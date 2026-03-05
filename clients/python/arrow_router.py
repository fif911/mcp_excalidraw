#!/usr/bin/env python3
"""
Arrow Router — A* pathfinding for Excalidraw diagram arrows.

Builds a grid from the canvas, marks text/icon bounding boxes as obstacles,
and finds optimal paths that:
1. Avoid text and icon overlaps (with configurable margin)
2. Minimize turns
3. Follow preferred direction hints
4. Enter/exit at 90° to element faces

Usage:
    from arrow_router import ArrowRouter
    router = ArrowRouter(api_url="http://localhost:3000")
    
    path = router.plot_arrow(
        from_id="img-q",           # source element ID
        to_id="img-ide",           # target element ID
        from_side="top",           # exit from this face
        to_side="right",           # enter target from this face
        preferred_dirs=["up", "right", "up"],  # hint for routing
        arrow_id="a-code-ide",     # Excalidraw element ID for the arrow
        stroke_color="#ff0000",
        stroke_width=6,
        stroke_style="solid",
    )
"""

import heapq
import requests
import json
import math
from typing import List, Tuple, Optional, Dict, Set


GRID_STEP = 20  # Grid resolution in diagram coordinates
MARGIN = 18     # Obstacle margin in diagram coordinates
ARROWHEAD_GAP = 25  # Gap before target element for arrowhead (accounts for thick stroke arrowheads)
EXIT_LENGTH = 60    # Minimum perpendicular exit/entry length (clear of source labels)


