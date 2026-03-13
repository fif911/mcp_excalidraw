---
name: excalidraw-diagramming
description: Build architecture diagrams programmatically via Python scripts and the Excalidraw canvas server. Use when you need to create, modify, or export any diagram. Python-first approach with MCP tools available for inspection.
---

# Excalidraw Diagramming Skill

## Overview & Setup

Getting started: architecture, connection modes, and environment setup.

### Overview

Build diagrams by writing Python scripts that call `components.py` — a library of reusable components (icon+label, containers, arrows, grids) with automatic grouping and alignment. The canvas server at `localhost:3000` stores elements in-memory and syncs to a React frontend via WebSocket.

**Python-first:** Build scripts produce diagrams. MCP tools (`describe_scene`, `get_canvas_screenshot`) are for inspection only.

### Architecture

```
Python build script (your deliverable)
    | REST API calls
Canvas Server (localhost:3000, in-memory)
    | WebSocket sync
React Frontend (Excalidraw canvas in browser)
    | export/screenshot
PNG output
```

- **components.py**: `mcp_excalidraw/scripts/components.py` — single utility file
- **Build scripts**: `clients/{client}/{project}/diagrams/` — one per diagram, versioned
- **Icons**: `mcp_excalidraw/aws-icons-official/` — SVG icon packs
- **Canvas state**: JSON snapshots for restore after server restart

### Connection Mode Detection

Before doing anything, determine which mode is available. Run these checks in order:

#### Check 1: MCPorter
```bash
mcporter list 2>/dev/null | grep excalidraw
```
If you see `excalidraw` with tools listed, use MCPorter mode: `mcporter call excalidraw.<tool> key=value`.

#### Check 2: MCP Server (Claude Code / direct MCP)
```bash
mcp-cli tools | grep excalidraw
```
If you see tools like `excalidraw/batch_create_elements`, use MCP mode directly.

#### Check 3: REST API (Fallback)
```bash
curl -s http://localhost:3000/health
```
If you get `{"status":"ok"}`, use REST API mode with HTTP endpoints.

#### Check 4: Nothing works
Tell the user:
> The Excalidraw canvas server is not running. To set up:
> 1. Clone: `git clone https://github.com/fif911/mcp_excalidraw && cd mcp_excalidraw`
> 2. Build: `npm ci && npm run build`
> 3. Start canvas: `HOST=0.0.0.0 PORT=3000 npm run canvas`
> 4. Open `http://localhost:3000` in a browser
> 5. Add to MCPorter: `mcporter config add excalidraw --command node --arg /path/to/mcp_excalidraw/dist/index.js --scope home`

### MCP vs MCPorter vs REST API Quick Reference

| Operation | MCP Tool | MCPorter | REST API |
|-----------|----------|----------|----------|
| Create elements | `batch_create_elements` | `mcporter call excalidraw.batch_create_elements --args '{"elements":[...]}'` | `POST /api/elements/batch` |
| Get all elements | `query_elements` | `mcporter call excalidraw.query_elements` | `GET /api/elements` |
| Get one element | `get_element` | `mcporter call excalidraw.get_element id=myId` | `GET /api/elements/:id` |
| Update element | `update_element` | `mcporter call excalidraw.update_element --args '{...}'` | `PUT /api/elements/:id` |
| Delete element | `delete_element` | `mcporter call excalidraw.delete_element id=myId` | `DELETE /api/elements/:id` |
| Clear canvas | `clear_canvas` | `mcporter call excalidraw.clear_canvas` | `DELETE /api/elements/clear` |
| Describe scene | `describe_scene` | `mcporter call excalidraw.describe_scene` | `GET /api/elements` (parse manually) |
| Screenshot | `get_canvas_screenshot` | `mcporter call excalidraw.get_canvas_screenshot` | Only via MCP (needs browser) |
| Viewport | `set_viewport` | `mcporter call excalidraw.set_viewport scrollToContent=true` | `POST /api/viewport` (needs browser) |
| Export image | `export_to_image` | `mcporter call excalidraw.export_to_image format=png` | `POST /api/export/image` (needs browser) |
| Export URL | `export_to_excalidraw_url` | `mcporter call excalidraw.export_to_excalidraw_url` | Only via MCP |

MCPorter uses the same MCP tool interface — all MCP mode patterns (labels, arrow binding, etc.) apply identically.

## Pre-Build Hard Rules (MUST apply before writing ANY code)

Rules that override reference images. If a reference image contradicts a rule below, the rule wins. Apply them during planning AND building — do not defer to the critic phase.

1. **AWS Cloud boundary is ALWAYS `stroke_style="solid"`** — NEVER dashed. Even if the reference image shows a dashed cloud boundary, use solid. This is the single most common mistake. AWS Region and nested containers can be dashed or solid per the reference, but the outermost AWS Cloud container is always solid.

2. **Generic concepts use generic Resource icons, not AWS service-branded Architecture icons.** Items like "Git repository", "Studio IDE", "Tools", "Database assets" should use Resource icons (`Res_*`) from the General-Icons category — NOT Architecture icons (`Arch_*`) which render as colored branded squares. Architecture icons are ONLY for specific named AWS services (e.g., Amazon S3, Amazon Redshift, AWS IAM Identity Center).

4. **No diagonal arrow segments — every segment must be perfectly horizontal or vertical.** Before drawing any arrow, verify that connected icons share the same `icon_cy` (for horizontal arrows) or `icon_cx` (for vertical arrows). Even 1px misalignment creates a visible diagonal. For multi-icon chains (e.g., User → IAM → Studio), ALL icons in the chain must be aligned. Print and compare `icon_cy`/`icon_cx` values after creating icons, before proceeding to arrows.

5. **ALL icons are 65px — no exceptions.** Service icons, container header icons, grid icons, user/external icons — every `icon_size=` and `icon_header_size=` must use a single `ICON_SIZE = 65` constant. Never use `HDR_ICON = 40`, `icon_size=50`, `icon_size=55`, or any other hardcoded size. If the styling spec or plan says a smaller size for certain icons, the plan is wrong — fix it to `ICON_SIZE` before building.

6. **ALL text is 24px — no exceptions.** Define a single `FONT_SIZE = 24` constant. Container headers, icon labels, arrow labels, numbered circle labels — everything uses `FONT_SIZE`. Never use separate `FONT_HDR`/`FONT_BODY` constants or hardcoded sizes (18, 20, 22). If the styling spec lists different font sizes, the spec is wrong — fix it to `FONT_SIZE` before building.

### Default rules (apply when no reference image or plan specifies otherwise)

3. **Container header text color is black (`#1a1a1a`) by default.** Only containers explicitly called out in the plan or visible in the reference image as having colored text (e.g., "Sales Forecasting Project" in purple) should use non-black `label_color`. Do NOT match `label_color` to `stroke_color` automatically.

## Workflow

Step-by-step processes for planning, building, validating, and exporting diagrams.

### 1. Plan the Diagram
Before writing code:
- List all containers and their nesting hierarchy
- List all service components (icon + label pairs)
- List all connections (arrows) and their direction
- Decide layout direction (left-to-right or top-to-bottom)
- Sketch rough coordinate grid (outer containers first, then inner)
- **Apply Pre-Build Hard Rules above** — verify the plan does not violate any of them

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

# 2. Define layout constants and validate containment
CLOUD_X, CLOUD_Y, CLOUD_W, CLOUD_H = 30, 5, 1780, 980
CHILD_X, CHILD_Y, CHILD_W, CHILD_H = 60, 80, 500, 400
assert CHILD_X + CHILD_W <= CLOUD_X + CLOUD_W - 15, "child overflows parent"
# ... assert for EVERY parent-child container pair

# 3. Create containers (outside-in)
container_box("cloud", CLOUD_X, CLOUD_Y, CLOUD_W, CLOUD_H, "#879196", ...)

# 4. Create service components
icon_label_component("s3", "file-s3", "Amazon S3", cx=400, cy=300)
service_in_container("svc", "file-svc", "Service Name", "container-id")

# 5. Create arrows (stop at container borders for cross-container arrows)
arrow("a1", sx, sy, ex, ey, waypoints=[(wx, wy)])
# or for simple connections:
elbowed_arrow("a2", "source-id", "target-id")

# 6. Validate
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

**Never overwrite a previous version.** Old versions are your rollback safety net. Each export maps 1:1 to a build file.

### MCP/REST Workflows (Without Python)

#### MCP Mode
1. **Call `read_diagram_guide`** first to load design best practices.
2. **Plan your coordinate grid** (see Quality Gate) before writing any JSON.
3. Optional: `clear_canvas` to start fresh.
4. Use `batch_create_elements` with shapes AND arrows in one call.
5. **Assign custom `id` to shapes** (e.g. `"id": "auth-svc"`). Set `text` field to label shapes.
6. **Size shapes for their text** — use `width: max(160, textLength * 9)`.
7. **Bind arrows** using `startElementId` / `endElementId` — arrows auto-route.
8. `set_viewport` with `scrollToContent: true` to auto-fit the diagram.
9. **Run Quality Checklist** — `get_canvas_screenshot` and critically evaluate.

