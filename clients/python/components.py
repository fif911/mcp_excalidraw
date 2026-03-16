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


# ─── LOCKED DIAGRAM CONSTANTS ───
# Enforced in all component functions. Build scripts cannot override these.
ICON_SIZE = 65    # ALL icons — service AND header — no exceptions
FONT_SIZE = 24    # ALL text — headers, labels, circles — no exceptions
HEADER_HEIGHT = 75  # ICON_SIZE + 10px padding — all container headers


# ─── REUSABLE COMPONENTS ───

def icon_label_component(prefix, file_id, label_text, cx, cy,
                          gap=8, text_color="#000000", label_width=None,
                          icon_bg_color=None, icon_bg_padding=6,
                          font_family="2"):
    """
    Create an icon centered above a label, grouped.

    Icon size and font size are locked to ICON_SIZE (65) and FONT_SIZE (24).
    These cannot be overridden — all icons and text must be uniform.

    Args:
        prefix: Unique prefix for element IDs
        file_id: Uploaded SVG file ID
        label_text: Label text (can contain \\n for multi-line).
                    Pass None or "" to skip label — icon centers directly at cy.
        cx, cy: CENTER position of the entire component (icon + gap + label)
        gap: Pixels between icon bottom and text top
        text_color: Label color
        label_width: Explicit label width (default: max(ICON_SIZE + 60, 140))
        icon_bg_color: Optional background color for a rounded rect behind the icon
        icon_bg_padding: Padding around icon for the background rect (default 6)
        font_family: Font family string (default "2" = Helvetica)

    Returns:
        dict with keys: icon_id, icon_bg_id, label_id (None if no label),
        group_id, bbox (includes icon_cx, icon_cy = actual image center)
    """
    icon_size = ICON_SIZE
    font_size = FONT_SIZE
    icon_id = f"img-{prefix}"
    icon_bg_id = f"{prefix}-ibg" if icon_bg_color else None
    label_id = f"{prefix}-lbl"
    group_id = f"g-{prefix}"

    has_label = bool(label_text and label_text.strip())

    if has_label:
        # Get accurate text dimensions from server
        text_w, text_h = measure_text(label_text, font_size)
        total_h = icon_size + gap + text_h
        component_w = max(icon_size, text_w)
        # Position: center icon+gap+label at (cx, cy)
        icon_x = cx - icon_size / 2
        icon_y = cy - total_h / 2
        label_x = cx - text_w / 2
        label_y = icon_y + icon_size + gap
    else:
        # No label — icon centered directly at (cx, cy)
        text_w, text_h = 0, 0
        total_h = icon_size
        component_w = icon_size
        icon_x = cx - icon_size / 2
        icon_y = cy - icon_size / 2
        label_x = 0
        label_y = 0

    # Icon background (created BEFORE icon for z-order)
    if icon_bg_color:
        bg_size = icon_size + 2 * icon_bg_padding
        create({
            "id": icon_bg_id, "type": "rectangle",
            "x": round(cx - bg_size / 2, 1), "y": round(icon_y - icon_bg_padding, 1),
            "width": bg_size, "height": bg_size,
            "backgroundColor": icon_bg_color, "strokeColor": "transparent",
            "fillStyle": "solid", "roughness": 0, "strokeWidth": 0,
            "roundness": {"type": 3, "value": 8},
            "groupIds": [group_id]
        })

    # Create icon
    create({
        "id": icon_id, "type": "image",
        "x": round(icon_x, 1), "y": round(icon_y, 1),
        "width": icon_size, "height": icon_size,
        "fileId": file_id, "status": "saved", "scale": [1, 1],
        "strokeWidth": 0,
        "groupIds": [group_id]
    })

    # Create label — only if there is text
    if has_label:
        lines = label_text.split('\n')
        line_h = font_size * 1.25

        if len(lines) == 1:
            create({
                "id": label_id, "type": "text",
                "x": round(label_x, 1), "y": round(label_y, 1),
                "text": label_text,
                "fontSize": font_size, "fontFamily": font_family,
                "strokeColor": text_color,
                "groupIds": [group_id]
            })
        else:
            for li, line in enumerate(lines):
                line_w = measure_text(line, font_size)[0]
                line_x = cx - line_w / 2
                line_y = label_y + li * line_h
                lid = f"{label_id}-{li}" if li > 0 else label_id
                create({
                    "id": lid, "type": "text",
                    "x": round(line_x, 1), "y": round(line_y, 1),
                    "text": line,
                    "fontSize": font_size, "fontFamily": font_family,
                    "strokeColor": text_color,
                    "groupIds": [group_id]
                })

    # Actual icon center (differs from cy when label is present)
    icon_cx = cx
    icon_cy = icon_y + icon_size / 2

    bbox = {
        "x": min(icon_x, label_x) if has_label else icon_x,
        "y": icon_y,
        "w": component_w,
        "h": total_h,
        "cx": cx, "cy": cy,
        "icon_cx": icon_cx, "icon_cy": icon_cy,
    }

    return {"icon_id": icon_id, "icon_bg_id": icon_bg_id,
            "label_id": label_id if has_label else None,
            "group_id": group_id, "bbox": bbox}


