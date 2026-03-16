# Excalidraw Diagram Building Workflow

## Overview

This workflow produces high-quality, error-free architecture diagrams from either a **reference image** or a **text description**. It uses a three-agent loop: **Planner → Main → Critic**, iterating until the diagram matches the input.

### Input types

| Input type | How it's used |
|---|---|
| **Reference image** | Saved to the version folder. Planner traces all elements, containers, connections, and layout from it. Critic compares the output directly against it pixel-by-pixel. |
| **Text description** | Planner interprets the description to define all elements, containers, connections, and a logical layout. Critic validates against the description and plan files. |

### Three-phase build order

1. Place all sections and service elements with icons — ignore arrows and styles for now
2. Apply all styling: sizes, colors, borders, icon backgrounds
3. Add arrows and numbered badges, adjusting element positions to avoid overlaps

Follow this order precisely. **Never read or reuse previous build scripts or diagrams — always start from scratch.**

Each agent may freely use `awslabs.aws-diagram-mcp-server` and Excalidraw MCP tools.

---

## Agent 1: Planner

**Goal:** Produce a fully structured D2-based plan that the Main agent builds from directly, with no ambiguity.

### Input handling

- **Reference image:** Save the image to `diagram_building/v_{number}/reference.png`. Trace every element, container, sub-boundary, connection, and numbered badge visible in it. Use it as the source of truth for structure and layout intent.
- **Text description:** Interpret the description to define all elements, containers, connections, and a logical spatial arrangement. Make layout decisions explicit in `components_styling.txt`.

### Output files

Create all files under `diagram_building/v_{number}/` (count up from the last version).

---

### `diagram.d2` — primary structural spec

Write the full diagram in D2 syntax. This is the **single source of truth for structure**. The Main agent reads it directly and translates it into `components.py` calls — it is never rendered by any tool.

**D2 syntax rules to follow:**

```d2
# Containers use nested braces
customer_account: Customer's AWS Account {
  auth: Authentication {
    cognito: Amazon Cognito
    openid: OpenID Connect
  }
  appsync: AWS AppSync
  lambda: AWS Lambda
}

managed_account: AWS Managed Account {
  s3: Amazon S3
  ecr: Amazon ECR
}

# Connections with numeric labels = numbered arrows
cognito -> appsync: 2
appsync -> lambda: 4
lambda -> step_functions: 5

# Bidirectional
appsync <-> lambda: 3

# Dashed sub-boundary
auth: Authentication {
  style.stroke-dash: 5
}

# Non-rectangle shapes
dynamodb: Amazon DynamoDB {
  shape: cylinder
}

# Layout hints as comments — Main agent reads these to pick the right components.py function
managed_account: AWS Managed Account {
  # layout: 2-column grid
  s3_template: S3 replication template
  dynamo_template: DynamoDB replication template
  ecr_template: ECR replication template
  ecr_image: ECR Docker image
}
```

**Rules:**
- Every container, sub-container, node, and connection from the input must be present
- Connection labels must be the arrow numbers (e.g., `: 2`, `: 5`) — these map directly to numbered badges
- Dashed boundaries must use `style.stroke-dash: 5`
- Use `# layout:` comments inside containers to specify arrangement: `single`, `horizontal-row`, `vertical-stack`, `2-column grid`, `2x2`, etc.
- Do NOT specify icon URLs — icon lookup is handled by the Main agent via `search_aws_icons`
- Do NOT specify colors, sizes, or positions — those belong in `components_styling.txt`

---

### `components_styling.txt` — visual styling spec

All styling the Main agent applies via `components.py`. Covers:

- Canvas size
- Container colors, stroke colors, stroke widths, corner radius, fill colors
- Header background colors and heights
- Icon styles: color and light/dark variants per service
- Arrow stroke color, width, style (solid/dashed)
- Numbered badge: background color, shape (`circle`, `square`, `rounded`, `diamond`), size
- Special positioning notes (e.g., "Step Functions container is centered, not left-aligned")
- Approximate positions within sections for all elements (e.g., "Cognito at 30% from left, 40% from top of container")

**Note:** Font sizes and icon sizes are globally locked constants in `components.py` (`ICON_SIZE=65`, `FONT_SIZE=24`). Do not specify them here — they cannot be overridden.

