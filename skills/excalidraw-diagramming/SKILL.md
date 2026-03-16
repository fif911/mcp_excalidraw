---
name: excalidraw-diagramming
description: >
  Build high-quality AWS/cloud architecture diagrams on the Excalidraw canvas using
  components.py. Use when the Main agent needs to translate diagram.d2 and
  components_styling.txt into a working build script. Covers all component patterns,
  container sizing, arrow routing, icon lookup, and external element placement.
---

# Excalidraw Diagramming Skill

Read this skill in full before writing any build script code. All patterns here are
derived from real reference diagrams and must be followed precisely.

---

## Global Constants (Locked — Never Override)

```python
ICON_SIZE = 65       # All service icons and container header icons
FONT_SIZE = 22       # All text: container headers, icon labels, arrow labels, badges
HEADER_HEIGHT = 75   # Container header height (ICON_SIZE + 10)
```

Never pass `icon_size=`, `font_size=`, `icon_header_size=`, or `label_font_size=` to
any `components.py` function — these parameters are silently ignored. All sizing is
governed by the constants above.

---

## Build Script Structure

Every build script follows this exact order:

```python
from components import *
from utilities.overlap_checks import run_all_overlap_checks
import time

# 1. Clear canvas
clear()
time.sleep(0.5)

# 2. Upload icons (looked up via search_aws_icons before writing script)
upload_svg("file-cognito", "icons/...")
# ...

# 3. Define arrow style (one constant, used everywhere)
ARROW_STYLE = arrow_style(
    stroke_color="#1a1a1a",
    stroke_width=2,
    label_bg="#1a1a1a",        # or "#147EBA" for blue square badges
    label_text_color="#ffffff",
    label_size=32,
    label_font_size=FONT_SIZE,
    label_shape="circle",      # or "square" for blue badges
)

# 4. Place external actors (outside all containers)
# 5. Place containers (outermost first, innermost last)
# 6. Place service nodes inside containers
# 7. Draw arrows with badges
# 8. Validate
# 9. Export
```

---

## Numbered Badge Style Reference

The badge style is determined by the reference image — not arbitrary. Use this table:

| Reference diagram style | `label_bg` | `label_shape` | `label_size` |
|---|---|---|---|
| Dark filled circle (AWS standard) | `"#1a1a1a"` | `"circle"` | `32` |
| Blue filled square (Step Functions / workflow diagrams) | `"#147EBA"` | `"square"` | `28` |
| Dark filled square | `"#1a1a1a"` | `"square"` | `28` |

Always read the reference image or `components_styling.txt` to determine which style
applies. All badges in a diagram must use the same style — never mix.

---

## Icon Lookup (Step 1 — Before Writing Any Code)

Use `search_aws_icons` MCP tool for every node in `diagram.d2` before writing the build script.

```
search_aws_icons(
    query="cognito",
    icon_type="architecture",   # "architecture" for AWS services, "resource" for generic
    size="48",
    variant="Light",            # or "Dark" — match components_styling.txt
)
```

**Architecture vs Resource icons:**

| Use case | `icon_type` | Appearance |
|---|---|---|
| Named AWS service (Lambda, S3, Cognito...) | `architecture` | Colored branded square |
| Generic concept (Git repository, Studio IDE, Tools, Database assets...) | `resource` | Dark outline icon, no color |
| External actor (User, Mobile client, ML engineers...) | `resource` | Dark outline silhouette |
| Container boundary (VPC, Region, AWS Cloud...) | `group` | Outline boundary icon |

**Icon background color:**
- AWS service icons: `icon_bg_color=None` — the icon SVG already has its colored background
- Generic/resource icons: `icon_bg_color=None` — no background tile
- External actors: `icon_bg_color=None` — standalone silhouette

If the exact color variant is unavailable, recolor and save as a new color option via
the `search_aws_icons` recolor capability.

---

## External Actor Placement

External actors (Users, Mobile client, ML engineers, Data Transfer Hub UI) sit **outside**
all container boundaries. Always check `components_styling.txt` and the reference image —
never assume external elements go outside the cloud boundary.

**Pattern:**

```python
# Place external actor at explicit coordinates from components_styling.txt
# These are NOT inside any container — placed on bare canvas
user = icon_label_component(
    prefix="user",
    file_id="file-user",
    label_text="User",
    cx=EXT_CX, cy=EXT_CY,   # from components_styling.txt
)
user_cx = user["bbox"]["cx"]
user_cy = user["bbox"]["icon_cy"]  # use icon_cy for arrow endpoints, not label cy
```

**Arrow from external actor to container:**
- Arrow starts at external actor's `icon_cy`
- Arrow ends at the target container's LEFT border (not inside the container)
- Use a straight horizontal arrow if they share the same Y
- Use L-shaped waypoints if they don't share the same Y

