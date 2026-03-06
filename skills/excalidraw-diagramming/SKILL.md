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
- `cx, cy`: center position of the entire component (icon + gap + label)
- `label_text`: label below icon. Pass `None` or `""` to skip label creation entirely — icon centers directly at `cy` with no vertical shift.
- `icon_size`: default 65px
- `font_size`: default 22px
- `gap`: pixels between icon bottom and text top (default 8)
- Returns: `{icon_id, label_id, group_id, bbox}` where `bbox` includes `icon_cx`, `icon_cy` (the actual image center, which differs from `cy` when a label is present)
- Multi-line text: use `\n` — each line is a separate centered text element
- **Important:** When a label is present, the icon center is at `cy - (gap + text_h) / 2`, not at `cy`. Use `bbox.icon_cy` for arrow connections.

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

See `references/reference.md` for the full two-layer validation checklist.

**Quick check after every iteration:**
1. All text fully visible? No truncation or overflow.
2. No element overlaps? Run `validate_diagram()`.
3. Arrows route cleanly? Run `validate_arrow_paths()`. No crossings through unrelated elements.
4. Consistent spacing? At least 40px between elements.
5. All labels readable at 50% zoom? Font size >= 16 body, >= 20 titles.
6. Arrow bindings intact? Every arrow has start/end binding.

## Positioning Lessons (from build iterations)

### Arrow Labels: Center Between Endpoints Using `measure_text`
Arrow annotation labels must be **horizontally centered** between the arrow start and end points, and placed **fully above** (or below) the arrow line. Use `measure_text` to get the exact text width, then compute `x = midpoint - text_width / 2`.

```python
ARROW_LEFT = CIRCLE_X + CIRCLE_R    # arrow start x
ARROW_RIGHT = SVC_X - ICON_R        # arrow end x
ARROW_MID_X = (ARROW_LEFT + ARROW_RIGHT) / 2

tw, th = measure_text(label_text, FONT_BODY)
label_x = ARROW_MID_X - tw / 2      # horizontally centered
label_y = row_y - th - 4            # above arrow with 4px gap
```

Never use hardcoded x-offsets for labels — always measure and center. This prevents labels from overlapping arrowheads at either end.

### Numbered Circle Placement: No Border Overlaps, No Arrow Overlaps
Circles must never overlap container borders OR sit on arrow paths. Two hard rules:

1. **No border crossings:** Every circle must be fully inside or fully outside every container. Center circles in the available gap between borders.
2. **No arrow overlaps:** If a circle is near an arrow path, offset it vertically (`cy = arrow_y - CIRCLE_R - 5`) so it sits just above (or below) the arrow line — close enough to associate, but no overlap.

**Placement decision:** If there's enough space outside a container (gap ≥ `circle_size + 30px`), place outside. Otherwise, place **inside** the container in the gap between borders.

```python
# Between two borders (outer container and inner sub-section)
C57_X = (SF_X + PP_X) / 2   # centered in the gap, equal clearance from both

# Inside container, between sub-section right and container right
C6_X = (PP_X + PP_W + SF_X + SF_W) / 2   # centered in the gap
# Offset above arrow to avoid overlap
numbered_circle("c6", 6, cx=C6_X, cy=arrow_y - CIRCLE_R - 5, ...)

# At arrow start (circle is source of the arrow)
numbered_circle("c1", 1, cx=CIRCLE_X, cy=ROW_Y, ...)
arrow("a1", CIRCLE_X + CIRCLE_R, ROW_Y, SVC_X - ICON_R, ROW_Y, ...)
```

**Minimum clearance:** circle edge must be at least 15px from any border.

### Hard Rule: No Icon or Circle May Cross Any Container Border
Every icon, icon background rectangle, and numbered circle must be **fully inside** or **fully outside** every container. Partial overlap with any border is forbidden.

To ensure clearance: `element_edge = cx + radius` must be `< container_border - 15` (inside) or `> container_border + 15` (outside).

### Account for Label Width Near Container Borders
Service icon labels (e.g. "Amazon Rekognition" ~190px wide) extend far beyond the icon itself. When placing icons outside a container, ensure the **label's left edge** clears the container border by at least 30px. Calculate: `AI_X - (max_label_width / 2) > container_right_edge + 30`.

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
FONT_HDR = 28            # Container header labels only
FONT_BODY = 20           # Everything else: icon labels, numbers, arrows, text boxes

# Then reuse everywhere
numbered_circle("c1", 1, cx=..., cy=..., size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)
icon_label_component("amplify", "file-amplify", "AWS Amplify", cx=..., cy=...,
                      icon_size=SVC_ICON, font_size=FONT_BODY)
