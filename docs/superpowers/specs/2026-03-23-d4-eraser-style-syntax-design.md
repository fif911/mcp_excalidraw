# D4: Eraser-Style Diagram Syntax

## Goal

A new diagram syntax (D4) that matches Eraser.io's simplicity — flat node declarations, short connection syntax, automatic layout via ELK Layered — while producing beautiful Excalidraw diagrams with AWS icons.

## Why

The current D3 syntax requires:
- Manual column wrappers (`col1: { ... }`)
- Fully-qualified IDs in connections (`aws_cloud.customer_account.col2.appsync -> aws_cloud.customer_account.col3.lambda`)
- `placement:` hints and `route:` hints for positioning
- Understanding of row-index alignment across columns

An LLM should be able to write this instead:
```
AWS Cloud {
  User [icon: user]
  Customer Account {
    Auth [icon: cognito, style: dashed] { Cognito, OpenID Connect }
    AppSync [icon: appsync]
    DynamoDB [icon: dynamodb]
    Lambda [icon: lambda]
    CloudFront [icon: cloudfront]
    S3 [icon: s3]
    Step Functions [icon: sfn, color: pink] { Lambda Worker }
    CloudFormation [icon: cloudformation]
    Fargate [icon: fargate]
  }
  Managed Account {
    S3 Managed [icon: s3]
    ECR [icon: ecr]
  }
}

User > AppSync: 2
User > DTH UI: 3
AppSync > Lambda: 4
AppSync > DynamoDB: 8
Lambda > Step Functions: 5
CloudFront > S3: 1
DTH UI > CloudFront
CloudFormation > S3 Managed: 6
Fargate > ECR: 7
```

## Syntax Reference

### Nodes
```
NodeName                          # bare node
NodeName [icon: aws-lambda]       # with icon
NodeName [icon: lambda, color: orange]  # with properties
"Node With Spaces" [icon: s3]     # quoted name
```

**Node properties:** `icon`, `color`, `style` (dashed/solid), `label` (display override)

### Groups (Containers)
```
Group Name {
  Child1 [icon: x]
  Child2 [icon: y]
}

Group Name [icon: vpc, color: blue] {
  Nested Group {
    Deep Child
  }
}
```

### Connections
```
A > B                    # arrow left-to-right
A > B: label             # labeled arrow
A > B, C, D              # one-to-many
A > B [color: red]       # styled connection
A -- B                   # line (no arrow)
A --> B                  # dotted arrow
```

### Direction
```
direction right          # default, left-to-right flow
direction down           # top-to-bottom
```

### Diagram-Level Styling
```
colorMode bold           # pastel (default), bold, outline
```

### Name Resolution in Connections

Short names resolve by searching the node tree:
1. Exact match in current scope
2. Unique match anywhere in the tree
3. If ambiguous, prefix with parent: `Account.Lambda`

## Architecture

```
D4 Source Text
    │
    ▼
┌──────────┐
│  Parser   │  → D4Graph { nodes, edges, groups }
└──────────┘
    │
    ▼
┌──────────────┐
│ ELK Layouter │  → Assigns (x,y,w,h) to every node/group
│  (elkjs)     │  → Routes edges with bend points
└──────────────┘
    │
    ▼
┌──────────────────┐
│ Element Builder   │  → Excalidraw elements (reuse from D3)
│ (icons, arrows,   │  → Icon resolution via searchIcons()
│  badges, groups)  │  → Badge placement
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Overlap Validator │  → Reuse overlapChecks.ts
└──────────────────┘
```

### Phase 1: Parser

Parses D4 text into an intermediate graph:
```typescript
interface D4Node {
  id: string;           // unique, auto-generated from name
  name: string;         // display name
  icon?: string;        // icon search query
  color?: string;
  style?: string;       // "dashed"
  children: D4Node[];   // nested nodes (group)
  parent?: string;      // parent group ID
}

interface D4Edge {
  from: string;         // node ID (resolved from short name)
  to: string;
  label?: string;
  color?: string;
  style?: string;       // "dotted"
}

interface D4Graph {
  nodes: D4Node[];      // flat list (all nodes, including nested)
  edges: D4Edge[];
  groups: D4Node[];     // only container nodes
  direction: 'right' | 'down' | 'left' | 'up';
  colorMode: 'pastel' | 'bold' | 'outline';
}
```