def numbered_circle(prefix, number, cx, cy, size=50,
                    bg_color="#1a1a1a", text_color="#ffffff",
                    shape="circle"):
    """
    Create a colored shape with centered number, grouped.

    Font size is locked to FONT_SIZE (24). Cannot be overridden.
    Centering is computed from measure_text (width) and font_size * 1.25
    (height). Do NOT use align_in_parent — it worsens centering.

    Shapes: "circle" (ellipse), "square" (sharp corners), "rounded" (rounded
    rectangle), "diamond" (rotated square).

    Returns:
        dict with keys: bg_id, text_id, group_id, bbox
    """
    font_size = FONT_SIZE
    bg_id = f"{prefix}-bg"
    text_id = f"{prefix}-tx"
    group_id = f"g-{prefix}"

    if shape == "circle":
        el_type = "ellipse"
        roundness = None
    elif shape == "square":
        el_type = "rectangle"
        roundness = None
    elif shape == "rounded":
        el_type = "rectangle"
        roundness = {"type": 3, "value": round(size * 0.3)}
    elif shape == "diamond":
        el_type = "diamond"
        roundness = None
    else:
        raise ValueError(f"Unknown shape '{shape}'. Use: circle, square, rounded, diamond")

    bg_props = {
        "id": bg_id, "type": el_type,
        "x": cx - size / 2, "y": cy - size / 2,
        "width": size, "height": size,
        "backgroundColor": bg_color, "strokeColor": "transparent",
        "strokeWidth": 0, "fillStyle": "solid", "roughness": 0,
        "groupIds": [group_id]
    }
    if roundness is not None:
        bg_props["roundness"] = roundness

    create(bg_props)

    txt = str(number)
    tw, th = measure_text(txt, font_size)
    if th <= 0:
        th = font_size * 1.25

    create({
        "id": text_id, "type": "text",
        "x": cx - tw / 2, "y": cy - th / 2,
        "text": txt,
        "fontSize": font_size, "fontFamily": "2",
        "textAlign": "center",
        "strokeColor": text_color,
        "groupIds": [group_id]
    })

    return {
        "bg_id": bg_id, "text_id": text_id, "group_id": group_id,
        "bbox": {"x": cx - size/2, "y": cy - size/2, "w": size, "h": size, "cx": cx, "cy": cy}
    }


def center_all_badge_texts():
    """
    Re-center all numbered badge texts using browser-rendered dimensions.

    Call ONCE after the full build is complete and the browser has rendered
    all elements. Finds all ellipse/rectangle badge backgrounds (id ending
    in '-bg') and their paired text elements ('-tx'), then uses
    align_in_parent for pixel-perfect centering.
    """
    import time
    time.sleep(0.5)  # let browser finish rendering
    els = get_elements().get('elements', [])
    pairs = []
    el_map = {e['id']: e for e in els}
    for e in els:
        if e['id'].endswith('-bg') and e['type'] in ('ellipse', 'rectangle', 'diamond'):
            tx_id = e['id'][:-3] + '-tx'
            if tx_id in el_map:
                pairs.append((tx_id, e['id']))
    for tx_id, bg_id in pairs:
        try:
            align_in_parent(tx_id, bg_id, alignment="center")
        except Exception:
            pass
    if pairs:
        print(f"  Re-centered {len(pairs)} badge texts via browser alignment")