---

### `icons_graph_structure.md` — arrow connection reference

Tracks every arrow for the Main agent and Critic to validate against.

| Icon_1 | Icon_2 | Arrow_direction | Arrow_number | Number box style |
|--------|--------|-----------------|--------------|------------------|
| Amazon Cognito | AWS AppSync | from 1 to 2 | 2 | dark circle |
| AWS AppSync | AWS Lambda | from 1 to 2 | 4 | dark circle |
| AWS Lambda | Step Functions | from 1 to 2 | 5 | dark circle |

---

## Agent 2: Main

**Goal:** Read `diagram.d2` as the structural spec and build the diagram entirely via `components.py` and skills. No rendering tools are used for the base layer — everything is built directly from the spec.

### Before starting

- Read relevant skill files from `skills/excalidraw-diagramming/`
- Run `npm run canvas`
- Do **not** read or reuse previous build scripts — start from scratch
- If any feedback comes from the Critic, fix it in the source code and re-run the full build script — do not make targeted updates with new temp scripts

### How to read `diagram.d2`

Parse `diagram.d2` manually to extract:

| D2 element | What to do |
|---|---|
| Leaf node (no children) | `icon_label_component()` at position from `components_styling.txt` |
| Container / nested container | `container_box()` + `fit_container()` |
| `style.stroke-dash: 5` | `container_box()` with `stroke_style="dashed"` |
| Connection with numeric label | `arrow()` with `label_number` matching the label |
| Bidirectional connection | `arrow()` with `start_arrowhead="arrow"` |
| `# layout: X` comment | Pick the matching `components.py` layout function (see step 3) |

### Build steps

#### 1. Icon lookup

For every leaf node in `diagram.d2`, resolve its icon using `search_aws_icons` MCP tool before writing any build script code:

- Always use `search_aws_icons` — never manual search
- `search_aws_icons` parameters:
  - `query` — keyword search (e.g., "lambda", "S3", "step functions")
  - `category` — filter by AWS category (e.g., "Compute", "Storage", "Security-Identity")
  - `icon_type` — `architecture` for service icons, `resource` for sub-resource icons, `group` for boundary icons
  - `size` — pixel size, most service icons are 48
  - `variant` — `Light` or `Dark` — match to `components_styling.txt`
  - `color` — recolored variant color name (e.g., "Orange", "Purple")
  - `limit` — max results (default 20)
- If found: `upload_svg()` the SVG, use returned `file_id` in `icon_label_component()`
- If not found: use a generic placeholder — do not block on missing icon
- If exact color unavailable: recolor and save as a new color option
- Track light vs dark variants carefully — many icons exist in both in different folders

#### 2. Place service nodes

For every leaf node in `diagram.d2`, call `icon_label_component()` using coordinates from `components_styling.txt`:

```python
comp = icon_label_component(
    prefix="cognito",
    file_id="file-cognito",
    label_text="Amazon Cognito",
    cx=..., cy=...,   # from components_styling.txt
)
cognito_cx = comp["bbox"]["cx"]
cognito_cy = comp["bbox"]["cy"]
```

Store each component's `bbox` center immediately — you will need `cx`/`cy` for arrow endpoints in step 4.

#### 3. Draw containers

For every container in `diagram.d2`, call `container_box()` using positions and styles from `components_styling.txt`. Apply `# layout:` hints to place children:

```python
container_box(
    cid="customer_account",
    x=..., y=..., w=..., h=...,
    stroke_color="...",
    header_bg_color="...",
    icon_file_id="file-cloud",
    label_text="Customer's AWS Account",
    stroke_style="solid",   # or "dashed" for sub-boundaries
    corner_radius=0,        # ALWAYS 0 — never use rounded corners
)
fit_container("customer_account", ["cognito", "appsync", "lambda"])
```

Layout hint → function mapping:

| `# layout:` value | `components.py` call |
|---|---|
| `single` | `service_in_container()` |
| `horizontal-row` | manual placement at equal x intervals |
| `vertical-stack` | `vertical_stack()` |
| `2-column grid` / `2x2` | `grid_2x2()` |

#### 4. Draw arrows with numbered badges

