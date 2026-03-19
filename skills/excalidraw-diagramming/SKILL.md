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

```d2
aws_cloud: AWS Cloud {
  # ... services inside
}

# External actors outside aws_cloud
user: User
dth_ui: Data Transfer Hub UI

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
2. **Never invent connections** for standalone elements — if the reference shows no arrows, don't add any. Whether an element is standalone depends on the reference, not the element type.
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

### Icon resolution (Planner decides, tool executes)

The tool resolves icons automatically from node labels. The Planner overrides with `icon:` only when auto-resolution would pick the wrong type.

**Icon type decision tree:**

| Label type | Icon type | Example |
|---|---|---|
| Named AWS service (Amazon S3, AWS Lambda, Amazon Cognito) | Architecture icon (`Arch_*`) — colored branded square | `cognito: Amazon Cognito` |
| Generic concept or role (User, Git repo, Tools, Database, IDE) | Resource icon (`Res_*`) — dark outline | `user: User` |
| External actors (User, Mobile client, Data Transfer Hub UI) | Resource icon with Light variant (`Res_48_Light`) | `user: User { icon: ".../Res_User_48_Light.svg" }` |

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
- [ ] External actors and generic concepts use `Res_*` icon paths (not `Arch_*`)
- [ ] Every container header icon matches the reference (including dashed sub-boundaries)
- [ ] Arrow endpoint decision matrix applied — border-stop vs icon-to-icon matches reference
- [ ] No stub arrows (icon → own container border)
- [ ] No invented connections for standalone elements

### Planner does NOT do

- Do NOT add `pos:`, `waypoints:`, or `badge_pos:` — Main handles positioning
- Do NOT read previous diagram versions from `diagram_building/`
- Do NOT read `skills/diagram-review/` files — those are for the Critic only
- Do NOT invent connections to "fix" orphaned nodes
- Do NOT write Python build scripts
- Do NOT create `components_styling.txt` or `icons_graph_structure.md`

---

## Phase 2: Main (positioning, building, iterating)

Main receives the structural `diagram.d2` from the Planner and adds all positioning — `pos:` for containers and nodes, `waypoints:` for arrow routing, `badge_pos:` for numbered badges. Then builds with `create_from_d2` and iterates on validation issues.

### Main responsibilities

1. Add `pos: "x,y,w,h"` to every container
2. Add `pos: "cx,cy"` to every leaf node
3. Add `waypoints:` to arrows that need L-shape routing
4. Add `badge_pos:` to cross-container and L-shape arrow badges
5. Call `create_from_d2` and check validation output
6. Fix positioning issues and rebuild (tool clears canvas each time)
7. Verify visually with `get_canvas_screenshot`
8. Export using `export_to_image`

### Main hard rules

1. **All arrows must be orthogonal** — every segment purely horizontal or vertical. The tool auto-creates L-shapes but verify the result.
2. **Every cross-container arrow needs explicit `waypoints`** — without them, arrows render as straight diagonals crossing containers.
3. **Every cross-container arrow badge needs explicit `badge_pos`** — auto-positioned badges land on or inside container borders.
4. **Container sizing must fit all children** — at least 15px padding from children to container edges, plus header height.
5. **Border arrows use container coordinates** — arrows to/from containers use waypoints at the border coordinate. E.g., `waypoints: (830,491)` for a container's left border at x=830.

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

- Do NOT change the structural D2 (adding/removing nodes or connections) — route to Planner
- Do NOT use `header_bg_color`