def container_box(cid, x, y, w, h, stroke_color, fill_color="transparent",
                   icon_file_id=None, label_text=None, label_color=None,
                   stroke_width=2, stroke_style="solid", corner_radius=0,
                   header_bg_color=None, header_height=None,
                   header_fill=True):
    """
    Create a container rectangle with optional header (icon + label in top-left).

    Icon header size and label font size are locked to ICON_SIZE (65) and
    FONT_SIZE (24). Header height is locked to HEADER_HEIGHT (75).
    These cannot be overridden.

    Args:
        header_bg_color: Optional colored bar spanning full width at top
        header_height: IGNORED — kept for backward compat, locked to HEADER_HEIGHT
        header_fill: If False, skip drawing the header background even if header_bg_color is set

    Returns:
        dict with keys: box_id, header_bg_id, icon_id, label_id, group_id, bbox
    """
    group_id = f"g-{cid}"
    icon_id = None
    label_id = None
    header_bg_id = None

    icon_sz = ICON_SIZE
    label_font_size = FONT_SIZE

    # Auto-expand width to fit header text on one line
    if label_text:
        text_w, _ = measure_text(label_text, label_font_size)
        min_w = (icon_sz + 5 + text_w + 20) if icon_file_id else (10 + text_w + 20)
        w = max(w, min_w)

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

    # Header background bar (created BEFORE icon/label for z-order)
    if header_bg_color and header_fill:
        hdr_h = HEADER_HEIGHT
        header_bg_id = f"{cid}-hdr-bg"
        create({
            "id": header_bg_id, "type": "rectangle",
            "x": x, "y": y, "width": w, "height": hdr_h,
            "backgroundColor": header_bg_color, "strokeColor": header_bg_color,
            "fillStyle": "solid", "roughness": 0, "strokeWidth": 0,
            "groupIds": [group_id]
        })

    # Header icon (flush with top-left corner)
    if icon_file_id:
        icon_id = f"img-{cid}-hdr"
        create({
            "id": icon_id, "type": "image",
            "x": x, "y": y,
            "width": icon_sz, "height": icon_sz,
            "fileId": icon_file_id, "status": "saved", "scale": [1, 1],
            "strokeWidth": 0,
            "groupIds": [group_id]
        })

    # Header label — right of icon, or centered horizontally when no icon
    if label_text:
        label_id = f"{cid}-lbl"
        text_w, text_h = measure_text(label_text, label_font_size)
        if icon_file_id:
            lx = x + icon_sz + 5
            center_h = HEADER_HEIGHT
            # Align text visual center with icon center.
            # Text bounding box includes line-height padding below baseline,
            # so geometric center sits lower than visual glyph center.
            # Shift up by ~10% of font size to compensate.
            ly = y + (center_h - text_h) / 2 - label_font_size * 0.1
        else:
            lx = x + (w - text_w) / 2   # centered horizontally
            ly = y + 8
        create({
            "id": label_id, "type": "text",
            "x": lx, "y": round(ly, 1),
            "text": label_text,
            "fontSize": label_font_size, "fontFamily": "2",
            "strokeColor": label_color or stroke_color,
            "groupIds": [group_id]
        })

    return {
        "box_id": cid, "header_bg_id": header_bg_id, "icon_id": icon_id,
        "label_id": label_id, "group_id": group_id,
        "bbox": {"x": x, "y": y, "w": w, "h": h}
    }


def service_in_container(prefix, file_id, label_text, container_id,
                          text_color="#000000", icon_bg_color=None):
    """
    Create an icon+label component centered within an existing container.

    Reads the container's position and centers the component within it,
    accounting for any header (assumes ICON_SIZE header height).

    Returns:
        dict from icon_label_component
    """
    ctr = get_element(container_id)
    header_h = HEADER_HEIGHT  # locked constant

    # Content area
    content_x = ctr['x']
    content_y = ctr['y'] + header_h
    content_w = ctr['width']
    content_h = ctr['height'] - header_h

    cx = content_x + content_w / 2
    cy = content_y + content_h / 2

    return icon_label_component(prefix, file_id, label_text, cx, cy,
                                 text_color=text_color, icon_bg_color=icon_bg_color)


def grid_2x2(prefix, items, container_id, header_h=45,
             icon_bg_color=None):
    """
    Create a 2x2 grid of icon+label components inside a container.

    Args:
        prefix: Prefix for sub-element IDs
        items: List of 4 dicts: [{"file_id", "label", "id_suffix"}, ...]
               Order: top-left, top-right, bottom-left, bottom-right
               Items can optionally include "icon_bg_color" and "text_color" keys.
        container_id: Parent container element ID
        header_h: Height reserved for container header
        icon_bg_color: Default icon background color for all items (overridden per-item)

    Returns:
        List of 4 component dicts from icon_label_component
    """
    header_h = HEADER_HEIGHT  # locked — param ignored
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
            icon_bg_color=item.get("icon_bg_color", icon_bg_color),
            text_color=item.get("text_color", "#000000"),
        )
        results.append(comp)

    return results