```python
arrow(
    "a-user-cloudfront",
    start_x=user_cx + ICON_SIZE/2,   # right edge of icon
    start_y=user_cy,
    end_x=cloudfront_cx - ICON_SIZE/2,  # left edge of target icon
    end_y=cloudfront_cy,
    label_number=1,
    **ARROW_STYLE
)
```

---

## Container Patterns

### Pattern 1: Standard container with header icon + label (solid border)

Used for: AWS Cloud, Customer Account, AWS Managed Account, VPC, Region.

```python
container_box(
    cid="customer_account",
    x=CX, y=CY, w=W, h=H,
    stroke_color="#1a1a1a",
    fill_color="transparent",
    header_bg_color="#232F3E",   # dark header — from components_styling.txt
    icon_file_id="file-cloud",
    label_text="Customer's AWS Account",
    label_color="#ffffff",
    stroke_width=2,
    stroke_style="solid",
    corner_radius=0,             # ALWAYS 0
)
```

### Pattern 2: Dashed sub-boundary with header icon + label

Used for: Authentication, Front end, Parallel processing, Storage management.

```python
container_box(
    cid="auth",
    x=CX, y=CY, w=W, h=H,
    stroke_color="#7B3FBE",     # or "#1a1a1a" — from components_styling.txt
    fill_color="transparent",
    icon_file_id=None,          # dashed sub-boundaries often have no header icon
    label_text="Authentication",
    label_color="#1a1a1a",
    stroke_width=1,
    stroke_style="dashed",
    corner_radius=0,
)
```

### Pattern 3: Dashed container with NO header icon — text label only

Used for: "Parallel processing", "Storage", "Catalog", "Data component",
"Discovery component", "Cost component", "Web UI component".

```python
container_box(
    cid="parallel",
    x=CX, y=CY, w=W, h=H,
    stroke_color="#7B3FBE",
    fill_color="transparent",
    icon_file_id=None,          # no header icon
    label_text="Parallel processing",
    label_color="#7B3FBE",      # label color matches stroke
    stroke_width=1,
    stroke_style="dashed",
    corner_radius=0,
)
```

### Pattern 4: Inner container with colored header (Step Functions style)

Used for: "AWS Step Functions workflow" — solid colored border, colored header bg.

```python
container_box(
    cid="step_functions",
    x=CX, y=CY, w=W, h=H,
    stroke_color="#E7174E",     # pink/magenta
    fill_color="transparent",
    header_bg_color="#E7174E",
    icon_file_id="file-step-functions",
    label_text="AWS Step Functions\nworkflow",
    label_color="#ffffff",
    stroke_width=2,
    stroke_style="solid",
    corner_radius=0,
)
```

### AWS Cloud outer boundary (special case)

**HARD RULE:** AWS Cloud boundary is ALWAYS solid, ALWAYS has the AWS logo icon and
"AWS Cloud" label. Never dashed. Never without header.

```python
container_box(
    cid="aws_cloud",
    x=20, y=20, w=CANVAS_W-40, h=CANVAS_H-40,
    stroke_color="#232F3E",
    fill_color="transparent",
    header_bg_color=None,       # no colored header bg for AWS Cloud
    icon_file_id="file-aws-logo",
    label_text="AWS Cloud",
    label_color="#232F3E",
    stroke_width=2,
    stroke_style="solid",       # ALWAYS solid
    corner_radius=0,
)
```

---

## Container Sizing Formula

Containers must be sized to fit their children with clearance. Use these formulas:

```python
# Minimum container width
min_w = left_padding + content_width + right_padding
# where content_width = sum of child widths + gaps between them

# Minimum container height
min_h = HEADER_HEIGHT + top_padding + content_height + bottom_padding

# Recommended padding
H_PAD = 40   # horizontal padding inside container
V_PAD = 30   # vertical padding below header / above bottom border
CHILD_GAP = 60  # gap between sibling elements inside container
```

**Side-by-side containers (e.g., Customer Account + Managed Account):**

```python
# Total inner width = AWS Cloud width - 2*H_PAD - gap between containers
total_inner_w = AWS_W - 2*H_PAD - INNER_GAP
# Split proportionally based on content (not always 50/50)
left_w = total_inner_w * 0.6   # Customer Account has more elements
right_w = total_inner_w * 0.4  # Managed Account has fewer

left_x = aws_x + H_PAD
right_x = left_x + left_w + INNER_GAP
# Both start at same y, both use same height
```

**Always call `fit_container()` after placing children** to auto-expand if content overflows:

```python
fit_container("customer_account", ["cognito", "appsync", "lambda", "dynamodb"],
              padding=40, header_height=HEADER_HEIGHT)
```

