# Excalidraw Diagram Building Workflow

## Overview

Three-agent loop: **Planner → Main → Critic**, iterating until the diagram matches the input.

- **Reference image** → Planner traces all elements, connections, layout from it
- **Text description** → Planner interprets to define structure and layout

### Single-file workflow

Planner writes **one file**: `diagram.d2` in standard D2 syntax. Main calls **one tool**: `create_from_d2`. No `build.py`, no `components_styling.txt`, no `icons_graph_structure.md`.

### Enhanced D2 syntax

Full spec: `skills/excalidraw-diagramming/enhanced-d2-syntax.md`

Quick reference: containers have `pos: "x,y,w,h"` + `stroke` + optional `header_icon`. Nodes have `pos: "cx,cy"` + `icon`. Connections use `->` with optional `waypoints`, `badge_pos`, `border_stop`. Global `arrow_style` block is first.

---

## Agent 1: Planner

**Goal:** Write a single `diagram.d2` file that fully specifies the diagram.

### Before starting

- **Read `skills/excalidraw-diagramming/SKILL.md`** — D2 patterns and hard rules
- Do NOT read `skills/diagram-review/` files — those are for the Critic only
- Do **not** read or reuse previous diagram files — start from scratch. NEVER read files from `diagram_building/` other than the current version being built. Previous versions, build logs, and diagram.d2 files are irrelevant and will mislead you.
- If feedback comes from the Critic, fix `diagram.d2` and increment version
- **Version numbering:** Check `diagram_building/` for existing versions. Format is `v{N}` (e.g., `v1`, `v2`, `v3`) — no underscore.

### Input handling

- **Reference image:** Save to `diagram_building/v{N}/reference.png`. Trace every element, container, sub-boundary, connection, and numbered badge.
- **Text description:** Interpret to define all elements, containers, connections, and layout.

### Output

Create `diagram_building/v{N}/diagram.d2` with:
- All containers with nested `{}` braces
- All nodes as leaf elements inside containers
- All connections with `->`, `<->` and numbered labels (`: 1`, `: 2`)
- D2 style attributes for dashed borders, stroke colors
- `# standalone: true` annotation on nodes with no connections

The tool handles icon resolution, positioning, and styling automatically from node labels.

---

## Agent 2: Main

**Goal:** Call `create_from_d2` with `diagram.d2` contents. The tool resolves icons, builds containers, places nodes, draws arrows, and validates.

1. Run `npm run canvas` to start the Express server
2. Read `diagram.d2` → call `create_from_d2` MCP tool
3. Check output for validation issues
4. If issues → fix `diagram.d2` and re-call (tool clears canvas each time)
5. Verify visually with `get_canvas_screenshot`
6. Export using `export_to_image` MCP tool

---

## Agent 3: Critic

**Goal:** Compare output against reference and `diagram.d2`. Flag discrepancies.

- Read `skills/diagram-review/SKILL.md` and `skills/diagram-review/references/checklist.md`
- Pre-build: verify every connection in `diagram.d2` against reference before Main builds
- Post-build: visual inspection with canvas screenshots
- All fixes route to **Planner** (fix `diagram.d2`) since all styling is in the D2 file

---

## Build Log

After every build (successful or not), write `diagram_building/v{N}/build_log.md`. This is a full record of what happened, what went wrong, and what was learned. Future sessions use it to avoid repeating mistakes.

### Required sections

```markdown
# {Diagram Name} v{N} — Build Log

## Overview
- **Reference:** `refs/{filename}` or text description summary
- **Duration:** approximate total time
- **Build iterations:** how many runs of create_from_d2 + fix reruns
- **Final element count:** total elements, arrows (numbered + unlabeled)

## Structure
- Container count and names
- Node count and key nodes
- Arrow count (numbered + unlabeled)
- Layout summary (what sits where)

## Phase-by-Phase Timeline
Chronological record of every phase. For each phase include:
- What was done (reads, searches, file creation, tool calls)
- What the result was
- If a fix attempt: what the root cause was, what was tried, and whether it worked

Phases typically include:
1. Setup & Exploration — reading reference, skill files, checking server
2. Planner Phase — creating diagram.d2
3. Icon Lookup — search_aws_icons calls, path confirmations
4. Build Run(s) — each create_from_d2 call and its result
5. Fix Attempts — each fix with root cause, what changed, result
6. Export — export method used and any issues

## Problems Summary
Table format:
| # | Problem | Severity | Root Cause | Fix | Time Cost |
|---|---------|----------|------------|-----|-----------|

Severity: Major (blocked progress or produced wrong output) / Minor (quick fix)

## Key Decisions
Non-obvious choices made during the build:
- Icon mappings (which icon was chosen when multiple candidates existed)
- Layout decisions (placement rationale, why X is inside/outside Y)
- Arrow routing choices (L-shape direction, waypoint rationale)
- Anything that differed from a previous version and why

## Key Lessons & Process Improvements
Reusable lessons from problems encountered. Each lesson should explain:
- What the rule is
- Why it matters (what broke without it)
- How to apply it in future builds

## Files Modified
Table format:
| File | Changes |
|------|---------|
```

### Rules
- Write the build_log **after** the final export, not during the build
- Include **every** fix attempt, even failed ones — the failure chain is the most valuable part
- Be specific about root causes: "arrow crossed text" not "layout issue"
- Record exact error messages from validation output
- If a lesson led to a skill file or CLAUDE.md update, note which file was updated
