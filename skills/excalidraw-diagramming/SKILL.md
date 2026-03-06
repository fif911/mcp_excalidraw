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

## Connection Mode Detection

Before doing anything, determine which mode is available. Run these checks in order:

### Check 1: MCPorter
```bash
mcporter list 2>/dev/null | grep excalidraw
```
If you see `excalidraw` with tools listed, use MCPorter mode: `mcporter call excalidraw.<tool> key=value`.

### Check 2: MCP Server (Claude Code / direct MCP)
```bash
mcp-cli tools | grep excalidraw
```
If you see tools like `excalidraw/batch_create_elements`, use MCP mode directly.

### Check 3: REST API (Fallback)
```bash
curl -s http://localhost:3000/health
```
If you get `{"status":"ok"}`, use REST API mode with HTTP endpoints.

### Check 4: Nothing works
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

**After EVERY iteration, you MUST run a quality check before proceeding. NEVER say "looks great" unless ALL checks pass.**

### Quality Checklist
1. **Text truncation**: Is ALL text fully visible? Labels must fit inside their shapes.
2. **Overlap**: Do ANY elements overlap each other? Background zones must fully contain their children with padding.
3. **Arrow crossing**: Do arrows cross through unrelated elements or overlap with text labels? Use curved/elbowed arrows with waypoints to route around obstacles.
4. **Arrow-text overlap**: Do arrow labels overlap with shapes? Adjust arrow path or label position.
5. **Spacing**: At least 40px gap between elements.
6. **Readability**: All labels readable at normal zoom. Font size >= 16 body, >= 20 titles.
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
- `header_fill`: True|False to control header background rectangle
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

## Arrow Routing

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
3. **No border crossings:** Every circle must be fully inside or fully outside every container (15px clearance from borders).

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

### Arrows Must Not Cross Unrelated Section Boundaries
Arrows must only cross a container border when they are **entering or leaving** that container. An arrow must NEVER pass through a container it has no business with.

**Example violation:** An arrow from AppSync to DynamoDB routed vertically through the Authentication sub-section — the arrow has nothing to do with Auth, so it must not cross its border.

**Fix:** Add waypoints to route the arrow AROUND the unrelated section:
```python
# WRONG: vertical segment at x=400 crosses through Auth (x=100..410, y=150..345)
arrow("a-appsync-dynamo", 400, 357, 450, 210,
      waypoints=[(400, 210)])  # passes through Auth!

# CORRECT: jog right past Auth right edge first, then up
AUTH_RIGHT = AUTH_X + AUTH_W  # 410
ROUTE_X = AUTH_RIGHT + 15     # 425
arrow("a-appsync-dynamo", 400, 357, 450, 210,
      waypoints=[(ROUTE_X, 357), (ROUTE_X, 210)])  # avoids Auth
```

**Validation:** For every arrow segment, check that it does not intersect any container border it's not supposed to cross. Especially watch for:
- Vertical segments passing through adjacent sub-sections
- Horizontal segments crossing nested container tops/bottoms

### Subsection Borders Must Stay Inside Parent Section Borders
Every nested container (Auth, Step Functions, etc.) must be **fully contained** within its parent container, with at least 15px clearance from the parent border on all sides. When making room for circles or arrows, **always expand the outer (parent) container outward** — never shrink it to squeeze inner sections. Push sibling containers and the cloud boundary further out to accommodate.

**Correct approach when circles need more gap between sibling containers:**
1. **Expand** the parent container outward (increase its width/height)
2. **Push** the sibling container further away (increase its X/Y offset)
3. **Expand** the cloud boundary to fit everything
4. **Shift** all elements inside the pushed container by the same delta

**Wrong approach:** Shrinking the parent container to widen the gap — this risks inner subsections crossing or touching the parent border.

```python
# Verify after any layout change:
assert SF_X + SF_W < CUST_X + CUST_W - 15, "SF right edge too close to Customer Account"
assert AUTH_X + AUTH_W < CUST_X + CUST_W - 15, "Auth right edge too close to Customer Account"
assert SF_Y >= CUST_Y + HDR_HEIGHT, "SF top crosses Customer Account header"
assert SF_Y + SF_H < CUST_Y + CUST_H - 15, "SF bottom too close to Customer Account"

# When pushing siblings, shift all their children by the same delta:
# MA_X += 50  →  all MA internal elements += 50  →  CLOUD_W += 50
```

