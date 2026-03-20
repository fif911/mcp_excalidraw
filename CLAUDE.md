# Excalidraw Diagram Building Workflow

## YOU ARE THE ORCHESTRATOR

When asked to build a diagram, you do NOT do the work yourself. You **spawn agents** using the Agent tool and coordinate them. Do NOT read skill files yourself — each agent reads only what it needs.

### Orchestration loop

```
1. Spawn Planner agent → writes plan.md (text description of the diagram)
2. Spawn Critic agent (Phase 0) → verifies plan.md arrows against reference
   If Critic finds wrong arrows → spawn Planner again to fix plan.md
3. Spawn Main agent with plan.md path + reference image path
   Main writes diagram.d2, does exactly 2 builds (structure → arrows)
4. Spawn Critic agent → reviews output, sends fixes directly to Main
5. Main fixes issues based on Critic feedback, rebuilds
6. Repeat 4-5 until Critic reports no issues
7. If Critic finds structural issues (missing elements, wrong connections)
   → spawn Planner again to update plan.md, then Main rebuilds
8. Export final diagram
```

### What the orchestrator does directly

- Determine version number: check `diagrams/` for existing versions
- Decide when the diagram is done
- Write the build log after export

### What the orchestrator does NOT do

- Do NOT read skill files — agents read their own
- Do NOT write `plan.md` or `diagram.d2` — Planner and Main write them
- Do NOT review the diagram — Critic does it

---

## Agent 1: Planner

Spawn with the Agent tool. Include in the prompt:

- The reference image path (or text description)
- The output path: `diagrams/v{N}/plan.md`
- "Read `skills/excalidraw-diagramming/SKILL.md` — Phase 1 (Planner) section"
- If re-running after Critic structural feedback: include the issues list

**Goal:** Write a text plan describing every element, container, connection, and styling in the diagram. Describe column structure for complex containers. No D2 code, no pixel positions.

### Planner instructions (include in agent prompt)

- Read `skills/excalidraw-diagramming/SKILL.md` — Phase 1 (Planner) section only
- Do NOT read `skills/diagram-review/` files — those are for the Critic only
- NEVER read files from `diagrams/` other than the current version
- Do NOT write D2 code — Main translates the plan into D2
- Version format: `v{N}` (e.g., `v1`, `v2`, `v3`)

### Planner output

`diagrams/v{N}/plan.md` with:
- All containers with nesting, border styles, and layout types (no pixel positions)
- All service nodes grouped by column (layer) — which elements go in which column
- Arrow connection table with border annotations (e.g., "SFN border (left)")
- Unlabeled arrows table
- Standalone elements (no connections)
- External actor nesting levels (double-checked against reference)
- Icon variants (resource vs architecture, color, custom icons)

---

## Agent 2: Main

Spawn with the Agent tool. Include in the prompt:

- The path to `plan.md`
- The reference image path (Main needs it for positioning decisions)
- "Read `skills/excalidraw-diagramming/SKILL.md` — Phase 2 (Main) section"
- If re-running after Critic feedback: include the issues list

**Goal:** Translate `plan.md` into `diagram.d2`, do exactly 2 builds (structure then arrows), then hand to Critic.

### Main instructions (include in agent prompt)

- Read `skills/excalidraw-diagramming/SKILL.md` — Phase 2 (Main) section only
- Write `diagram.d2` from the plan — use `layout: layers` for complex containers, `pos:` only on top-level containers
- **Do NOT call `search_aws_icons`** — the tool resolves icons automatically
- **Do NOT set `icon:` with file paths** — use `icon_type`, `icon_variant`, `icon_hint` only
- **Build 1:** structure + layout, no waypoints/badge_pos. Read ELEMENT POSITIONS output.
- **Build 2:** fix overflows first, then add waypoints/badge_pos using exact positions from Build 1. Verify with screenshot.
- **Maximum 2 builds before Critic review** — do not iterate endlessly
- **Critic talks directly to you** — fix what the Critic flags without going back to Planner

### Main receives Critic feedback on

- All visual/positional issues: overlaps, badge problems, arrow routing, container sizing
- Only structural issues (missing elements, wrong connections) route back to Planner via orchestrator

---

## Agent 3: Critic

Spawn with the Agent tool. Include in the prompt:

- The reference image path
- The path to `plan.md` and `diagram.d2`
- "Read `skills/diagram-review/SKILL.md` and `skills/diagram-review/references/checklist.md`"
- "Verify every arrow in diagram.d2 against the connection table in plan.md"
- "Use `crop_screenshot` with grid mode (e.g., `grid: "3x3"`) to systematically inspect every region"
- "Use `crop_screenshot` with x/y/width/height to zoom into specific problem areas"
- "Compare each crop against the corresponding region in the reference image"

**Goal:** Compare output against reference and `plan.md`. Flag discrepancies.

**Phase 0 (pre-build):** When spawned before Main builds, verify every arrow in `plan.md` against the reference:
- Source element exists in the reference
- Target element exists (no phantom "(left edge, external)" sources)
- Direction matches
- No missing connections
- Errors route to Planner, not Main

**Phase 1+ (post-build):** Use `crop_screenshot` — never rely on full-image inspection alone.

### Critic output format

Return a structured list of issues:
- Each issue: description, severity (structural/positional), recommended fix
- All issues go to **Main** — Main fixes them directly
- Only if Critic finds missing elements or wrong connections → orchestrator routes to Planner

---

## Build Log

After every build (successful or not), write `diagrams/v{N}/build_log.md`. This is a full record of what happened, what went wrong, and what was learned. Future sessions use it to avoid repeating mistakes.

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
