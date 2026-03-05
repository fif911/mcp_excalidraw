#!/usr/bin/env python3
"""
Excalidraw reusable diagram components with automatic grouping + alignment.

Every component function:
1. Creates all child elements
2. Groups them (groupIds)
3. Aligns them (icon centered above label)
4. Returns component metadata for verification

NO HAND TUNING. All positions are calculated from inputs.

Canonical location: mcp_excalidraw/scripts/components.py
Skill reference: skills/excalidraw-diagramming/SKILL.md
"""
import requests
import json
import base64
import os
import time

# Repo root: clients/python/components.py → up 3 levels
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

API = "http://localhost:3000/api"

def set_api(url):
    """Override the default API URL (e.g. for remote servers)."""
    global API
    API = url.rstrip("/")
    if not API.endswith("/api"):
        API = API + "/api"

# ─── Low-level helpers ───

def _post(path, data):
    r = requests.post(f"{API}{path}", json=data)
    return r.json()

def _put(path, data):
    r = requests.put(f"{API}{path}", json=data)
    return r.json()

def _get(path):
    r = requests.get(f"{API}{path}")
    return r.json()

def _delete(path):
    r = requests.delete(f"{API}{path}")
    return r.json()

def clear():
    return _delete("/elements/clear")

def get_elements():
    return _get("/elements")

def get_element(eid):
    d = _get(f"/elements/{eid}")
    return d.get('element', d)

def create(element):
    return _post("/elements", element)

def update(eid, props):
    return _put(f"/elements/{eid}", props)

def align_in_parent(child_ids, parent_id, alignment="center", padding=0):
    """
    Center/align children within a parent element using the browser's rendered dimensions.

    Delegates to the browser via WebSocket — requires browser open at localhost:3000.
    Unlike the server-side /api/elements/center, this uses actual rendered sizes
    (accurate for text elements, images, etc).

    Args:
        child_ids: list of element IDs to align
        parent_id: parent element ID
        alignment: 'center', 'left', 'right', 'top', 'bottom',
                   'top-left', 'top-right', 'bottom-left', 'bottom-right'
        padding: pixels of padding from parent edges

    Returns:
        dict with success, updates
    """
    r = requests.post(f"{API}/align", json={
        "parentId": parent_id,
        "childIds": child_ids if isinstance(child_ids, list) else [child_ids],
        "alignment": alignment,
        "padding": padding,
    }, timeout=15)
    return r.json()