### Hard Rule: No Icon or Circle May Cross Any Container Border
Every icon, icon background rectangle, and numbered circle must be **fully inside** or **fully outside** every container. To ensure clearance: `element_edge = cx + radius` must be `< container_border - 15` (inside) or `> container_border + 15` (outside).

### Account for Label Width Near Container Borders
Service icon labels (e.g. "Amazon Rekognition" ~190px wide) extend far beyond the icon itself. When placing icons outside a container, ensure the **label's left edge** clears the container border by at least 30px: `AI_X - (max_label_width / 2) > container_right_edge + 30`.

### No Borders on Icons or Circles
Icon background rectangles and numbered circle ellipses must have `strokeWidth: 0` and `strokeColor: "transparent"`. Enforced in `components.py` — never override with a visible stroke.

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
SVC_ICON = 69            # All service icons — one constant controls all sizes
HDR_ICON = SVC_ICON      # Header icons match service icons
FONT_HDR = 28            # Container header labels only
FONT_BODY = 20           # Everything else: icon labels, numbers, arrows, text boxes
```

**Font size rule:** A diagram uses exactly **2 font sizes** — `FONT_HDR` for container headers, `FONT_BODY` for all other text. No exceptions.

Categories that must be uniform within a diagram:
- **Font sizes**: exactly 2 — `FONT_HDR` for container headers, `FONT_BODY` for everything else
- **Numbered circles**: same `size`, `bg_color`, and `font_size`
- **Service icons**: same `icon_size` via single `SVC_ICON` constant
- **Container headers**: same `icon_header_size` via `HDR_ICON = SVC_ICON`, same `label_font_size` via `FONT_HDR`
- **Text boxes**: same `font_size`, `stroke_width`, `corner_radius`, `min_width`, and `max_height` within a section
- **Arrows**: same `stroke_width` for same-type connections

### Icon Scaling Ripple Effects
Changing `SVC_ICON` triggers a cascade of layout adjustments:

| What | Rule |
|------|------|
| `HDR_ICON` | Must equal `SVC_ICON` — auto-updates if defined as `HDR_ICON = SVC_ICON` |
| `header_height` | Should equal `SVC_ICON` so header bg matches icon |
| Container heights | Grow by ~1.15x the icon delta per row inside |
| Inner sub-section heights | Same proportional growth |
| Row Y spacing | Add ~10-15px gap per row to prevent icon/label overlap |
| Sub-container Y offsets | Push down to account for taller headers |
| Arrow endpoints | Start/end offsets from icons grow with icon size (use +/-icon_size*0.8 as guide) |
| External elements | Reposition to stay vertically aligned with new row centers |

**Key principle:** When `SVC_ICON` changes, treat it as a full layout reflow — adjust every Y position and every container dimension.

### Font Scaling Ripple Effects
Changing `FONT_HDR` or `FONT_BODY` also triggers layout adjustments:

| What | Rule |
|------|------|
| `header_height` | Must fit tallest header text. For multi-line: `lines x font_size x 1.25` |
| Sub-container Y offsets | Push down when header text grows |
| Arrow label Y offsets | Recalculate offset above arrow y |
| Container heights | Larger body text makes rows taller |
| Row Y spacing | Add ~5px per row for every +4px in FONT_BODY |
| Text box dimensions | Vertical chain arrows must account for taller boxes |

### Cloud Provider Boundary Is Always the Outermost Container
The cloud provider boundary (e.g., "AWS Cloud") is **always the outermost container** encompassing all cloud services. Service-specific containers are **nested inside** — never as siblings.

```
Correct hierarchy:
  AWS Cloud (outer, gray solid)
    +-- Front end (dashed sub-section)
    +-- Step Functions workflow (pink solid, nested inside cloud)
    +-- AI service icons
    +-- API Gateway, other services

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
container_box("cloud", ..., icon_file_id="file-aws", label_text="AWS Cloud")
container_box("account", ..., icon_file_id="file-account", label_text="Customer's AWS Account")
container_box("stepfn", ..., icon_file_id="file-stepfunctions", label_text="AWS Step Functions\nworkflow")