def vertical_stack(items, cx, start_y, spacing=25,
                   gap=8, font_family="2",
                   text_color="#1a1a1a",
                   arrows=False, arrow_color="#1a1a1a", arrow_width=2,
                   arrow_direction="up"):
    """
    Stack icon+label components vertically with consistent spacing and optional
    connecting arrows centered between them.

    Calculates each component's rendered height so the next component starts
    exactly `spacing` pixels below the previous one's bounding box.

    Args:
        items: list of dicts, each with keys:
               - "prefix": unique ID prefix
               - "file_id": uploaded SVG file ID
               - "label": label text (can contain \\n)
        cx: X center for all components (vertical alignment)
        start_y: Y center of the FIRST component
        spacing: pixels between bottom of one component bbox and top of next
        gap: passed to icon_label_component
        text_color: label color
        arrows: if True, draw vertical arrows between consecutive items
        arrow_color, arrow_width: arrow styling
        arrow_direction: "up" (arrows point upward) or "down" (arrows point downward)

    Returns:
        dict with:
          - "components": list of icon_label_component results
          - "arrows": list of arrow dicts (if arrows=True)
          - "total_height": total height from first icon top to last label bottom
    """
    components = []
    arrow_results = []
    current_cy = start_y

    for i, item in enumerate(items):
        comp = icon_label_component(
            item["prefix"], item["file_id"], item["label"],
            cx=cx, cy=current_cy,
            gap=gap,
            text_color=text_color, font_family=font_family,
        )
        components.append(comp)

        # Calculate the bottom of this component's bounding box
        bbox = comp["bbox"]
        comp_bottom = bbox["y"] + bbox["h"]

        # Draw arrow from previous component to this one
        if arrows and i > 0:
            prev_bbox = components[i - 1]["bbox"]
            prev_bottom = prev_bbox["y"] + prev_bbox["h"]
            this_top = bbox["y"]

            arrow_y1 = prev_bottom + 3
            arrow_y2 = this_top - 3
            aid = f"a-stack-{items[i-1]['prefix']}-{item['prefix']}"

            if arrow_direction == "up":
                arrow(aid, cx, arrow_y2, cx, arrow_y1,
                      stroke_color=arrow_color, stroke_width=arrow_width)
            else:
                arrow(aid, cx, arrow_y1, cx, arrow_y2,
                      stroke_color=arrow_color, stroke_width=arrow_width)
            arrow_results.append({"arrow_id": aid})

        # Next component center: bottom + spacing + half of next component height
        # We estimate next height same as current (will be corrected when created)
        if i < len(items) - 1:
            next_label = items[i + 1]["label"]
            next_text_h = estimate_text_height(next_label, FONT_SIZE)
            next_total_h = ICON_SIZE + gap + next_text_h
            current_cy = comp_bottom + spacing + next_total_h / 2

    first_top = components[0]["bbox"]["y"]
    last_bottom = components[-1]["bbox"]["y"] + components[-1]["bbox"]["h"]

    return {
        "components": components,
        "arrows": arrow_results,
        "total_height": last_bottom - first_top,
    }


def text_box(prefix, text, cx, cy,
             width=None, height=None, min_width=0, max_height=0, padding=12,
             font_family="2",
             text_color="#1a1a1a", stroke_color="#1a1a1a",
             fill_color="transparent", stroke_width=1,
             corner_radius=8):
    """
    Create a bordered rectangle with centered text (no icon).

    Used for workflow step labels like "extract text", "describe face", etc.
    Auto-sizes from text if width/height not provided.

    Args:
        min_width: Minimum box width — ensures consistent sizing across text boxes
        max_height: Maximum box height — caps the height for uniform rows

    Returns:
        dict with keys: box_id, text_id, group_id, bbox
    """
    font_size = FONT_SIZE
    box_id = f"{prefix}-box"
    text_id = f"{prefix}-tx"
    group_id = f"g-{prefix}"

    tw, th = measure_text(text, font_size)
    w = max(width or (tw + 2 * padding), min_width)
    h = height or (th + 2 * padding)
    if max_height:
        h = min(h, max_height)

    # Rectangle
    create({
        "id": box_id, "type": "rectangle",
        "x": round(cx - w / 2), "y": round(cy - h / 2),
        "width": w, "height": h,
        "strokeColor": stroke_color,
        "backgroundColor": fill_color,
        "strokeWidth": stroke_width,
        "roughness": 0,
        "fillStyle": "solid" if fill_color != "transparent" else "hachure",
        "roundness": {"type": 3, "value": corner_radius} if corner_radius else None,
        "groupIds": [group_id]
    })

    # Text — initial position, then browser centers it
    create({
        "id": text_id, "type": "text",
        "x": round(cx - tw / 2), "y": round(cy - th / 2),
        "text": text,
        "fontSize": font_size, "fontFamily": font_family,
        "strokeColor": text_color,
        "groupIds": [group_id]
    })

    align_in_parent(text_id, box_id, alignment="center")

    bbox = {"x": cx - w / 2, "y": cy - h / 2, "w": w, "h": h, "cx": cx, "cy": cy}
    return {"box_id": box_id, "text_id": text_id, "group_id": group_id, "bbox": bbox}


