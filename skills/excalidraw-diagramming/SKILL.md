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

The Planner reads the reference image and writes `plan.md` — a **text description** of every element, container, connection, and styling. No D2 code, no positions.

### Planner output

`diagram_building/v{N}/plan.md` — a clean, structured document. **No stream-of-consciousness reasoning, no corrections inline, no "wait, let me re-examine".** Examine the reference carefully BEFORE writing, then write the final clean output once.

The plan must contain these sections in order:

1. **Container hierarchy** — nesting, which are dashed, colored borders, header icons
2. **Service nodes** — one table per container with: label, icon type, icon color, icon notes
3. **Numbered arrow table** — one final clean table, no duplicates, no corrections:
   | # | Source | Target | Direction | Style |
   |---|--------|--------|-----------|-------|
   | 1 | Amazon CloudFront | Amazon S3 (customer) | → | dark circle |
4. **Unlabeled arrows** — same format, no badge column
5. **Standalone elements** — nodes with no connections
6. **External actors** — position relative to containers. **Double-check every actor's nesting**: trace the container borders in the reference to determine if the actor is outside ALL containers, inside AWS Cloud but outside account containers, or inside an account container. Getting this wrong is the most common Planner error.
7. **Icon notes** — resource vs architecture type, **specific color** (orange, pink, purple, green), custom icons. Always note the icon color — the same icon shape exists in multiple colors.
8. **Layout intent** — "Managed Account: 2x3 grid", "Auth: horizontal row"

**IMPORTANT: Write each section ONCE. Do not revise inline. If you need to re-examine the reference, do it before writing — not during.**

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
4. **No stub arrows** — describe exits as one arrow from border to target
5. **Same service = same label** — identical label text for duplicate services
6. **Icon color must match reference** — note color variants (e.g., "CloudFormation Template — orange, not pink")

### Planner does NOT do

- Do NOT write D2 code — Main does that
- Do NOT specify pixel positions
- Do NOT read previous diagram versions from `diagram_building/`
- Do NOT read `skills/diagram-review/` files — those are for the Critic only

---

## Phase 2: Main (D2 coding, building, iterating)

Main reads `plan.md` and the reference image, writes `diagram.d2` with full D2 syntax including positions, layout hints, and waypoints. Then builds with `create_from_d2` and iterates. **Critic talks directly to Main** — no routing through Planner for visual/positional fixes.

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

### Canvas and container sizing

Icons are **98px** (not the old 65px). Everything must be scaled accordingly:
- **Minimum canvas:** 2800×1500 for a typical 2-account diagram
- **Each icon+label takes ~160×136px** of space
- **Containers need at least 60px gap** between children and **40px padding** from edges
- **Header height is 108px** — don't place children within 108px of container top
- A container with 2 icons in a row needs at least **420px wide** (2×160 + 60 gap + 2×40 padding)
- A container with 2 icons stacked vertically needs at least **440px tall** (108 header + 2×136 + 60 gap)
- **Side-by-side account containers:** split proportionally — if one has more children, give it more width

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

**Do NOT guess coordinates.** After Pass 1, the tool gives you exact positions. Use them for Pass 2.

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

1. **All arrows must be orthogonal** — tool draws straight lines, verify the result
2. **Cross-container arrows need explicit `waypoints`** — without them, arrows go straight (may cross containers)
3. **Cross-container badges need explicit `badge_pos`** — auto-position may land on borders
4. **Container sizing must fit all children** — 15px minimum padding
5. **Arrows to container borders: no waypoints needed** — tool draws straight to nearest border edge
6. **Icon-to-icon same Y/X: no waypoints** — tool draws straight
7. **One waypoint per turn** — no redundant tiny segments
8. **Arrows stop at icon edges** — tool auto-snaps, no manual edge offsets needed

### Element alignment for clean arrows

**Elements connected by horizontal arrows must share the same Y position.** If AppSync → Lambda → Step Functions are on the same flow row, set all their `pos:` to the same Y value. Same for cross-container horizontal arrows (ECR → Fargate, S3 managed → CloudFormation).

Look at the reference image and identify horizontal rows. All elements on the same row get the same Y. This eliminates L-shape bends — the tool draws straight horizontal lines when source and target share Y.

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

- Do NOT add `pos:` to leaf nodes — tool auto-places via layout hints
- Do NOT call `search_aws_icons` — `create_from_d2` handles icon resolution
- Do NOT create files other than `diagram.d2`
- Do NOT use `header_bg_color`