container_box("cloud", ..., icon_header_size=HDR_ICON, label_font_size=FONT_HDR)
text_box("tb-1", "extract text", cx=..., cy=..., font_size=FONT_BODY)
# Arrow annotation labels — also use FONT_BODY
create({"id": "lbl-1", "type": "text", ..., "fontSize": FONT_BODY})
```

**Font size rule:** A diagram uses exactly **2 font sizes** — `FONT_HDR` for container headers, `FONT_BODY` for all other text (icon labels, circle numbers, arrow annotations, text boxes). No exceptions. Pass these explicitly to every component call — do not rely on defaults.

Categories that must be uniform within a diagram:
- **Font sizes**: exactly 2 — `FONT_HDR` for container headers, `FONT_BODY` for everything else
- **Numbered circles**: same `size`, `bg_color`, and `font_size`
- **Service icons**: same `icon_size` via single `SVC_ICON` constant
- **Container headers**: same `icon_header_size` via `HDR_ICON = SVC_ICON`, same `label_font_size` via `FONT_HDR`
- **Text boxes**: same `font_size`, `stroke_width`, `corner_radius`, `min_width`, and `max_height` within a section
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

### Font Scaling Ripple Effects
Changing `FONT_HDR` or `FONT_BODY` also triggers layout adjustments:

| What | Rule |
|------|------|
| `header_height` | Must fit the tallest header text. For multi-line headers, calculate: `lines × font_size × 1.25`. If this exceeds `SVC_ICON`, set `header_height` explicitly. |
| Sub-container Y offsets | Push down when header text grows — taller headers eat into content area |
| Arrow label Y offsets | Recalculate: 2-line offset = `-(lines × FONT_BODY × 1.25 + 20)`, 1-line = `-(FONT_BODY × 1.25 + 20)` above arrow y |
| Container heights | Larger body text makes icon labels taller → rows need more vertical space → containers grow |
| Row Y spacing | Add ~5px per row for every +4px in FONT_BODY |
| Text box dimensions | `text_box()` auto-sizes from `font_size`, but vertical chain arrows must account for taller boxes |

### Align Containers at Matching Levels
Side-by-side containers must share aligned edges. Use shared constants to enforce this:

1. **Outer containers** placed side-by-side must share the same `y` and the same `header_height` (`HDR_HEIGHT`). This ensures their header bands and content areas start at the same vertical position.
2. **Inner sub-sections** at the same nesting level must share the same `y`. Derive it from the parent: `SUB_Y = PARENT_Y + HDR_HEIGHT + gap`.
3. **Stacked containers** (one above the other) must share the same `x` and width for visual alignment.

```python
HDR_HEIGHT = 75                          # Shared — fits tallest header (2-line at FONT_HDR)
SUB_Y = CLOUD_Y + HDR_HEIGHT + 25       # Both dashed sub-sections start here (clears 2-line text)

container_box("cloud", ..., header_height=HDR_HEIGHT)
container_box("step-fn", ..., SF_Y=CLOUD_Y, header_height=HDR_HEIGHT)  # same Y, same height
container_box("front-end", ..., FE_Y=SUB_Y)     # aligned
container_box("parallel",  ..., PP_Y=SUB_Y)     # aligned
```

**SUB_Y gap rule:** The gap between `HDR_HEIGHT` and `SUB_Y` must clear the tallest header text (including multi-line overflow). For 2-line text at `FONT_HDR`, the second line extends below the header band, so add at least `FONT_HDR * 1.25` as gap — not just 10px.

### Header Text Centering: Use `header_height` as Reference
Header text is vertically centered within the `header_height` band (not the icon size). This means single-line and multi-line headers are each centered within the same height, keeping both visually balanced relative to the header area:

```python
# components.py — center text block within header_height band
_, text_h = measure_text(label_text, label_font_size)
center_h = header_height or icon_sz
ly = y + (center_h - text_h) / 2
```

When all side-by-side containers share the same `header_height` (`HDR_HEIGHT`), each header's text is centered within an identical band, producing consistent visual weight.

### Header Fill Control
`container_box` supports `header_fill=True|False` to control the header background rectangle. When `header_fill=False`, the header background is not drawn even if `header_bg_color` is provided. Use this when header text should sit on a clean background:

```python
# Pink border, but no pink fill behind header text
container_box("step-fn", ..., header_bg_color=PINK+"30", header_fill=False)
```

### Uniform Text Box Sizing Within Sections
All `text_box` elements within the same section or sub-section must have identical dimensions, controlled by shared `min_width` and `max_height` constants. This ensures visual consistency even when text content varies in length.

```python
TB_MIN_W = 150   # All text boxes at least this wide
TB_MAX_H = 50    # All text boxes capped at this height