#### REST API Mode
1. Read `references/reference.md` for design guidelines.
2. **Plan your coordinate grid** before writing any JSON.
3. Optional: `curl -X DELETE http://localhost:3000/api/elements/clear`
4. Create elements in one call:
   ```bash
   curl -X POST http://localhost:3000/api/elements/batch \
     -H "Content-Type: application/json" \
     -d '{"elements": [
       {"id": "svc-a", "type": "rectangle", "x": 0, "y": 0, "width": 160, "height": 60, "label": {"text": "Service A"}},
       {"id": "svc-b", "type": "rectangle", "x": 0, "y": 200, "width": 160, "height": 60, "label": {"text": "Service B"}},
       {"type": "arrow", "x": 0, "y": 0, "start": {"id": "svc-a"}, "end": {"id": "svc-b"}}
     ]}'
   ```
5. **Use `"label": {"text": "..."}` for shape labels** (not `"text": "..."`).
6. **Bind arrows with `"start": {"id": "..."}` / `"end": {"id": "..."}`**.
7. **Size shapes for their text** — use `width: max(160, labelTextLength * 9)`.
8. **Run Quality Checklist** — take screenshot, fix issues before adding more elements.

#### Arrow Binding (MCP vs REST)

**MCP Mode** — use `startElementId` / `endElementId`:
```json
{"elements": [
  {"id": "svc-a", "type": "rectangle", "x": 0, "y": 0, "width": 120, "height": 60, "text": "Service A"},
  {"id": "svc-b", "type": "rectangle", "x": 0, "y": 200, "width": 120, "height": 60, "text": "Service B"},
  {"type": "arrow", "x": 0, "y": 0, "startElementId": "svc-a", "endElementId": "svc-b", "text": "calls"}
]}
```

**REST API Mode** — use `start: {id}` / `end: {id}` and `label: {text}`:
```json
{"elements": [
  {"id": "svc-a", "type": "rectangle", "x": 0, "y": 0, "width": 120, "height": 60, "label": {"text": "Service A"}},
  {"id": "svc-b", "type": "rectangle", "x": 0, "y": 200, "width": 120, "height": 60, "label": {"text": "Service B"}},
  {"type": "arrow", "x": 0, "y": 0, "start": {"id": "svc-a"}, "end": {"id": "svc-b"}, "label": {"text": "calls"}}
]}
```

### Iterative Refinement

Each iteration MUST include a quality check.

1. Add elements (`batch_create_elements`, `create_element`, or Python script).
2. `set_viewport` with `scrollToContent: true`.
3. `get_canvas_screenshot` — **critically evaluate** against the Quality Checklist.
4. **If issues found** — fix them (`update_element`, `delete_element`, resize, reposition).
5. `get_canvas_screenshot` again — re-verify fix.
6. **Only proceed to next iteration when ALL quality checks pass.**

How to critically evaluate a screenshot:
- Look at EVERY label — is any text cut off or overflowing its container?
- Look at EVERY arrow — does any arrow pass through an unrelated element?
- Look at ALL element pairs — do any overlap or touch?
- Look at spacing — is anything crammed together?
- **Be honest.** If you see ANY issue, say "I see [issue], fixing it" — not "looks great".

### Other Workflows

**Refine existing diagram:** `describe_scene` to understand state. Identify targets by id/type/label. `update_element` to move/resize/recolor. `get_canvas_screenshot` to verify.

**File I/O:** `export_scene` to .excalidraw JSON. `import_scene` with `mode: "replace"` or `"merge"`. `export_to_image` for PNG/SVG (requires browser). CLI: `node scripts/export-elements.cjs --out diagram.elements.json`.

**Snapshots:** `snapshot_scene` before risky changes. `restore_snapshot` to rollback.

**Duplication:** `duplicate_elements` with `elementIds` and optional `offsetX`/`offsetY` (default 20,20).

**Share:** `export_to_excalidraw_url` uploads encrypted scene, returns shareable URL.

**Viewport:** `set_viewport` with `scrollToContent: true` (zoom-to-fit), `scrollToElementId` (center on element), or `zoom`/`offsetX`/`offsetY` (manual).

## Quality Gate (MANDATORY)

Quality checklist, sizing rules, and layout planning guidelines applied after every iteration.

**After EVERY iteration, you MUST run a quality check before proceeding. NEVER say "looks great" unless ALL checks pass.**

### Quality Checklist
1. **Text truncation**: Is ALL text fully visible? Labels must fit inside their shapes.
2. **Overlap**: Do ANY elements overlap each other? Background zones must fully contain their children with padding.
3. **Arrow crossing**: Do arrows cross through unrelated elements or overlap with text labels? Use curved/elbowed arrows with waypoints to route around obstacles.
4. **Arrow-text overlap**: Do arrow labels overlap with shapes? Adjust arrow path or label position.
5. **Spacing**: At least 40px gap between elements.
6. **Readability**: All labels readable at normal zoom. Font size >= 18 body, >= 20 titles.
7. **Arrow bindings**: Every arrow has start/end binding. Run `validate_arrow_paths()`.
8. **Element overlaps**: Run `validate_diagram()`.

### If ANY issue is found:
- **STOP adding new elements**
- Fix the issue first (resize, reposition, delete and recreate)
- Re-verify with a new screenshot
- Only proceed after ALL checks pass

### Sizing Rules
- **Shape width**: `max(160, labelTextLength * 9)` pixels.
- **Shape height**: 60px for single line, 80px for 2 lines, 100px for 3 lines.
- **Background zones**: Add 50px padding on ALL sides around contained elements.
- **Element spacing**: 60px vertical between tiers, 40px horizontal between siblings.
- **Sibling container spacing**: At least 100px gap between peer containers at the same level (e.g., Coding capabilities ↔ Lakehouse, SageMaker ↔ ML capabilities). Tight gaps (< 60px) make sections look cramped and leave no room for arrow routing. When in doubt, increase the gap rather than decrease it.
- **Outer boundary fit**: After placing all elements, shrink the outermost containers (Cloud, Region) to fit tightly around content — calculate `max(rightmost element edge) + 50px` for the right border, same for bottom. Dead space > 80px on any side means the boundary is too large. Alternatively, if content doesn't fill the boundary, spread sibling containers further apart to use the space evenly.
- **Side panels**: Place at least 80px away from main diagram elements.
- **Arrow labels**: Keep labels short (1-2 words).

### Layout Planning
Before creating elements, plan your coordinate grid:
- Tier 1 (y=50-130): Client apps
- Tier 2 (y=200-280): Gateway/Edge
- Tier 3 (y=350-440): Services (each ~180px apart)
- Tier 4 (y=510-590): Data stores
- Side panels: x < 0 (left) or x > mainDiagramRight + 80 (right)

**Do NOT place side panels at the same x-range as the main diagram — they WILL overlap.**

## Component Reference

Documentation for all component functions in `components.py`.

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

### `numbered_circle(prefix, number, cx, cy, size=50, shape="circle")`
Colored shape with white centered number.
- `shape`: `"circle"` (ellipse), `"square"` (sharp corners), `"rounded"` (rounded rectangle, ~30% corner radius), `"diamond"` (rotated square)
- `bg_color`: background fill (default `#1a1a1a`)
- `text_color`: number color (default `#ffffff`)
- Uses `measure_text()` for accurate text width, then centers `x = cx - tw/2`, `y = cy - th/2`
- Sets `textAlign: "center"` on the text element for proper rendering
- Falls back gracefully if browser alignment (`align_in_parent`) is unavailable
- Returns: `{bg_id, text_id, group_id, bbox}`

### `container_box(cid, x, y, w, h, stroke_color, ...)`
Rectangle with optional header icon + label in top-left.
- `fill_color`: default "transparent"
- `icon_file_id`: optional header icon
- `label_text`: optional header label
- `stroke_style`: "solid" or "dashed"
- `header_fill`: True|False to control header background rectangle
- Returns: `{box_id, icon_id, label_id, group_id, bbox}`

### `service_in_container(prefix, file_id, label_text, container_id, ...)`
Icon+label centered within an existing container. Accounts for 60px header height.

### `grid_2x2(prefix, items, container_id, ...)`
2x2 grid of icon+label components inside a container.
- `items`: `[{"file_id": "...", "label": "...", "id_suffix": "..."}, ...]` (4 items)
- Order: top-left, top-right, bottom-left, bottom-right

### `arrow(aid, start_x, start_y, end_x, end_y, ...)`
Arrow with optional multi-point path via waypoints and optional numbered label.
- `waypoints`: list of `(x, y)` absolute coordinates for intermediate points
- `start_binding`, `end_binding`: dicts with `{"elementId", "focus", "gap"}`
- `elbowed`: if True, enables Excalidraw's built-in A* elbowed routing (client-side)
- `stroke_style`: "solid" or "dashed"
- **Numbered label** — auto-places a circle at the arrow midpoint or a specific segment:
  - `label_number`: number to display (None = no label)
  - `label_bg`: background color (default `#1a1a1a`)
  - `label_text_color`: text color (default `#ffffff`)
  - `label_size`: circle diameter (default 36)
  - `label_font_size`: font size (default 16)
  - `label_offset`: perpendicular offset from arrow in px (None = auto `label_size/2 + 5`). Positive = above for horizontal, right for vertical.
  - `label_shape`: `"circle"`, `"square"`, `"rounded"`, or `"diamond"`
