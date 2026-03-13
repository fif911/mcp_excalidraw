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

Write the full diagram in D2 syntax. This replaces the old `components_plan.txt` and is the **single source of truth for structure**. The Main agent must not deviate from it.

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

# Icon assignment (URL-based)
cognito: Amazon Cognito {
  icon: https://icons.terrastruct.com/aws/Security-Identity-Compliance/Amazon-Cognito.svg
}

# Non-rectangle shapes
dynamodb: Amazon DynamoDB {
  shape: cylinder
}
```

**Rules:**
- Every container, sub-container, node, and connection from the input must be present
- Connection labels must be the arrow numbers (e.g., `: 2`, `: 5`) — these map directly to numbered badges
- Dashed boundaries must use `style.stroke-dash: 5`
- D2 layout is a **structural guide only** — pixel positions come from `components_styling.txt`

---

### `components_styling.txt` — visual styling spec

All styling the Main agent applies via `components.py`. Covers:

- Canvas size
- Container colors, stroke colors, stroke widths, corner radius, fill colors
- Header background colors and heights
- Font sizes for container labels and service labels
- Icon sizes and styles (especially color and light/dark variants)
- Arrow stroke color, width, style (solid/dashed)
- Numbered badge: background color, shape (`circle`, `square`, `rounded`, `diamond`), size
- Any special positioning notes (e.g., "Step Functions container is centered, not left-aligned")
- Provide approximate positions within sections for all elements, e.g. "Cognito at 30% from left, 40% from top of container"

---

### `icons_graph_structure.md` — arrow connection reference

Tracks every arrow for the Main agent and Critic to validate against.
For example:
| Icon_1 | Icon_2 | Arrow_direction | Arrow_number | Number box style |
|--------|--------|-----------------|--------------|------------------|
| Amazon Cognito | AWS AppSync | from 1 to 2 | 2 | dark circle |
| AWS AppSync | AWS Lambda | from 1 to 2 | 4 | dark circle |
| AWS Lambda | Step Functions | from 1 to 2 | 5 | dark circle |

---

## Agent 2: Main

**Goal:** Parse `diagram.d2` as the structural spec and use `components.py` and skills to build the diagram on the Excalidraw canvas.

### Before starting

- Read relevant skill files from `skills/excalidraw-diagramming/`
- Run `npm run canvas`
- Do **not** read or reuse previous build scripts — start from scratch
- If any feedback comes from the Critic, fix it in the source code and re-run the build, do not do targeted updates with new temp scripts.

### Build steps

#### 1. Parse `diagram.d2`
Use create_from_d2 MCP server tool. 
For reference:

| D2 element | `components.py` call |
|---|---|
| Container / nested container | `container_box()` |
| Node | `icon_label_component()` + `upload_svg()` |
| Connection with numeric label | `arrow()` with `label_number` |
| Dashed boundary | `container_box()` with `stroke_style="dashed"` |

D2 layout is a **guide for hierarchy only** — use `components_styling.txt` for actual pixel positions and sizes.

#### 2. Icon lookup

- Always use `excalidraw search_aws_icons` MCP tool — never manual search
- Here are parameters: 
    • query: string - Keyword search (e.g., "lambda", "S3", "database", "step functions", "VPC"). Matches service names with fuzzy matching and AWS abbreviation aliases.           
    • category: string - Filter by AWS category (e.g., "Compute", "Analytics", "Security-Identity", "Storage", "Databases"). Use alone to browse all icons in a category.           
    • icon_type: string - Filter by icon type: architecture = service icons (Arch_*), resource = sub-resource icons (Res_*), group = boundary/region/VPC icons, category = 
    category-level icons, custom = user-added icons in icons/custom/
    • size: string - Filter by pixel size. Most service icons come in 16/32/48/64, group icons are 32.
    • variant: string - For general resource icons only: Light or Dark variant.
    • color: string - Filter by recolored variant color name (e.g., "Orange", "Green", "Purple"). Only applies to custom recolored icons in icons/custom/.
    • limit: number - Max results to return (default: 20, max: 50)
- Match light/dark icon variants to `components_styling.txt`, this is variant parameter.
- If the exact color is unavailable, recolor and save as a new color option
- Same icon can be in different folders and have light and dark versions in different folders.


#### 3. Apply styling

Apply all values from `components_styling.txt`:
- Container colors, stroke styles, header backgrounds
- Font sizes, icon sizes — these are LOCKED in `components.py` (`ICON_SIZE=65`, `FONT_SIZE=24`). Do NOT pass `icon_size`, `font_size`, `icon_header_size`, or `label_font_size` to any component function.
- Arrow styles, numbered badge colors, shapes, and sizes
- **All container corners MUST be straight** — always `corner_radius=0`. Never use rounded corners.
- **Element placement (inside/outside sections)** must match the reference image exactly. Do NOT assume external elements go outside the cloud boundary.
- **No phantom arrows** — only create arrows that exist in `icons_graph_structure.md`. Verify source, target, and direction for every arrow.

#### 3a. Post-build verification

After running the build script, verify these critical items:
- **Container auto-expansion**: `container_box()` silently expands width to fit header text + icon. A container specified at `w=280` may render at `w=312`. Verify that no child container's rendered edges exceed its parent. The `CONTAINER_OVERLAP` check in `validate_diagram()` catches this.
- **Grid label widths**: In multi-column grids, wide labels (e.g., "component template" = 259px at font 24) can overlap between columns. Split long lines ("component\ntemplate") or increase column spacing.
- **Circle text centering**: `numbered_circle()` uses `measure_text` + `align_in_parent` for browser-delegated centering. Font size is locked to `FONT_SIZE`. No parameters are exposed to override centering.

#### 4. Validate overlaps

```python
from utilities.overlap_checks import run_all_overlap_checks
report = run_all_overlap_checks()
```

All reported errors are valid and critical to fix before exporting.

#### 5. Validate arrows

Cross-check every arrow against `icons_graph_structure.md`:
- Correct source and target
- Correct direction
- Correct number and badge style

#### 6. Export

```
diagram_building/v_{number}/diagram.png
diagram_building/v_{number}/diagram.excalidraw
```

#### 7. Component generalization

Any new or modified `components.py` functions must remain generalized — not specific to the current diagram.

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
| Wrong hierarchy, missing containers/nodes, wrong connections | **Planner** — fix `diagram.d2`, re-pass to Main with change description |
| Wrong colors, sizes, overlaps, arrow routing, badge styles | **Main** — fix directly |

### Errors to detect

- Sections in wrong order or hierarchy
- Missing sections, elements, or icons
- Wrong section names or border styles (solid vs dashed)
- Overlapping elements
- Service badges missing icon images or being blended with background
- Incorrectly sized, positioned, or colored elements
- Incorrectly sized or positioned text
- Arrows not starting/ending at element centers
- Arrows pointing in wrong direction
- Missing or extra connections vs `icons_graph_structure.md`
- Arrows overlapping text or icons
- Arrows having different head sizes, they should be the same
- Numbers in numbered badges not being center aligned
- Numbered badges with wrong color, shape, or number
- Any other visual discrepancy vs the input, check `skills/diagram-review/SKILL.md` and `skills/diagram-review/references/checklist.md` for details.