text_box("tb-1", "extract text",        cx=..., cy=..., font_size=FONT_BODY, min_width=TB_MIN_W, max_height=TB_MAX_H)
text_box("tb-2", "prep and\ntranslate", cx=..., cy=..., font_size=FONT_BODY, min_width=TB_MIN_W, max_height=TB_MAX_H)
```

- `min_width` prevents narrow boxes for short text — all boxes share a consistent minimum width
- `max_height` caps tall boxes (e.g. multi-line text) so they don't break row spacing
- Define both as constants and pass to every `text_box` in the section

### Empty Labels: Skip Text Creation
When an icon has no label, pass `None` (or empty string) as `label_text` to `icon_label_component`. The component will skip creating the text element entirely, and the icon will be centered directly at `(cx, cy)` — no vertical shift from a phantom label.

```python
# Bad: empty string still shifted icon up in older versions
icon_label_component("people", "file-users", "", cx=50, cy=560, ...)

# Good: None skips label creation, icon centered at cy
icon_label_component("people", "file-users", None, cx=50, cy=560, ...)
```

### Arrow Endpoints: Connect at Image Center, Not Component Center
`icon_label_component` centers the entire component (icon + gap + label) at `cy`. The **actual icon image center** is shifted up from `cy` by `ICON_VSHIFT = (gap + label_height) / 2`. All arrows must connect at image centers, and components must be positioned so image centers align.

**Preferred approach — shift component `cy` so image center lands at the desired row Y:**

```python
COMP_GAP = 8                              # gap param in icon_label_component
LABEL_1LINE_H = FONT_BODY * 1.25         # ~25px for single-line label
ICON_VSHIFT = (COMP_GAP + LABEL_1LINE_H) / 2   # ~16.5px
COMP_HALF_H = (SVC_ICON + COMP_GAP + LABEL_1LINE_H) / 2  # 51

# Place icons with cy = ROW_Y + ICON_VSHIFT → image center lands at ROW_Y
icon_label_component("svc", "file-svc", "Service Name", cx=SVC_X, cy=ROW_Y + ICON_VSHIFT, ...)

# Label-less icons: image center IS at cy, no shift needed
icon_label_component("people", "file-users", None, cx=50, cy=ROW_Y, ...)

# Circles, text boxes at ROW_Y — all centers aligned → arrows are straight
numbered_circle("c1", 1, cx=CIRCLE_X, cy=ROW_Y, ...)
text_box("tb-1", "extract text", cx=TB_X, cy=ROW_Y, ...)

# Horizontal arrows at ROW_Y — connects all centers cleanly
arrow("a1", CIRCLE_X + CIRCLE_R, ROW_Y, SVC_X - ICON_R, ROW_Y, ...)
arrow("a2", TB_X + TB_HALF_W, ROW_Y, AI_X - ICON_R, ROW_Y, ...)

# Vertical arrows between icons: start below source label, end at target icon top
S3_LABEL_BOTTOM = ROW3_Y + ICON_VSHIFT + COMP_HALF_H   # below label text
APIGW_ICON_TOP = ROW4_Y + ICON_VSHIFT - COMP_HALF_H    # at icon top edge (= ROW4_Y - ICON_R)
arrow("a-vert", SVC_X, S3_LABEL_BOTTOM, SVC_X, APIGW_ICON_TOP, ...)
```

**Rules:**
- **Align at image center:** shift `cy` by `+ ICON_VSHIFT` so the icon image center lands at the intended row Y. This keeps arrow code simple — all arrows use `ROW_Y` directly.
- **Label-less icons** (`label_text=None`): no shift needed — image center IS at `cy`
- **Horizontal arrows:** both endpoints at the same Y for clean straight lines
- **Vertical arrows between icons:** start below the source component's label (avoid text overlap), end at the target icon's top edge
- **Vertical arrows to icons from below:** stop just below the label text, not at the icon itself — prevents the arrow line from crossing through the label
- Arrow label midpoints: `LBL_X = (start_x + end_x) / 2`
- `icon_label_component` returns `bbox.icon_cx`, `bbox.icon_cy` for verification

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
| Hardcode arrow label x-offsets | Use `measure_text` to center labels between arrow endpoints |
| Place numbered circles on arrow paths | Offset circles above/below/beside arrows (`cy = arrow_y - CIRCLE_R - 5`) |
| Place circles near container borders | Center circles in the gap between borders (`cx = (border1 + border2) / 2`) |
| Use `cy` as icon center for arrows | Shift `cy` by `+ ICON_VSHIFT` so image center aligns at row Y |
| Pass empty string `""` as icon label | Pass `None` to skip label creation — avoids phantom text offset |
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

- **Reference & checklist**: `skills/excalidraw-diagramming/references/reference.md`
- **Example build script**: `skills/excalidraw-diagramming/references/example-build.py`
- **components.py source**: `mcp_excalidraw/scripts/components.py`
- **smart_arrow.py**: `mcp_excalidraw/scripts/smart_arrow.py` (archived — experimental, not reliable)
