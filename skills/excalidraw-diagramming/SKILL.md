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
8. **Cross-container arrows stop at container border** — use waypoints at the border coordinate. E.g., arrow entering Step Functions (left border x=830): `waypoints: (830,491)`. Arrow exiting Step Functions (bottom border y=645): `waypoints: (990,645)`
9. **Arrow #3-style border entry** — arrows targeting a node inside a sub-boundary (e.g., Auth box) must end at the sub-boundary border, not the node inside. Use waypoints to route to the border edge.

## Icon Resolution

The tool resolves icons automatically from node labels:
- "Amazon Cognito" → finds Cognito architecture icon
- "AWS Lambda" → finds Lambda architecture icon
- "User" → finds user resource icon (dark outline)
- Container labels → finds appropriate header icons

No need to specify icon queries or file paths in D2.

## What NOT to Do

- Do NOT specify positions — the tool handles layout
- Do NOT specify icon file paths or queries — tool resolves from labels
- Do NOT write Python build scripts — tool builds directly
- Do NOT create `components_styling.txt` or `icons_graph_structure.md`
- Do NOT use `header_bg_color` — the tool never applies it

---

## Checklist

- [ ] Every element from reference has a node in `diagram.d2`
- [ ] Every connection from reference has an arrow with correct label number
- [ ] Standalone elements annotated with `# standalone: true`
- [ ] Dashed boundaries use `style.stroke-dash: 5`
- [ ] Wide labels split with `\n`
- [ ] All D2 IDs are unique
