---
name: excalidraw-diagramming
description: Build architecture diagrams programmatically via Python scripts and the Excalidraw canvas server. Use when you need to create, modify, or export any diagram. Python-first approach with MCP tools available for inspection.
---

# Excalidraw Diagramming Skill

## Overview

Build diagrams by writing Python scripts that call `components.py` — a library of reusable components (icon+label, containers, arrows, grids) with automatic grouping and alignment. The canvas server at `localhost:3000` stores elements in-memory and syncs to a React frontend via WebSocket.

**Python-first:** Build scripts produce diagrams. MCP tools (`describe_scene`, `get_canvas_screenshot`) are for inspection only.

## Architecture

```
Python build script (your deliverable)
    ↓ REST API calls
Canvas Server (localhost:3000, in-memory)
    ↓ WebSocket sync
React Frontend (Excalidraw canvas in browser)
    ↓ export/screenshot
PNG output
```

- **components.py**: `mcp_excalidraw/scripts/components.py` — single utility file
- **Build scripts**: `clients/{client}/{project}/diagrams/` — one per diagram, versioned
- **Icons**: `mcp_excalidraw/aws-icons-official/` — SVG icon packs
- **Canvas state**: JSON snapshots for restore after server restart

## Workflow

### 1. Plan the Diagram
Before writing code:
- List all containers and their nesting hierarchy
- List all service components (icon + label pairs)
- List all connections (arrows) and their direction
- Decide layout direction (left-to-right or top-to-bottom)
- Sketch rough coordinate grid (outer containers first, then inner)

### 2. Write a Python Build Script

```python
#!/usr/bin/env python3
import sys, time
sys.path.insert(0, '/path/to/mcp_excalidraw/scripts')
from components import *

# 1. Clear and upload icons
clear()
time.sleep(0.5)
upload_icons("aws")  # or upload_all_icons()
time.sleep(0.3)

# 2. Create containers (outside-in)
container_box("cloud", 30, 5, 1780, 980, "#879196", ...)

# 3. Create service components
icon_label_component("s3", "file-s3", "Amazon S3", cx=400, cy=300)
service_in_container("svc", "file-svc", "Service Name", "container-id")

# 4. Create arrows
arrow("a1", sx, sy, ex, ey, waypoints=[(wx, wy)])
# or for simple connections:
elbowed_arrow("a2", "source-id", "target-id")

# 5. Validate
issues = validate_arrow_paths()
issues += validate_diagram()
if issues:
    for i in issues: print(f"  - {i}")
    sys.exit(1)
```

### 3. Run and Validate
```bash
cd mcp_excalidraw && python3 ../clients/{client}/{project}/diagrams/build-diagram.py
```

### 4. Export
```bash
# Via headless Puppeteer (most reliable):
cd mcp_excalidraw && node headless-export.cjs output.png 3

# Or from Python:
export_screenshot("output.png")
```

### 5. Save Deliverables
For each diagram iteration, save three files:
- `build-diagram-v{N}.py` — the build script (reproducible recipe)
- `diagram-v{N}.png` — the exported screenshot
- `canvas-state-v{N}.json` — raw element state for restore

```bash
curl -s http://localhost:3000/api/elements > canvas-state-v{N}.json
```

## Component Reference

### `icon_label_component(prefix, file_id, label_text, cx, cy, ...)`
Icon centered above label, auto-grouped.
- `cx, cy`: center position of the entire component
- `icon_size`: default 65px
- `font_size`: default 22px
- `gap`: pixels between icon bottom and text top (default 8)
- Returns: `{icon_id, label_id, group_id, bbox}`
- Multi-line text: use `\n` — each line is a separate centered text element

