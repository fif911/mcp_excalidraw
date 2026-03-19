---
name: excalidraw-diagramming
description: >
  Write D2 diagram specs for AWS/cloud architecture diagrams. The create_from_d2
  tool converts standard D2 into complete Excalidraw diagrams with icons, containers,
  arrows, and numbered badges automatically.
---

# Excalidraw Diagramming Skill

Two-phase workflow: **Planner** writes the structural D2 spec, **Main** adds positions and builds.

---

## D2 Syntax Reference (both agents)

### Containers (nested braces)

```d2
aws_cloud: AWS Cloud {
  customer_account: Customer's AWS Account {
    cognito: Amazon Cognito
    appsync: AWS AppSync
    lambda: AWS Lambda
  }
  managed_account: AWS Managed Account {
    s3: Amazon S3
    ecr: Amazon ECR
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
# Number after colon = badge number
cognito -> appsync: 2
appsync -> lambda: 4

# Bidirectional
appsync <-> lambda: 3

# Unlabeled (no badge)
cloudfront -> s3
```

### Standalone elements (no connections)

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

Check the reference for each actor's position — they may be outside all containers, inside the outer AWS Cloud but outside inner accounts, or somewhere else. **Do NOT assume external actors go outside AWS Cloud.** Place them at the correct nesting level in D2:

```d2
# Actor OUTSIDE AWS Cloud (at root level)
user: User

# Actor INSIDE AWS Cloud but OUTSIDE account containers
aws_cloud: AWS Cloud {
  dth_ui: Data Transfer\nHub UI
  customer_account: Customer's AWS Account {
    # ... services inside
  }
}

dth_ui -> aws_cloud.customer_account.cloudfront: 1
```

---

## Phase 1: Planner (structure & reference interpretation)

The Planner reads the reference image and writes `diagram.d2` with all structural elements — containers, nodes, connections, labels, and styling. **No positions or waypoints** — those are Main's job.

### Planner output

The Planner writes `diagram.d2` with:
- All containers with nested `{}` braces
- All nodes as leaf elements inside containers
- All connections with `->`, `<->` and numbered labels (`: 1`, `: 2`)
- D2 style attributes for dashed borders, stroke colors
- `# standalone: true` annotation on nodes with no connections
- `icon:` overrides where auto-resolution would pick the wrong icon type

### Planner hard rules

1. **Every element from the reference must be in `diagram.d2`** — containers, nodes, and connections
2. **Never invent connections** for standalone elements — if the reference shows no arrows, don't add any. Whether an element is standalone depends entirely on the specific reference image — not the element type. A "User" icon may be standalone in one diagram and have arrows in another. **Common mistake:** The agent sees an unconnected icon and assumes it's an error, then invents a connection (e.g., User → DTH UI) to "fix" it. This creates a phantom arrow.
3. **Connection labels = badge numbers** — `: 2` maps to badge number 2
4. **Dashed boundaries use `style.stroke-dash: 5`**
5. **AWS Cloud boundary is always present** as the outermost container
6. **All short D2 IDs must be unique** across the diagram
7. **Wide labels split with `\n`** — any label wider than ~120px MUST use `\n` to wrap
8. **Arrow endpoint decision matrix** — before writing each arrow, check the reference:
   ```
   Default behavior:
   1. Same container (or both outside)  → icon-to-icon
   2. Source outside, target inside      → end at container border
   3. Source inside, target outside      → start at container border
   4. Different containers               → both ends at respective borders

   BUT: if the reference clearly shows an arrow crossing a container
   border to reach an icon inside, connect icon-to-icon directly.
   The reference overrides the default matrix.
   ```
9. **No stub arrows** — when a flow exits a container, draw ONE arrow from the container border to the target. Do NOT draw an icon-to-border stub inside the container.
10. **Track border arrows** — if an arrow starts or ends at a container border (not an icon), the connection source/target is the container ID, not the icon inside.

### Icon resolution (Planner describes, tool resolves)

The tool resolves icons automatically from node labels. **Never use `icon:` with file paths** — the Planner describes what icon is needed, the tool finds it. Use hint attributes when auto-resolution picks the wrong type:

```d2
# Named AWS service — auto-resolves correctly, no hints needed
cognito: Amazon Cognito

# External actor — needs resource/Light variant
user: User {
  icon_type: resource
  icon_variant: Light
}

# Custom search — override the search query entirely
ecr_docker: ECR Docker image {
  icon_hint: "elastic container registry"
}
```

**Icon hint attributes:**

| Attribute | Values | When to use |
|---|---|---|
| `icon_type` | `architecture`, `resource` | Auto-resolution picks wrong type (e.g., colored icon for User) |
| `icon_variant` | `Light`, `Dark` | Need outline variant instead of filled |
| `icon_hint` | any search string | Label doesn't match the icon name (e.g., "ECR Docker" → search "elastic container registry") |

