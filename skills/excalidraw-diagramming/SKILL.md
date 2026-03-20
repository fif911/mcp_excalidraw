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

Defines badge appearance for all numbered arrows. Per-connection overrides with `badge_bg`, `badge_color`, `badge_shape` still work.

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

**1. Containers** — with approximate positions estimated from the reference:
```
### AWS Cloud (outermost)
- Approximate size: full canvas, ~1900x1000
- Border: solid, dark
### Customer's AWS Account
- Approximate: left 60%, x~200, y~100, w~980, h~860
- Border: solid, dark
### Authentication (inside Customer's Account)
- Approximate: top-left, x~225, y~230, w~420, h~300
- Border: dashed
- Layout: row (Cognito left, OpenID right)
```

**2. Service nodes** — grouped by container, with approximate cx,cy positions:
```
### Inside Authentication
- Amazon Cognito: cx~320, cy~330 (architecture, pink)
- OpenID Connect: cx~460, cy~330 (custom icon)

### Middle row (inside Customer's Account)
- AWS AppSync: cx~550, cy~510 (architecture, pink)
- AWS Lambda: cx~730, cy~510 (architecture, orange)

### Bottom row (inside Customer's Account)
- Amazon CloudFront: cx~550, cy~790 (architecture, purple)
```

**3. Arrow connection table** — one clean table with border annotations:

| Source | Target | Direction | Badge # | Style |
|--------|--------|-----------|---------|-------|
| Data Transfer Hub UI | Amazon CloudFront | → | 1 | dark circle |
| AWS Lambda (middle) | SFN border (left) | → | 5 | dark circle |
| SFN border (bottom) | AWS Fargate | ↓ | — | unlabeled |

**Total: N numbered + M unlabeled = T arrows**

**4. Standalone elements** — nodes with zero connections

**5. External actors** — with nesting level. **Double-check every actor's nesting**: trace the container borders in the reference. Getting this wrong is the most common Planner error.

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
4. **No external arrows** — every arrow must connect two real elements. If the reference shows a line entering from the diagram edge, trace it to the actual source element (User, DTH UI, etc.). Never write "(left edge, external)" or "(outside)" as a source — find the real element.
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

**Build 2: Arrow refinement using EXACT positions from Build 1**
7. Calculate `waypoints:` using exact `icon_center` Y values from Build 1 output
8. Calculate `badge_pos:` using exact `borders` values (e.g., gap midpoint = `(container1.right + container2.left) / 2`)
9. Update `diagram.d2` with the calculated waypoints and badge_pos
10. Call `create_from_d2` ONCE more
11. Verify visually with `get_canvas_screenshot`

**HARD RULE: Maximum 2 builds before Critic review.** Do not iterate endlessly. Build 1 gets the structure right, Build 2 gets the arrows right. If there are still issues, the Critic will tell you what to fix specifically.

### Sizing

Each icon+label takes ~160×136px. Header height is 108px. Size containers to fit their content with 40px padding — don't inflate everything. A sub-container with 2 icons in a row needs ~420px wide, 2 stacked needs ~440px tall.

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
