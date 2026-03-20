---
name: excalidraw-diagramming
description: >
  Build AWS/cloud architecture diagrams on Excalidraw. Planner writes a text plan,
  Main translates it into D2 and builds with create_from_d2.
---

# Excalidraw Diagramming Skill

Two-phase workflow: **Planner** writes a text plan describing the diagram, **Main** translates it into D2 code, builds, and iterates with Critic feedback.

---

## D2 Syntax Reference (Main agent)

### Containers (nested braces)

```d2
aws_cloud: AWS Cloud {
  customer_account: Customer's AWS Account {
    cognito: Amazon Cognito
    appsync: AWS AppSync
  }
}
```

### Dashed sub-boundaries

```d2
auth: Authentication {
  style.stroke-dash: 5
  cognito: Amazon Cognito
  openid: OpenID Connect
}
```

### Connections with numbered badges

```d2
cognito -> appsync: 2
appsync -> lambda: 4
appsync <-> lambda: 3
cloudfront -> s3
```

### Standalone elements

```d2
user: User
# standalone: true
```

### Colored containers

```d2
step_functions: AWS Step Functions workflow {
  style.stroke: "#E7157B"
  lambda_sf: AWS Lambda
  cloudformation: AWS CloudFormation
}
```

### External actors

Check the reference — actors may be outside all containers, inside AWS Cloud but outside accounts, etc. Place at correct nesting level:

```d2
user: User

aws_cloud: AWS Cloud {
  dth_ui: Data Transfer\nHub UI
  customer_account: Customer's AWS Account {
    # ...
  }
}
```

### Icon hint attributes

```d2
user: User {
  icon_type: resource
  icon_variant: Light
}

ecr_docker: ECR Docker image {
  icon_hint: "elastic container registry"
}
```

| Attribute | Values | When to use |
|---|---|---|
| `icon_type` | `architecture`, `resource` | Auto-resolution picks wrong type |
| `icon_variant` | `Light`, `Dark` | Need outline variant |
| `icon_hint` | any search string | Label doesn't match icon name |

### Arrow style (global)

```d2
arrow_style {
  stroke_color: "#545B64"
  badge_bg: "#232F3E"
  badge_color: "#ffffff"
  badge_shape: circle
}
```

Badge style is determined by the reference — check which style it uses:

| Style | badge_bg | badge_shape |
|---|---|---|
| Dark filled circle (most common) | `#232F3E` | `circle` |
| Blue filled square (workflow diagrams) | `#147EBA` | `square` |
| Dark filled square | `#232F3E` | `square` |

All badges in a diagram must use the same style — never mix.

### Layout hints

```d2
managed_account: AWS Managed Account {
  pos: "1230,100,680,860"
  layout: "2x3"
  s3_repl: S3 replication template
  ecr: Amazon ECR
  # ... tool auto-places children in grid
}
```

Values: `"NxM"` (cols × rows), `row`, `col`. Tool auto-detects grid if omitted.

---

## Phase 1: Planner (structure & reference interpretation)

The Planner reads the reference image and writes `plan.md` — a structured description of every element, container, connection, and styling, with approximate positions estimated from the reference. No D2 code.

### Planner output

`diagram_building/v{N}/plan.md` — a clean, structured document. **No stream-of-consciousness reasoning, no corrections inline, no "wait, let me re-examine".** Examine the reference carefully BEFORE writing, then write the final clean output once.

**IMPORTANT: Write each section ONCE. Do not revise inline. If you need to re-examine the reference, do it before writing — not during.**

The plan must contain these sections in order:

**Important: each icon+label takes ~160×136px. Account for this when estimating container sizes — a container with 3 icons in a row needs at least ~600px wide.**

**Nested container spacing: each container has a 108px header. A sub-container's top must be at least 120px below its parent container's top to avoid header overlap. For 3-level nesting (Cloud → Account → Auth), the innermost container starts ~240px below the outermost.**

**1. Containers** — with approximate positions estimated from the reference. Remember: each icon takes ~160×136px, gaps are 60px, padding is 40px. A 2-icon row container needs ~460px wide. A 3-icon row needs ~640px wide. **If actors sit between two container borders, leave at least 200px gap between them for the actor icon.**
```
### Outer container
- Approximate: x~30, y~20, w~1900, h~1100
- Border: solid, dark
### Main left container (holds 3 rows of icons + 2 sub-containers)
- Approximate: x~60, y~100, w~1100, h~960
### Sub-container with 2 icons in a row
- Approximate: w~460, h~300
- Layout: row
### Sub-container with 2 icons stacked
- Approximate: w~300, h~500
- Layout: col
```

**2. Service nodes** — grouped by container, with approximate cx,cy positions. Space icons ~220px apart horizontally (160px icon + 60px gap):
```
### Inside sub-container (row layout — tool auto-places)
- Service A: (architecture, pink)
- Service B: (custom icon)

### Middle row (free-placed, all same Y for horizontal arrows)
- Service C: cx~400, cy~550 (architecture, pink)
- Service D: cx~620, cy~550 (architecture, orange)

### Bottom row (free-placed, all same Y)
- Service E: cx~400, cy~800 (architecture, purple)
```