For every connection in `diagram.d2`, call `arrow()`. Use `icons_graph_structure.md` as the source of truth — every arrow there must exist, no extras:

```python
# Define once at top of build script
ARROW_STYLE = arrow_style(
    stroke_color="...",
    stroke_width=2,
    label_bg="#1a1a1a",
    label_text_color="#ffffff",
    label_shape="circle",
)

# One call per connection
arrow(
    aid="a-cognito-appsync",
    start_x=cognito_cx, start_y=cognito_cy,
    end_x=appsync_cx, end_y=appsync_cy,
    label_number=2,
    **ARROW_STYLE
)
```

- Define `ARROW_STYLE` once and unpack into every `arrow()` call — never set stroke colors or widths per-arrow
- For cross-boundary arrows use explicit `waypoints` to route cleanly around containers
- For bidirectional connections set `start_arrowhead="arrow"`

#### 5. Post-build verification

After running the build script verify:
- **Container auto-expansion**: `container_box()` silently expands width to fit header text + icon. Verify no child container's rendered edges exceed its parent. The `CONTAINER_OVERLAP` check in `validate_diagram()` catches this.
- **Grid label widths**: Wide labels can overlap between columns. Split long lines with `\n` or increase column spacing.
- **Circle text centering**: `numbered_circle()` uses browser-delegated centering. Font size is locked — no override is possible.
- **No phantom arrows**: Cross-check every arrow against `icons_graph_structure.md` before exporting.
- **Icon sizes**: All icons must use locked `ICON_SIZE=65` — do NOT pass `icon_size`, `font_size`, `icon_header_size`, or `label_font_size` to any component function, they are silently ignored.
- **Element placement**: Must match reference image or text description exactly.

#### 6. Validate overlaps

```python
from utilities.overlap_checks import run_all_overlap_checks
report = run_all_overlap_checks()
```

All reported errors are valid and critical to fix before exporting.

#### 7. Validate arrows

Cross-check every arrow against `icons_graph_structure.md`:
- Correct source and target
- Correct direction
- Correct number and badge style

#### 8. Export

```
diagram_building/v_{number}/diagram.png
diagram_building/v_{number}/diagram.excalidraw
```

#### 9. Component generalization

Any new or modified `components.py` functions must remain generalized — not specific to the current diagram. Locked constants (`ICON_SIZE`, `FONT_SIZE`, `HEADER_HEIGHT`) must never be changed per-diagram.

---

## Agent 3: Critic

**Goal:** Compare the output diagram against the input (reference image or text description) and all plan files. Flag all discrepancies and route fixes to the correct agent.

### Inputs to read

- Reference image (`reference.png`) **or** original text description
- `diagram.d2`
- `components_styling.txt`
- `icons_graph_structure.md`
- `skills/diagram-review/references/checklist.md`

### Tools to use

- Excalidraw MCP — capture canvas output
- `skills/diagram-review/crop_region.py` — zoom in for detailed comparison
- Agentic Vision — when arrow direction or small elements are unclear

### Routing fixes

| Error type | Route to |
|---|---|
| Wrong hierarchy, missing containers/nodes, wrong connections | **Planner** — fix `diagram.d2`, re-pass to Main with clear change description |
| Wrong colors, sizes, overlaps, arrow routing, badge styles | **Main** — fix directly in build script and re-run |

### Errors to detect

- Sections in wrong order or hierarchy
- Missing sections, elements, or icons
- Wrong section names or border styles (solid vs dashed)
- Overlapping elements
- Service badges missing icon images or blended with background
- Incorrectly sized, positioned, or colored elements
- Incorrectly sized or positioned text
- Arrows not starting/ending at element centers
- Arrows pointing in wrong direction
- Missing or extra connections vs `icons_graph_structure.md`
- Arrows overlapping text or icons
- Arrows having different head sizes — all must match
- Numbers in numbered badges not center-aligned
- Numbered badges with wrong color, shape, or number
- Container corners not straight (rounded corners are never allowed)
- Icon sizes inconsistent across elements (all must use locked `ICON_SIZE=65`)
- Any other visual discrepancy vs the input — check `skills/diagram-review/SKILL.md` and `skills/diagram-review/references/checklist.md` for full details