**Multi-level nesting sizing:** size innermost containers first, then expand outward.
AWS VPC diagrams may have 4 levels (AWS Cloud → VPC → Private Subnet → component) —
this is acceptable for VPC diagrams only. General architecture diagrams: max 3 levels.

---

## Service Node Placement Inside Containers

### Single service centered in container

```python
service_in_container("cognito", "file-cognito", "Amazon Cognito", "auth")
```

### Horizontal row inside container

```python
# Equal spacing across container width
container = get_element("customer_account")
n = 3  # number of items
cell_w = container["width"] / n
for i, (prefix, file_id, label) in enumerate(items):
    cx = container["x"] + cell_w * i + cell_w / 2
    cy = container["y"] + HEADER_HEIGHT + (container["height"] - HEADER_HEIGHT) / 2
    comp = icon_label_component(prefix, file_id, label, cx=cx, cy=cy)
```

### 2-column grid inside container

```python
grid_2x2("managed", [
    {"file_id": "file-s3-template",     "label": "S3 replication\ncomponent template",     "id_suffix": "s3-tmpl"},
    {"file_id": "file-dynamo-template", "label": "DynamoDB replication\ncomponent template", "id_suffix": "db-tmpl"},
    {"file_id": "file-ecr-template",    "label": "ECR replication\ncomponent template",     "id_suffix": "ecr-tmpl"},
    {"file_id": "file-ecr-image",       "label": "ECR replication\nDocker image",           "id_suffix": "ecr-img"},
], "managed_account")
```

**Wide labels in grids:** Always split labels wider than ~140px onto two lines using `\n`.
Single-line "S3 replication component template" will overflow its cell — use
"S3 replication\ncomponent template".

### Vertical stack inside container

```python
result = vertical_stack([
    {"prefix": "lambda-sf",  "file_id": "file-lambda",         "label": "AWS Lambda"},
    {"prefix": "cfn",        "file_id": "file-cloudformation",  "label": "AWS CloudFormation"},
], cx=step_cx, start_y=step_top + HEADER_HEIGHT + 80, spacing=40)
```

### Text-box workflow steps (no icon)

Used for workflow steps like "extract text", "describe face", "prep and translate".
These are plain bordered rectangles with centered text — no icon.

```python
# Define consistent box dimensions
BOX_W = 180
BOX_H = 60
BOX_GAP = 30   # vertical gap between boxes

steps = ["extract text", "describe face", "describe image",
         "prep and\ntranslate", "create audio", "store audio"]

boxes = []
for i, label in enumerate(steps):
    cy = start_y + i * (BOX_H + BOX_GAP)
    box = text_box(
        prefix=f"step-{i}",
        text=label,
        cx=STEPS_CX, cy=cy,
        width=BOX_W, height=BOX_H,
        stroke_color="#1a1a1a",
        fill_color="#ffffff",
        stroke_width=1,
        corner_radius=0,
    )
    boxes.append(box)

# Connect boxes vertically with arrows (no badge)
for i in range(len(boxes) - 1):
    b1 = boxes[i]["bbox"]
    b2 = boxes[i+1]["bbox"]
    arrow(f"a-step-{i}",
          start_x=b1["cx"], start_y=b1["cy"] + BOX_H/2,
          end_x=b2["cx"],   end_y=b2["cy"] - BOX_H/2,
          **ARROW_STYLE)
```

---

## Arrow Routing Patterns

### Define ARROW_STYLE once — unpack everywhere

```python
ARROW_STYLE = arrow_style(
    stroke_color="#1a1a1a",
    stroke_width=2,
    label_bg="#1a1a1a",
    label_text_color="#ffffff",
    label_size=32,
    label_font_size=FONT_SIZE,
    label_shape="circle",
)

# Every arrow call:
arrow("a-x-y", sx, sy, ex, ey, label_number=3, **ARROW_STYLE)
```

### Straight horizontal arrow (same Y)

```python
arrow("a-cognito-appsync",
      start_x=cognito_cx + ICON_SIZE/2,  start_y=cognito_cy,
      end_x=appsync_cx - ICON_SIZE/2,    end_y=appsync_cy,
      label_number=2, **ARROW_STYLE)
```

### L-shaped arrow (different Y, avoids label text)

**HARD RULE: Never approach an icon from below when the label is below the icon.**
Always enter from LEFT or RIGHT to avoid crossing label text.

```python
# Route: horizontal from source → turn vertical → horizontal into target left edge
mid_x = source_cx + (target_cx - source_cx) * 0.6  # bend point x
arrow("a-hub-appsync",
      start_x=hub_cx, start_y=hub_cy,
      end_x=appsync_cx - ICON_SIZE/2, end_y=appsync_cy,
      waypoints=[(mid_x, hub_cy), (mid_x, appsync_cy)],
      label_number=3, **ARROW_STYLE)
```