**3. Arrow connection table** — one clean table. Source and target only — no direction symbols, no notes. The Main agent figures out routing. Targets can be icons or container borders (e.g., "SFN border (left)"):

| Source | Target | Badge # | Badge style |
|--------|--------|---------|-------------|
| Data Transfer Hub UI | Amazon CloudFront | 1 | dark circle |
| AWS Lambda (middle) | SFN border (left) | 5 | dark circle |
| SFN border (bottom) | AWS Fargate | — | — |

**Total: N numbered + M unlabeled = T arrows**

**Verification: every leaf node must appear in exactly one of: numbered arrows, unlabeled arrows, or standalone elements. If any node is missing from all three, the plan has a gap.**

**4. Standalone elements** — nodes with zero connections

**5. External actors** — with nesting level. **Double-check every actor's nesting**: trace the container borders in the reference. Getting this wrong is the most common Planner error. **Leave room for actors between containers** — if an actor sits between AWS Cloud left border and Customer Account left border, the gap must be at least 200px (one icon width + padding). Shift the inner container right to make room.

**6. Icon variants** — which need resource type, Light variant, color variants, custom icons

### Planner hard rules

1. **Every element from the reference must be in the plan**
2. **Never invent connections** — if the reference shows no arrows for an element, list it as standalone. A "User" icon may be standalone in one diagram and connected in another. **Common mistake:** inventing User → DTH UI to "fix" an unconnected icon.
3. **Arrow endpoint decision matrix:**
   ```
   Default:
   1. Same container       → icon-to-icon
   2. Source outside, target inside → end at container border
   3. Source inside, target outside → start at container border
   4. Different containers  → both ends at borders

   Reference overrides: if it clearly shows an arrow crossing a border
   to reach an icon inside, note it as icon-to-icon.
   ```
4. **No external arrows** — every arrow must connect two real elements. If the reference shows a line entering from the diagram edge, trace it to the actual source element. Never write "(left edge, external)" or "(outside)" as a source — find the real element.
   - **Trace arrowheads, not badge positions** — the badge sits on the arrow body, not at the source. Follow the arrowhead to determine direction. A badge near element X doesn't mean X is the source — it means the arrow passes near X.
   - **One element can be the source of multiple arrows** — look for fan-out patterns where one element connects to several targets.