def _path_midpoint(all_points):
    """
    Find the midpoint along a polyline path and the segment direction there.

    Args:
        all_points: list of (x, y) tuples — absolute coordinates

    Returns:
        (mx, my, seg_dx, seg_dy) — midpoint coords and segment direction vector
    """
    total_len = 0
    segments = []
    for i in range(len(all_points) - 1):
        x1, y1 = all_points[i]
        x2, y2 = all_points[i + 1]
        seg_len = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
        segments.append((x1, y1, x2, y2, seg_len))
        total_len += seg_len

    if total_len == 0:
        return all_points[0][0], all_points[0][1], 1, 0

    half = total_len / 2
    walked = 0
    for x1, y1, x2, y2, seg_len in segments:
        if walked + seg_len >= half:
            remain = half - walked
            t = remain / seg_len if seg_len > 0 else 0.5
            return (x1 + t * (x2 - x1),
                    y1 + t * (y2 - y1),
                    x2 - x1, y2 - y1)
        walked += seg_len

    # Fallback
    return all_points[-1][0], all_points[-1][1], 0, -1


def _perp_offset(seg_dx, seg_dy, offset):
    """
    Compute a perpendicular offset from a segment direction vector.

    Convention:
      - Horizontal segments → offset upward (negative Y)
      - Vertical segments   → offset rightward (positive X)

    Returns:
        (off_x, off_y) — the offset vector to add to the midpoint
    """
    seg_len = (seg_dx ** 2 + seg_dy ** 2) ** 0.5
    if seg_len > 0:
        perp_x = -seg_dy / seg_len
        perp_y = seg_dx / seg_len
        if abs(seg_dx) >= abs(seg_dy):
            if perp_y > 0:
                perp_x, perp_y = -perp_x, -perp_y
        else:
            if perp_x < 0:
                perp_x, perp_y = -perp_x, -perp_y
    else:
        perp_x, perp_y = 0, -1
    return perp_x * offset, perp_y * offset


def _build_segments(all_pts):
    """
    Build a list of segment info dicts from an ordered list of absolute points.

    Returns:
        list of dicts: {index, start, end, dx, dy, length, orientation, midpoint}
    """
    segments = []
    for i in range(len(all_pts) - 1):
        x1, y1 = all_pts[i]
        x2, y2 = all_pts[i + 1]
        dx = x2 - x1
        dy = y2 - y1
        seg_len = (dx ** 2 + dy ** 2) ** 0.5
        orientation = "horizontal" if abs(dx) >= abs(dy) else "vertical"
        segments.append({
            "index": i,
            "start": (x1, y1), "end": (x2, y2),
            "dx": dx, "dy": dy,
            "length": round(seg_len, 1),
            "orientation": orientation,
            "midpoint": (round((x1 + x2) / 2, 1), round((y1 + y2) / 2, 1)),
        })
    return segments


def arrow_style(stroke_color="#1a1a1a", stroke_width=2, stroke_style="solid",
                label_bg="#1a1a1a", label_text_color="#ffffff",
                label_size=36, label_shape="circle"):
    """
    Create a reusable arrow style dict.

    Define once as a global constant in each build script, then unpack into
    every arrow() call with **ARROW_STYLE to guarantee uniform appearance.

    label_font_size is locked to FONT_SIZE (24) and cannot be overridden.

    Returns dict with keys matching arrow() keyword arguments.
    """
    return {
        "stroke_color": stroke_color,
        "stroke_width": stroke_width,
        "stroke_style": stroke_style,
        "label_bg": label_bg,
        "label_text_color": label_text_color,
        "label_size": label_size,
        "label_shape": label_shape,
    }