def upload_svg(file_id, svg_path):
    with open(svg_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return _post("/files", [{
        "id": file_id,
        "dataURL": f"data:image/svg+xml;base64,{b64}",
        "mimeType": "image/svg+xml",
    }])

def export_screenshot(output_path):
    """Export using headless puppeteer (most reliable)."""
    import subprocess
    r = subprocess.run(
        ["node", "headless-export.cjs", output_path, "3"],
        cwd=REPO_ROOT,
        capture_output=True, text=True, timeout=30
    )
    if os.path.exists(output_path) and os.path.getsize(output_path) > 200:
        return os.path.getsize(output_path)
    # Fallback: puppeteer screenshot
    script = f"""
const puppeteer = require('puppeteer-core');
(async () => {{
  const browser = await puppeteer.launch({{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']}});
  const page = await browser.newPage();
  await page.setViewport({{width:2400,height:1400}});
  await page.goto('http://localhost:3000',{{waitUntil:'networkidle0',timeout:30000}});
  await new Promise(r=>setTimeout(r,4000));
  await page.evaluate(async()=>{{await fetch('/api/viewport',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{scrollToContent:true}})}});}});
  await new Promise(r=>setTimeout(r,2000));
  await page.screenshot({{path:'{output_path}'}});
  await browser.close();
}})();
"""
    subprocess.run(["node", "-e", script],
                   cwd=REPO_ROOT,
                   capture_output=True, text=True, timeout=40)
    return os.path.getsize(output_path) if os.path.exists(output_path) else 0


# ─── Text width estimation ───
# Helvetica (fontFamily "2") character widths at fontSize 1.0
# Measured from actual Excalidraw renders
CHAR_WIDTH_RATIO = {
    "2": 0.55,  # Helvetica — average width per char relative to fontSize
    "1": 0.50,  # Hand-drawn
}

def measure_text(text, font_size=22):
    """Get accurate text width from server (per-character Helvetica widths)."""
    r = requests.post(f"{API}/text/measure", json={"text": text, "fontSize": font_size})
    d = r.json()
    return d.get("width", 0), d.get("height", 0)

def estimate_text_width(text, font_size=22, font_family="2"):
    """Get accurate text width from server."""
    w, _ = measure_text(text, font_size)
    return w

def estimate_text_height(text, font_size=22):
    """Estimate rendered height of text string."""
    lines = text.split('\n')
    return len(lines) * font_size * 1.25


# ─── REUSABLE COMPONENTS ───

def icon_label_component(prefix, file_id, label_text, cx, cy,
                          icon_size=65, font_size=22, gap=8,
                          text_color="#000000", label_width=None):
    """
    Create an icon centered above a label, grouped.
    
    Uses explicit width + textAlign=center on the label so Excalidraw
    handles text centering natively — no character width estimation.
    
    Args:
        prefix: Unique prefix for element IDs
        file_id: Uploaded SVG file ID
        label_text: Label text (can contain \\n for multi-line)
        cx, cy: CENTER position of the entire component
        icon_size: Icon width/height
        font_size: Label font size
        gap: Pixels between icon bottom and text top
        text_color: Label color
        label_width: Explicit label width (default: max(icon_size + 60, 140))
    
    Returns:
        dict with keys: icon_id, label_id, group_id, bbox
    """
    icon_id = f"img-{prefix}"
    label_id = f"{prefix}-lbl"
    group_id = f"g-{prefix}"
    
    # Get accurate text dimensions from server
    text_w, text_h = measure_text(label_text, font_size)
    total_h = icon_size + gap + text_h
    component_w = max(icon_size, text_w)
    
    # Position: center everything at (cx, cy)
    icon_x = cx - icon_size / 2
    icon_y = cy - total_h / 2
    # Label: center text horizontally under icon using ACCURATE width
    label_x = cx - text_w / 2
    label_y = icon_y + icon_size + gap
    
    # Create icon
    create({
        "id": icon_id, "type": "image",
        "x": round(icon_x, 1), "y": round(icon_y, 1),
        "width": icon_size, "height": icon_size,
        "fileId": file_id, "status": "saved", "scale": [1, 1],
        "groupIds": [group_id]
    })
    
    # Create label — separate text element per line, each centered under icon
    # This is needed because Excalidraw ignores textAlign on standalone text
    lines = label_text.split('\n')
    line_h = font_size * 1.25
    
    if len(lines) == 1:
        # Single line: one text element centered
        create({
            "id": label_id, "type": "text",
            "x": round(label_x, 1), "y": round(label_y, 1),
            "text": label_text,
            "fontSize": font_size, "fontFamily": "2",
            "strokeColor": text_color,
            "groupIds": [group_id]
        })
    else:
        # Multi-line: create one element per line, each individually centered
        for li, line in enumerate(lines):
            line_w = measure_text(line, font_size)[0]
            line_x = cx - line_w / 2
            line_y = label_y + li * line_h
            lid = f"{label_id}-{li}" if li > 0 else label_id
            create({
                "id": lid, "type": "text",
                "x": round(line_x, 1), "y": round(line_y, 1),
                "text": line,
                "fontSize": font_size, "fontFamily": "2",
                "strokeColor": text_color,
                "groupIds": [group_id]
            })
    
    bbox = {
        "x": min(icon_x, label_x),
        "y": icon_y,
        "w": component_w,
        "h": total_h,
        "cx": cx, "cy": cy
    }
    
    return {"icon_id": icon_id, "label_id": label_id, "group_id": group_id, "bbox": bbox}


def numbered_circle(prefix, number, cx, cy, size=50):
    """
    Create a dark circle with centered white number, grouped.
    
    Returns:
        dict with keys: bg_id, text_id, group_id, bbox
    """
    bg_id = f"{prefix}-bg"
    text_id = f"{prefix}-tx"
    group_id = f"g-{prefix}"
    
    # Circle
    create({
        "id": bg_id, "type": "ellipse",
        "x": round(cx - size/2), "y": round(cy - size/2),
        "width": size, "height": size,
        "backgroundColor": "#1a1a1a", "strokeColor": "#1a1a1a",
        "strokeWidth": 1, "fillStyle": "solid", "roughness": 0,
        "groupIds": [group_id]
    })
    
    # Number text — initial position, then browser centers it accurately
    create({
        "id": text_id, "type": "text",
        "x": round(cx - 5), "y": round(cy - 11),
        "text": str(number),
        "fontSize": 18, "fontFamily": "2",
        "strokeColor": "#ffffff",
        "groupIds": [group_id]
    })

    # Browser-delegated centering — uses actual rendered text dimensions
    align_in_parent(text_id, bg_id, alignment="center")

    return {
        "bg_id": bg_id, "text_id": text_id, "group_id": group_id,
        "bbox": {"x": cx - size/2, "y": cy - size/2, "w": size, "h": size, "cx": cx, "cy": cy}
    }


def container_box(cid, x, y, w, h, stroke_color, fill_color="transparent",
                   icon_file_id=None, label_text=None, label_color=None,
                   stroke_width=2, stroke_style="solid", corner_radius=0,
                   icon_header_size=None):
    """
    Create a container rectangle with optional header (icon + label in top-left).
    
    Returns:
        dict with keys: box_id, icon_id, label_id, group_id, bbox
    """
    group_id = f"g-{cid}"
    icon_id = None
    label_id = None
    
    # Box
    create({
        "id": cid, "type": "rectangle",
        "x": x, "y": y, "width": w, "height": h,
        "strokeColor": stroke_color,
        "backgroundColor": fill_color,
        "strokeWidth": stroke_width,
        "strokeStyle": stroke_style,
        "roughness": 0,
        "fillStyle": "solid" if fill_color != "transparent" else "hachure",
        "roundness": {"type": 3, "value": corner_radius} if corner_radius else None,
        "groupIds": [group_id]
    })
    
    # Header icon (flush with top-left corner, same size as service icons)
    if icon_file_id:
        icon_id = f"img-{cid}-hdr"
        icon_sz = icon_header_size or 55
        create({
            "id": icon_id, "type": "image",
            "x": x, "y": y,
            "width": icon_sz, "height": icon_sz,
            "fileId": icon_file_id, "status": "saved", "scale": [1, 1],
            "groupIds": [group_id]
        })
    
    # Header label (right of icon)
    if label_text:
        label_id = f"{cid}-lbl"
        icon_sz = icon_header_size or 55
        lx = x + icon_sz + 5 if icon_file_id else x + 10
        ly = y + (icon_sz - 22) / 2 if icon_file_id else y + 8  # vertically center text with icon
        create({
            "id": label_id, "type": "text",
            "x": lx, "y": round(ly, 1),
            "text": label_text,
            "fontSize": 22, "fontFamily": "2",
            "strokeColor": label_color or stroke_color,
            "groupIds": [group_id]
        })
    
    return {
        "box_id": cid, "icon_id": icon_id, "label_id": label_id,
        "group_id": group_id,
        "bbox": {"x": x, "y": y, "w": w, "h": h}
    }


def service_in_container(prefix, file_id, label_text, container_id,
                          icon_size=65, font_size=22):
    """
    Create an icon+label component centered within an existing container.
    
    Reads the container's position and centers the component within it,
    accounting for any header (assumes 45px header height).
    
    Returns:
        dict from icon_label_component
    """
    ctr = get_element(container_id)
    header_h = 60  # space for header icon (55px) + padding
    
    # Content area
    content_x = ctr['x']
    content_y = ctr['y'] + header_h
    content_w = ctr['width']
    content_h = ctr['height'] - header_h
    
    cx = content_x + content_w / 2
    cy = content_y + content_h / 2
    
    return icon_label_component(prefix, file_id, label_text, cx, cy,
                                 icon_size=icon_size, font_size=font_size)


def grid_2x2(prefix, items, container_id, header_h=45, icon_size=55, font_size=22):
    """
    Create a 2x2 grid of icon+label components inside a container.
    
    Args:
        prefix: Prefix for sub-element IDs
        items: List of 4 dicts: [{"file_id", "label", "id_suffix"}, ...]
               Order: top-left, top-right, bottom-left, bottom-right
        container_id: Parent container element ID
        header_h: Height reserved for container header
    
    Returns:
        List of 4 component dicts from icon_label_component
    """
    ctr = get_element(container_id)
    cx = ctr['x']
    cy = ctr['y'] + header_h
    cw = ctr['width']
    ch = ctr['height'] - header_h
    
    cell_w = cw / 2
    cell_h = ch / 2
    
    positions = [
        (0, 0),  # top-left
        (1, 0),  # top-right
        (0, 1),  # bottom-left
        (1, 1),  # bottom-right
    ]
    
    results = []
    for i, (col, row) in enumerate(positions):
        if i >= len(items):
            break
        item = items[i]
        cell_cx = cx + col * cell_w + cell_w / 2
        cell_cy = cy + row * cell_h + cell_h / 2
        
        comp = icon_label_component(
            item["id_suffix"], item["file_id"], item["label"],
            cell_cx, cell_cy,
            icon_size=icon_size, font_size=font_size
        )
        results.append(comp)
    
    return results


def arrow(aid, start_x, start_y, end_x, end_y,
          stroke_color="#1a1a1a", stroke_width=2, stroke_style="solid",
          start_arrowhead=None, end_arrowhead="arrow",
          start_binding=None, end_binding=None,
          waypoints=None, elbowed=False):
    """
    Create an arrow element. Supports multi-point paths via waypoints.

    Args:
        start_x, start_y: start point (absolute coords)
        end_x, end_y: end point (absolute coords)
        waypoints: list of (x, y) absolute coordinates for intermediate points.
                   If provided, creates a multi-segment path:
                   start → waypoint1 → waypoint2 → ... → end
        start_binding, end_binding: dicts with {"elementId", "focus", "gap"} for bound arrows
        elbowed: if True, use Excalidraw's built-in A* elbowed routing

    Returns:
        dict with arrow_id
    """
    if waypoints:
        all_pts = [(start_x, start_y)] + list(waypoints) + [(end_x, end_y)]
        points = [[px - start_x, py - start_y] for px, py in all_pts]
    else:
        points = [[0, 0], [end_x - start_x, end_y - start_y]]

    element = {
        "id": aid, "type": "arrow",
        "x": start_x, "y": start_y,
        "width": abs(end_x - start_x), "height": abs(end_y - start_y),
        "strokeColor": stroke_color,
        "strokeWidth": stroke_width,
        "strokeStyle": stroke_style,
        "roughness": 0,
        "startArrowhead": start_arrowhead,
        "endArrowhead": end_arrowhead,
        "points": points,
    }

    if elbowed:
        element["elbowed"] = True
        element["roundness"] = {"type": 2}

    if start_binding:
        element["startBinding"] = start_binding
    if end_binding:
        element["endBinding"] = end_binding

    create(element)
    return {"arrow_id": aid}


def elbowed_arrow(aid, start_id, end_id, label=None,
                  stroke_color="#1a1a1a", stroke_width=2, stroke_style="solid"):
    """
    Create an arrow between two elements with elbowed flag and bindings.

    WARNING: Excalidraw's elbowed routing is an interactive-only feature.
    When created programmatically, the arrow stores `elbowed: true` but renders
    as a STRAIGHT LINE because the A* routing only triggers during UI interactions
    (drag/move). The flag is preserved for when the user edits the arrow in the UI.

    For programmatic routing, use arrow() with explicit waypoints instead.

    Args:
        aid: arrow element ID
        start_id: source element ID
        end_id: target element ID
        label: optional arrow label text
        stroke_color, stroke_width, stroke_style: styling

    Returns:
        dict with arrow_id
    """
    start_el = get_element(start_id)
    end_el = get_element(end_id)

    sx = start_el['x'] + start_el.get('width', 0) / 2
    sy = start_el['y'] + start_el.get('height', 0) / 2
    ex = end_el['x'] + end_el.get('width', 0) / 2
    ey = end_el['y'] + end_el.get('height', 0) / 2

    element = {
        "id": aid, "type": "arrow",
        "x": sx, "y": sy,
        "points": [[0, 0], [ex - sx, ey - sy]],
        "strokeColor": stroke_color,
        "strokeWidth": stroke_width,
        "strokeStyle": stroke_style,
        "roughness": 0,
        "elbowed": True,
        "roundness": {"type": 2},
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "startBinding": {"elementId": start_id, "focus": 0, "gap": 5, "fixedPoint": None},
        "endBinding": {"elementId": end_id, "focus": 0, "gap": 5, "fixedPoint": None},
    }

    create(element)
    return {"arrow_id": aid}


def validate_arrow_paths(arrow_ids=None, margin=15, skip_text_ids=None):
    """
    Check all arrows for text bounding box overlaps and endpoint accuracy.

    Args:
        arrow_ids: list of arrow IDs to check (None = all arrows)
        margin: minimum pixel distance from text bounding boxes
        skip_text_ids: set of text element IDs to skip overlap checks for
                       (e.g. step circle labels that intentionally sit near arrows)

    Returns:
        list of issue strings (empty = all good)
    """
    elems = get_elements().get('elements', [])
    by_id = {e['id']: e for e in elems}
    texts = [e for e in elems if e['type'] == 'text']
    icons = [e for e in elems if e['type'] == 'image']
    arrows = [e for e in elems if e['type'] == 'arrow']

    if arrow_ids:
        arrows = [a for a in arrows if a['id'] in arrow_ids]

    issues = []

    # Auto-detect step circle text IDs: text elements grouped with an ellipse
    step_circles = set(skip_text_ids or [])
    if not skip_text_ids:
        ellipse_groups = set()
        for e in elems:
            if e['type'] == 'ellipse':
                for gid in e.get('groupIds', []):
                    ellipse_groups.add(gid)
        for e in elems:
            if e['type'] == 'text':
                for gid in e.get('groupIds', []):
                    if gid in ellipse_groups:
                        step_circles.add(e['id'])
                        break
    
    def _get_icon_bbox(e):
        return (e['x'], e['y'], e['x'] + e.get('width', 0), e['y'] + e.get('height', 0))
    
    def _point_near_bbox(px, py, bbox, dist):
        """Check if point is within dist of bbox."""
        bx1, by1, bx2, by2 = bbox
        cx = max(bx1, min(px, bx2))
        cy = max(by1, min(py, by2))
        return (px - cx)**2 + (py - cy)**2 <= dist**2
    
    def _segment_near_bbox(seg, bbox, dist):
        """Check if any point on segment is within dist of bbox."""
        x1, y1, x2, y2 = seg
        # Check endpoints
        if _point_near_bbox(x1, y1, bbox, dist) or _point_near_bbox(x2, y2, bbox, dist):
            return True
        # Check expanded bbox intersection
        bx1, by1, bx2, by2 = bbox
        return _segment_intersects_bbox(seg, (bx1 - dist, by1 - dist, bx2 + dist, by2 + dist))
    
    for a in arrows:
        ox, oy = a['x'], a['y']
        pts = a.get('points', [])
        
        # Get absolute segments
        segments = []
        abs_pts = []
        for p in pts:
            abs_pts.append((ox + p[0], oy + p[1]))
        for i in range(len(abs_pts) - 1):
            segments.append((*abs_pts[i], *abs_pts[i+1]))
        
        # Determine source/target element IDs from arrow position heuristic
        # (first point near source icon, last point near target icon)
        source_icons = set()
        target_icons = set()
        if abs_pts:
            for ic in icons:
                ib = _get_icon_bbox(ic)
                if _point_near_bbox(abs_pts[0][0], abs_pts[0][1], ib, 30):
                    source_icons.add(ic['id'])
                if _point_near_bbox(abs_pts[-1][0], abs_pts[-1][1], ib, 30):
                    target_icons.add(ic['id'])
        
        # CHECK 1: Text overlap
        for t in texts:
            if t['id'] in step_circles:
                continue
            tx, ty = t['x'], t['y']
            tw = t.get('width', 0)
            fs = t.get('fontSize', 20)
            text = t.get('text', '')
            if tw == 0:
                tw = len(text) * fs * 0.6
            th = fs * 1.4 * (text.count('\n') + 1)
            bx1, by1 = tx - margin, ty - margin
            bx2, by2 = tx + tw + margin, ty + th + margin
            for seg in segments:
                if _segment_intersects_bbox(seg, (bx1, by1, bx2, by2)):
                    issues.append(f"TEXT_OVERLAP: {a['id']} crosses text '{text[:30]}' ({t['id']})")
                    break
        
        # CHECK 2: Icon overlap (10px margin, skip source/target)
        for ic_el in icons:
            if ic_el['id'] in source_icons or ic_el['id'] in target_icons:
                continue
            ib = _get_icon_bbox(ic_el)
            for seg in segments:
                if _segment_near_bbox(seg, ib, 10):
                    issues.append(f"ICON_OVERLAP: {a['id']} within 10px of icon {ic_el['id']}")
                    break
        
        # CHECK 3: Orthogonality — every segment must be purely H or V
        for i, seg in enumerate(segments):
            dx = abs(seg[2] - seg[0])
            dy = abs(seg[3] - seg[1])
            if dx > 0.5 and dy > 0.5:
                issues.append(f"DIAGONAL: {a['id']} segment {i} is diagonal: ({seg[0]:.0f},{seg[1]:.0f})→({seg[2]:.0f},{seg[3]:.0f})")
        
        # CHECK 4: Arrowhead gap — endpoint within 15px of any icon bbox
        if abs_pts:
            end_pt = abs_pts[-1]
            for ic_el in icons:
                if ic_el['id'] in target_icons:
                    continue  # Skip target — arrow is supposed to point there
                ib = _get_icon_bbox(ic_el)
                if _point_near_bbox(end_pt[0], end_pt[1], ib, 15):
                    issues.append(f"ARROWHEAD_GAP: {a['id']} endpoint too close to icon {ic_el['id']}")
    
    return issues


def _segment_intersects_bbox(seg, bbox):
    """Check if a line segment intersects a bounding box."""
    x1, y1, x2, y2 = seg
    bx1, by1, bx2, by2 = bbox
    
    def outcode(x, y):
        code = 0
        if x < bx1: code |= 1
        elif x > bx2: code |= 2
        if y < by1: code |= 4
        elif y > by2: code |= 8
        return code
    
    c1, c2 = outcode(x1, y1), outcode(x2, y2)
    if c1 == 0 or c2 == 0:
        return True
    if c1 & c2:
        return False
    
    dx, dy = x2 - x1, y2 - y1
    for ex1, ey1, ex2, ey2 in [(bx1,by1,bx1,by2),(bx2,by1,bx2,by2),
                                 (bx1,by1,bx2,by1),(bx1,by2,bx2,by2)]:
        dex, dey = ex2 - ex1, ey2 - ey1
        denom = dx * dey - dy * dex
        if abs(denom) < 0.001:
            continue
        t = ((ex1 - x1) * dey - (ey1 - y1) * dex) / denom
        u = ((ex1 - x1) * dy - (ey1 - y1) * dx) / denom
        if 0 <= t <= 1 and 0 <= u <= 1:
            return True
    return False


# ─── Icon management ───

ICONS_BASE = os.path.join(REPO_ROOT, "aws-icons-official")

# Configurable icon packs. Each pack maps file_id → relative path from ICONS_BASE.
# Register new packs with register_icon_pack().
ICON_PACKS = {
    "aws": {
        "file-cloud": "Architecture-Group-Icons_01302026/AWS-Cloud-logo_32.svg",
        "file-region": "Architecture-Group-Icons_01302026/Region_32.svg",
        "file-sagemaker": "Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_Amazon-SageMaker_48.svg",
        "file-sagemaker-ai": "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-SageMaker-AI_48.svg",
        "file-iam": "Architecture-Service-Icons_01302026/Arch_Security-Identity/48/Arch_AWS-IAM-Identity-Center_48.svg",
        "file-s3": "Architecture-Service-Icons_01302026/Arch_Storage/48/Arch_Amazon-Simple-Storage-Service_48.svg",
        "file-redshift": "Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_Amazon-Redshift_48.svg",
        "file-glue": "Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_AWS-Glue_48.svg",
        "file-q": "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-Q_48.svg",
        "file-codewhisperer": "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-CodeWhisperer_48.svg",
        "file-user": "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Users_48_Light.svg",
        "file-glue-catalog": "Resource-Icons_01302026/Res_Analytics/Res_AWS-Glue_Data-Catalog_48.svg",
        "file-database": "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Database_48_Light.svg",
        "file-codecommit": "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Git-Repository_48_Light.svg",
        "file-cloud9": "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Source-Code_48_Light.svg",
        "file-sysmgr": "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Toolkit_48_Light.svg",
    },
    # Add more packs here: "gcp": {...}, "azure": {...}
}

# Flat view for backward compatibility
ALL_ICONS = ICON_PACKS.get("aws", {})


def register_icon_pack(name, icons, base_path=None):
    """Register an icon pack. icons: dict of file_id → relative SVG path."""
    ICON_PACKS[name] = icons
    if base_path:
        global ICONS_BASE
        ICONS_BASE = base_path


def upload_icons(pack="aws"):
    """Upload all SVG icons from the specified pack (or all packs if pack='all')."""
    packs = ICON_PACKS if pack == "all" else {pack: ICON_PACKS.get(pack, {})}
    for pack_name, icons in packs.items():
        for fid, rel_path in icons.items():
            full_path = os.path.join(ICONS_BASE, rel_path)
            if os.path.exists(full_path):
                upload_svg(fid, full_path)


def upload_all_icons():
    """Upload all icons from all registered packs. Backward-compatible wrapper."""
    upload_icons("all")


# ─── State management ───

def save_state(filepath=None):
    """Save current canvas state (elements + files) to JSON. Returns the data."""
    data = get_elements()
    if filepath:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    return data


def restore_state(data_or_path):
    """Restore canvas from saved state (dict or JSON file path)."""
    if isinstance(data_or_path, str):
        with open(data_or_path) as f:
            data = json.load(f)
    else:
        data = data_or_path
    clear()
    time.sleep(0.3)
    _post("/elements/sync", {"elements": data.get("elements", data if isinstance(data, list) else [])})


def center_element(child_id, parent_id, axis="both"):
    """Center a child element within a parent element using the server's center endpoint."""
    return _post("/elements/center", {
        "childIds": [child_id],
        "parentId": parent_id,
        "axis": axis
    })


# ─── Verification ───

def verify_component_isolation(component_fn, *args, output_path="component-test.png", **kwargs):
    """
    Test a component in isolation:
    1. Save current state
    2. Clear canvas
    3. Create component
    4. Export screenshot
    5. Restore state

    Returns: (component_result, screenshot_path)
    """
    backup = save_state()
    clear()
    time.sleep(0.3)
    result = component_fn(*args, **kwargs)
    time.sleep(0.5)
    export_screenshot(output_path)
    restore_state(backup)
    return result, output_path


def validate_diagram():
    """
    Check diagram for common issues:
    - Overlapping text/icons
    - Elements too close to container borders
    - Non-black font colors on service labels
    - Ungrouped icon+label pairs
    Returns list of issue strings.
    """
    els = get_elements()['elements']
    issues = []
    el_map = {e['id']: e for e in els}
    
    # Build bounding boxes
    bboxes = {}
    for e in els:
        w = e.get('width', 0)
        h = e.get('height', 0)
        if e['type'] == 'text' and (not w or w == 0):
            tw, th = measure_text(e.get('text', ''), e.get('fontSize', 22))
            w, h = tw, th
        bboxes[e['id']] = {
            'x': e['x'], 'y': e['y'],
            'w': w, 'h': h,
            'r': e['x'] + w, 'b': e['y'] + h
        }
    
    # Find containers
    containers = [e for e in els if e['type'] == 'rectangle' and e.get('width', 0) > 100]
    
    # Check: elements overlapping container borders or too close
    for e in els:
        if e['type'] in ('text', 'image') and e['id'] in bboxes:
            eb = bboxes[e['id']]
            if eb['w'] == 0: continue
            for c in containers:
                if c['id'] == e.get('containerId'): continue
                cb = bboxes.get(c['id'])
                if not cb or cb['w'] == 0: continue
                # Check if element OVERLAPS container border (element partially inside)
                overlaps_x = eb['x'] < cb['r'] and eb['r'] > cb['x']
                overlaps_y = eb['y'] < cb['b'] and eb['b'] > cb['y']
                if overlaps_x and overlaps_y:
                    # Element overlaps with container — check if it's a border crossing
                    inside_x = eb['x'] >= cb['x'] and eb['r'] <= cb['r']
                    inside_y = eb['y'] >= cb['y'] and eb['b'] <= cb['b']
                    if inside_x and inside_y:
                        # Fully inside — check margins
                        margins = {
                            'left': eb['x'] - cb['x'],
                            'right': cb['r'] - eb['r'],
                            'top': eb['y'] - cb['y'],
                            'bottom': cb['b'] - eb['b'],
                        }
                        for side, m in margins.items():
                            if 0 < m < 5:
                                issues.append(f"TIGHT: {e['id']} is {m:.0f}px from {side} of {c['id']}")
                    elif not (eb['r'] < cb['x'] or eb['x'] > cb['r'] or eb['b'] < cb['y'] or eb['y'] > cb['b']):
                        # Partially overlapping a container border
                        # Skip outermost containers (those larger than 80% of canvas)
                        max_w = max((bboxes[cc['id']]['w'] for cc in containers), default=0)
                        if cb['w'] < max_w * 0.8:
                            issues.append(f"BORDER: {e['id']} crosses border of {c['id']}")
    
    # Check: overlapping text elements
    texts = [e for e in els if e['type'] == 'text']
    for i, t1 in enumerate(texts):
        b1 = bboxes[t1['id']]
        for t2 in texts[i+1:]:
            b2 = bboxes[t2['id']]
            # Check overlap
            if (b1['x'] < b2['r'] and b1['r'] > b2['x'] and
                b1['y'] < b2['b'] and b1['b'] > b2['y']):
                issues.append(f"OVERLAP: '{t1.get('text','')}' overlaps '{t2.get('text','')}'")
    
    # Check: non-standard font colors on service labels
    # Container header labels may use the container's stroke color — that's OK.
    # Service labels (icon+label components) should be black/dark.
    container_label_ids = {f"{c['id']}-lbl" for c in containers}
    for e in els:
        if e['type'] == 'text':
            color = e.get('strokeColor', '#000000')
            if color not in ('#000000', '#1a1a1a', '#ffffff'):
                if e['id'] not in container_label_ids:
                    issues.append(f"COLOR: {e['id']} has non-black color {color}")
    
    return issues


if __name__ == "__main__":
    print("Components library loaded. Use: from components import *")
    print(f"Icons base: {ICONS_BASE}")
    print(f"API: {API}")