### `numbered_circle(prefix, number, cx, cy, size=50)`
Dark circle (#1a1a1a) with white centered number.
- Uses server's center endpoint for precision
- Returns: `{bg_id, text_id, group_id, bbox}`

### `container_box(cid, x, y, w, h, stroke_color, ...)`
Rectangle with optional header icon + label in top-left.
- `fill_color`: default "transparent"
- `icon_file_id`: optional header icon
- `label_text`: optional header label
- `stroke_style`: "solid" or "dashed"
- Returns: `{box_id, icon_id, label_id, group_id, bbox}`

### `service_in_container(prefix, file_id, label_text, container_id, ...)`
Icon+label centered within an existing container. Accounts for 60px header height.

### `grid_2x2(prefix, items, container_id, ...)`
2x2 grid of icon+label components inside a container.
- `items`: `[{"file_id": "...", "label": "...", "id_suffix": "..."}, ...]` (4 items)
- Order: top-left, top-right, bottom-left, bottom-right

### `arrow(aid, start_x, start_y, end_x, end_y, ...)`
Arrow with optional multi-point path via waypoints.
- `waypoints`: list of `(x, y)` absolute coordinates for intermediate points
- `start_binding`, `end_binding`: dicts with `{"elementId", "focus", "gap"}`
- `elbowed`: if True, enables Excalidraw's built-in A* elbowed routing (client-side)
- `stroke_style`: "solid" or "dashed"

### `elbowed_arrow(aid, start_id, end_id, ...)`
Simplified arrow creation with elbowed routing and element bindings.
- Reads element positions automatically
- Sets up start/end bindings
- **Note:** Routing happens client-side (React frontend) — server stores 2-point path

### `measure_text(text, font_size=22)`
Get accurate text width/height from server using per-character Helvetica width tables.

### `validate_arrow_paths(arrow_ids=None, margin=15)`
Check arrows for: text overlap, icon overlap, diagonal segments, arrowhead proximity.

### `validate_diagram()`
Check diagram for: border crossings, tight margins, text overlaps, non-standard colors.

### State Management
- `save_state(filepath=None)` — save current canvas to JSON
- `restore_state(data_or_path)` — restore canvas from dict or JSON file
- `center_element(child_id, parent_id, axis="both")` — center child within parent

### Icon Management
- `upload_icons(pack="aws")` — upload icons from a registered pack
- `upload_all_icons()` — upload from all packs
- `register_icon_pack(name, icons, base_path=None)` — register a new icon pack
- Built-in packs: `"aws"` (16 service + resource icons)

## Critical Rules

### Text
- **`textAlign: "center"` does NOT work** on standalone Excalidraw text elements. Multi-line labels MUST be split into separate text elements per line, each individually centered using `measure_text()`. The `icon_label_component()` function handles this automatically.
- **Never set explicit `width` on text elements** — Excalidraw ignores it for rendering but it shifts the x anchor point.
- **Always use `measure_text()`** for positioning — never estimate character widths.

### Export
- **Use headless Puppeteer** (`headless-export.cjs` or `export_screenshot()`) for reliable PNG export.
- The `/api/export/image` endpoint requires a browser tab connected via WebSocket. After `POST /api/elements/sync`, it may return empty 121-byte PNGs.
- **Browser must be open** at localhost:3000 for icon rendering in exports.

### Server State
- **Server is in-memory.** All elements AND icon files are lost on restart.
- After restart: restore from `canvas-state-v{N}.json` AND re-upload all icons.
- Start: `cd mcp_excalidraw && npm run canvas`
- Health: `curl -s http://localhost:3000/health`

### Grouping
- **Always group related elements** with `groupIds`. Without groups, moving one element leaves its partner behind.
- All component functions set `groupIds` automatically.
- Pattern: `g-{prefix}` for icon+label, `g-{cid}` for containers.

### Font
- Use fontFamily `"2"` (Helvetica) for all text — must be string, not number.
- Use consistent fontSize: 22px for labels, 18px for circle numbers.
- `fillStyle: "solid"` required for background colors to show.

## Arrow Routing

### Primary: Elbowed Arrows (built-in Excalidraw routing)

Use `elbowed_arrow()` for all connections. Excalidraw's React frontend handles A* pathfinding client-side — arrows auto-route around obstacles when rendered.

```python
elbowed_arrow("a1", "img-source", "img-target")
```

**How it works:** Python creates the arrow with `elbowed: true` and element bindings. The server stores a 2-point path. When the frontend renders it, Excalidraw's built-in router calculates the actual elbowed path around obstacles.

**Limitation:** The server-stored points are just start→end, not the actual routed path. Programmatic validation of arrow paths won't work. Use visual inspection instead.

### Fallback: Python + MCP Tweaking

If elbowed arrows don't route well (e.g. awkward paths, arrows too close together):

1. **Create basic arrows with Python** using `arrow()` with explicit waypoints
2. **Inspect visually** via MCP `get_canvas_screenshot` or browser
3. **Tweak individual arrows** via MCP `update_element` to adjust points
4. **Re-inspect** until the routing looks clean

```python
# Step 1: Create arrow with approximate waypoints
arrow("a1", sx, sy, ex, ey, waypoints=[(mid_x, sy), (mid_x, ey)])

# Step 2-3: Inspect and tweak via MCP tools or REST API
# update("a1", {"points": [[0,0], [dx1,0], [dx1,dy1], [dx2,dy1], [dx2,dy2]]})
```

### Manual Waypoints

For precise control, use `arrow()` with explicit waypoints:

```python
# L-shaped: right then down
arrow("a1", 100, 200, 400, 500,
      waypoints=[(400, 200)])  # goes right to x=400, then down to y=500

# Z-shaped: right, down, right
arrow("a2", 100, 200, 500, 400,
      waypoints=[(300, 200), (300, 400)])
```

All waypoints are absolute coordinates. The function converts to relative points internally.

## Icon Management

### Available Packs
- **aws**: 16 AWS service + resource icons (SVG)
  - Service: SageMaker, IAM, S3, Redshift, Glue, Q, CodeWhisperer
  - Resource: User, Database, Git-Repository, Source-Code, Toolkit
  - Group: Cloud logo, Region badge

### Registering New Packs
```python
register_icon_pack("gcp", {
    "file-gcs": "path/to/gcs.svg",
    "file-bigquery": "path/to/bigquery.svg",
}, base_path="/path/to/gcp-icons/")
```

### Icon Rules
- Upload icons BEFORE creating image elements (server needs files in memory)
- Wait briefly after upload before creating elements (WebSocket sync delay)
- Use generic Resource icons for generic concepts (database, user, toolkit)
- Use service icons ONLY for specific cloud services

## MCP Tools for Inspection

When configured as an MCP server, these tools are available for read-only inspection:

| Tool | Purpose |
|------|---------|
| `describe_scene` | Get structured text description of canvas state |
| `get_canvas_screenshot` | Capture current canvas as image |

These supplement Python scripts — use them for visual verification, not for building.

## Quality Checklist

See `references/checklist.md` for the full two-layer validation checklist.

**Quick check after every iteration:**
1. All text fully visible? No truncation or overflow.
2. No element overlaps? Run `validate_diagram()`.
3. Arrows route cleanly? Run `validate_arrow_paths()`. No crossings through unrelated elements.
4. Consistent spacing? At least 40px between elements.
5. All labels readable at 50% zoom? Font size >= 16 body, >= 20 titles.
6. Arrow bindings intact? Every arrow has start/end binding.

## Positioning Lessons (from build iterations)

### Arrow Labels Must Not Overlap Arrow Lines
When placing text annotations between a numbered circle and a service icon (e.g. "HTML, CSS, JavaScript" between circle 1 and AWS Amplify), the label must sit **fully above** (or below) the arrow line — never at the same y-coordinate. If the arrow runs at `row_y - 20`, a 2-line label (~35px tall at fontSize 14) needs `y = row_y - 58` to clear the arrow completely. A 1-line label needs `y = row_y - 42`.

### Numbered Circles Must Never Overlap Arrows
Circles must be placed **adjacent** to arrow paths, not on top of them. Never split an arrow into two segments around a circle — keep arrows as single elements. Instead, offset the circle so it sits clearly above, below, or to the side of the arrow.

**Placement rules by position:**
- **Start of horizontal arrow** (circles 1-4): Place circle at the arrow's left end. Arrow starts from `circle_cx + radius + 5`.
- **Between containers** (circles 5, 7): Place in the gap between nested container borders, vertically aligned with the arrow's y but the arrow terminates at the container edge — circle is beside the arrow endpoint, not on it.
- **Along a horizontal arrow** (circle 6): Offset vertically — place `cy = arrow_y - 28` so the circle sits just above the arrow line. Close enough to associate with the arrow, but no overlap.

```python
# Bad: circle on the arrow path — number obscured
numbered_circle("c6", 6, cx=1160, cy=arrow_y, ...)
arrow("a1", tb_right, arrow_y, ai_left, arrow_y)

# Good: circle offset just above the arrow — readable and associated
numbered_circle("c6", 6, cx=1160, cy=arrow_y - 28, ...)
arrow("a1", tb_right, arrow_y, ai_left, arrow_y)
```

### Hard Rule: No Icon or Circle May Cross Any Container Border
Every icon (image element), icon background rectangle, and numbered circle must be **fully inside** or **fully outside** every container. Partial overlap with any border is forbidden. Validate programmatically:

```python
# After building, verify zero crossings
for elem in [images + circles]:
    for container in containers:
        assert fully_inside(elem, container) or fully_outside(elem, container)
```

To ensure clearance, calculate: `element_edge = cx + radius` must be `< container_border - 5` (inside) or `> container_border + 5` (outside). Never place an element where any edge is within 5px of a border.

### Account for Label Width Near Container Borders
Service icon labels (e.g. "Amazon Rekognition" ~190px wide) extend far beyond the icon itself. When placing icons outside a container, ensure the **label's left edge** clears the container border by at least 30px. Calculate: `AI_X - (max_label_width / 2) > container_right_edge + 30`.

### Leave Gap Between Nested Containers for Circles
When numbered circles (like 5 and 7) sit between two nested container borders (e.g. Step Functions outer and Parallel Processing inner), the gap between borders must be at least `circle_size + 30px` (70px for 40px circles). Otherwise circles overlap one or both borders.

### No Borders on Icons or Circles
Icon background rectangles and numbered circle ellipses must have `strokeWidth: 0` and `strokeColor: "transparent"`. This is enforced in `components.py` — the `icon_label_component` and `numbered_circle` functions set these automatically. Never override with a visible stroke.

### AWS Icons Have Built-in Backgrounds — Don't Add `icon_bg_color`
AWS official SVG icons (from `aws-icons-official/`) already include colored background fills (e.g. S3: `#7AA116`, Amplify: `#DD344C`). Adding `icon_bg_color` creates a second, mismatched background rectangle that shows as a visible "border" around the icon. **Do not use `icon_bg_color` for AWS service icons.** Only use it for custom icons that have no built-in background.

```python
# Bad: double background creates visible border artifact
icon_label_component("s3", "file-s3", "Amazon S3", cx=..., cy=...,
                      icon_size=SVC_ICON, icon_bg_color="#3f8624")  # mismatches SVG's #7AA116

# Good: let the SVG's built-in background show
icon_label_component("s3", "file-s3", "Amazon S3", cx=..., cy=...,
                      icon_size=SVC_ICON)
```

### Z-Order: Create Background Elements First
Elements render in creation order (first created = bottom layer). Create numbered circles **after** nearby icon components so the circle renders on top and isn't hidden behind icon backgrounds.

### Consistent Styling via Shared Constants
Same-category elements must use **identical style parameters** defined as shared constants at the top of the script. Never hardcode style values per-element — change the constant once to update all.

```python
# Shared style constants (top of script)
CIRCLE_BG = "#1a1a1a"   # All numbered circles — same color
CIRCLE_SIZE = 40         # All numbered circles — same size
SVC_ICON = 69            # All service icons — one constant controls all sizes
HDR_ICON = SVC_ICON      # Header icons match service icons

# Then reuse everywhere
numbered_circle("c1", 1, cx=..., cy=..., size=CIRCLE_SIZE, bg_color=CIRCLE_BG)
numbered_circle("c2", 2, cx=..., cy=..., size=CIRCLE_SIZE, bg_color=CIRCLE_BG)
icon_label_component("amplify", "file-amplify", "AWS Amplify", cx=..., cy=...,
                      icon_size=SVC_ICON)
container_box("cloud", ..., icon_header_size=HDR_ICON)
```

Categories that must be uniform within a diagram:
- **Numbered circles**: same `size` and `bg_color`
- **Service icons**: same `icon_size` via single `SVC_ICON` constant
- **Container headers**: same `icon_header_size` via `HDR_ICON = SVC_ICON`
- **Text boxes**: same `font_size`, `stroke_width`, `corner_radius`
- **Arrows**: same `stroke_width` for same-type connections

### Icon Scaling Ripple Effects
Changing `SVC_ICON` triggers a cascade of layout adjustments. Every item below must be recalculated:

| What | Rule | Example (1.25× scale, +14px icon) |
|------|------|-----------------------------------|
| `HDR_ICON` | Must equal `SVC_ICON` — auto-updates if defined as `HDR_ICON = SVC_ICON` | 55→69 |
| `header_height` | Should equal `SVC_ICON` so header bg matches icon | 55→69 |
| Container heights | Grow by ~1.15× the icon delta per row inside | 790→910 (~+15% for 6 rows) |
| Inner sub-section heights | Same proportional growth | 345→400, 450→520 |
| Row Y spacing | Add ~10-15px gap per row to prevent icon/label overlap | 120px gaps → 130-135px |
| Sub-container Y offsets | Push down to account for taller headers | +15-20px |
| Arrow endpoints | Start/end offsets from icons grow with icon size (use `±icon_size*0.8` as guide) | +5-10px per endpoint |
| External elements | Reposition to stay vertically aligned with new row centers | people/mobile/SDK all shift |

**Key principle:** A single `SVC_ICON` constant controls all icon sizes (service + header). When it changes, treat it as a full layout reflow — adjust every Y position and every container dimension, don't just change the icon size alone.

### Align Container Headers at the Top
All containers that start at the same `y` must use the same `icon_header_size` so their header icons and labels align horizontally. Define a single `HDR_ICON` constant (equal to `SVC_ICON`) and apply it to every `container_box` call.

### Header Text Must Be Vertically Centered Using Full Text Height
For multi-line header labels, the label y-position must be calculated from the **full text height** (via `measure_text()`), not just the single-line `font_size`. This is fixed in `components.py`'s `container_box`:

```python
# components.py — correct: centers using actual text height
_, text_h = measure_text(label_text, label_font_size)
ly = y + (icon_sz - text_h) / 2
```

With this fix, `header_height = icon_size` works correctly — the text is centered within the icon area rather than starting too low and overflowing. The header background matches the icon height, and the text fits inside it.

### Validation False Positives
`validate_diagram()` and `validate_arrow_paths()` report TEXT_OVERLAP for arrows that intentionally pass through annotation text areas (e.g. arrows from circles through label text to service icons). These are **expected** for this diagram style. BORDER warnings for elements near container edges (e.g. AI service labels near the Step Functions border) are also expected when icons are intentionally placed outside containers.

## Anti-Patterns

| Don't | Do Instead |
|-------|-----------|
| Hand-tune pixel positions | Use component functions with calculated positions |
| Batch-create 200 elements blindly | Build incrementally: containers → services → arrows → validate |
| Trust vision models for arrow tracing | Use programmatic validation (`validate_arrow_paths`) |
| Call raw Puppeteer for export | Use `export_screenshot()` or `headless-export.cjs` |
| Guess text width | Call `measure_text()` for every positioning calculation |
| Set explicit `width` on text | Let Excalidraw auto-size, position with `measure_text()` |
| Use `diagram_helpers.py` | Use `components.py` (diagram_helpers is deprecated) |
| Mix fontFamily across elements | Pick one (fontFamily `"2"`) and use everywhere |
| Skip validation before export | Always run `validate_diagram()` + `validate_arrow_paths()` |
| Claim "done" without checking | Export PNG, run quality checklist, then deliver |
| Place arrow labels at same y as arrows | Position labels fully above/below the arrow line |
| Place numbered circles on arrow paths | Offset circles above/below/beside arrows so numbers are fully readable |
| Ignore label width for border clearance | Calculate label extent and ensure 30px+ gap from borders |

## AWS Color Reference

### Container Border Style Hierarchy

| Level | Style | Stroke Width | Example |
|-------|-------|-------------|---------|
| Outer boundary (top-level sections) | solid | 2px | Cloud boundary, workflow boundary |
| Inner sub-section (logical grouping) | dashed | 1px | Front-end group, parallel processing group |

**Rules:**
- Outer containers use **solid** borders. Inner sub-sections use **dashed** borders.
- Dashed = logical grouping of related elements that don't necessarily include everything in the parent.
- If a sub-section only wraps some elements (e.g. parallel steps but not sequential ones), use dashed to signal it's a grouping, not a full boundary.
- Stroke color is typically gray (#879196) for neutral containers, or a brand color (e.g. pink for Step Functions) for top-level service boundaries.

### Common Container Colors
| Purpose | Stroke | Fill | Style |
|---------|--------|------|-------|
| Neutral outer boundary | #879196 (gray) | transparent | solid, 2px |
| Neutral sub-section | #879196 (gray) | transparent | dashed, 1px |
| Branded outer boundary | service color (e.g. #d63384 pink) | transparent | solid, 2px |
| Filled themed section | service color | light tint (e.g. #f0fdfa) | solid |

### Icon Background Colors
AWS official SVG icons already include their own background colors — do not add `icon_bg_color`. The SVG built-in colors are:
| Service | SVG built-in fill |
|---------|------------------|
| S3 | #7AA116 (green) |
| Amplify | #DD344C (red) |
| Cognito | #DD344C (red) |
| API Gateway | #8C4FFF (purple) |
| AI services (Textract, Rekognition, etc.) | #01A88D (teal) |

### Numbered Circle Colors
All numbered circles in a diagram should use the **same** `bg_color` for visual consistency. Define a single `CIRCLE_BG` constant and apply it to every circle. Default: `#1a1a1a` (dark).

## References

- **Quality checklist**: `skills/excalidraw-diagramming/references/checklist.md`
- **Example build script**: `skills/excalidraw-diagramming/references/example-build.py`
- **components.py source**: `mcp_excalidraw/scripts/components.py`
- **smart_arrow.py**: `mcp_excalidraw/scripts/smart_arrow.py` (archived — experimental, not reliable)