def arrow(aid, start_x, start_y, end_x, end_y,
          stroke_color="#1a1a1a", stroke_width=2, stroke_style="solid",
          start_arrowhead=None, end_arrowhead="arrow",
          start_binding=None, end_binding=None,
          waypoints=None, elbowed=False,
          label_number=None, label_bg="#1a1a1a", label_text_color="#ffffff",
          label_size=36, label_offset=None,
          label_shape="circle",
          label_segment=None, label_cx=None, label_cy=None):
    """
    Create an arrow element with optional numbered label.

    Supports straight, L-shaped, U-shaped, and multi-segment paths via waypoints.
    The label is a numbered circle placed at the arrow's midpoint, on a specific
    segment, or at a manually overridden position.

    IMPORTANT: Use arrow_style() to define a single ARROW_STYLE dict, then unpack
    it into every arrow() call with **ARROW_STYLE. This guarantees all arrows share
    identical stroke_color, stroke_width, stroke_style, label_bg, label_text_color,
    label_size, and label_shape. Per-arrow overrides (start_arrowhead,
    end_arrowhead, waypoints, label_number, etc.) are passed directly.

    Base arrow args:
        start_x, start_y: start point (absolute coords)
        end_x, end_y: end point (absolute coords)
        waypoints: list of (x, y) absolute coordinates for intermediate points.
                   Creates a multi-segment path: start → wp1 → wp2 → ... → end
        start_binding, end_binding: dicts with {"elementId", "focus", "gap"}
        elbowed: if True, use Excalidraw's built-in A* elbowed routing

    Label args (set label_number to enable):
        label_number: number to display (None = no label)
        label_bg: background color of the circle
        label_text_color: text color for the number
        label_size: circle diameter (default 36)
        (label font size is locked to FONT_SIZE)
        label_offset: perpendicular offset from arrow in px.
                      None = auto (label_size/2 + 5). Positive = above/right.
        label_shape: "circle", "square", "rounded", or "diamond"

    Label positioning (evaluated in priority order):
        label_cx, label_cy: Manual override — use only when auto-position causes
                            overlap or the reference image shows non-centered placement.
                            Both must be set; partial override is not supported.
        label_segment: 0-based segment index for multi-segment arrows.
                       Supports negative indexing (-1 = last segment).
                       Segments: 0 = start→wp[0], 1 = wp[0]→wp[1], ..., -1 = wp[-1]→end.
                       The label is centered on that segment's midpoint.
        (default): Centers label at the 50% distance point along the full path.

    Returns:
        dict with:
          arrow_id: element ID of the arrow
          label: {prefix, cx, cy, number, segment} or None
          segments: list of segment info dicts (index, start, end, length, orientation, midpoint)
    """
    if waypoints:
        all_pts = [(start_x, start_y)] + list(waypoints) + [(end_x, end_y)]
    else:
        all_pts = [(start_x, start_y), (end_x, end_y)]

    # Collapse degenerate segments (length < 3px) to prevent missing arrowheads.
    # A zero-length last segment means Excalidraw can't determine arrowhead direction.
    cleaned = [all_pts[0]]
    for pt in all_pts[1:]:
        prev = cleaned[-1]
        dx = pt[0] - prev[0]
        dy = pt[1] - prev[1]
        if (dx * dx + dy * dy) >= 9:  # >= 3px
            cleaned.append(pt)
        else:
            print(f"  NOTE: collapsed degenerate segment at ({pt[0]:.0f}, {pt[1]:.0f})")
    if len(cleaned) < 2:
        cleaned = all_pts  # fallback — keep original
    all_pts = cleaned

    points = [[px - all_pts[0][0], py - all_pts[0][1]] for px, py in all_pts]

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

    # Compute segment breakdown
    segments = _build_segments(all_pts)

    # Optional label (numbered circle)
    label_info = None
    if label_number is not None:
        if label_offset is None:
            label_offset = label_size / 2 + 5

        resolved_seg_idx = None

        # Priority 1: manual override
        if label_cx is not None and label_cy is not None:
            cx, cy = label_cx, label_cy
        # Priority 2: specific segment
        elif label_segment is not None:
            n_seg = len(segments)
            idx = label_segment
            if idx < 0:
                idx = n_seg + idx
            if idx < 0 or idx >= n_seg:
                print(f"WARNING: label_segment={label_segment} out of range "
                      f"for {n_seg} segments, clamping")
                idx = max(0, min(idx, n_seg - 1))
            resolved_seg_idx = idx
            seg = segments[idx]
            mx, my = seg["midpoint"]
            if seg["length"] < label_size:
                print(f"WARNING: segment {idx} length ({seg['length']}px) < "
                      f"label diameter ({label_size}px)")
            off_x, off_y = _perp_offset(seg["dx"], seg["dy"], label_offset)
            cx = mx + off_x
            cy = my + off_y
        # Priority 3: full path midpoint (default)
        else:
            mx, my, seg_dx, seg_dy = _path_midpoint(all_pts)
            off_x, off_y = _perp_offset(seg_dx, seg_dy, label_offset)
            cx = mx + off_x
            cy = my + off_y

        label_prefix = f"{aid}-lbl"
        numbered_circle(label_prefix, label_number, cx=round(cx), cy=round(cy),
                        size=label_size, bg_color=label_bg,
                        text_color=label_text_color,
                        shape=label_shape)
        label_info = {"prefix": label_prefix, "cx": round(cx), "cy": round(cy),
                      "number": label_number, "segment": resolved_seg_idx}

    return {"arrow_id": aid, "label": label_info, "segments": segments}


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