### Cross-container arrow

Arrows crossing from one top-level container into another must stop at the
receiving container's border — not pierce through to the internal icon.

```python
# Arrow from Managed Account → Customer Account (Step Functions border)
# End point: left border of Step Functions container, not the internal icon
step_fn = get_element("step_functions")
arrow("a-s3-cfn",
      start_x=s3_cx + ICON_SIZE/2, start_y=s3_cy,
      end_x=step_fn["x"],          end_y=cfn_cy,  # left border of container
      label_number=6, **ARROW_STYLE)
```

### High arrow count strategy (10+ arrows)

For complex diagrams with many arrows (image 5 has 17):

1. **Draw in order** — follow `icons_graph_structure.md` arrow numbers sequentially
2. **Plan horizontal lanes** — assign each major flow a Y lane to minimize crossings
3. **Route vertical segments through gaps** — between containers, not through them
4. **Use `label_segment`** to place badges on the longest segment of L-shaped arrows
5. **Use standalone `numbered_circle()`** for badges in tight gaps between containers
   where `label_number` auto-position would land on a border or icon

```python
# Badge on specific segment of multi-waypoint arrow
arrow("a-complex",
      start_x=sx, start_y=sy,
      end_x=ex, end_y=ey,
      waypoints=[(wx1, wy1), (wx2, wy2)],
      label_number=15,
      label_segment=1,    # place badge on segment 1 (middle segment)
      **ARROW_STYLE)
```

### Arrow with italic text label (no numbered badge)

Used for flow descriptions like "authenticate", "store image files", "interact with".

```python
arrow("a-sdk-amplify",
      start_x=sdk_cx, start_y=sdk_cy,
      end_x=amplify_cx, end_y=amplify_cy,
      **ARROW_STYLE)

# Place italic text label above/below arrow midpoint
arrow_label("a-sdk-amplify",
            text="HTML, CSS,\nJavaScript",
            font_size=FONT_SIZE,
            text_color="#1a1a1a",
            offset_y=-18)  # above the arrow
```

---

## Storing Component Centers for Arrow Endpoints

Always store `icon_cy` (not `cy`) for arrow endpoints — arrows must connect to the
icon center, not the label center.

```python
comp = icon_label_component("cognito", "file-cognito", "Amazon Cognito", cx=CX, cy=CY)
cognito_cx   = comp["bbox"]["cx"]
cognito_cy   = comp["bbox"]["icon_cy"]   # use icon_cy for arrows
cognito_bbox = comp["bbox"]

# For text_box components — use box center directly
box = text_box("step-0", "extract text", cx=CX, cy=CY, ...)
step0_cx = box["bbox"]["cx"]
step0_cy = box["bbox"]["cy"]
```

---

## Post-Build Validation

Always run both checks before exporting:

```python
issues = []
issues += validate_arrow_paths()
issues += validate_diagram()
report = run_all_overlap_checks()

if issues or report.get("errors"):
    print("ERRORS — fix before export:")
    for i in issues: print(f"  {i}")
else:
    print("Validation passed")

export_screenshot("diagram_building/v_{N}/diagram.png")
save_state("diagram_building/v_{N}/diagram.excalidraw")
```

**Common failures and fixes:**

| Error | Fix |
|---|---|
| `TEXT_OVERLAP` on arrow | Re-route with L-shaped waypoints, enter icon from side |
| `ICON_OVERLAP` on arrow | Adjust waypoint x to clear icon bounding box |
| `DIAGONAL` segment | Ensure all waypoints form orthogonal (H or V only) segments |
| `CONTAINER_OVERLAP` | Child container's rendered width exceeds parent — reduce child w or increase parent w |
| `ARROWHEAD_GAP` | Final arrow segment <30px — extend the last waypoint further from icon |
| Grid label overlap | Add `\n` to split wide labels across two lines |

---

## Checklist Before Exporting

- [ ] Every node in `diagram.d2` has a corresponding element on canvas
- [ ] Every connection in `icons_graph_structure.md` has a matching arrow — no extras, no missing
- [ ] All arrows enter icons from label-free sides (left or right)
- [ ] No arrow crosses any text (icon labels or container headers)
- [ ] All numbered badges use the same style (color, shape, size)
- [ ] All container corners are `corner_radius=0`
- [ ] No explicit `icon_size` or `font_size` passed to any component function
- [ ] External actors placed at correct positions per `components_styling.txt`
- [ ] Cross-container arrows stop at container border — not piercing through
- [ ] Wide grid labels split with `\n`
- [ ] `fit_container()` called after all children placed
- [ ] `validate_arrow_paths()` and `validate_diagram()` both return zero issues