# WRONG: missing icon_file_id — header will have text only, no icon
container_box("account", ..., label_text="AWS Managed Account")
```

### Align Containers at Matching Levels
1. **Outer containers** side-by-side must share the same `y` and `header_height` (`HDR_HEIGHT`).
2. **Inner sub-sections** at same nesting level must share the same `y`. Derive from parent: `SUB_Y = PARENT_Y + HDR_HEIGHT + gap`.
3. **Stacked containers** must share the same `x` and width.

**SUB_Y gap rule:** Gap between `HDR_HEIGHT` and `SUB_Y` must clear tallest header text. For 2-line text at `FONT_HDR`, add at least `FONT_HDR * 1.25` as gap.

### Header Icon + Label Vertical Alignment
The header icon is placed flush at the container's top-left corner. `header_height` is the **source of truth** — set it to fit the tallest header text (including multi-line). Then set `icon_header_size = header_height` so the icon fills the full header band.

```python
# CORRECT: header_height is source of truth, icon matches it
HDR_HEIGHT = 55           # sized for multi-line headers
HDR_ICON = HDR_HEIGHT     # icon matches header
container_box("cloud", ..., icon_header_size=HDR_ICON, header_height=HDR_HEIGHT)

# WRONG: icon smaller than header — icon sits higher than label
container_box("cloud", ..., icon_header_size=32, header_height=55)
```

### Uniform Text Box Sizing Within Sections
All `text_box` elements within the same section must have identical dimensions via shared `min_width` and `max_height` constants.

### Empty Labels: Skip Text Creation
Pass `None` as `label_text` to `icon_label_component` — skips label creation, icon centers directly at `(cx, cy)`.

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
- Vertical arrows between icons: start below source label, end at target icon top

### Validation False Positives
`validate_diagram()` and `validate_arrow_paths()` report TEXT_OVERLAP for arrows that intentionally pass through annotation text areas. BORDER warnings for elements near container edges are also expected when icons are intentionally placed outside containers.

## Anti-Patterns

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
| Claim "done" without checking | Export PNG, run quality checklist, then deliver |
| Place arrow labels at same y as arrows | Position labels fully above/below the arrow line |
| Hardcode arrow label x-offsets | Use `measure_text` to center labels between endpoints |
| Create numbered circles before arrows | Create arrows first, then circles (z-order) |
| Place circles on arrows or split arrows around circles | Offset circles with 5px margin (above for horizontal, side for vertical) |
| Place circles near container borders | Center circles in the gap between borders |
| Omit `icon_file_id` on `container_box()` | Always pass a header icon for every container |
| Route arrows through unrelated sections | Add waypoints to route around unrelated containers |
| Shrink parent container to widen gaps | Expand parent outward, push siblings further away, expand cloud boundary |
| Place circles touching arrow lines (zero margin) | Use `COFFSET = CIRCLE_R + 5 + stroke/2` for a 5px visible gap |
| Place circles near arrow endpoints (arrowheads) | Position circles on the arrow body, away from endpoints — arrowhead triangles extend ~10px back from the tip and must not touch circles |
| Assume arrow directions without checking reference | Verify every arrow's direction (which end has arrowhead) against the reference image |
| Add internal arrows in a section not shown in reference | Only add arrows that exist in the reference — standalone icons with no connections are valid |
| `icon_header_size` smaller than `header_height` | `header_height` is source of truth; always `icon_header_size = header_height` |
| Use `cy` as icon center for arrows | Shift `cy` by `+ ICON_VSHIFT` so image center aligns at row Y |
| Pass empty string `""` as icon label | Pass `None` to skip label creation |
| Ignore label width for border clearance | Calculate label extent and ensure 30px+ gap from borders |

## AWS Color Reference

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

## References

- **Reference & checklist**: `skills/excalidraw-diagramming/references/reference.md`
- **Example build script**: `skills/excalidraw-diagramming/references/example-build.py`
- **components.py source**: `mcp_excalidraw/scripts/components.py`
