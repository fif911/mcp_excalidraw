#!/usr/bin/env python3
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
Smart Arrow Router — Channel-based routing for Excalidraw diagrams.

Routes arrows through predefined horizontal/vertical channels,
auto-detects entry side, validates against all obstacles.

Usage:
    from smart_arrow import SmartArrowRouter
    router = SmartArrowRouter()
    router.smart_arrow("img-q", "img-ide", exit_side="top")
"""
import requests
import math
from typing import List, Tuple, Optional, Dict


# ── Configuration ──
STROKE_OFFSET = 10      # px outside icon edge where arrow starts
EXIT_LENGTH = 60         # px perpendicular exit before first turn  
ARROWHEAD_GAP = 25       # px before icon edge for arrowhead
CONTAINER_ENTRY = 30     # px inside container border
TEXT_MARGIN = 20         # px margin around text bboxes
ICON_MARGIN = 15         # px margin around icon bboxes
BORDER_MARGIN = 25       # px margin from container borders


class SmartArrowRouter:
    def __init__(self, api_url="http://localhost:3000"):
        self.api = api_url + "/api/elements"
        self.elements = {}
        self.by_type = {'text': [], 'image': [], 'rectangle': [], 'arrow': []}
        self._load_elements()
        self._build_obstacles()
    
    def _load_elements(self):
        data = requests.get(self.api).json()
        elems = data if isinstance(data, list) else data.get('elements', [])
        self.elements = {e['id']: e for e in elems}
        self.by_type = {'text': [], 'image': [], 'rectangle': [], 'arrow': []}
        for e in elems:
            t = e.get('type', '')
            if t in self.by_type:
                self.by_type[t].append(e)
    
    def _bbox(self, e):
        """Get element bounding box (x1, y1, x2, y2)."""
        x, y = e['x'], e['y']
        w, h = e.get('width', 0), e.get('height', 0)
        if e['type'] == 'text' and w == 0:
            fs = e.get('fontSize', 20)
            text = e.get('text', '')
            w = len(text) * fs * 0.6
            h = fs * 1.4 * (text.count('\n') + 1)
        return (x, y, x + w, y + h)
    
    def _center(self, eid):
        x1, y1, x2, y2 = self._bbox(self.elements[eid])
        return ((x1 + x2) / 2, (y1 + y2) / 2)
    
    def _face(self, eid, side):
        """Get face center point WITH stroke offset (outside the element)."""
        x1, y1, x2, y2 = self._bbox(self.elements[eid])
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        off = STROKE_OFFSET
        if side == "top":    return (cx, y1 - off)
        elif side == "bottom": return (cx, y2 + off)
        elif side == "left":   return (x1 - off, cy)
        elif side == "right":  return (x2 + off, cy)
        return (cx, cy)
    
    def _exit_point(self, eid, side):
        """Point after perpendicular exit (EXIT_LENGTH px from face)."""
        fx, fy = self._face(eid, side)
        print(f"    _exit_point({eid}, {side}): fx={fx}, fy={fy}, EXIT_LENGTH={EXIT_LENGTH}")
        if side == "top":    r = (fx, fy - EXIT_LENGTH)
        elif side == "bottom": r = (fx, fy + EXIT_LENGTH)
        elif side == "left":   r = (fx - EXIT_LENGTH, fy)
        elif side == "right":  r = (fx + EXIT_LENGTH, fy)
        else: r = (fx, fy)
        print(f"    _exit_point returning {r}")
        return r
    
    def _entry_point(self, eid, side):
        """Point just before entering target element."""
        e = self.elements[eid]
        x1, y1, x2, y2 = self._bbox(e)
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        
        is_container = e.get('type') == 'rectangle'
        gap = -CONTAINER_ENTRY if is_container else ARROWHEAD_GAP
        
        if side == "top":    return (cx, y1 - gap)
        elif side == "bottom": return (cx, y2 + gap)
        elif side == "left":   return (x1 - gap, cy)
        elif side == "right":  return (x2 + gap, cy)
        return (cx, cy)
    
    def _build_obstacles(self):
        """Build all obstacle bounding boxes upfront."""
        self.text_obstacles = []  # (x1,y1,x2,y2, id)
        self.icon_obstacles = []
        self.border_obstacles = []  # container edge strips
        
        # Step circle text IDs (OK to overlap)
        step_ids = {f'c{i}-tx' for i in range(1, 10)}
        
        for e in self.by_type['text']:
            if e['id'] in step_ids:
                continue
            bx = self._bbox(e)
            self.text_obstacles.append((
                bx[0] - TEXT_MARGIN, bx[1] - TEXT_MARGIN,
                bx[2] + TEXT_MARGIN, bx[3] + TEXT_MARGIN,
                e['id']
            ))
        
        for e in self.by_type['image']:
            bx = self._bbox(e)
            self.icon_obstacles.append((
                bx[0] - ICON_MARGIN, bx[1] - ICON_MARGIN,
                bx[2] + ICON_MARGIN, bx[3] + ICON_MARGIN,
                e['id']
            ))
        
        # Container border strips (thin obstacle zones along each edge)
        containers = [e for e in self.by_type['rectangle'] 
                      if e['id'] in ('sm-ctr','proj','ml-ctr','code-ctr','lake-ctr',
                                      'stor-ctr','cat-ctr','aws-cloud','aws-region')]
        for e in containers:
            x1, y1, x2, y2 = self._bbox(e)
            m = BORDER_MARGIN
            # Top edge
            self.border_obstacles.append((x1-m, y1-m, x2+m, y1+m, e['id']+'-top'))
            # Bottom edge
            self.border_obstacles.append((x1-m, y2-m, x2+m, y2+m, e['id']+'-bot'))
            # Left edge
            self.border_obstacles.append((x1-m, y1-m, x1+m, y2+m, e['id']+'-left'))
            # Right edge
            self.border_obstacles.append((x1-m, y1-m, x2+m, y1+m, e['id']+'-right'))
    
    def _segment_hits_obstacle(self, seg, obstacles, exclude_ids=None):
        """Check if a line segment hits any obstacle bbox. Returns list of hit IDs."""
        x1, y1, x2, y2 = seg
        hits = []
        for obs in obstacles:
            ox1, oy1, ox2, oy2, oid = obs
            if exclude_ids and oid in exclude_ids:
                continue
            if self._seg_intersects_rect(x1, y1, x2, y2, ox1, oy1, ox2, oy2):
                hits.append(oid)
        return hits
    
    def _seg_intersects_rect(self, x1, y1, x2, y2, rx1, ry1, rx2, ry2):
        """Cohen-Sutherland line-rectangle intersection."""
        def outcode(x, y):
            c = 0
            if x < rx1: c |= 1
            elif x > rx2: c |= 2
            if y < ry1: c |= 4
            elif y > ry2: c |= 8
            return c
        c1, c2 = outcode(x1, y1), outcode(x2, y2)
        if c1 == 0 or c2 == 0: return True
        if c1 & c2: return False
        dx, dy = x2 - x1, y2 - y1
        for ex1, ey1, ex2, ey2 in [(rx1,ry1,rx1,ry2),(rx2,ry1,rx2,ry2),
                                     (rx1,ry1,rx2,ry1),(rx1,ry2,rx2,ry2)]:
            dex, dey = ex2 - ex1, ey2 - ey1
            denom = dx * dey - dy * dex
            if abs(denom) < 0.001: continue
            t = ((ex1 - x1) * dey - (ey1 - y1) * dex) / denom
            u = ((ex1 - x1) * dy - (ey1 - y1) * dx) / denom
            if 0 <= t <= 1 and 0 <= u <= 1: return True
        return False
    
    def _auto_entry_side(self, approach_point, target_id):
        """Determine best entry side based on where the path arrives from."""
        x1, y1, x2, y2 = self._bbox(self.elements[target_id])
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        ax, ay = approach_point
        
        # Check which face the approach point is closest to
        distances = {
            'top':    abs(ay - y1) if ax >= x1 and ax <= x2 else float('inf'),
            'bottom': abs(ay - y2) if ax >= x1 and ax <= x2 else float('inf'),
            'left':   abs(ax - x1) if ay >= y1 and ay <= y2 else float('inf'),
            'right':  abs(ax - x2) if ay >= y1 and ay <= y2 else float('inf'),
        }
        
        # Fallback: use Manhattan direction
        dx, dy = ax - cx, ay - cy
        if all(v == float('inf') for v in distances.values()):
            if abs(dx) > abs(dy):
                return 'right' if dx > 0 else 'left'
            else:
                return 'bottom' if dy > 0 else 'top'
        
        return min(distances, key=distances.get)
    
    def _make_orthogonal_path(self, points):
        """Ensure all segments are strictly H or V. Split diagonals."""
        if len(points) <= 1:
            return points
        result = [points[0]]
        for i in range(1, len(points)):
            prev = result[-1]
            curr = points[i]
            dx = curr[0] - prev[0]
            dy = curr[1] - prev[1]
            if dx != 0 and dy != 0:
                # Split: horizontal first, then vertical
                result.append((curr[0], prev[1]))
            result.append(curr)
        return result
    
    def _dedupe(self, points):
        """Remove consecutive duplicate points."""
        if not points: return points
        result = [points[0]]
        for p in points[1:]:
            if abs(p[0] - result[-1][0]) > 0.01 or abs(p[1] - result[-1][1]) > 0.01:
                result.append(p)
        return result
    
    def smart_arrow(self, from_id, to_id, exit_side,
                    waypoints=None,
                    arrow_id=None,
                    stroke_color="#ff0000", stroke_width=6,
                    stroke_style="solid"):
        """
        Route an arrow from source to target.
        
        Args:
            from_id: source element ID
            to_id: target element ID
            exit_side: "top", "bottom", "left", "right"
            waypoints: optional list of (x, y) forced intermediate points
            arrow_id: Excalidraw element ID
            stroke_color, stroke_width, stroke_style: arrow styling
        
        Returns:
            dict with arrow_id, path, entry_side, issues
        """
        if arrow_id is None:
            arrow_id = f"arr-{from_id}-{to_id}"
        
        # 1. Build path: face → exit → waypoints → approach → entry
        face_pt = self._face(from_id, exit_side)
        exit_pt = self._exit_point(from_id, exit_side)
        
        # Check if exit point overshoots INTO the target (elements very close together)
        target_bbox = self._bbox(self.elements[to_id])
        tcx = (target_bbox[0] + target_bbox[2]) / 2
        tcy = (target_bbox[1] + target_bbox[3]) / 2
        
        ex, ey = exit_pt
        # Only shorten if exit direction points TOWARD target AND overshoots into it
        if exit_side == "right" and tcx > face_pt[0] and ex > target_bbox[0]:
            ex = (face_pt[0] + target_bbox[0]) / 2
            exit_pt = (ex, ey)
        elif exit_side == "left" and tcx < face_pt[0] and ex < target_bbox[2]:
            ex = (face_pt[0] + target_bbox[2]) / 2
            exit_pt = (ex, ey)
        elif exit_side == "top" and tcy < face_pt[1] and ey < target_bbox[3]:
            ey = (face_pt[1] + target_bbox[3]) / 2
            exit_pt = (ex, ey)
        elif exit_side == "bottom" and tcy > face_pt[1] and ey > target_bbox[1]:
            ey = (face_pt[1] + target_bbox[1]) / 2
            exit_pt = (ex, ey)
        
        if waypoints:
            route = [face_pt, exit_pt] + [(float(x), float(y)) for x, y in waypoints]
        else:
            route = [face_pt, exit_pt]
        
        # 2. Last waypoint is the approach point — auto-detect entry side
        last_pt = route[-1]
        entry_side = self._auto_entry_side(last_pt, to_id)
        entry_pt = self._entry_point(to_id, entry_side)
        
        # 3. Build approach: from last route point to entry point
        route.append(entry_pt)
        
        # 4. Force orthogonal
        print(f"  DBG face={face_pt} exit={exit_pt}")
        print(f"  DBG route={route}")
        path = self._make_orthogonal_path(route)
        path = self._dedupe(path)
        
        # 5. Validate
        issues = self._validate_path(path, from_id, to_id)
        
        # 6. Print
        path_str = " → ".join([f"({p[0]:.0f},{p[1]:.0f})" for p in path])
        status = "✅" if not issues else "❌"
        print(f"{status} {arrow_id}: {from_id}[{exit_side}] → {to_id}[{entry_side}] | {path_str}")
        if issues:
            for iss in issues:
                print(f"   ⚠️  {iss}")
        
        # 7. Create in Excalidraw
        self._create_arrow(arrow_id, path, stroke_color, stroke_width, stroke_style)
        
        return {
            "arrow_id": arrow_id,
            "path": path,
            "entry_side": entry_side,
            "issues": issues,
        }
    
    def _validate_path(self, path, from_id, to_id):
        """Validate the full path against all obstacles."""
        issues = []
        
        # IDs to exclude from checks (source, target, their labels)
        exclude_icons = {from_id, to_id}
        exclude_text = set()
        for eid in [from_id, to_id]:
            prefix = eid.replace('img-', '')
            for sfx in ['-lbl', '-lbl-0', '-lbl-1']:
                exclude_text.add(prefix + sfx)
        
        # Containers that contain source/target — exclude their borders
        exclude_borders = set()
        for eid in [from_id, to_id]:
            e = self.elements[eid]
            ecx, ecy = e['x'] + e.get('width',0)/2, e['y'] + e.get('height',0)/2
            for ctr in self.by_type['rectangle']:
                cx1, cy1 = ctr['x'], ctr['y']
                cx2, cy2 = cx1 + ctr.get('width',0), cy1 + ctr.get('height',0)
                if cx1 <= ecx <= cx2 and cy1 <= ecy <= cy2:
                    for sfx in ['-top','-bot','-left','-right']:
                        exclude_borders.add(ctr['id'] + sfx)
        
        for i in range(len(path) - 1):
            seg = (path[i][0], path[i][1], path[i+1][0], path[i+1][1])
            
            # Check orthogonality
            dx = seg[2] - seg[0]
            dy = seg[3] - seg[1]
            if dx != 0 and dy != 0:
                issues.append(f"DIAGONAL segment {i}: ({seg[0]:.0f},{seg[1]:.0f})→({seg[2]:.0f},{seg[3]:.0f})")
            
            # Check text overlap
            hits = self._segment_hits_obstacle(seg, self.text_obstacles, exclude_text)
            for h in hits:
                issues.append(f"TEXT overlap at segment {i}: {h}")
            
            # Check icon overlap
            hits = self._segment_hits_obstacle(seg, self.icon_obstacles, exclude_icons)
            for h in hits:
                issues.append(f"ICON overlap at segment {i}: {h}")
            
            # Check border proximity
            hits = self._segment_hits_obstacle(seg, self.border_obstacles, exclude_borders)
            for h in hits:
                issues.append(f"BORDER overlap at segment {i}: {h}")
        
        return issues
    
    def _create_arrow(self, arrow_id, path, stroke_color, stroke_width, stroke_style):
        """Create arrow element in Excalidraw."""
        start_x, start_y = path[0]
        points = [[p[0] - start_x, p[1] - start_y] for p in path]
        
        element = {
            "id": arrow_id, "type": "arrow",
            "x": start_x, "y": start_y,
            "strokeColor": stroke_color,
            "strokeWidth": stroke_width,
            "strokeStyle": stroke_style,
            "roughness": 0,
            "startArrowhead": None,
            "endArrowhead": "arrow",
            "points": points,
        }
        
        requests.delete(f"{self.api}/{arrow_id}")
        r = requests.post(self.api, json=element)
        return r.status_code


if __name__ == "__main__":
    router = SmartArrowRouter()
    
    print("\n=== Testing smart_arrow ===\n")
    
    # ── All diagram arrows ──
    
    # 1. Person → IAM (close together, short horizontal)
    router.smart_arrow("img-person", "img-iam", exit_side="right",
                       arrow_id="a-ml-iam")
    
    # 2. IAM → Unified Studio
    router.smart_arrow("img-iam", "img-us", exit_side="right",
                       arrow_id="a-iam-us")
    
    # 3. Q Developer → Studio IDE
    # Q is inside code-ctr. Exit RIGHT (past code-ctr edge 700), then UP to IDE
    # Channel: x=730 vertical corridor between code-ctr(700) and lake-ctr(740)
    router.smart_arrow("img-q", "img-ide", exit_side="right",
                       waypoints=[(730, 798), (730, 465)],
                       arrow_id="a-code-ide")
    
    # 4a. Studio IDE → SageMaker ML
    # Exit IDE top, UP to y=190 (above proj-lbl at 208), RIGHT to x=960, UP to y=100 (above all), RIGHT to SM x
    router.smart_arrow("img-ide", "img-sm-ml", exit_side="top",
                       waypoints=[(595, 190), (960, 190), (960, 100), (1340, 100)],
                       arrow_id="a-ide-ml")
    
    # 4b. Tools → ML capabilities
    router.smart_arrow("img-tools", "ml-ctr", exit_side="right",
                       arrow_id="a-tools-ml")
    
    # 5. Database → Lakehouse
    # Exit DB right, x=730 corridor, DOWN to y=610 (below ml-ctr bottom 580+25=605), RIGHT into lake
    router.smart_arrow("img-db", "lake-ctr", exit_side="right",
                       waypoints=[(730, 296), (730, 610)],
                       arrow_id="a-db-lake")
    
    # 6. SageMaker ML → Lakehouse (dashed)
    # Exit SM right, past ml-ctr (x=1560), DOWN to y=610, into lake
    router.smart_arrow("img-sm-ml", "lake-ctr", exit_side="right",
                       waypoints=[(1560, 367), (1560, 610)],
                       arrow_id="a-ml-lake", stroke_style="dashed")