5. **No stub arrows** — describe exits as one arrow from border to target
6. **Same service = same label** — identical label text for duplicate services
7. **Icon color must match reference** — note color variants (e.g., "CloudFormation Template — orange, not pink")
8. **Wide labels split with `\n`** — any label wider than ~140px must be split (e.g., "S3 replication\ncomponent template")
9. **Container types** — four patterns exist, check reference for each:
   - Solid + header icon (AWS Cloud, Account, Region, VPC)
   - Dashed + header icon (rare sub-boundaries with their own icon)
   - Dashed text-only (Authentication, Storage, Catalog — no icon)
   - Colored border (Step Functions #E7157B pink)
10. **External actor arrows** — arrows from actors start at the icon edge, connect to container border or target icon directly
11. **Trace every arrow end-to-end** — for each numbered badge, follow the line from one end to the other. Don't assume the source from the badge position alone. An arrow with badge "8" near DynamoDB could go FROM AppSync TO DynamoDB, not from the nearest icon.

### Planner does NOT do

- Do NOT write D2 code — Main does that
- Do NOT read previous diagram versions from `diagram_building/`
- Do NOT read `skills/diagram-review/` files — those are for the Critic only

---

## Phase 2: Main (D2 coding, building, iterating)

Main reads `plan.md` and the reference image, writes `diagram.d2`, then does exactly 2 builds. **Critic talks directly to Main** — no routing through Planner for visual/positional fixes.

### Main responsibilities — EXACTLY two builds, no more

**Build 1: Structure + positions, NO arrows refinement**
1. Write `diagram.d2` from `plan.md` — all containers, nodes, connections
2. Add `pos:` to containers and special-placement elements
3. Add `layout:` to grid containers
4. Do NOT add `waypoints:` or `badge_pos:` yet — let the tool auto-route
5. Call `create_from_d2` ONCE
6. **STOP. Read the ELEMENT POSITIONS output.** Write down the icon_center and borders values you need.

**Build 2: Fix ALL issues from Build 1 output**
7. Read validation errors and fix suggestions — fix container overflows FIRST:
   - If children overflow a container → expand the container `pos:` width/height
   - If expanding pushes into a neighbor → shift the neighbor too
   - If icons are outside their container → the container is too small, expand it
8. Then calculate arrows using exact positions from Build 1:
   - `waypoints:` using exact `icon_center` Y values
   - `badge_pos:` using exact `borders` values (gap midpoint = `(container1.right + container2.left) / 2`)
9. Update `diagram.d2` with ALL fixes
10. Call `create_from_d2` ONCE more
11. Verify visually with `get_canvas_screenshot`

**HARD RULE: Maximum 2 builds before Critic review.** Do not iterate endlessly. Build 1 gets the structure right, Build 2 gets the arrows right. If there are still issues, the Critic will tell you what to fix specifically.

### Sizing

Each icon+label takes ~160×136px. Header height is 108px. **Calculate container sizes by adding up children + gaps + padding:**
- 2-icon row: 160 + 60 + 160 + 80 (padding) = **460px wide**
- 3-icon row: 160 + 60 + 160 + 60 + 160 + 80 = **680px wide**
- A container holding 3 rows of icons + 2 sub-containers needs ~**1100px wide** and ~**960px tall**
- Header text must also fit: label width + icon (98px) + 40px padding
- The tool auto-expands if too small, but getting it right avoids cascading overlaps with neighbors

### Positioning rules — what gets `pos:` and what doesn't

**Always add `pos: "x,y,w,h"` to:**
- All containers — every container needs explicit bounds to match the reference layout
- Elements that have a specific position in the reference that can't be derived from a grid pattern — look at the reference and ask: "would auto-layout put this in the right place?" If no, add `pos:`.

**Use `layout:` instead of `pos:` for:**
- Containers where all children form a regular repeating pattern (grid, row, or column)
- If children are evenly spaced in a grid → `layout: "NxM"`
- If children sit side by side → `layout: row`
- If children stack top to bottom → `layout: col`

**Leaf nodes inside a `layout:` container need no `pos:`** — the tool auto-places them.

**For Build 1**, use Planner's approximate positions. **For Build 2**, use the exact positions returned by the tool — never guess.

### What the tool handles automatically (don't override unless Critic flags issues)

- **Arrow endpoint snapping** — arrows stop at icon edges, centered on the approached side
- **Badge placement** — auto-placed on the longest arrow segment
- **Container auto-sizing** — grows to fit children with 40px padding
- **Sibling container proportional split** — by leaf child count
- **External actor Y-alignment** — auto-aligns to connected target's icon center
- **Child gap spacing** — 60px between siblings
- **Label-aware grid** — column widths based on actual label measurements
- **Auto-grid detection** — picks grid dimensions from child count if no hint

### Main hard rules

1. **Cross-container arrows need `waypoints` in Build 2** — use exact positions from Build 1 output
2. **Cross-container badges need `badge_pos` in Build 2** — calculate gap midpoint from container borders
3. **One waypoint per turn** — no redundant tiny segments
4. **Container sizing must fit all children** — check validation for overflow

### Element alignment for clean arrows

Elements connected by horizontal arrows must share the same Y position. Identify horizontal rows in the reference and set all elements on the same row to the same Y. The tool also auto-aligns connected elements within 50px — but setting correct Y from the start is better.

### Arrow routing guidance

- **Horizontal lanes for 10+ arrows** — assign each flow a Y lane
- **Route vertical segments through gaps** — not through container bodies
- **Standalone badges in tight gaps** — use `badge_pos` when auto-position overlaps

### Icon resolution (Main translates Planner's descriptions)

| Planner says | D2 attribute |
|---|---|
| "architecture icon" (default for AWS services) | none needed — auto-resolves from label |
| "resource icon" or "outline icon" | `icon_type: resource` |
| "Light/outline variant" | `icon_type: resource` + `icon_variant: Light` |
| "orange CloudFormation Template" | `icon_hint: "CloudFormation Template Orange"` |
| "custom OpenID icon" | `icon: "custom/icons8-openid.svg"` |

**If the tool picks the wrong icon, make the description more specific.** Add `icon_type`, `icon_variant`, or refine `icon_hint` text. Only use `icon:` with file paths for truly custom icons (e.g., OpenID).

**Container header icon mapping (auto-detected):**

| Container label | Header icon | Border color |
|---|---|---|
| `AWS Cloud` | AWS Cloud logo | `#232F3E` |
| Contains `Account` | AWS Cloud icon | `#232F3E` |
| Contains `Region` | Region icon | `#147EBA` |
| Contains `VPC` | VPC icon | `#248814` |
| Contains `Step Functions` | Step Functions icon | `#E7157B` |

### Main receives Critic feedback directly

- Overlapping elements → fix positions or layout hints
- Badge on border → fix `badge_pos`
- Arrow crosses text → fix `waypoints`
- Container overflow → expand `pos` or split labels with `\n`
- Diagonal segment → fix waypoints
- Wrong icon → fix the icon description: improve `icon_hint` to be more specific, add `icon_type: resource` or `icon_variant: Light` if needed. The tool resolves icons from descriptions — if it picked wrong, the description wasn't specific enough.

Only structural issues (missing elements, wrong connections) route back to Planner via orchestrator.

### Main does NOT do

- Do NOT add `pos:` to leaf nodes inside `layout:` containers — tool auto-places them
- Do NOT create files other than `diagram.d2`
- Do NOT use `header_bg_color`
