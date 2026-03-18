# Enhanced D2 Syntax Specification

This extends standard D2 syntax with attributes that drive the full diagram build — positions, icons, styling, arrow routing, and badge placement.

## Global arrow style block

Defined once at the top of the file. Applies to ALL labeled connections. Must be the first block.

```d2
arrow_style: {
  stroke: "#545B64"
  stroke_width: "2"
  badge_bg: "#232F3E"
  badge_color: "#ffffff"
  badge_size: "38"
  badge_shape: "circle"
}
```

All fields are required. `badge_shape`: `circle` (standard AWS) or `square` (workflow diagrams).

## Container attributes

Containers are D2 blocks with children. Extended attributes are `key: "value"` pairs.

| Attribute | Format | Required | Default |
|---|---|---|---|
| `pos` | `"x, y, w, h"` | yes | — |
| `stroke` | `"#hex"` | yes | — |
| `stroke_style` | `"solid"` or `"dashed"` | no | `solid` |
| `stroke_width` | `"N"` | no | `2` |
| `header_icon` | `"search query"` | no | — |
| `fill` | `"#hex"` | no | `transparent` |

**Hard rules:**
- `header_bg_color` is NEVER specified
- Corner radius is always 0
- AWS Cloud boundary: always solid, always has `header_icon`
- Dashed sub-boundaries (Authentication, Parallel processing etc): `stroke_style: "dashed"`, NO `header_icon`

**Canonical header icons for standard AWS boundaries:**

| Container type | `header_icon` value | Notes |
|---|---|---|
| AWS Cloud | `"aws cloud logo"` | Outermost boundary — always solid |
| AWS Account | `"aws account"` | Customer/Managed accounts |
| AWS Region | `"aws region flag"` | Regional boundaries |
| VPC | `"aws vpc"` | VPC boundaries |
| Availability Zone | `"aws az"` | AZ boundaries |

```d2
customer_account: Customer's AWS Account {
  pos: "200, 100, 980, 860"
  stroke: "#545B64"
  header_icon: "aws account"

  # child nodes here
}
```

## Node (leaf) attributes

| Attribute | Format | Required | Default |
|---|---|---|---|
| `pos` | `"cx, cy"` | yes | — |
| `icon` | `"search query"` | no | — |
| `icon_variant` | `"Light"` or `"Dark"` | no | `Light` |
| `icon_color` | `"ColorName"` | no | — |
| `external` | `"true"` | no | — |

`icon_color` must use the exact color name saved in `icons/custom/` (e.g. `"Orange"` not `"orange"` or `"#FF9900"`). The tool searches custom recolored variants first before falling back to standard icons.

```d2
appsync: AWS AppSync {
  pos: "550, 510"
  icon: "appsync"
}

s3_repl: S3 replication\ncomponent template {
  pos: "1350, 280"
  icon: "cloudformation template"
  icon_color: "Orange"
}
```

## Connection attributes

Connections use standard D2 arrow syntax. Label number maps to badge.

**Simple:**
```d2
appsync -> lambda: 4
```

**With routing:**
```d2
dth_ui -> cloudfront: 1 {
  waypoints: "350, 648; 350, 790"
  badge_pos: "374, 724"
}
```

**Border stop (arrow ends at container border):**
```d2
lambda -> step_functions: 5 {
  border_stop: "step_functions.left"
}
```

**Unlabeled:**
```d2
cloudfront -> s3_customer
```

**Bidirectional:**
```d2
appsync <-> lambda: 3
```

| Attribute | Format | Required |
|---|---|---|
| `waypoints` | `"x1,y1; x2,y2; ..."` | no |
| `badge_pos` | `"cx, cy"` | required for cross-container arrows |
| `border_stop` | `"container_id.side"` | no |
| `style` | `"plain"` | no (suppresses badge) |

## Validation rules for Planner

1. `arrow_style` block must be first
2. Every node must have `pos`
3. Every container must have `pos` and `stroke`
4. AWS Cloud container: always has `header_icon` and solid stroke
5. Dashed sub-boundaries must NOT have `header_icon`
6. `header_bg_color` must NEVER appear
7. All cross-container connections must have `badge_pos`
8. `external: "true"` on all actors outside containers
9. Multi-line labels use `\n`
10. All short D2 IDs must be unique across the entire diagram
11. `icon_color` values must match exactly what is saved in `icons/custom/`

---

## Hard Rules