def arrow_label(arrow_id, text, text_color="#1a1a1a",
                offset_x=0, offset_y=-14, font_family="2"):
    """
    Place a text annotation near an arrow's midpoint.

    Args:
        arrow_id: ID of an existing arrow element
        text: Label text
        offset_x, offset_y: Offset from midpoint (default: slightly above)

    Returns:
        dict with label_id
    """
    font_size = FONT_SIZE
    a = get_element(arrow_id)
    pts = a.get("points", [[0, 0], [0, 0]])
    ax, ay = a["x"], a["y"]

    # Find midpoint of the points array
    mid_idx = len(pts) // 2
    if len(pts) % 2 == 0:
        # Average of the two middle points
        p1 = pts[mid_idx - 1]
        p2 = pts[mid_idx]
        mx = ax + (p1[0] + p2[0]) / 2
        my = ay + (p1[1] + p2[1]) / 2
    else:
        mx = ax + pts[mid_idx][0]
        my = ay + pts[mid_idx][1]

    tw, th = measure_text(text, font_size)
    label_id = f"{arrow_id}-lbl"

    create({
        "id": label_id, "type": "text",
        "x": round(mx - tw / 2 + offset_x),
        "y": round(my - th / 2 + offset_y),
        "text": text,
        "fontSize": font_size, "fontFamily": font_family,
        "strokeColor": text_color,
    })

    return {"label_id": label_id}


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

ICONS_BASE = os.path.join(REPO_ROOT, "icons")

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


# ─── Container auto-sizing ───

