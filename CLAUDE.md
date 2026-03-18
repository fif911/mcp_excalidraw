# Excalidraw Diagram Building Workflow

## Overview

Three-agent loop: **Planner → Main → Critic**, iterating until the diagram matches the input.

- **Reference image** → Planner traces all elements, connections, layout from it
- **Text description** → Planner interprets to define structure and layout

### Single-file workflow

Planner writes **one file**: `diagram.d2` in enhanced D2 syntax. Main calls **one tool**: `create_from_enhanced_d2`. No `build.py`, no `components_styling.txt`, no `icons_graph_structure.md`.

### Enhanced D2 syntax

Full spec: `skills/excalidraw-diagramming/enhanced-d2-syntax.md`

Quick reference: containers have `pos: "x,y,w,h"` + `stroke` + optional `header_icon`. Nodes have `pos: "cx,cy"` + `icon`. Connections use `->` with optional `waypoints`, `badge_pos`, `border_stop`. Global `arrow_style` block is first.

---

## Agent 1: Planner

**Goal:** Write a single `diagram.d2` file that fully specifies the diagram.

### Before starting

- **Read `skills/excalidraw-diagramming/enhanced-d2-syntax.md`** — syntax spec, hard rules, and patterns (single file)
- Do NOT read other skill files — `SKILL.md` is a pointer, `diagram-review/` is for the Critic only
- Do **not** read or reuse previous diagram files — start from scratch
- If feedback comes from the Critic, fix `diagram.d2` and increment version
- **Version numbering:** Check `diagram_building/` for existing versions (e.g., `v1`, `v2`). Use the next number. Format is `v{N}` (e.g., `v1`, `v2`, `v3`) — no underscore.

### Input handling

- **Reference image:** Save to `diagram_building/v{N}/reference.png`. Trace every element, container, sub-boundary, connection, and numbered badge.
- **Text description:** Interpret to define all elements, containers, connections, and layout.

### Output

Create `diagram_building/v{N}/diagram.d2` with:
- `arrow_style` block (first)
- All containers with `pos`, `stroke`, `header_icon` (where applicable)
- All nodes with `pos`, `icon`, `icon_color`/`icon_variant` where needed
- All connections with routing (`waypoints`, `badge_pos`, `border_stop`) where needed
- `external: "true"` on actors outside containers

Font sizes and icon sizes are globally locked (`ICON_SIZE=65`, `FONT_SIZE=24`). Do not specify them.

---

## Agent 2: Main

**Goal:** Call `create_from_enhanced_d2` with `diagram.d2` contents. No manual icon lookup, no Python, no build scripts.

1. Run `npm run canvas` to start the Express server
2. Read `diagram.d2` → call `create_from_enhanced_d2` MCP tool
3. Check `iconsMissing`, `validationIssues`, `badgesCentered` in output
4. If issues → fix `diagram.d2` and re-call (tool clears canvas each time)
5. Verify visually with `get_canvas_screenshot`
6. Export using `export_to_image` MCP tool
7. Write `build_log.md` (overview, problems encountered, key lessons, files modified)

---

## Agent 3: Critic

**Goal:** Compare output against reference and `diagram.d2`. Flag discrepancies.

- Read `skills/diagram-review/SKILL.md` and `skills/diagram-review/references/checklist.md`
- Pre-build: verify every connection in `diagram.d2` against reference before Main builds
- Post-build: visual inspection with canvas screenshots and crop_region.py
- All fixes route to **Planner** (fix `diagram.d2`) since all styling is in the D2 file
- Read `build_log.md` and flag lessons for skill file updates