- **Never use `header_bg_color`** — colored borders use `stroke` only
- **Cross-container arrow badges need manual `badge_pos`** — auto-position lands on borders
- **Arrow endpoint container check** — before each arrow, determine if it crosses a container boundary:
  - Same container or both outside → direct icon-to-icon (no border_stop)
  - Source outside, target inside → `border_stop: "container.side"`
  - Source inside, target outside → arrow starts at container border
  - Different containers → both ends at borders, `badge_pos` in the gap
- **No internal stub arrows** — when a flow exits a container, draw ONE arrow from the border to the target. Do NOT draw icon→own-container-border stubs.
- **External actors need `external: "true"`** — tool validates they sit outside all containers
- **Never invent connections for standalone elements** — if the reference shows no arrows for an element, it has zero connections in `diagram.d2`. Common mistake: agent sees unconnected icon, assumes it's an error, invents a connection. This creates a phantom arrow.
- **No external arrows** — every arrow connects two real elements. Never start/end at canvas edge or empty space. If the reference shows a line entering from the diagram edge, trace it to the actual source element.
- **Prefer straight arrows** when source and target share Y (or X). Waypoints only when both differ.
- **Arrows enter icons from LEFT or RIGHT** — never from below (label is below icon)
- **All badges use same style** — never mix circle/square or colors within one diagram
- **Icon color must match reference** — use `icon_color` for non-default variants

## Badge styles

| Style | `badge_bg` | `badge_shape` | `badge_size` |
|---|---|---|---|
| Dark circle (AWS standard) | `"#232F3E"` | `"circle"` | `"38"` |
| Blue square (workflow) | `"#147EBA"` | `"square"` | `"28"` |

## Global constants (locked)

```
ICON_SIZE = 65       # All service icons and container header icons
FONT_SIZE = 24       # All text: headers, labels, badges
HEADER_HEIGHT = 75   # Container header height (ICON_SIZE + 10)
```

## Icon types and appearance

| Use case | Example query | Appearance |
|---|---|---|
| Named AWS service (Lambda, S3, Cognito) | `icon: "lambda"` | Colored branded square |
| Generic concept (Git repo, Tools, DB assets) | `icon: "git repository"` | Dark outline icon, no color background |
| External actor (User, Mobile client) | `icon: "user"` | Dark outline silhouette, no color background |
| Container boundary (VPC, Region, Cloud) | `header_icon: "aws vpc"` | Outline boundary icon |

The tool determines icon_type automatically. **Never** add colored backgrounds to resource/external icons — they are dark outlines by design.

Available `icon_color` values: `Orange`, `Green`, `Purple`, `Pink`, `Red`, `Teal`, `Blue`, `Gray`.

**Icon color verification:** After identifying an icon, compare its color against the reference image. The same shape can exist in multiple colors (e.g., CloudFormation Template: pink `#E7157B` standard vs orange `#ED7100` custom). If colors don't match, set `icon_color` to the correct variant. Common mismatch: CloudFormation Template icons that should be orange, not pink.

## External actor placement

External actors (User, Mobile client, DTH UI) sit **outside** all container boundaries. Use `external: "true"`.

```d2
dth_ui: Data Transfer Hub UI {
  pos: "110, 640"
  icon: "client"
  external: "true"
}
```

- Arrows from external actors typically target the LEFT border of a container or a direct icon
- Straight horizontal arrow if actor and target share the same Y
- L-shaped waypoints if they differ in Y
- Arrow enters target from the side (left/right), not from above/below

## Sizing

- Horizontal padding: ~40px inside edges. Vertical: ~30px. Child gap: ~60px. Header: 75px.
- Side-by-side containers: split width proportionally. Max 3 nesting levels (4 for VPC).
- Wide labels (>140px) split with `\n`.

## Positioning formulas

```
Centered:   cx = container_x + w/2,  cy = container_y + 75 + (h-75)/2
Horiz row:  cx_i = container_x + (w/n)*i + (w/n)/2
2-col grid: left_cx = container_x + 40 + col_w/2,  right_cx = left_cx + col_w
Vert stack: same cx, increasing cy with ~100px spacing
```

## Checklist

- [ ] Every node/connection in `diagram.d2` has matching element/arrow on canvas
- [ ] No extras on canvas not in `diagram.d2`
- [ ] Arrows enter icons from sides, no text crossings
- [ ] All badges same style, all corners straight
- [ ] External actors outside containers, cross-container arrows stop at border
- [ ] Canvas arrow count matches `diagram.d2` connection count
