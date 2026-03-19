# Excalidraw Diagram Building Workflow

## YOU ARE THE ORCHESTRATOR

When asked to build a diagram, you do NOT do the work yourself. You **spawn agents** using the Agent tool and coordinate them. Do NOT read skill files yourself — each agent reads only what it needs.

### Orchestration loop

```
1. Spawn Planner agent → writes diagram.d2 (structure only, no positions)
2. Spawn Main agent → adds positions, builds with create_from_d2, iterates
3. Spawn Critic agent → reviews output, returns issues
4. Route feedback:
   - Structural issues (missing node, wrong connection) → spawn Planner again
   - Positional issues (overlap, arrow routing) → spawn Main again
5. Repeat 2-4 until Critic reports no issues
6. Export final diagram
```

### What the orchestrator does directly

- Determine version number: check `diagram_building/` for existing versions
- Copy reference image to `diagram_building/v{N}/reference.png` if needed
- Route Critic feedback to the correct agent
- Decide when the diagram is done
- Write the build log after export

### What the orchestrator does NOT do

- Do NOT read skill files — agents read their own
- Do NOT write `diagram.d2` — Planner writes it
- Do NOT calculate positions — Main does it
- Do NOT review the diagram — Critic does it

---

## Agent 1: Planner

Spawn with the Agent tool. Include in the prompt:

- The reference image path (or text description)
- The output path: `diagram_building/v{N}/diagram.d2`
- "Read `skills/excalidraw-diagramming/SKILL.md` — Phase 1 (Planner) section"
- If re-running after Critic feedback: include the issues list

**Goal:** Write the structural `diagram.d2` — containers, nodes, connections, labels, styling. No positions.

### Planner instructions (include in agent prompt)

- Read `skills/excalidraw-diagramming/SKILL.md` — Phase 1 (Planner) section only
- Look at reference diagrams in `skills/diagram-review/references/` for layout patterns. These are examples of good diagram structure — the layout is mostly correct, but some may have errors (e.g., AWS Cloud with dashed border instead of solid). Reason about what you see, don't copy blindly.
- Do NOT read `skills/diagram-review/` skill files (SKILL.md, checklist.md) — those are for the Critic only
- NEVER read files from `diagram_building/` other than the current version
- Do NOT add `pos:`, `waypoints:`, or `badge_pos:` — Main handles positioning
- Version format: `v{N}` (e.g., `v1`, `v2`, `v3`)

### Planner output

`diagram_building/v{N}/diagram.d2` with:
- All containers with nested `{}` braces
- All nodes as leaf elements inside containers
- All connections with `->`, `<->` and numbered labels
- D2 style attributes for dashed borders, stroke colors
- `# standalone: true` annotation on nodes with no connections
- `icon_type:`, `icon_variant:`, `icon_hint:` where auto-resolution needs guidance

---

## Agent 2: Main

Spawn with the Agent tool. Include in the prompt:

- The path to `diagram.d2`
- "Read `skills/excalidraw-diagramming/SKILL.md` — Phase 2 (Main) section"
- If re-running after Critic feedback: include the positional issues list

**Goal:** Add positions to `diagram.d2`, build with `create_from_d2`, and iterate on validation issues.

### Main instructions (include in agent prompt)

- Read `skills/excalidraw-diagramming/SKILL.md` — Phase 2 (Main) section only
- Add `pos:` to every container and node
- Use `layout:` hints on containers to auto-place children (e.g., `layout: "2x3"`)
- Add `waypoints:` and `badge_pos:` to arrows that need them
- Call `create_from_d2` and check validation output
- Fix positioning issues and rebuild (tool clears canvas each time)
- Verify visually with `get_canvas_screenshot`

### Main receives Critic feedback on

- Positional issues: overlaps, badge on border, arrow crosses text, container overflow, diagonal segments
- Structural issues: route back to orchestrator → Planner

---

## Agent 3: Critic

Spawn with the Agent tool. Include in the prompt:

- The reference image path
- The path to `diagram.d2`
- "Read `skills/diagram-review/SKILL.md` and `skills/diagram-review/references/checklist.md`"
- "Use `crop_screenshot` with grid mode (e.g., `grid: "3x3"`) to systematically inspect every region"
- "Use `crop_screenshot` with x/y/width/height to zoom into specific problem areas"
- "Compare each crop against the corresponding region in the reference image"

**Goal:** Compare output against reference and `diagram.d2`. Flag discrepancies.

**Always use `crop_screenshot`** — never rely on full-image inspection alone. Issues invisible at full scale become obvious when zoomed in.

### Critic output format

Return a structured list of issues:
- Each issue: description, severity (structural/positional), recommended fix
- Structural issues → orchestrator routes to Planner
- Positional issues → orchestrator routes to Main

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
- How much time it took
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