class ArrowRouter:
    def __init__(self, api_url="http://localhost:3000"):
        self.api = api_url + "/api/elements"
        self.elements = {}
        self.obstacles = []  # list of (x1, y1, x2, y2) bounding boxes
        self.grid_obstacles = set()  # set of (gx, gy) blocked grid cells
        self._load_elements()
    
    def _load_elements(self):
        """Fetch all elements from Excalidraw and build obstacle map."""
        data = requests.get(self.api).json()
        elems = data if isinstance(data, list) else data.get('elements', [])
        
        self.elements = {e['id']: e for e in elems}
        self.obstacles = []
        
        # Text elements are obstacles
        for e in elems:
            if e['type'] == 'text':
                # Skip step circle labels (c1-tx, c2-tx, etc.)
                if e['id'].endswith('-tx') and e['id'].startswith('c'):
                    continue
                bbox = self._text_bbox(e)
                self.obstacles.append((*bbox, e['id']))
            
            elif e['type'] == 'image':
                # Icon images are obstacles
                x, y = e['x'], e['y']
                w, h = e.get('width', 0), e.get('height', 0)
                self.obstacles.append((x, y, x + w, y + h, e['id']))
        
        self._build_grid()
    
    # Container IDs whose borders should be obstacles
    CONTAINER_IDS = {'sm-ctr', 'proj', 'ml-ctr', 'code-ctr', 'lake-ctr',
                     'stor-ctr', 'cat-ctr', 'aws-cloud', 'aws-region'}
    
    def _text_bbox(self, e):
        """Estimate text element bounding box."""
        x, y = e['x'], e['y']
        w = e.get('width', 0)
        fs = e.get('fontSize', 20)
        text = e.get('text', '')
        if w == 0:
            w = len(text) * fs * 0.6
        h = fs * 1.4 * (text.count('\n') + 1)
        return (x, y, x + w, y + h)
    
    def _build_grid(self):
        """Build obstacle grid for pathfinding. Stores which element IDs block each cell."""
        self.grid_obstacles = set()
        self.grid_obstacle_ids = {}  # (gx, gy) -> set of element IDs
        
        def _mark_obstacle(x1, y1, x2, y2, oid):
            gx1 = int(x1 // GRID_STEP)
            gy1 = int(y1 // GRID_STEP)
            gx2 = int(x2 // GRID_STEP) + 1
            gy2 = int(y2 // GRID_STEP) + 1
            for gx in range(gx1, gx2 + 1):
                for gy in range(gy1, gy2 + 1):
                    self.grid_obstacles.add((gx, gy))
                    if (gx, gy) not in self.grid_obstacle_ids:
                        self.grid_obstacle_ids[(gx, gy)] = set()
                    self.grid_obstacle_ids[(gx, gy)].add(oid)
        
        # Text and icon obstacles
        for obs in self.obstacles:
            oid = obs[4]
            _mark_obstacle(obs[0] - MARGIN, obs[1] - MARGIN, obs[2] + MARGIN, obs[3] + MARGIN, oid)
        
        # Container border obstacles (25px strips along each edge)
        BORDER_MARGIN = 25
        for eid, e in self.elements.items():
            if e.get('type') != 'rectangle' or eid not in self.CONTAINER_IDS:
                continue
            x, y = e['x'], e['y']
            w, h = e.get('width', 0), e.get('height', 0)
            # Top edge strip
            _mark_obstacle(x - BORDER_MARGIN, y - BORDER_MARGIN, x + w + BORDER_MARGIN, y + BORDER_MARGIN, f"{eid}-border")
            # Bottom edge strip
            _mark_obstacle(x - BORDER_MARGIN, y + h - BORDER_MARGIN, x + w + BORDER_MARGIN, y + h + BORDER_MARGIN, f"{eid}-border")
            # Left edge strip
            _mark_obstacle(x - BORDER_MARGIN, y - BORDER_MARGIN, x + BORDER_MARGIN, y + h + BORDER_MARGIN, f"{eid}-border")
            # Right edge strip
            _mark_obstacle(x + w - BORDER_MARGIN, y - BORDER_MARGIN, x + w + BORDER_MARGIN, y + h + BORDER_MARGIN, f"{eid}-border")
    
    def _element_bbox(self, eid):
        """Get element bounding box (x1, y1, x2, y2)."""
        e = self.elements[eid]
        x, y = e['x'], e['y']
        w, h = e.get('width', 0), e.get('height', 0)
        return (x, y, x + w, y + h)
    
    def _element_center(self, eid):
        """Get element center point."""
        x1, y1, x2, y2 = self._element_bbox(eid)
        return ((x1 + x2) / 2, (y1 + y2) / 2)
    
    def _face_point(self, eid, side, stroke_offset=10):
        """Get a point just outside a face of an element (accounts for thick strokes)."""
        x1, y1, x2, y2 = self._element_bbox(eid)
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        if side == "top":
            return (cx, y1 - stroke_offset)
        elif side == "bottom":
            return (cx, y2 + stroke_offset)
        elif side == "left":
            return (x1 - stroke_offset, cy)
        elif side == "right":
            return (x2 + stroke_offset, cy)
        return (cx, cy)
    
    def _exit_point(self, eid, side):
        """Get the point just outside an element face (after perpendicular exit)."""
        fx, fy = self._face_point(eid, side)
        if side == "top":
            return (fx, fy - EXIT_LENGTH)
        elif side == "bottom":
            return (fx, fy + EXIT_LENGTH)
        elif side == "left":
            return (fx - EXIT_LENGTH, fy)
        elif side == "right":
            return (fx + EXIT_LENGTH, fy)
        return (fx, fy)
    
    def _is_container(self, eid):
        """Check if element is a container (rectangle, not image/text)."""
        e = self.elements.get(eid, {})
        return e.get('type') == 'rectangle'
    
    def _entry_point(self, eid, side):
        """Get the point just outside target element face (before entry).
        For containers (rectangles), target 30px INSIDE the border."""
        fx, fy = self._face_point(eid, side)
        if self._is_container(eid):
            # Go 30px INSIDE the container (past the border)
            inward = 30
            if side == "top":
                return (fx, fy + inward)
            elif side == "bottom":
                return (fx, fy - inward)
            elif side == "left":
                return (fx + inward, fy)
            elif side == "right":
                return (fx - inward, fy)
        else:
            gap = ARROWHEAD_GAP
            if side == "top":
                return (fx, fy - gap)
            elif side == "bottom":
                return (fx, fy + gap)
            elif side == "left":
                return (fx - gap, fy)
            elif side == "right":
                return (fx + gap, fy)
        return (fx, fy)
    
    def _snap_to_grid(self, x, y):
        """Snap coordinates to grid."""
        return (round(x / GRID_STEP) * GRID_STEP, round(y / GRID_STEP) * GRID_STEP)
    
    def _is_blocked(self, gx, gy, exclude_ids=None):
        """Check if a grid cell is blocked, optionally excluding certain element obstacles."""
        if (gx, gy) not in self.grid_obstacles:
            return False
        if exclude_ids is None:
            return True
        # Check if ALL blocking obstacles are excluded
        blockers = self.grid_obstacle_ids.get((gx, gy), set())
        return not blockers.issubset(exclude_ids)
    
    def _direction_name(self, dx, dy):
        """Get direction name from delta."""
        if dy < 0:
            return "up"
        elif dy > 0:
            return "down"
        elif dx > 0:
            return "right"
        elif dx < 0:
            return "left"
        return "none"
    
    def find_path(self, start, end, preferred_dirs=None, exclude_ids=None):
        """
        A* pathfinding on the grid from start to end.
        Returns list of (x, y) waypoints (in diagram coordinates).
        
        The path is orthogonal (only horizontal/vertical segments).
        Turns are penalized. Following preferred_dirs is rewarded.
        """
        sx, sy = self._snap_to_grid(*start)
        ex, ey = self._snap_to_grid(*end)
        
        sgx, sgy = int(sx // GRID_STEP), int(sy // GRID_STEP)
        egx, egy = int(ex // GRID_STEP), int(ey // GRID_STEP)
        
        # Direction vectors: right, left, down, up
        dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        dir_names = ["right", "left", "down", "up"]
        
        # Build preferred direction sequence for bonus scoring
        pref_seq = preferred_dirs or []
        
        # A* with parent map instead of storing paths in PQ
        TURN_COST = 20
        MOVE_COST = 10
        PREF_BONUS = 5  # Extra cost for NOT following preferred direction
        
        # Priority queue: (f_cost, g_cost, gx, gy, last_dir_idx, pref_idx)
        # Use a counter to break ties
        counter = 0
        start_state = (0, 0, counter, sgx, sgy, -1, 0)
        pq = [start_state]
        # visited: (gx, gy, last_dir) -> best g_cost
        visited = {}
        # parent: (gx, gy, last_dir) -> (prev_gx, prev_gy, prev_last_dir)
        parent = {}
        best_g = {}  # best known g-cost per state key
        
        best_cost = float('inf')
        best_end_key = None
        
        iterations = 0
        max_iterations = 200000
        
        while pq and iterations < max_iterations:
            iterations += 1
            f, g, _cnt, gx, gy, last_dir, pref_idx = heapq.heappop(pq)
            
            if gx == egx and gy == egy:
                best_cost = g
                best_end_key = (gx, gy, last_dir)
                break
            
            visit_key = (gx, gy, last_dir)
            if visit_key in visited and visited[visit_key] <= g:
                continue
            visited[visit_key] = g
            
            for di, (ddx, ddy) in enumerate(dirs):
                ngx, ngy = gx + ddx, gy + ddy
                
                if self._is_blocked(ngx, ngy, exclude_ids):
                    continue
                
                new_g = g + MOVE_COST
                
                if last_dir >= 0 and di != last_dir:
                    new_g += TURN_COST
                
                new_pref_idx = pref_idx
                if pref_idx < len(pref_seq):
                    if dir_names[di] == pref_seq[pref_idx]:
                        if last_dir >= 0 and di != last_dir:
                            new_pref_idx = pref_idx + 1
                    else:
                        new_g += PREF_BONUS
                
                nkey = (ngx, ngy, di)
                if nkey in visited and visited[nkey] <= new_g:
                    continue
                
                # Only push/update parent if this is better than any pending
                if nkey not in best_g or new_g < best_g[nkey]:
                    best_g[nkey] = new_g
                    parent[nkey] = visit_key
                    h = (abs(ngx - egx) + abs(ngy - egy)) * MOVE_COST
                    counter += 1
                    heapq.heappush(pq, (new_g + h, new_g, counter, ngx, ngy, di, new_pref_idx))
        
        if best_end_key is None:
            print(f"  ⚠️  No path found in {iterations} iterations!")
            return [start, end]
        
        # Reconstruct path from parent map
        grid_path = []
        key = best_end_key
        while key in parent:
            grid_path.append((key[0], key[1]))
            key = parent[key]
        grid_path.append((key[0], key[1]))
        grid_path.reverse()
        
        # Simplify and convert
        waypoints = self._simplify_path(grid_path)
        result = [(gx * GRID_STEP, gy * GRID_STEP) for gx, gy in waypoints]
        
        # Snap first point to exact start coords along the exit axis only
        if len(result) >= 2:
            # First segment direction
            dx = result[1][0] - result[0][0]
            dy = result[1][1] - result[0][1]
            if abs(dx) > abs(dy):
                # Horizontal first segment — snap y to exact start y, keep grid x
                result[0] = (result[0][0], start[1])
                result[1] = (result[1][0], start[1])
            else:
                # Vertical first segment — snap x to exact start x, keep grid y
                result[0] = (start[0], result[0][1])
                result[1] = (start[0], result[1][1])
        
        # Snap last point to exact end coords along the entry axis only
        if len(result) >= 2:
            dx = result[-1][0] - result[-2][0]
            dy = result[-1][1] - result[-2][1]
            if abs(dx) > abs(dy):
                # Horizontal last segment
                result[-1] = (result[-1][0], end[1])
                result[-2] = (result[-2][0], end[1])
            else:
                # Vertical last segment
                result[-1] = (end[0], result[-1][1])
                result[-2] = (end[0], result[-2][1])
        
        # Force strict orthogonality: each segment must be purely H or V
        result = self._force_orthogonal(result)
        
        print(f"  Path found: {len(result)} points, {iterations} A* iterations, cost={best_cost}")
        return result
    
    def _simplify_path(self, grid_path):
        """Remove redundant points — keep only start, turns, and end."""
        if len(grid_path) <= 2:
            return grid_path
        
        simplified = [grid_path[0]]
        for i in range(1, len(grid_path) - 1):
            prev = grid_path[i - 1]
            curr = grid_path[i]
            nxt = grid_path[i + 1]
            
            # Direction from prev to curr
            d1 = (curr[0] - prev[0], curr[1] - prev[1])
            # Direction from curr to next
            d2 = (nxt[0] - curr[0], nxt[1] - curr[1])
            
            # Keep point if direction changes (it's a turn)
            if d1 != d2:
                simplified.append(curr)
        
        simplified.append(grid_path[-1])
        return simplified
    
    def _force_orthogonal(self, path):
        """Ensure every segment is strictly horizontal or vertical.
        If a segment is diagonal, split it into H+V segments."""
        if len(path) <= 1:
            return path
        
        result = [path[0]]
        for i in range(1, len(path)):
            prev = result[-1]
            curr = path[i]
            dx = curr[0] - prev[0]
            dy = curr[1] - prev[1]
            
            if dx != 0 and dy != 0:
                # Diagonal — split into H then V (or V then H based on direction)
                # Prefer: keep the axis of the previous segment, then turn
                if i >= 2:
                    pprev = result[-2] if len(result) >= 2 else prev
                    pdx = prev[0] - pprev[0]
                    pdy = prev[1] - pprev[1]
                    if pdx != 0:
                        # Previous was horizontal, continue horizontal then turn vertical
                        result.append((curr[0], prev[1]))
                    else:
                        # Previous was vertical, continue vertical then turn horizontal
                        result.append((prev[0], curr[1]))
                else:
                    # First segment — prefer horizontal first
                    result.append((curr[0], prev[1]))
                result.append(curr)
            else:
                result.append(curr)
        
        return result
    
    def plot_arrow(self, from_id, to_id, 
                   from_side="auto", to_side="auto",
                   preferred_dirs=None,
                   arrow_id=None,
                   stroke_color="#1a1a1a", stroke_width=2, stroke_style="solid",
                   create=True):
        """
        Plot an arrow from one element to another using A* pathfinding.
        
        Args:
            from_id: source element ID
            to_id: target element ID
            from_side: "top", "bottom", "left", "right", or "auto"
            to_side: "top", "bottom", "left", "right", or "auto"
            preferred_dirs: list of direction hints, e.g. ["up", "right", "down"]
            arrow_id: ID for the arrow element (auto-generated if None)
            stroke_color: arrow color
            stroke_width: arrow width
            stroke_style: "solid" or "dashed"
            create: if True, create the arrow in Excalidraw
        
        Returns:
            dict with arrow_id, path, waypoints
        """
        if arrow_id is None:
            arrow_id = f"arr-{from_id}-{to_id}"
        
        # Auto-detect best sides based on relative position
        if from_side == "auto" or to_side == "auto":
            from_side, to_side = self._auto_sides(from_id, to_id)
        
        # Get start/end points
        face_start = self._face_point(from_id, from_side)
        exit_pt = self._exit_point(from_id, from_side)
        entry_pt = self._entry_point(to_id, to_side)
        
        print(f"\nRouting {arrow_id}: {from_id}[{from_side}] → {to_id}[{to_side}]")
        print(f"  Face start: ({face_start[0]:.0f}, {face_start[1]:.0f})")
        print(f"  Exit point: ({exit_pt[0]:.0f}, {exit_pt[1]:.0f})")  
        print(f"  Entry point: ({entry_pt[0]:.0f}, {entry_pt[1]:.0f})")
        
        # Exclude target element + target labels from obstacles
        # Source stays as obstacle to prevent backtracking
        # Source labels also stay as obstacles (arrow must route around them)
        exclude = {to_id}
        
        # NOTE: We do NOT exclude target labels — arrows must route around them
        
        # Exclude border obstacles for containers that contain the source or target
        for cid in self.CONTAINER_IDS:
            c = self.elements.get(cid, {})
            if c.get('type') != 'rectangle':
                continue
            cx, cy = c['x'], c['y']
            cw, ch = c.get('width', 0), c.get('height', 0)
            for eid in [from_id, to_id]:
                eb = self._element_bbox(eid)
                ecx, ecy = (eb[0] + eb[2]) / 2, (eb[1] + eb[3]) / 2
                if cx <= ecx <= cx + cw and cy <= ecy <= cy + ch:
                    exclude.add(f"{cid}-border")
        
        # Find path from exit point to entry point
        path = self.find_path(exit_pt, entry_pt, preferred_dirs, exclude)
        
        # Build full path: face_start → exit_pt → [route] → entry_pt
        # face_start → exit_pt is the perpendicular exit segment (guaranteed orthogonal)
        full_path = [face_start, exit_pt] + path[1:]  # path[0] ≈ exit_pt (grid-snapped), skip it
        
        # Force the entire full path to be orthogonal
        full_path = self._force_orthogonal(full_path)
        
        # Remove consecutive duplicate points
        deduped = [full_path[0]]
        for p in full_path[1:]:
            if p != deduped[-1]:
                deduped.append(p)
        full_path = deduped
        
        # Print path
        path_str = " → ".join([f"({p[0]:.0f},{p[1]:.0f})" for p in full_path])
        print(f"  Full path: {path_str}")
        
        if create:
            self._create_arrow(arrow_id, full_path, stroke_color, stroke_width, stroke_style)
        
        return {
            "arrow_id": arrow_id,
            "path": full_path,
            "from_side": from_side,
            "to_side": to_side,
        }
    
    def _auto_sides(self, from_id, to_id):
        """Auto-detect best exit/entry sides based on relative position."""
        fc = self._element_center(from_id)
        tc = self._element_center(to_id)
        dx = tc[0] - fc[0]
        dy = tc[1] - fc[1]
        
        # Primary direction
        if abs(dx) > abs(dy):
            # Mostly horizontal
            from_side = "right" if dx > 0 else "left"
            to_side = "left" if dx > 0 else "right"
        else:
            # Mostly vertical
            from_side = "bottom" if dy > 0 else "top"
            to_side = "top" if dy > 0 else "bottom"
        
        return from_side, to_side
    
    def _create_arrow(self, arrow_id, path, stroke_color, stroke_width, stroke_style):
        """Create arrow element in Excalidraw from a path."""
        start_x, start_y = path[0]
        points = [[p[0] - start_x, p[1] - start_y] for p in path]
        
        element = {
            "id": arrow_id,
            "type": "arrow",
            "x": start_x,
            "y": start_y,
            "strokeColor": stroke_color,
            "strokeWidth": stroke_width,
            "strokeStyle": stroke_style,
            "roughness": 0,
            "startArrowhead": None,
            "endArrowhead": "arrow",
            "points": points,
        }
        
        # Delete existing arrow if any
        requests.delete(f"{self.api}/{arrow_id}")
        
        r = requests.post(self.api, json=element)
        print(f"  Created {arrow_id}: {r.status_code}")


def test_arrows():
    """Test routing key arrows."""
    router = ArrowRouter()
    
    # Test Q → IDE
    print("\n=== Test: Q Developer → Studio IDE ===")
    result = router.plot_arrow(
        "img-q", "img-ide",
        from_side="top", to_side="right",
        preferred_dirs=["up", "right", "up"],
        arrow_id="test-code-ide",
        stroke_color="#ff0000", stroke_width=6,
        create=True,
    )
    
    # Test IDE → ML
    print("\n=== Test: IDE → SageMaker ML ===")
    result = router.plot_arrow(
        "img-ide", "img-sm-ml",
        from_side="right", to_side="top",
        preferred_dirs=["right", "up", "right", "down"],
        arrow_id="test-ide-ml",
        stroke_color="#ff0000", stroke_width=6,
        create=True,
    )
    
    # Test Tools → ML container
    print("\n=== Test: Tools → ML capabilities ===")
    result = router.plot_arrow(
        "img-tools", "ml-ctr",
        from_side="right", to_side="left",
        preferred_dirs=["right"],
        arrow_id="test-tools-ml",
        stroke_color="#ff0000", stroke_width=6,
        create=True,
    )


if __name__ == "__main__":
    test_arrows()