### Phase 2: ELK Layout

Convert D4Graph to ELK JSON format, run ELK Layered, get coordinates back.

**Key ELK options for clean diagrams:**
```typescript
{
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',                    // or DOWN
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',  // horizontal gap
  'elk.layered.spacing.edgeNodeBetweenLayers': '40',
  'elk.spacing.nodeNode': '60',                // vertical gap
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN', // layout groups properly
  'elk.layered.edgeRouting.strategy': 'ORTHOGONAL',  // clean right-angle routing
  'elk.padding': '[top=40,left=40,bottom=40,right=40]',
}
```

**ELK handles automatically:**
- Node ordering to minimize edge crossings
- Layer assignment (which column each node goes in)
- Orthogonal edge routing with bend points
- Compound/nested node layout
- Port placement (where edges connect to nodes)

**What we handle after ELK:**
- Icon placement within nodes (centered, with label below)
- Badge placement on edges (midpoint of longest segment)
- Container header icons and labels
- Fine-tuning of edge endpoints to snap to icon edges

### Phase 3: Element Builder

Reuse the existing D3 element builder with modifications:
- **Containers:** Same as D3 (rectangle + header icon + label)
- **Leaf nodes:** Same as D3 (icon image + label text)
- **Arrows:** Use ELK's bend points directly instead of our custom routing. Convert ELK's absolute bend points to Excalidraw relative points. Apply icon-edge snapping from existing pipeline.
- **Badges:** Reuse existing badge placement logic

### Phase 4: Server Integration

New endpoint: `POST /api/elements/from-d4`
- Same pattern as `/api/elements/from-d3`
- Broadcasts elements via WebSocket
- Auto-export to `.excalidraw` files

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/d4/parser.ts` | Create | D4 syntax parser |
| `src/utils/d4/layouter.ts` | Create | ELK integration + coordinate assignment |
| `src/utils/d4/builder.ts` | Create | Excalidraw element builder (adapts from D3) |
| `src/utils/d4/index.ts` | Create | Public API: `convertD4ToExcalidraw()` |
| `src/utils/d4/types.ts` | Create | D4 type definitions |
| `src/server.ts` | Modify | Add `/api/elements/from-d4` route |
| `tests/d4-parser.test.ts` | Create | Parser unit tests |
| `tests/d4-layout.test.ts` | Create | Layout integration tests |
| `tests/d4-e2e.test.ts` | Create | E2E visual tests |
| `tests/fixtures/*.d4` | Create | Test fixtures |

## Reuse from D3

| Component | Reuse Strategy |
|-----------|---------------|
| `searchIcons()` | Direct import — resolve icon names to SVG paths |
| `measureText()` | Direct import — compute text dimensions for ELK node sizing |
| `detectContainerType()` | Direct import — identify AWS containers for header icons |
| Badge placement | Adapt — use ELK bend points instead of custom routing |
| Icon-edge snapping | Adapt — snap ELK endpoints to icon borders |
| `overlapChecks.ts` | Direct import — validate final output |
| Element ID generation | Direct import — `generateId()` |

## What NOT to Reuse

| Component | Why |
|-----------|-----|
| D3 parser | Different syntax entirely |
| D3 layout engine | Replaced by ELK |
| D3 arrow routing pipeline | ELK handles routing; we only do endpoint snapping |
| Column/layer logic | Not needed — ELK determines layers automatically |

## Success Criteria

1. The Data Transfer Hub diagram renders correctly from D4 syntax (no coordinates, no columns)
2. All arrows are orthogonal with no overlaps
3. All icons render correctly via short name resolution
4. Containers properly nested with header icons
5. Badge numbers visible on all labeled arrows
6. Layout quality comparable to Eraser.io examples
7. An LLM can generate the D4 syntax without computing any positions