- **Label positioning** (evaluated in priority order):
  1. **`label_cx`, `label_cy`** — Manual override. Use **only** when auto position causes overlap with container borders, icons, or other elements, or when the reference image explicitly shows non-centered placement. Both must be set together. Always add a comment explaining *why* the override is needed.
  2. **`label_segment`** — 0-based segment index for multi-segment (L/U/Z) arrows. Supports negative indexing (`-1` = last segment). Centers the circle on that segment's midpoint. Segments: `0 = start→wp[0]`, `1 = wp[0]→wp[1]`, ..., `-1 = wp[-1]→end`.
  3. **(default)** — Centers at 50% distance along the full path. Best for straight arrows and U-shapes where the path midpoint falls on a horizontal segment.
- Offset direction is automatic: horizontal segments → circle above, vertical segments → circle to the right.
- Returns: `{arrow_id, label, segments}` where `label` is `{prefix, cx, cy, number, segment}` or `None`, and `segments` is a list of segment info dicts.

**Usage examples:**
```python
# Straight arrow — auto midpoint (default)
arrow("a1", x1, y1, x2, y2, label_number=1)

# L-shaped arrow — label on last horizontal segment
arrow("a2", x1, y1, x2, y2, waypoints=[(wx, wy)],
      label_number=2, label_segment=-1)

# Override — midpoint lands on VPC border, shift right
arrow("a3", x1, y1, x2, y2,
      label_number=3, label_cx=VPC_RIGHT + 40, label_cy=y2 - COFFSET)
```

### `elbowed_arrow(aid, start_id, end_id, ...)`
Simplified arrow creation with elbowed routing and element bindings.
- Reads element positions automatically
- Sets up start/end bindings
- **Note:** Routing happens client-side (React frontend) — server stores 2-point path

### `text_box(prefix, text, cx, cy, ...)`
Text element with optional border rectangle.
- `min_width`, `max_height`: constrain dimensions for uniform sizing
- `font_size`: text size

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

## Containers: Layout, Nesting & Borders

All rules for creating, sizing, nesting, and styling container elements.

### Mandatory Containment Validation (Every Build Script)

Every build script MUST include **containment assertions** for ALL nested containers. This is not optional — silent overflow is the #1 source of visual bugs.

**The pattern:** For every child container, assert all 4 edges are inside its parent with clearance:

```python
CLEARANCE = 15  # minimum px between child edge and parent edge

# Generic containment check — add for EVERY parent-child pair
def assert_contained(child_name, cx, cy, cw, ch, parent_name, px, py, pw, ph, hdr_h):
    """Assert child container is fully inside parent with clearance."""
    assert cx >= px + CLEARANCE, \
        f"{child_name} left edge ({cx}) too close to {parent_name} left ({px})"
    assert cx + cw <= px + pw - CLEARANCE, \
        f"{child_name} right edge ({cx+cw}) overflows {parent_name} right ({px+pw})"
    assert cy >= py + hdr_h, \
        f"{child_name} top ({cy}) crosses {parent_name} header (ends at {py+hdr_h})"
    assert cy + ch <= py + ph - CLEARANCE, \
        f"{child_name} bottom ({cy+ch}) overflows {parent_name} bottom ({py+ph})"

# Call for EVERY parent-child pair in your diagram. Example for a 2-account layout:
assert_contained("SectionA",  SEC_A_X, SEC_A_Y, SEC_A_W, SEC_A_H,
                 "Account1",  ACCT1_X, ACCT1_Y, ACCT1_W, ACCT1_H, HDR_HEIGHT)
assert_contained("SectionB",  SEC_B_X, SEC_B_Y, SEC_B_W, SEC_B_H,
                 "Account1",  ACCT1_X, ACCT1_Y, ACCT1_W, ACCT1_H, HDR_HEIGHT)
assert_contained("Account1",  ACCT1_X, ACCT1_Y, ACCT1_W, ACCT1_H,
                 "Cloud",     CLOUD_X, CLOUD_Y, CLOUD_W, CLOUD_H, HDR_HEIGHT)
assert_contained("Account2",  ACCT2_X, ACCT2_Y, ACCT2_W, ACCT2_H,
                 "Cloud",     CLOUD_X, CLOUD_Y, CLOUD_W, CLOUD_H, HDR_HEIGHT)
# Add more for every nesting relationship in your specific diagram
```

**Place these assertions BEFORE any `container_box()` calls** so the script fails fast on layout errors, not after creating 80+ elements.

### Container Auto-Expansion Trap

`container_box` silently expands its width to fit header text + icon. Your layout math assumes one width, but the rendered container is wider. This overflow is invisible in code and causes nested containers to break out of their parent.

**How to prevent:**
1. **Estimate minimum width** before setting constants: `min_w = icon_header_size + 10 + len(header_text) * font_size * 0.6`
2. **Always set width >= estimated minimum** so auto-expansion doesn't kick in
3. **Run containment assertions** (above) which catch overflow even if estimation is off

```python
# WRONG: width smaller than header needs → auto-expands silently, may overflow parent
CHILD_W = 230   # header "Service Name\nworkflow" + icon needs ~285px → expands past parent!

# CORRECT: estimate first, set width >= estimate
header_text = "Service Name\nworkflow"
est_w = ICON_SIZE + 10 + len(max(header_text.split("\n"), key=len)) * FONT_HDR * 0.6
CHILD_W = max(est_w, 285)  # explicit width exceeds auto-expansion threshold
```

**When you change any container's header text, icon size, or font size**, re-check that the explicit width still exceeds auto-expansion. This is the most common trigger for overflow bugs.

### Subsection Borders Must Stay Inside Parent

Every nested container must be **fully contained** within its parent with at least 15px clearance on all sides. When space is tight:

1. **Expand** the parent container outward (increase width/height)
2. **Push** sibling containers further away (increase X/Y offset)
3. **Expand** the cloud boundary to fit
4. **Shift** all elements inside pushed containers by the same delta

**Never shrink** a parent to make room — always grow outward.

```python
# When pushing a sibling container, shift ALL its internal elements by the same delta:
# SIBLING_X += 50  →  all sibling's icons, labels, arrows += 50  →  CLOUD_W += 50
```

### Sibling Containers Must Not Overlap

`fit_container()` only **grows** containers, never shrinks them. If the initial width/height is too large, the container keeps that oversized dimension. This causes sibling containers to overlap when the initial size extends into a neighbor's space.

**Rule:** Set initial container dimensions to a **tight estimate** — just large enough to hold children. Let `fit_container()` grow as needed. Verify at least 20px gap between sibling containers after auto-sizing.

```python
# WRONG: initial width 480 is too generous — right edge (570) overlaps Client API at x=560
container_box("web-ui", 90, 70, 480, 410, ...)

# CORRECT: initial width 380 fits children tightly — auto-grows to ~400, leaves 160px gap
container_box("web-ui", 90, 70, 380, 410, ...)
```

**How to estimate initial width:** sum the widest child element width + labels + padding (20px each side). When in doubt, undersize — `fit_container()` will expand.

### HARD RULE: AWS Cloud Boundary Is Always SOLID — Never Dashed