**Icon type decision tree:**

| Label type | Icon type | D2 hint |
|---|---|---|
| Named AWS service (Amazon S3, AWS Lambda) | Architecture (auto) | none needed |
| Generic concept (Git repo, Tools, Database) | Resource | `icon_type: resource` |
| External actors (User, Mobile client) | Resource + Light | `icon_type: resource` + `icon_variant: Light` |

### Same service = same label

If a service appears multiple times (e.g., two "Amazon S3" nodes), use the **exact same label text** for both. The tool resolves icons from labels — different labels may resolve to different icons. If one needs a different icon variant, use `icon_hint` on that specific node only.

### Icon color must match reference

The same icon shape can exist in multiple color variants (e.g., CloudFormation Template in pink `#E7157B` vs orange `#ED7100`). Always compare the reference image color and use `icon_hint` to find the correct variant:

```d2
# Standard pink template — auto-resolves correctly
cloudformation: AWS CloudFormation

# Orange variant — use icon_hint to find custom recolored version
s3_repl: S3 replication template {
  icon_hint: "CloudFormation Template Orange"
}
```

If the tool can't find the right color variant, note it as a validation issue.

| Icon | Standard color | Common reference color | icon_hint to use |
|---|---|---|---|
| CloudFormation Template | Pink #E7157B | Orange #ED7100 | `icon_hint: "CloudFormation Template Orange"` |

**Container header icon mapping (auto-detected):**

| Container label pattern | Header icon | Border color |
|---|---|---|
| `AWS Cloud` | AWS Cloud logo (32px) | `#232F3E` |
| Contains `Account` | AWS Cloud icon (32px) | `#232F3E` |
| Contains `Region` | Region icon (32px) | `#147EBA` |
| Contains `VPC` | VPC icon (32px) | `#248814` |
| Contains `Step Functions` | Step Functions icon (search) | `#E7157B` |
| Dashed sub-boundary | Check reference — may or may not have header icon | inherited |

### Planner checklist

- [ ] Every element from reference has a node in `diagram.d2`
- [ ] Every connection from reference has an arrow with correct label number
- [ ] Standalone elements annotated with `# standalone: true`
- [ ] No orphan nodes — every node is in a connection or marked standalone
- [ ] Dashed boundaries use `style.stroke-dash: 5`
- [ ] Wide labels split with `\n`
- [ ] All D2 IDs are unique
- [ ] External actors and generic concepts use `icon_type: resource` (not architecture)
- [ ] Every container header icon matches the reference (including dashed sub-boundaries)
- [ ] Arrow endpoint decision matrix applied — border-stop vs icon-to-icon matches reference
- [ ] No stub arrows (icon → own container border)
- [ ] No invented connections for standalone elements

### Planner does NOT do

- Do NOT add `pos:`, `waypoints:`, or `badge_pos:` — Main handles positioning
- Do NOT use `icon:` with file paths — use `icon_hint`, `icon_type`, `icon_variant` to describe what you need
- Do NOT read previous diagram versions from `diagram_building/`
- Do NOT read `skills/diagram-review/` files — those are for the Critic only
- Do NOT invent connections to "fix" orphaned nodes
- Do NOT write Python build scripts
- Do NOT create `components_styling.txt` or `icons_graph_structure.md`

---

## Phase 2: Main (positioning, building, iterating)

Main receives `diagram.d2` from the Planner **plus a list of fix suggestions** from the initial auto-layout build (the orchestrator calls `create_from_d2` right after the Planner). Fix these specific issues — don't redesign the layout from scratch. The auto-layout handles most positioning; Main only adjusts what the fix suggestions flag.

### Main responsibilities

1. Add `pos: "x,y,w,h"` to **top-level containers only** (AWS Cloud, Account containers) — set the canvas frame
2. Add `layout:` hints to containers with multiple children (`"2x3"`, `row`, `col`)
3. Add `waypoints:` to cross-container arrows for L-shape routing
4. Add `badge_pos:` only when validation flags border overlap
5. Call `create_from_d2` and check validation output
6. Fix issues and rebuild (tool clears canvas each time)
7. Verify visually with `get_canvas_screenshot`
8. Export using `export_to_image`

**Do NOT add `pos:` to leaf nodes.** The tool auto-places all leaf nodes inside their containers using `layout:` hints and auto-spacing. Only set `pos:` on the outermost containers that define the canvas frame.

### Layout hints (primary positioning mechanism for leaf nodes)

All leaf node positioning is done via `layout:` on the parent container. Never add `pos:` to leaf nodes:

