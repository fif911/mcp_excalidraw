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

`diagram_building/v{N}/plan.md` with:

1. **Container hierarchy** — nesting, which are dashed, colored borders, header icons
2. **Service nodes** — label, which container, icon type (architecture/resource/custom)
3. **Numbered arrow table:**
   | Source | Target | Direction | Badge # | Style |
   |--------|--------|-----------|---------|-------|
   | Data Transfer Hub UI | Amazon CloudFront | → | 1 | dark circle |
   | AWS Lambda (middle) | Step Functions border | → | 5 | dark circle |
4. **Unlabeled arrows** — same format, no badge
5. **Standalone elements** — nodes with no connections
6. **External actors** — position relative to containers (inside/outside which ones)
7. **Icon notes** — resource vs architecture type, color variants, custom icons
8. **Layout intent** — "Managed Account: 2x3 grid", "Auth: horizontal row"

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

### Main responsibilities — two-pass build

**Pass 1: Initial build**
1. Write `diagram.d2` from `plan.md` — translate the text plan into D2 syntax
2. Add `pos:` where needed (see positioning rules below)
3. Add `layout:` hints to containers with grid-like children
4. Call `create_from_d2` — the tool builds AND returns exact positions of all elements

**Pass 2: Refine arrows using exact positions**
5. Read the **ELEMENT POSITIONS** section from the build output
6. Use exact `icon_center` coordinates and `borders` values to calculate:
   - `waypoints:` for arrows that need L-shapes (use exact icon_cy values)
   - `badge_pos:` for cross-container badges (use container border midpoints)
7. Update `diagram.d2` with refined waypoints/badge_pos
8. Rebuild with `create_from_d2`
9. Verify visually with `get_canvas_screenshot`
10. Export using `export_to_image`

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

### Arrow routing guidance

- **Horizontal lanes for 10+ arrows** — assign each flow a Y lane
- **Route vertical segments through gaps** — not through container bodies
- **Standalone badges in tight gaps** — use `badge_pos` when auto-position overlaps

### Icon resolution (Main translates Planner's descriptions)

| Planner says | D2 attribute |
|---|---|
| "architecture icon" (default for AWS services) | none needed |
| "resource icon" | `icon_type: resource` |
| "Light/outline variant" | `icon_variant: Light` |
| "orange CloudFormation Template" | `icon_hint: "CloudFormation Template Orange"` |
| "custom OpenID icon" | `icon: "custom/icons8-openid.svg"` |

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
- Wrong icon → fix `icon_hint` or `icon_type`

Only structural issues (missing elements, wrong connections) route back to Planner via orchestrator.

### Main does NOT do

- Do NOT add `pos:` to leaf nodes — tool auto-places via layout hints
- Do NOT call `search_aws_icons` — `create_from_d2` handles icon resolution
- Do NOT create files other than `diagram.d2`
- Do NOT use `header_bg_color`