See also Pre-Build Hard Rules (rule #1).

**The AWS Cloud container MUST use `stroke_style="solid"`.** This is the single most common mistake in diagram builds. Every other container can be dashed or solid per the reference image, but the outermost AWS Cloud boundary is ALWAYS a solid, uninterrupted line.

```python
# CORRECT — AWS Cloud is solid
container_box("aws-cloud", ..., stroke_style="solid", ...)

# WRONG — dashed cloud boundary
container_box("aws-cloud", ..., stroke_style="dashed", ...)  # NEVER do this
```

### Cloud Provider Boundary Is Always the Outermost Container
The cloud provider boundary (e.g., "AWS Cloud") is **always the outermost container** encompassing all cloud services. Service-specific containers are **nested inside** — never as siblings.

```
Correct hierarchy:
  AWS Cloud (outer, solid line)
    +-- AWS Region (dashed)
    +-- Service containers (solid or dashed per reference)

Wrong:
  AWS Cloud (left)     Step Functions (right, sibling)
```

**Rules:**
- Cloud boundary must encompass **all** nested containers and their children (including labels)
- Only external/on-premise elements sit outside the cloud boundary
- Cloud boundary must be **visibly larger** than nested containers on **all sides** — at least 30px clearance

### Every Container Header MUST Have an Icon
Every `container_box()` call MUST include an `icon_file_id` parameter. Headers without icons look inconsistent and break the visual pattern. If a container represents a cloud provider section, use the provider logo; if it represents an account or service, use the matching service icon.

```python
# CORRECT: every container has a header icon
container_box("cloud", ..., icon_file_id="file-cloud-logo", label_text="AWS Cloud")
container_box("account", ..., icon_file_id="file-account", label_text="Account Name")
container_box("service", ..., icon_file_id="file-service", label_text="Service Name\nworkflow")

# WRONG: missing icon_file_id — header will have text only, no icon
container_box("account", ..., label_text="Account Name")
```

### Align Containers at Matching Levels
1. **Outer containers** side-by-side must share the same `y` and `header_height` (`HDR_HEIGHT`).
2. **Inner sub-sections** at same nesting level must share the same `y`. Derive from parent: `SUB_Y = PARENT_Y + HDR_HEIGHT + gap`.
3. **Stacked containers** must share the same `x` and width.

**SUB_Y gap rule:** Gap between `HDR_HEIGHT` and `SUB_Y` must clear tallest header text. For 2-line text at `FONT_HDR`, add at least `FONT_HDR * 1.25` as gap.

### Minimum 20px Gap Between Adjacent Header Icons
When a child container's header is directly below its parent's header (e.g., AWS Region → Amazon SageMaker), there must be at least **20px of clear space** between the bottom of the parent header icon and the top of the child header icon. This prevents headers from appearing cramped or overlapping.

**Formula:** `child_Y ≥ parent_Y + ICON_SIZE + 20`

```python
# AWS Region at y=65, ICON_SIZE=65 → header bottom at 130
# SageMaker must start at y ≥ 150 (130 + 20)
container_box("aws-region", 240, 65, ...)
container_box("sagemaker", 270, 150, ...)  # 150 - 130 = 20px gap ✓
```

This rule applies whenever two container headers are vertically adjacent (parent-child or stacked siblings). Side-by-side containers at the same nesting level share the same `y` and don't need this gap.

### Header Icon + Label Vertical Alignment
The header icon is placed flush at the container's top-left corner. Both `icon_header_size` and `header_height` must equal `ICON_SIZE` — the same constant used for service icons.

```python
# CORRECT: single ICON_SIZE for everything
ICON_SIZE = 65   # always 65
container_box("cloud", ..., icon_header_size=ICON_SIZE, header_height=ICON_SIZE)

# WRONG: different sizes for header vs service icons
container_box("cloud", ..., icon_header_size=32, header_height=55)
```

### HARD RULE: Container Border Color Must Match Header Icon Color

The `stroke_color` of a container MUST match the color of its header icon. AWS icons have built-in category colors (teal for AI/ML, red for Security, purple for Analytics, etc.). The container border should use the same color as the icon's category. This creates visual consistency between the icon and the container it represents.

```python
# CORRECT: SageMaker is AI/ML (teal), so border is teal
container_box("sagemaker", ..., stroke_color=TEAL, icon_file_id="file-sagemaker-ai")

# CORRECT: IAM is Security (red), so border is red
container_box("iam-section", ..., stroke_color="#DD344C", icon_file_id="file-iam")

# WRONG: random border color that doesn't match the icon
container_box("sagemaker", ..., stroke_color="#879196", icon_file_id="file-sagemaker-ai")
```

### HARD RULE: Container Header Text Is Black by Default

See also Pre-Build Hard Rules (rule #3).

Container header `label_color` MUST be black (`TEXT_COLOR` / `#1a1a1a`) unless the plan or reference explicitly specifies a colored header for that specific container. Do NOT automatically match `label_color` to `stroke_color` — colored header text should be the rare exception (e.g., a Lakehouse container), not the default. When in doubt, use black.

```python
# CORRECT: black text by default, even though border is teal
container_box("region", ..., stroke_color=AWS_TEAL, label_color=TEXT_COLOR)
container_box("service", ..., stroke_color=PURPLE, label_color=TEXT_COLOR)

# WRONG: matching label color to border color by default
container_box("region", ..., stroke_color=AWS_TEAL, label_color=AWS_TEAL)
```

### Icon-less Container Headers Are Centered
When a container has no icon (`icon_file_id` omitted), the header label is **horizontally centered** within the container width. This matches how reference diagrams style sub-sections like "Authentication" that have a label but no icon. `components.py` handles this automatically.

### Hard Rule: No Icon or Circle May Cross Any Container Border
Every icon, icon background rectangle, and numbered circle must be **fully inside** or **fully outside** every container. To ensure clearance: `element_edge = cx + radius` must be `< container_border - 15` (inside) or `> container_border + 15` (outside).

### Account for Label Width Near Container Borders
Service icon labels (e.g. "Amazon Rekognition" ~190px wide) extend far beyond the icon itself. When placing icons near a container edge, ensure the **label's edge** clears the container border by at least 30px: `icon_cx - (max_label_width / 2) > container_right_edge + 30`.

### Container Header Pinning — Icon and Title Stay at Top-Left

The `container_box()` component places the header icon and label at the container's top-left corner. When `fit_container()` resizes a container (shifting its x/y), all header elements in the container's group are automatically moved by the same delta so they remain pinned to the new top-left. Never manually reposition header elements after `fit_container()` — this is handled internally.

## Arrows: Routing, Endpoints & Labels

Rules for drawing, routing, and connecting arrows between elements.

### Primary: Elbowed Arrows (built-in Excalidraw routing)

Use `elbowed_arrow()` for all connections. Excalidraw's React frontend handles A* pathfinding client-side.

```python
elbowed_arrow("a1", "img-source", "img-target")
```

**How it works:** Python creates the arrow with `elbowed: true` and element bindings. The server stores a 2-point path. When the frontend renders it, Excalidraw's built-in router calculates the actual elbowed path.

**Limitation:** Server-stored points are just start-end, not the actual routed path. Use visual inspection for validation.

### Fallback: Python + MCP Tweaking

If elbowed arrows don't route well:
1. Create basic arrows with `arrow()` using explicit waypoints
2. Inspect visually via MCP `get_canvas_screenshot` or browser
3. Tweak individual arrows via MCP `update_element` to adjust points
4. Re-inspect until routing looks clean

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

### Curved Arrows (MCP/REST)

For non-Python usage, add intermediate waypoints + `roundness`:
```json
{
  "type": "arrow", "x": 100, "y": 100,
  "points": [[0, 0], [50, -40], [200, 0]],
  "roundness": {"type": 2},
  "strokeColor": "#1971c2"
}
```

**When to use which:**
- **Fan-out arrows** (one source, many targets): Curved arrows with waypoints spread vertically.
- **Cross-lane arrows** (connecting to side panels): Elbowed arrows that route around the main diagram.
- **Inter-service arrows** (horizontal connections): Curved arrows with slight vertical offset.

**Rule:** If an arrow would cross through an unrelated element, add a waypoint to route around it.

### Arrow Routing Best Practices

**1. Prefer simple L-shapes (1 waypoint) over complex multi-waypoint routes.**
When an arrow needs to avoid an obstacle, first try changing the EXIT SIDE of the source icon rather than adding waypoints to dodge. For example, exiting from the RIGHT of an icon instead of the TOP can naturally clear a container header — one L-bend vs four waypoints.

**2. NEVER cross container header text or icons.**
Container headers occupy the top-left area of the container border. Arrows exiting a container must cross the border at a portion WITHOUT header content — typically the right side, bottom, or left side below the header. Use `check_arrow_header_overlaps()` to verify. This is a HARD RULE with no exceptions.

**3. Arrows approaching from the label side must stop at the label boundary.**
When an arrow arrives at an icon from the direction where its label text sits (e.g., from below when the label is below the icon), ending at the icon edge (`icon_cy ± ICON_R`) forces the shaft through the label — a HARD RULE violation. Instead, end the arrow at the component's label bottom:
```python
target_bottom = target_component["bbox"]["y"] + target_component["bbox"]["h"]
arrow("a1", sx, sy, target_icx, target_bottom + 2, ...)
```
Alternatively, use an L-shape to approach the icon from a non-label side (left/right edge at `icon_cy`).

**4. Enter icons from label-free sides.**
When connecting an arrow to an icon, prefer entering from a side where no label text exists (typically LEFT or RIGHT). Avoid entering from below when the label is below the icon — the arrow will cross through the label. When an old arrow is removed, its entry point becomes a natural clean path for a replacement arrow.

**5. Offset vertical segments to avoid same-x icons.**
If two icons share the same x-coordinate (e.g., in a grid column), a vertical arrow segment at that x will cross through the lower icon's label. Route the vertical segment at a different x — for example, the midpoint between grid columns. Before committing to a vertical segment x, check if any other icons/labels exist at that x along the path.

**6. Choosing the right exit side — work backwards from clearance.**
Before writing arrow code, check what obstacles exist between source and target. Pick the source exit side that gives the most direct path with fewest crossings:
- **Header in the way at top?** → Exit from RIGHT or LEFT, L-shape up
- **Label in the way below target?** → End at label bottom, or L-shape to enter from the side
- **Other container in the way?** → Route through gaps between containers
- **Same-x icon below?** → Offset vertical segment to a clear corridor between columns

### Arrows Must Not Cross Unrelated Section Boundaries
Arrows must only cross a container border when they are **entering or leaving** that container. An arrow must NEVER pass through a container it has no business with.

**Example violation:** An arrow between two services routed vertically through an unrelated sub-section — the arrow has no logical connection to that section, so it must not cross its border.

**Fix:** Add waypoints to route the arrow AROUND the unrelated section:
```python
# WRONG: vertical segment crosses through an unrelated container
arrow("a-src-tgt", src_cx, src_cy, tgt_cx, tgt_cy,
      waypoints=[(src_cx, tgt_cy)])  # passes through unrelated section!

# CORRECT: jog past the section's edge first, then up/down
SECTION_RIGHT = SECTION_X + SECTION_W
ROUTE_X = SECTION_RIGHT + 15  # clear the border
arrow("a-src-tgt", src_cx, src_cy, tgt_cx, tgt_cy,
      waypoints=[(ROUTE_X, src_cy), (ROUTE_X, tgt_cy)])  # routes around
```

**Validation:** For every arrow segment, check that it does not intersect any container border it's not supposed to cross. Especially watch for:
- Vertical segments passing through adjacent sub-sections
- Horizontal segments crossing nested container tops/bottoms

### Arrows Must Not Cross Container Header Text or Icons
When an arrow exits or enters a container, it crosses the container border. Container headers (icon + label text) sit at the top-left of the border. If the arrow crosses the border WHERE the header is, it visually crosses through the header text/icon — this is a HARD RULE violation.

**Fix:** Route the arrow to cross the container border at a non-header section:
```python
# WRONG: arrow exits through the top of the container at x=460, crossing header text
arrow("a3", src_cx, src_cy - ICON_R, tgt_cx, tgt_cy,
      waypoints=[(src_cx, tgt_cy)])

# CORRECT: exit from the RIGHT side of the icon, L-shape past the header
# Header text ends at x~551, so x=592 is past it — no crossing
arrow("a3", src_cx + ICON_R, src_cy, tgt_icx, tgt_bottom + 2,
      waypoints=[(tgt_icx, src_cy)])  # right then up, clears header
```

**How to identify the clear zone:** Query the header text element position (e.g., `coding-cap-lbl` at x=355 with width ~196px → right edge ~551). Any arrow segment at x > 551 passes to the RIGHT of the header. Use `check_arrow_header_overlaps()` to verify.

**Quick rule of thumb:** Container headers typically occupy the LEFT 60-70% of the top border. Arrows exiting through the RIGHT 30% of the top border, or through the side/bottom walls, will avoid the header.

### Arrows Crossing Container Borders

**Rule: an arrow must stop at the border of any container it enters.** It must NOT reach deep inside to target an icon within a nested container. The visual convention is a "hand-off" at the container edge.

**When to apply:** Any arrow whose source is OUTSIDE a container and whose logical target is a service INSIDE that container.

```python
# WRONG: arrow from outside pierces through container to reach icon inside
arrow("a1", source_cx + ICON_R, source_cy,
      target_icon_cx - ICON_R, target_icon_cy, ...)  # ends at icon deep inside

# CORRECT: arrow stops at the container border
arrow("a1", source_cx + ICON_R, source_cy,
      container_x + container_w, target_icon_cy, ...)  # ends at container edge
# (use container_x for left border, container_x + container_w for right border, etc.)
```

**How to decide which border:** Use the border face the arrow approaches from:
- Arrow coming from the right → stop at `container_x + container_w` (right edge)
- Arrow coming from the left → stop at `container_x` (left edge)
- Arrow coming from below → stop at `container_y + container_h` (bottom edge)
- Arrow coming from above → stop at `container_y + hdr_height` (top edge, below header)

**Arrows between services in the SAME container** connect directly to icon centers as normal — this rule only applies when crossing a container boundary from outside.

### Arrow Endpoints: Connect at Image Center, Not Component Center
`icon_label_component` centers the entire component (icon + gap + label) at `cy`. The **actual icon image center** is shifted up by `ICON_VSHIFT = (gap + label_height) / 2`. All arrows must connect at image centers.

```python
COMP_GAP = 8
LABEL_1LINE_H = FONT_BODY * 1.25         # ~25px
ICON_VSHIFT = (COMP_GAP + LABEL_1LINE_H) / 2   # ~16.5px

# Place icons with cy = ROW_Y + ICON_VSHIFT so image center lands at ROW_Y
icon_label_component("svc", "file-svc", "Service Name", cx=SVC_X, cy=ROW_Y + ICON_VSHIFT, ...)

# Label-less icons: image center IS at cy, no shift needed
icon_label_component("people", "file-users", None, cx=50, cy=ROW_Y, ...)

# Horizontal arrows at ROW_Y — connects all centers cleanly
arrow("a1", CIRCLE_X + CIRCLE_R, ROW_Y, SVC_X - ICON_R, ROW_Y, ...)
```

**Rules:**
- Shift `cy` by `+ ICON_VSHIFT` so image center lands at row Y
- Label-less icons: no shift needed
- Horizontal arrows: both endpoints at same Y
- Vertical arrows between icons: start below source label, end **below target label** (not at icon border)

### Arrow Endpoints Must Clear Labels

When an arrow approaches a component from the **label side** (below, when labels are below icons), the arrow must stop below the label text — never pierce through the label to reach the icon. Add 7px below the label bottom for a clean visual gap (the validator may still flag this as a false positive due to its 15px margin — that's expected).

```python
# WRONG: arrow pierces through "Amazon Cognito" label to reach icon border
arrow("a-s3-cognito", S3_CX, S3_CY - ICON_R,
      COGNITO_CX, COGNITO_CY + ICON_R, ...)  # ends at icon bottom

# CORRECT: arrow stops 25px below the label bottom
LABEL_BOTTOM = COGNITO_CY + ICON_R + COMP_GAP + FONT_BODY * 1.25
arrow("a-s3-cognito", S3_CX, S3_CY - ICON_R,
      COGNITO_CX, LABEL_BOTTOM + 7, ...)  # 7px visual gap below label
```

**Formula:** `endpoint_y = target_icon_cy + ICON_R + COMP_GAP + (lines * FONT_BODY * 1.25) + 7`

### HARD RULE: No Diagonal Arrow Segments — Every Segment Must Be Perfectly Horizontal or Vertical

**Every arrow segment must be either perfectly horizontal (same Y for start and end) or perfectly vertical (same X for start and end). Diagonal lines are NEVER allowed.** This applies to all arrows — straight, L-shaped, Z-shaped, or any other shape. If an arrow appears diagonal, it means the connected icons are misaligned.

**How to prevent diagonal arrows:**
1. **Horizontal arrows:** All connected icons must share the same `icon_cy`. Before writing arrow code, print all `icon_cy` values and verify they match. Even 1px difference creates a visible diagonal at full zoom.
2. **Vertical arrows:** All connected icons must share the same `icon_cx`.
3. **L-shaped arrows:** The waypoint must share one coordinate with the start and one with the end — e.g., `waypoints=[(end_x, start_y)]` for a right-then-down L-shape.
4. **Multi-icon chains:** When 3+ icons are connected by horizontal arrows (e.g., User → IAM → Studio), ALL icons in the chain must share the same `icon_cy`. Align the entire chain first, then draw the arrows.

**Verification:** After creating icons, print their `icon_cy` (or `icon_cx` for vertical chains) and confirm they match before proceeding to arrows. If they don't match, adjust the `cy`/`cx` parameter of the misaligned icon.

```python
# WRONG: icons at different cy values → diagonal arrow
ml_eng = icon_label_component("ml", "file-user", "ML engineers", 55, 300, icon_size=50)
iam = icon_label_component("iam", "file-iam", "IAM", 180, 300, icon_size=65)
# ml_eng icon_cy=274, iam icon_cy=274 ✓ — but if icon_size differs, cy must compensate!
unified = icon_label_component("uni", "file-sm", "Unified Studio", 380, 310, icon_size=65)
# unified icon_cy=284 ✗ — 10px off → diagonal arrow!

# CORRECT: all icons in chain share same icon_cy
unified = icon_label_component("uni", "file-sm", "Unified Studio", 380, 300, icon_size=65)
# unified icon_cy=274 ✓ — matches chain

# For vertical connections, align cx:
# WRONG: S3 at cx=390, Cognito at cx=290 → diagonal
# CORRECT: S3_CX = COGNITO_CX
```

### STRICT: Global `ARROW_STYLE` Constant — Single Source of Truth for All Arrows

**Every build script MUST define one `ARROW_STYLE` dict using `arrow_style()` from `components.py`, then unpack it into every `arrow()` call with `**ARROW_STYLE`.** This is non-negotiable. Never pass `stroke_color`, `stroke_width`, `stroke_style`, `label_bg`, `label_text_color`, `label_size`, or `label_font_size` as individual arguments to `arrow()` — they all come from the single dict.

Only per-arrow overrides (coordinates, `waypoints`, `start_arrowhead`, `end_arrowhead`, `label_number`, `label_segment`, `label_cx`/`label_cy`, `label_bg` for colored circles) are passed directly. If a specific arrow needs a different `label_bg` (e.g. orange for a highlight), pass it after `**ARROW_STYLE` so it overrides that one key.

```python
# components.py provides arrow_style():
ARROW_STYLE = arrow_style(
    stroke_color=DARK, stroke_width=2, stroke_style="solid",
    label_bg=CIRCLE_BG, label_text_color="#ffffff",
    label_size=CIRCLE_SIZE, label_font_size=FONT_BODY,
)

# WRONG: repeating style params on every call
arrow("a1", x1, y1, x2, y2,
      stroke_color=DARK, stroke_width=2,
      label_number=1, label_bg=CIRCLE_BG, label_size=CIRCLE_SIZE, label_font_size=FONT_BODY)

# CORRECT: unpack global style, only pass per-arrow params
arrow("a1", x1, y1, x2, y2, **ARROW_STYLE, label_number=1)

# CORRECT: override label_bg for colored circle
arrow("a2", x1, y1, x2, y2, **ARROW_STYLE, label_number=5, label_bg=ORANGE)

# CORRECT: bidirectional arrow
arrow("a3", x1, y1, x2, y2, **ARROW_STYLE,
      start_arrowhead="arrow", end_arrowhead="arrow", label_number=7)
```

**Minimum segment length rule**: Every arrow segment ending with an arrowhead must be at least **50px long**. Shorter segments cause arrowheads to visually fill the segment. For staggered L-shaped arrows sharing a start point, distribute vertical-line X-offsets with equal gaps so all final horizontal segments stay above 50px.

Bidirectional arrows explicitly set `start_arrowhead="arrow", end_arrowhead="arrow"`. One-way arrows leave `start_arrowhead=None` (default). No other arrowhead types should be used.

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

## Numbered Circles

Rules for placing, sizing, and connecting numbered step circles on arrows.

### Numbered Circle Placement: Offset from Arrows with 5px Margin
Circles mark flow steps and must be placed **adjacent to** their arrow, not on it. Draw full continuous arrows, then place circles offset with a visible gap.

**Offset rules:**
- **Horizontal arrows:** circle sits **ABOVE or BELOW** the arrow. `CY = arrow_y ∓ COFFSET`
- **Vertical arrows:** circle sits to the **LEFT or RIGHT**. `CX = arrow_x ∓ COFFSET`
- **COFFSET** = `CIRCLE_R + 5 + stroke_width/2` (e.g. radius 20 + 5px gap + 1px half-stroke = 26)
- **Choose the side with the most space** — avoid placing circles where they'd overlap with icons, labels, containers, or other circles. If a component sits above the arrow, place the circle below instead. If the left side is crowded, use the right.

**Three hard rules:**
1. **Full continuous arrows:** Draw ONE arrow from source to target. Never split arrows.
2. **5px visible margin:** Between the arrow line's visual edge and the circle's edge — no touching, no overlap.
3. **No border crossings:** Every circle must be fully inside or fully outside every container (15px clearance from borders). **Do not use midpoint formulas blindly** — when an arrow crosses a container border, the midpoint may land on the border. Instead, calculate the circle position, then verify it against all nearby container edges (left, right, top, bottom). If the circle edge is within 15px of any border, shift it to the nearest safe side.

```python
# WRONG: midpoint lands on the Web UI border
C6_CX = (DYNAMO_CX + LAMBDA_SET_CX) / 2  # = 460, but Web UI right edge is ~478

# CORRECT: explicitly position outside the container with clearance
C6_CX = 510  # Web UI right ~478, circle left = 510-18=492 → 14px clearance
```

**Pattern:**
```python
COFFSET = CIRCLE_R + 5 + 1   # 26px: radius + 5px gap + half stroke

# Horizontal arrow — circle above (or below if space above is tight)
arrow("a-src-tgt", SRC_X + ICON_R, ROW_Y, TGT_X - ICON_R, ROW_Y, ...)
numbered_circle("c1", 1, cx=MID_X, cy=ROW_Y - COFFSET, ...)  # above
numbered_circle("c2", 2, cx=MID_X, cy=ROW_Y + COFFSET, ...)  # below (if above is blocked)

# Vertical arrow — circle to whichever side has more room
arrow("a-trunk", COL_X, START_Y, COL_X, END_Y, ...)
numbered_circle("c3", 3, cx=COL_X - COFFSET, cy=MID_Y, ...)  # left
numbered_circle("c4", 4, cx=COL_X + COFFSET, cy=MID_Y, ...)  # right (if left is blocked)

# L-shaped arrow — circle beside the vertical segment
BEND_X = 290
arrow("a-src-tgt", SRC_X, SRC_Y, TGT_X, TGT_Y, ...,
      waypoints=[(BEND_X, SRC_Y), (BEND_X, TGT_Y)])
numbered_circle("c1", 1, cx=BEND_X - COFFSET, cy=MID_Y, ...)
```

**Choosing the offset side:**
1. Check which side of the arrow has the most free space (no icons, labels, borders)
2. Prefer above/left as default, but switch to below/right when that side is blocked
3. Verify the chosen position doesn't overlap with any element or cross any border

**Important:** Arrow waypoints must NOT reference circle positions. Define bend/turn coordinates independently, then derive circle positions from them.

**WRONG:** Placing circles on arrows (overlapping), splitting arrows into segments, or having zero margin between arrow lines and circles.

### Arrow Endpoints Must Not Touch Numbered Circles
Arrowhead triangles extend ~10px backward from the tip. When a numbered circle sits on an arrow path, ensure it is positioned on the **body** of the arrow — away from both endpoints. The arrowhead tip and its triangle must have clear space (no overlap) with the circle edge.

**Fix strategies:**
- Move the circle further along the arrow body (away from the endpoint)
- Move the circle slightly left/right if it's too close to where the arrowhead renders
- For circles in tight spaces (e.g., between a container border and an icon), place them in a gap between containers rather than inside one

```python
# WRONG: circle right edge (475) overlaps arrowhead triangle extending from (487, 210)
C8_CX = 455;  C8_CY = 184  # too close to arrow endpoint at (487, 210)

# CORRECT: move circle left so arrowhead has clearance
C8_CX = 435;  C8_CY = 184  # 20px further from arrowhead
```

### Numbered Circles Must Be Attached to Arrows

Every numbered circle should be created by `arrow(..., label_number=N)` — not as a standalone `numbered_circle()` call. This ensures circles automatically track arrow positions when icons move.

**Positioning priority:**
1. **Default** — auto midpoint. Correct for straight arrows and U-shapes.
2. **`label_segment=N`** — for L/Z-shaped arrows where the midpoint falls on the wrong segment. Specify which segment the circle belongs to (0-indexed, supports `-1` for last).
3. **`label_cx`, `label_cy`** — manual override. Use **only** when auto/segment placement causes overlap with container borders or nearby elements, or when the reference image explicitly shows non-centered placement. Always comment why.

```python
# Straight arrow — auto midpoint (preferred)
arrow("a1", x1, y1, x2, y2, label_number=1)

# L-shaped — circle on last horizontal segment
arrow("a2", x1, y1, x2, y2, waypoints=[...],
      label_number=2, label_segment=-1)

# Override — auto midpoint lands on VPC border
arrow("a3", x1, y1, x2, y2,
      label_number=3, label_cx=VPC_RIGHT + 40, label_cy=y - COFFSET)
      # override: midpoint at VPC border, shift outside
```

**Only use standalone `numbered_circle()`** for circles that have no associated arrow (e.g., Circle 4 between two icons in the same container) or circles on `vertical_stack` arrows that aren't directly accessible.

**Standalone circles are a red flag.** Numbered circles very rarely appear on their own — almost every circle belongs to an arrow. If you see a standalone `numbered_circle()` in a build script, double-check `icons_graph_structure.md` to verify no arrow was missed or accidentally deleted.

### Numbered Circle Shape & Color Must Match the Reference

Do not default to dark circles (`#1a1a1a`, shape `"circle"`) without checking. The reference image or plan may specify different shapes (square, rounded, diamond) and colors (blue, teal, red, etc.) for numbered badges. Always:

1. Check `icons_graph_structure.md` — the "Number box style" column specifies shape and color per arrow.
2. Set `label_shape` and `label_bg` in `arrow_style()` if all arrows share the same style, or override per-arrow if they differ.
3. For standalone circles, pass `shape=` and `bg_color=` to `numbered_circle()`.

```python
# All arrows use blue rounded squares
ASTYLE = arrow_style(label_bg="#2563eb", label_shape="rounded", ...)

# Mix: most are dark circles, arrow 3 is a blue diamond
ASTYLE = arrow_style(label_bg="#1a1a1a", label_shape="circle", ...)
arrow("a3", ..., label_number=3, label_bg="#2563eb", label_shape="diamond", **ASTYLE)
```

## Icons & Visual Consistency

Rules for icon styling, z-ordering, sizing constants, and visual uniformity.

### HARD RULE: No Borders on Any Icon — Image Elements, Backgrounds, or Circles
**All image elements (`type: "image"`) MUST have `strokeWidth: 0`.** Excalidraw renders a default 1px border on images if strokeWidth is not explicitly set to 0. This applies to both service icons and container header icons. Enforced in `components.py` (`icon_label_component` and `container_box` both set `strokeWidth: 0` on image elements).

Additionally, icon background rectangles and numbered circle ellipses must have `strokeWidth: 0` and `strokeColor: "transparent"`.

**SVG-level borders:** Some AWS Category icons (`Arch-Category_*`) have a gray `#879196` border baked into the SVG itself (a `<rect stroke="#879196">` element). Architecture icons (`Arch_*`) do NOT have this. If a category icon shows a border, create a custom copy in `icons/custom/` with the border rect removed and the fill rect extended to cover the full viewBox. Match the Architecture icon format: `viewBox="0 0 64 64"` with fill at `x=0, y=0, width=64, height=64`.

### AWS Icons Have Built-in Backgrounds — Don't Add `icon_bg_color`
AWS official SVG icons already include colored background fills. Adding `icon_bg_color` creates a second, mismatched background. **Do not use `icon_bg_color` for AWS service icons.** Only use it for custom icons with no built-in background.

### Z-Order: Containers → Icons → Arrows → Circles
Elements render in creation order (first created = bottom layer). The correct build order is:
1. **Containers** (background, lowest layer)
2. **Service icons + labels** (on top of containers)
3. **Arrows** (on top of icons — arrow lines connect between services)
4. **Numbered circles** (highest layer — circles sit ON TOP of arrows, cleanly covering arrow endpoints where they split)

### Consistent Styling via Shared Constants
Same-category elements must use **identical style parameters** defined as shared constants at the top of the script.

```python
# Shared style constants (top of script)
CIRCLE_BG = "#1a1a1a"   # All numbered circles — same color
CIRCLE_SIZE = 40         # All numbered circles — same size
ICON_SIZE = 65           # ALL icons — service icons AND container header icons. Always 65px.
FONT_HDR = 28            # Container header labels only
FONT_BODY = 20           # Everything else: icon labels, numbers, arrows, text boxes
```

**HARD RULE: A diagram uses exactly 1 font size — `FONT_SIZE = 24` for ALL text.** Container headers, icon labels, arrow labels, numbered circle labels — everything is 24px. No `FONT_HDR`/`FONT_BODY` split. Define a single `FONT_SIZE = 24` constant and use it everywhere. Any hardcoded font size (18, 20, 22) or separate constants (`FONT_HDR`, `FONT_BODY`) are bugs.

Categories that must be uniform within a diagram:
- **Font size**: exactly 1 — `FONT_SIZE = 24` for all text (headers, labels, circles, arrows)
- **Numbered circles**: same `size`, `bg_color`, and `font_size`
- **All icons (service + header)**: same size via single `ICON_SIZE` constant — service icons use `icon_size=ICON_SIZE`, container headers use `icon_header_size=ICON_SIZE` and `header_height=ICON_SIZE`
- **Text boxes**: same `font_size`, `stroke_width`, `corner_radius`, `min_width`, and `max_height` within a section
- **Arrows**: same `stroke_width` for same-type connections

### STRICT: Unified Icon Size — One Constant for ALL Icons

**HARD RULE: Every icon in the diagram — service icons, container header icons, grid icons, user/external icons — MUST use the same `ICON_SIZE` constant (65px). No exceptions.**

This is one of the most commonly violated rules. Here is every way it gets broken — check for ALL of them:

1. **Separate header constant**: `HDR_ICON = 40` or `HDR_ICON_SIZE = 40` — WRONG. Header icons are NOT smaller. Set `HDR_ICON = ICON_SIZE`.
2. **Hardcoded smaller sizes for "external actors"**: `icon_size=50` for user icons — WRONG. Users get `ICON_SIZE` like everything else.
3. **Hardcoded smaller sizes for grid items**: `grid_2x2(..., icon_size=55)` — WRONG. Grid icons get `ICON_SIZE` too.
4. **Styling spec with multiple sizes**: If the plan says "Size: 50px (external actor)" or "Size: 55px (grid, slightly smaller)", that plan is wrong — fix it to `ICON_SIZE (65px)` before building.
5. **Arrow half-radius aliases**: `HALF_G = 55/2` or `HALF_U = 50/2` — these exist only because icons had different sizes. With unified sizing, use a single `HALF = ICON_SIZE / 2` for all arrow endpoint calculations.

**Verification**: grep the build script for `icon_size=` and `icon_header_size=`. Every value must be either `ICON_SIZE` or `HDR_ICON` where `HDR_ICON = ICON_SIZE`. Any hardcoded number (50, 55, 40, 32, etc.) is a bug.

```python
ICON_SIZE = 65   # ALL icons — always 65px, hardcoded across all diagrams
HDR_ICON = ICON_SIZE  # HARD RULE: headers use same size
HALF = ICON_SIZE / 2  # single radius for all arrow endpoints

# WRONG — all of these are bugs:
HDR_ICON = 40                                          # separate header size
icon_label_component("users", ..., icon_size=50, ...)  # smaller "external" icon
grid_2x2(..., icon_size=55, ...)                       # smaller grid icons
container_box("vpc", ..., icon_header_size=32, ...)    # smaller header icon
HALF_U = 50 / 2; HALF_G = 55 / 2                      # multiple radius aliases

# CORRECT — single constant everywhere:
icon_label_component("users", ..., icon_size=ICON_SIZE, ...)
grid_2x2(..., icon_size=ICON_SIZE, ...)
container_box("vpc", ..., icon_header_size=ICON_SIZE, header_height=ICON_SIZE, ...)
```

### Icon Scaling Ripple Effects
Changing `ICON_SIZE` triggers a cascade of layout adjustments:

| What | Rule |
|------|------|
| `header_height` | Should equal `ICON_SIZE` so header bg matches icon |
| Container heights | Grow by ~1.15x the icon delta per row inside |
| Inner sub-section heights | Same proportional growth |
| Row Y spacing | Add ~10-15px gap per row to prevent icon/label overlap |
| Sub-container Y offsets | Push down to account for taller headers |
| Arrow endpoints | Start/end offsets from icons grow with icon size (use +/-ICON_SIZE*0.8 as guide) |
| External elements | Reposition to stay vertically aligned with new row centers |

**Key principle:** When `ICON_SIZE` changes, treat it as a full layout reflow — adjust every Y position and every container dimension.

### Font Size Is Fixed at 24px
`FONT_SIZE = 24` is a constant across all diagrams. There is no font scaling — the value never changes. All text (container headers, icon labels, arrow labels, circle numbers) uses this single size.

### Uniform Text Box Sizing Within Sections
All `text_box` elements within the same section must have identical dimensions via shared `min_width` and `max_height` constants.

### Label Proximity — Minimum 20px Text Gap

Adjacent service labels must have at least 20px horizontal or vertical gap between their text edges. When two icons are side by side, calculate label widths with `measure_text()` and verify the gap. If labels are too close, spread the icons further apart.

```python
# Check label gap between CloudFront (cx=110) and S3 (cx=290)
cf_w, _ = measure_text("Amazon CloudFront", FONT_BODY)
s3_w, _ = measure_text("Amazon S3 bucket", FONT_BODY)
cf_right = CLOUDFRONT_CX + cf_w / 2    # ~182
s3_left = S3_CX - s3_w / 2             # ~222
gap = s3_left - cf_right               # ~40px ✓ (minimum 20px)
```

## Text & Fonts

Rules for text rendering, font selection, and label handling.

### Text
- **`textAlign: "center"` does NOT work** on standalone Excalidraw text elements. Multi-line labels MUST be split into separate text elements per line, each individually centered using `measure_text()`. The `icon_label_component()` function handles this automatically.
- **Never set explicit `width` on text elements** — Excalidraw ignores it for rendering but it shifts the x anchor point.
- **Always use `measure_text()`** for positioning — never estimate character widths.

### Supported Fonts

| ID | Name(s) | Style |
|----|---------|-------|
| 1  | `virgil`, `hand`, `handwritten` | Hand-drawn sketch (Excalidraw default) |
| 2  | `helvetica`, `sans`, `sans-serif` | Clean sans-serif (**recommended**) |
| 3  | `cascadia`, `mono`, `monospace` | Monospace (code/technical labels) |
| 5  | `excalifont` | Excalidraw's custom sketch font |
| 6  | `nunito` | Rounded sans-serif |
| 7  | `lilita`, `lilita one` | Bold display font |
| 8  | `comic shanns`, `comic` | Comic Sans alternative |

- Use fontFamily `"2"` (Helvetica) for all text — must be string, not number.
- Use consistent fontSize: 22px for labels, 18px for circle numbers.
- `fillStyle: "solid"` required for background colors to show.
- **All text elements AND labels MUST use the same fontFamily** unless there's a specific design reason.
- **Labels accept fontFamily**: `"label": {"text": "Service A", "fontFamily": "helvetica"}`. Without `fontFamily`, labels render in Virgil. Also accepts `fontSize` and `strokeColor`.
- **Dark-filled shapes with labels**: Labels inherit `strokeColor` from parent. On dark shapes, labels are invisible. Fix: `"label": {"text": "1", "strokeColor": "#ffffff", "fontFamily": "helvetica"}`.

### Empty Labels: Skip Text Creation
Pass `None` as `label_text` to `icon_label_component` — skips label creation, icon centers directly at `(cx, cy)`.

## Technical: Export, Server & REST API

Infrastructure details for export, server state, grouping, and REST API specifics.

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

### REST API Gotchas
1. **Labels**: Use `"label": {"text": "My Label"}` (not `"text": "My Label"`). MCP tools auto-convert, REST API does not.
2. **Arrow binding**: Use `"start": {"id": "svc-a"}, "end": {"id": "svc-b"}` (not `"startElementId"`/`"endElementId"`).
3. **fontFamily**: Pass a string name or numeric ID — both work, server normalizes automatically.
4. **Updating labels**: When updating via `PUT /api/elements/:id`, include the full `label` in the update body to preserve it.
5. **Screenshot in REST mode**: `POST /api/export/image` returns `{"data": "<base64>"}`. Requires browser open.

### Points Format
The `points` field accepts both formats:
- Tuple: `[[0, 0], [100, 50]]`
- Object: `[{"x": 0, "y": 0}, {"x": 100, "y": 50}]`

Both are normalized to tuples automatically.

### Validation False Positives
`validate_diagram()` and `validate_arrow_paths()` report TEXT_OVERLAP for arrows that intentionally pass through annotation text areas. BORDER warnings for elements near container edges are also expected when icons are intentionally placed outside containers.

## Anti-Patterns

Common mistakes and their correct alternatives.

| Don't | Do Instead |
|-------|-----------|
| Place cloud boundary and service containers as siblings | Nest service containers inside the cloud boundary |
| Hand-tune pixel positions | Use component functions with calculated positions |
| Batch-create 200 elements blindly | Build incrementally: containers, services, arrows, validate |
| Trust vision models for arrow tracing | Use programmatic validation (`validate_arrow_paths`) |
| Call raw Puppeteer for export | Use `export_screenshot()` or `headless-export.cjs` |
| Guess text width | Call `measure_text()` for every positioning calculation |
| Set explicit `width` on text | Let Excalidraw auto-size, position with `measure_text()` |
| Use `diagram_helpers.py` | Use `components.py` (diagram_helpers is deprecated) |
| Mix fontFamily across elements | Pick one (fontFamily `"2"`) and use everywhere |
| Skip validation before export | Always run `validate_diagram()` + `validate_arrow_paths()` |
| Skip containment assertions | Add `assert_contained()` for EVERY parent-child container pair BEFORE creating elements |
| Set container width without checking auto-expansion | Estimate min width from header text + icon, set explicit width >= estimate |
| End cross-container arrows at the target icon | Stop arrows at the container border they're entering |
| Claim "done" without checking | Export PNG, run quality checklist, then deliver |
| Place arrow labels at same y as arrows | Position labels fully above/below the arrow line |
| Hardcode arrow label x-offsets | Use `measure_text` to center labels between endpoints |
| Create numbered circles before arrows | Create arrows first, then circles (z-order) |
| Manually compute circle midpoints for straight arrows | Use `arrow(..., label_number=N)` — auto-calculates midpoint and offset |
| Use standalone `numbered_circle` for L-shaped arrow labels | Use `arrow(..., label_number=N, label_segment=-1)` to attach to specific segment |
| Use `label_cx`/`label_cy` without justification | Only override when auto-position overlaps borders/elements; always add a comment why |
| Place circles on arrows or split arrows around circles | Offset circles with 5px margin (above for horizontal, side for vertical) |
| Place circles near container borders | Center circles in the gap between borders |
| Omit `icon_file_id` on `container_box()` | Always pass a header icon for every container |
| Route arrows through unrelated sections | Add waypoints to route around unrelated containers |
| Shrink parent container to widen gaps | Expand parent outward, push siblings further away, expand cloud boundary |
| Place circles touching arrow lines (zero margin) | Use `COFFSET = CIRCLE_R + 5 + stroke/2` for a 5px visible gap |
| Hardcode circle positions to absolute pixels | Define circle cx/cy from icon/arrow position variables so they move together |
| Place circles near arrow endpoints (arrowheads) | Position circles on the arrow body, away from endpoints — arrowhead triangles extend ~10px back from the tip and must not touch circles |
| Assume arrow directions without checking reference | Verify every arrow's direction (which end has arrowhead) against the reference image |
| Add internal arrows in a section not shown in reference | Only add arrows that exist in the reference — standalone icons with no connections are valid |
| `icon_header_size` smaller than `header_height` | Both must equal `ICON_SIZE`; always `icon_header_size = header_height = ICON_SIZE` |
| Use `cy` as icon center for arrows | Shift `cy` by `+ ICON_VSHIFT` so image center aligns at row Y |
| Pass empty string `""` as icon label | Pass `None` to skip label creation |
| Ignore label width for border clearance | Calculate label extent and ensure 30px+ gap from borders |

## AWS Color Reference

Color palettes, border styles, and icon background colors for AWS diagrams.

### Container Border Style Hierarchy

| Level | Style | Stroke Width | Example |
|-------|-------|-------------|---------|
| Cloud provider boundary (outermost) | solid | 2px | AWS Cloud |
| Service-specific boundary (nested) | solid | 2px | Step Functions, VPC |
| Logical sub-section (nested inside service) | dashed | 1px | Front-end group |

**Rules:**
- Cloud provider boundary is **always outermost**
- Service-specific containers use **solid** borders with brand color
- Logical sub-sections use **dashed** borders
- Stroke color: gray (#879196) for neutral, brand color for service-specific
- Only external elements sit outside the cloud boundary

### Common Container Colors
| Purpose | Stroke | Fill | Style |
|---------|--------|------|-------|
| Neutral outer boundary | #879196 (gray) | transparent | solid, 2px |
| Neutral sub-section | #879196 (gray) | transparent | dashed, 1px |
| Branded outer boundary | service color (e.g. #d63384 pink) | transparent | solid, 2px |
| Filled themed section | service color | light tint (e.g. #f0fdfa) | solid |

### Icon Background Colors
AWS official SVG icons include their own background colors:
| Service | SVG built-in fill |
|---------|------------------|
| S3 | #7AA116 (green) |
| Amplify | #DD344C (red) |
| Cognito | #DD344C (red) |
| API Gateway | #8C4FFF (purple) |
| AI services (Textract, Rekognition, etc.) | #01A88D (teal) |

### Numbered Circle Colors
All numbered circles should use the **same** `bg_color`. Define a single `CIRCLE_BG` constant. Default: `#1a1a1a` (dark).

## Icon Packs

AWS icon pack registration, variants, and custom color overrides.

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

### Light vs Dark Variants
Many icons ship with **Light** and **Dark** variants. These refer to the **background** they are designed for, NOT their own color:
- `_Light` / no suffix → designed for **light/white backgrounds** (renders as dark/visible icon)
- `_Dark` → designed for **dark backgrounds** (renders as light/faint icon on white canvas)

**Always use the Light variant (or no-suffix) when the canvas background is white.** Using a `_Dark` variant on a white canvas produces a barely visible icon.

Icons with Light/Dark variants:
- **Group icons**: `AWS-Cloud_32.svg` vs `AWS-Cloud_32_Dark.svg`, `AWS-Cloud-logo_32.svg` vs `AWS-Cloud-logo_32_Dark.svg`
- **Resource general icons**: `Res_User_48_Light.svg` vs `Res_User_48_Dark.svg`, `Res_Client_48_Light.svg` vs `Res_Client_48_Dark.svg`, `Res_Document_48_Light.svg` vs `Res_Document_48_Dark.svg`, etc.

Icons WITHOUT Light/Dark variants (single version only):
- **Architecture Service Icons** (`Arch_*`) — always have a colored square background
- **Category-specific Resource Icons** (e.g., `Res_AWS-CloudFormation_Template_48.svg`) — single version

### Architecture vs Resource Icon Types
The same AWS service often has icons in **multiple icon types** with different visual styles. Choose the right type for your diagram:

| Icon Type | Path Pattern | Visual Style | When to Use |
|---|---|---|---|
| **Architecture** | `Arch_*_48.svg` | Colored square bg + white icon | Service-level representation (e.g., "Amazon S3" as a service) |
| **Resource** | `Res_*_48.svg` | Outline/flat icon, no square bg | Sub-resource or instance-level (e.g., a specific S3 bucket, a user, a template) |
| **Group** | `*_32.svg` | Small boundary/header icons | Container headers (AWS Cloud, Account, Region, VPC) |

**Match the reference diagram's style.** Many AWS reference architectures mix both types:
- Architecture icons for primary services (e.g., compute, API, database, networking services)
- Resource icons for specific instances (e.g., a bucket, a template, a container image, a user)

**Example:** Amazon S3 has both:
- `Arch_Amazon-Simple-Storage-Service_48.svg` → green square with white bucket (Architecture)
- `Res_Amazon-Simple-Storage-Service_Bucket_48.svg` → olive/green bucket outline (Resource)

Use `search_aws_icons` MCP tool with `icon_type` filter to find the right variant:
```python
# Find architecture-level icon
search_aws_icons(query="s3", icon_type="architecture")
# Find resource-level icon
search_aws_icons(query="s3 bucket", icon_type="resource")
```

**Beware of color differences between icon types.** Resource icons in the same category share a color (e.g., Management-Governance resources are all pink `#E7157B`). Architecture icons also share colors by category but with a filled square background. If the reference shows an outline icon in a specific color, search across categories — the right icon may be a Resource icon from a different category than expected.

### Custom Color Variants

When an icon's default color doesn't match the visual context in the reference diagram, create a **custom recolored SVG** rather than using the wrong-color original. This is common with Resource icons whose category color clashes with the section they appear in.

**When to recolor:**
- The reference diagram shows a specific icon in a different color than the AWS icon library provides
- A Resource icon's category color (e.g., pink for Management-Governance) doesn't match the section it sits in (e.g., orange for Containers/Compute)
- A third-party/open-standard icon (e.g., OpenID Connect) doesn't exist in the AWS icon library at all

**How to create a custom color variant:**
1. Copy the original SVG from `icons/aws-icons-official/` to `icons/custom/`
2. Change the `fill` attribute(s) to the target color
3. Add the color name to the filename: `Res_AWS-CloudFormation_Template_48_Orange.svg`
4. Register in the icon pack using the `custom/` path prefix:
   ```python
   register_icon_pack("my-diagram", {
       "file-cfn-tpl-orange": "custom/Res_AWS-CloudFormation_Template_48_Orange.svg",
   })
   ```

**Naming convention:** `{OriginalName}_{Color}.svg` — e.g., `Res_AWS-CloudFormation_Template_48_Orange.svg`

**For non-AWS icons** (open standards like OpenID Connect, Docker, etc.), save the custom SVG in `icons/custom/` with a descriptive name: `icons8-openid.svg`

### Custom Icon File ID Caching

Excalidraw caches uploaded files by `file_id` in the browser. If you replace an icon SVG but reuse the same `file_id`, the old icon persists. **Always use a new `file_id`** when changing which SVG file an icon points to (e.g., `file-openid` → `file-openid-v2`, `file-cfn-template` → `file-cfn-tpl-orange`).

## References

Pointers to detailed reference docs, examples, and source code.

- **Reference & checklist**: `skills/excalidraw-diagramming/references/reference.md`
- **Example build script**: `skills/excalidraw-diagramming/references/example-build.py`
- **components.py source**: `mcp_excalidraw/scripts/components.py`