```d2
# 2-column, 3-row grid — tool places 6 children automatically
managed_account: AWS Managed Account {
  pos: "1230,100,680,860"
  layout: "2x3"
  s3_repl: S3 replication template
  dynamodb_repl: DynamoDB replication template
  s3_managed: Amazon S3
  ecr_repl: ECR replication template
  ecr: Amazon ECR
  ecr_docker: ECR Docker image
}

# Single horizontal row
auth: Authentication {
  pos: "225,230,310,175"
  layout: row
  cognito: Amazon Cognito
  openid: OpenID Connect
}

# Single vertical column
sidebar: Sidebar {
  pos: "50,100,200,600"
  layout: col
  service_a: Service A
  service_b: Service B
  service_c: Service C
}
```

**Layout values:** `"NxM"` (cols × rows), `row` (single row), `col` (single column).

The tool auto-places all children inside the container using the layout hint. No individual `pos:` needed.

### What the tool handles automatically (don't override unless Critic flags issues)

The tool auto-handles these — Main should NOT manually calculate them:

- **Arrow endpoint snapping** — arrows stop at icon edges, centered on the approached side. Bottom approach accounts for label text height.
- **Badge placement** — auto-placed on the longest arrow segment (most visible, least overlap)
- **L-shape routing** — horizontal-first L-shapes when source/target differ in both X and Y. Straight arrows when same Y or X (within 15px).
- **Container auto-sizing** — when no explicit `pos:` width/height, container grows to fit children with 40px padding and 75px header.
- **Sibling container proportional split** — when parent has explicit width, unpositioned sibling containers split available space proportionally by leaf child count.
- **External actor Y-alignment** — unpositioned root elements auto-align Y to match their connected target's icon center.
- **Child gap spacing** — 60px horizontal and vertical gap between siblings inside containers.

Only override these with explicit `pos:`, `waypoints:`, `badge_pos:` when the Critic flags a problem.

### Main hard rules

1. **All arrows must be orthogonal** — every segment purely horizontal or vertical. The tool auto-creates L-shapes but verify the result.
2. **Every cross-container arrow needs explicit `waypoints`** — without them, arrows render as straight diagonals crossing containers.
3. **Every cross-container arrow badge needs explicit `badge_pos`** — auto-positioned badges land on or inside container borders.
4. **Container sizing must fit all children** — at least 15px padding from children to container edges, plus header height.
5. **Border arrows use container coordinates** — arrows to/from containers use waypoints at the border coordinate. E.g., `waypoints: (830,491)` for a container's left border at x=830.

### Arrow routing guidance (Main decides)

- **Arrows to container borders need no waypoints** — the tool draws a straight line to the nearest border edge. Don't add waypoints for icon-to-container arrows.
- **Icon-to-icon same Y/X: no waypoints** — if two icons share the same Y (or X), the tool draws a straight line. Only add waypoints when the arrow actually needs to turn.
- **One waypoint per turn** — an L-shape needs exactly one waypoint at the bend. Two waypoints creating a tiny segment is wrong.
- **Horizontal lanes for 10+ arrows** — assign each major flow a Y lane to minimize arrow crossings
- **Route vertical segments through gaps** — vertical arrow segments go through gaps between containers, never through container bodies
- **Standalone badges in tight gaps** — when auto-positioned badge overlaps a border, use explicit `badge_pos` in the gap between containers

### Waypoints syntax

```d2
# L-shape: vertical then horizontal
dth_ui -> aws_cloud.customer_account.appsync: 2 {
  waypoints: (300,640),(300,510)
  badge_pos: (340,462)
}

# Single waypoint for right-angle turn
aws_cloud.customer_account.appsync -> aws_cloud.customer_account.dynamodb: 8 {
  waypoints: (550,230)
  badge_pos: (578,185)
}
```

### When badge_pos is needed

- **Cross-container arrows:** Always. Auto-positioned badges land on or inside container borders.
- **L-shape arrows:** Always. Auto-position puts the badge at the midpoint which may overlap icons/labels.
- **Simple same-container arrows:** Usually safe to omit — auto-position works.

### Main receives Critic feedback on

- Overlapping elements — fix positions
- Badge on container border — fix `badge_pos`
- Arrow crosses text — fix `waypoints`
- Container too small / children overflow — fix `pos` dimensions
- Diagonal arrow segment — add `waypoints`
- Icons too close — adjust `pos`

### Main does NOT do

- Do NOT add `pos:` to leaf nodes — tool auto-places them via `layout:` hints
- Do NOT change the structural D2 (adding/removing nodes or connections) — route to Planner
- Do NOT create any files other than editing `diagram.d2` — no Python scripts, no build files
- Do NOT call `search_aws_icons` — icon resolution is handled automatically by `create_from_d2`
- Do NOT use `header_bg_color`