def fit_container(container_id, child_ids=None, padding=20, header_height=None,
                  min_width=0, min_height=0):
    """
    Auto-resize a container to fit all its children with padding.

    Reads the actual rendered positions of child elements from the canvas,
    computes their bounding box, and expands the container to fit them.
    Only GROWS the container — never shrinks below current size or min_width/min_height.

    Args:
        container_id: ID of the container rectangle element
        child_ids: list of child element IDs to fit. If None, uses all elements
                   whose groupIds overlap with elements inside the container's bbox.
        padding: minimum pixels of clearance between children and container edges
        header_height: pixels reserved for the container header (icon + label).
                       If None, auto-detects from existing header elements.
        min_width: minimum container width (never shrinks below this)
        min_height: minimum container height (never shrinks below this)

    Returns:
        dict with keys: container_id, old_bbox, new_bbox, grew (bool)
    """
    ctr = get_element(container_id)
    old_x, old_y = ctr['x'], ctr['y']
    old_w, old_h = ctr.get('width', 0), ctr.get('height', 0)

    # Auto-detect header height from header elements in the same group
    if header_height is None:
        header_height = 0
        group_id = f"g-{container_id}"
        all_els = get_elements().get('elements', [])
        for e in all_els:
            if group_id in e.get('groupIds', []) and e['id'] != container_id:
                # Header elements sit at y == container y
                el_bottom = e['y'] + e.get('height', 0)
                if abs(e['y'] - old_y) < 5:
                    header_height = max(header_height, el_bottom - old_y)

    # Collect child bounding boxes
    if child_ids is None:
        # Find leaf elements (text, image, ellipse) geometrically inside the container.
        # Excludes: arrows, other containers, and the container's own header elements.
        all_els = get_elements().get('elements', [])

        # Build set of the container's own group members (header icon, label, bg)
        container_group = f"g-{container_id}"
        own_group_ids = {container_id}
        for e in all_els:
            if container_group in e.get('groupIds', []):
                own_group_ids.add(e['id'])

        child_ids = []
        for e in all_els:
            if e['id'] in own_group_ids:
                continue
            # Skip arrows — they span across containers
            if e['type'] == 'arrow':
                continue
            # Skip large rectangles (other containers)
            if e['type'] == 'rectangle' and e.get('width', 0) > 80 and e.get('height', 0) > 60:
                continue
            ex, ey = e['x'], e['y']
            ew = e.get('width', 0)
            eh = e.get('height', 0)
            # Text elements may not have width set — estimate
            if e['type'] == 'text' and (not ew or ew == 0):
                ew, eh = measure_text(e.get('text', ''), e.get('fontSize', 22))
            # Check if element center is inside container
            ecx = ex + ew / 2
            ecy = ey + eh / 2
            if (old_x < ecx < old_x + old_w and old_y < ecy < old_y + old_h):
                child_ids.append(e['id'])

    if not child_ids:
        return {"container_id": container_id,
                "old_bbox": {"x": old_x, "y": old_y, "w": old_w, "h": old_h},
                "new_bbox": {"x": old_x, "y": old_y, "w": old_w, "h": old_h},
                "grew": False}

    # Compute children bounding box
    all_els = get_elements().get('elements', [])
    by_id = {e['id']: e for e in all_els}

    min_x = float('inf')
    min_y = float('inf')
    max_x = float('-inf')
    max_y = float('-inf')

    for cid in child_ids:
        e = by_id.get(cid)
        if not e:
            continue
        ex, ey = e['x'], e['y']
        ew = e.get('width', 0)
        eh = e.get('height', 0)
        if e['type'] == 'text' and (not ew or ew == 0):
            ew, eh = measure_text(e.get('text', ''), e.get('fontSize', 22))
        min_x = min(min_x, ex)
        min_y = min(min_y, ey)
        max_x = max(max_x, ex + ew)
        max_y = max(max_y, ey + eh)

    # Required container bounds
    req_x = min_x - padding
    req_y = min(old_y, min_y - padding - header_height)  # preserve header
    req_right = max_x + padding
    req_bottom = max_y + padding

    # Only grow, never shrink
    new_x = min(old_x, req_x)
    new_y = min(old_y, req_y)
    new_right = max(old_x + old_w, req_right)
    new_bottom = max(old_y + old_h, req_bottom)
    new_w = max(new_right - new_x, min_width)
    new_h = max(new_bottom - new_y, min_height)

    grew = (new_x != old_x or new_y != old_y or new_w != old_w or new_h != old_h)

    if grew:
        update(container_id, {
            "x": round(new_x, 1),
            "y": round(new_y, 1),
            "width": round(new_w, 1),
            "height": round(new_h, 1),
        })

        # Re-pin header elements (icon, label, header bg) to the new top-left.
        # Header elements are in the container's group but are NOT the box itself.
        # When the container grows left/up (x/y decrease), header must follow.
        dx = new_x - old_x
        dy = new_y - old_y
        if dx != 0 or dy != 0:
            container_group = f"g-{container_id}"
            all_els = get_elements().get('elements', [])
            for e in all_els:
                if e['id'] == container_id:
                    continue
                if container_group in e.get('groupIds', []):
                    update(e['id'], {
                        "x": round(e['x'] + dx, 1),
                        "y": round(e['y'] + dy, 1),
                    })

    return {
        "container_id": container_id,
        "old_bbox": {"x": old_x, "y": old_y, "w": old_w, "h": old_h},
        "new_bbox": {"x": new_x, "y": new_y, "w": new_w, "h": new_h},
        "grew": grew,
    }


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
    
    # Check: container border overlap — nested containers must have clearance
    MIN_CONTAINER_GAP = 15  # minimum px between nested container borders
    for i, c1 in enumerate(containers):
        b1 = bboxes.get(c1['id'])
        if not b1 or b1['w'] == 0:
            continue
        for c2 in containers[i+1:]:
            b2 = bboxes.get(c2['id'])
            if not b2 or b2['w'] == 0:
                continue
            # Check if one contains the other (parent-child)
            c1_contains_c2 = (b1['x'] <= b2['x'] and b1['y'] <= b2['y'] and
                              b1['r'] >= b2['r'] and b1['b'] >= b2['b'])
            c2_contains_c1 = (b2['x'] <= b1['x'] and b2['y'] <= b1['y'] and
                              b2['r'] >= b1['r'] and b2['b'] >= b1['b'])
            if c1_contains_c2:
                # c1 is parent of c2 — check clearance on all sides
                gaps = {
                    'left': b2['x'] - b1['x'],
                    'top': b2['y'] - b1['y'],
                    'right': b1['r'] - b2['r'],
                    'bottom': b1['b'] - b2['b'],
                }
                for side, gap in gaps.items():
                    if gap < MIN_CONTAINER_GAP:
                        issues.append(
                            f"CONTAINER_OVERLAP: {c2['id']} {side} border is "
                            f"{gap:.0f}px from {c1['id']} (min {MIN_CONTAINER_GAP}px)")
            elif c2_contains_c1:
                gaps = {
                    'left': b1['x'] - b2['x'],
                    'top': b1['y'] - b2['y'],
                    'right': b2['r'] - b1['r'],
                    'bottom': b2['b'] - b1['b'],
                }
                for side, gap in gaps.items():
                    if gap < MIN_CONTAINER_GAP:
                        issues.append(
                            f"CONTAINER_OVERLAP: {c1['id']} {side} border is "
                            f"{gap:.0f}px from {c2['id']} (min {MIN_CONTAINER_GAP}px)")

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
