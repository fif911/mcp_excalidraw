---
name: excalidraw-diagramming
description: >
  Write D2 diagram specs for AWS/cloud architecture diagrams. The create_from_d2
  tool converts standard D2 into complete Excalidraw diagrams with icons, containers,
  arrows, and numbered badges automatically.
---

# Excalidraw Diagramming Skill

Write standard D2 syntax. The `create_from_d2` tool handles icon resolution,
layout, container headers, arrow routing, and validation internally.

---

## D2 Structure Patterns

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

The tool detects AWS container types from labels and applies correct header icons,
stroke colors, and styling automatically.

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
lambda -> step_functions: 5

# Bidirectional
appsync <-> lambda: 3

# Unlabeled (no badge)
cloudfront -> s3
```

### Standalone elements (no connections)

Mark with a comment. Never invent connections for these:

```d2
user: User
# standalone: true
```

### External actors

Place outside all containers. The tool validates positioning:

```d2
aws_cloud: AWS Cloud {
  # ... services inside
}

# External actors outside aws_cloud
user: User
dth_ui: Data Transfer Hub UI

dth_ui -> aws_cloud.customer_account.cloudfront: 1
```

### Colored containers (Step Functions style)

```d2
step_functions: AWS Step Functions workflow {
  style.stroke: "#E7157B"
  lambda_sf: AWS Lambda
  cloudformation: AWS CloudFormation
}
```

---

## Hard Rules

1. **Every element from the reference must be in `diagram.d2`** — containers, nodes, and connections
2. **Never invent connections** for standalone elements — if the reference shows no arrows, don't add any
3. **Connection labels = badge numbers** — `: 2` maps to badge number 2
4. **Dashed boundaries use `style.stroke-dash: 5`** — the tool converts this to dashed stroke
5. **AWS Cloud boundary is always present** as the outermost container
6. **All short D2 IDs must be unique** across the diagram
7. **Wide labels split with `\n`** — any label wider than ~120px MUST use `\n` to wrap. E.g., `s3_repl: S3 replication\ncomponent template`, `dth_ui: Data Transfer\nHub UI`. The tool renders each line as a separate centered element.
8. **All arrows must be orthogonal** — every segment purely horizontal or vertical. No diagonal arrows. The tool auto-creates L-shapes when source and target differ in both X and Y, but verify the result.
9. **Arrow endpoint decision matrix** — before writing each arrow, check the reference:
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
10. **No stub arrows** — when a flow exits a container, draw ONE arrow from the container border to the target. Do NOT draw an icon-to-border stub inside the container — the icon's connection to the border is implicit by being inside it.
11. **Track border arrows** — in `diagram.d2`, if an arrow starts or ends at a container border (not an icon), the connection source/target is the container ID, not the icon inside. Use waypoints at the border coordinate for entry/exit. E.g., `waypoints: (830,491)` for Step Functions left border.
12. **Arrow #3-style border entry** — arrows targeting a node inside a sub-boundary (e.g., Auth box) must end at the sub-boundary border, not the node inside. Use waypoints to route to the border edge.

## Icon Resolution

The tool resolves icons automatically from node labels. Override with `icon:` only when auto-resolution picks the wrong icon.

### Icon type decision tree

| Label type | Icon type | Example |
|---|---|---|
| Named AWS service (Amazon S3, AWS Lambda, Amazon Cognito) | Architecture icon (`Arch_*`) — colored branded square | `cognito: Amazon Cognito` |
| Generic concept or role (User, Git repo, Tools, Database, IDE) | Resource icon (`Res_*`) — dark outline | `user: User` |
| External actors (User, Mobile client, Data Transfer Hub UI) | Resource icon with Light variant (`Res_48_Light`) | `user: User { icon: "aws-icons-official/.../Res_User_48_Light.svg" }` |

When auto-resolution returns the wrong type (e.g., architecture icon for "User"), add an explicit `icon:` path in the D2 node.

### Container header icons

The tool auto-detects container type from labels and applies header icons. Mapping:

| Container label pattern | Header icon | Border color |
|---|---|---|
| `AWS Cloud` | AWS Cloud logo (32px) | `#232F3E` |
| Contains `Account` | AWS Cloud icon (32px) | `#232F3E` |
| Contains `Region` | Region icon (32px) | `#147EBA` |
| Contains `VPC` | VPC icon (32px) | `#248814` |
| Contains `Step Functions` | Step Functions icon (search) | `#E7157B` |
| Dashed sub-boundary | Check reference — may or may not have header icon | inherited |

**Every container's header icon must match the reference image.** Dashed sub-boundaries sometimes have icons and sometimes don't — always verify against the reference.

## Waypoints & Badge Position

### When waypoints are needed

Any arrow that crosses a container boundary or needs an L-shape route requires explicit waypoints. Without them, arrows render as straight diagonals.

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

## What NOT to Do

- Do NOT specify positions — the tool handles layout
- Do NOT specify icon file paths or queries unless auto-resolution picks the wrong icon
- Do NOT write Python build scripts — tool builds directly
- Do NOT create `components_styling.txt` or `icons_graph_structure.md`
- Do NOT use `header_bg_color` — the tool never applies it
- Do NOT invent connections to "fix" orphaned nodes — if the reference shows no arrows, mark as `# standalone: true`
- Do NOT draw stub arrows (icon → own container border) — one arrow from border to target

---

## Checklist

- [ ] Every element from reference has a node in `diagram.d2`
- [ ] Every connection from reference has an arrow with correct label number
- [ ] Standalone elements annotated with `# standalone: true`
- [ ] Dashed boundaries use `style.stroke-dash: 5`
- [ ] Wide labels split with `\n`
- [ ] All D2 IDs are unique
- [ ] External actors and generic concepts use `Res_*` icon paths (not `Arch_*`)
- [ ] Every container header icon matches the reference (including dashed sub-boundaries)
- [ ] Every cross-container arrow has explicit `waypoints` for L-shape routing
- [ ] Every cross-container arrow has explicit `badge_pos` to avoid border overlap
- [ ] Arrow endpoint decision matrix applied — border-stop vs icon-to-icon matches reference
- [ ] No stub arrows (icon → own container border)
- [ ] No orphan nodes — every node is in a connection or marked `# standalone: true`
- [ ] No diagonal arrows — all segments orthogonal (tool enforces, but verify)
