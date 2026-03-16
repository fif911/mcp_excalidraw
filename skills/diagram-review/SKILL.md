---
name: diagram-review
description: >
  Review and QA architecture diagrams (AWS, GCP, Azure, Kubernetes) for visual issues using
  agentic vision — iterative zoom, crop, and inspect. Use when asked to review a diagram image,
  check diagram quality, find visual issues, verify alignment, or QA a component diagram before
  delivery. No reference image needed — the agent understands diagram best practices and evaluates
  independently. Outputs structured fix requirements with current vs expected state.
---

# Diagram Review Skill

Review architecture diagrams using an agentic **Think > Act > Observe** loop inspired by
Gemini's Agentic Vision. Instead of a single static glance, iteratively zoom into regions
to catch fine-grained issues that full-image review misses.

---

## Core Workflow

### Phase 1: Full-Image Overview (Think)

1. View the full diagram image
2. Identify the diagram type (AWS, GCP, Azure, K8s) and major structural elements
3. List all visible containers, services, arrows, labels, and numbered steps
4. Note areas that look potentially problematic (crowded, misaligned, overlapping)
5. Plan which regions need detailed inspection

### Phase 2: Systematic Grid Inspection (Act + Observe)

Split the diagram into a grid for systematic review:

```bash
python3 scripts/crop_region.py <image> --grid 3 3 <output_dir>/
```

**Review EVERY cell.** For each cell:
1. View the cropped image
2. Check against the checklist in `references/checklist.md`
3. Log any issues found with exact descriptions

**Then zoom into problem areas** — crop specific regions for closer inspection:

```bash
python3 scripts/crop_region.py <image> <x> <y> <width> <height> <o>.png
```

**Minimum inspection passes:**
- Pass 1: 3x3 grid (9 cells) — structural overview
- Pass 2: Targeted crops of every container header (icon+label alignment)
- Pass 3: Targeted crops of every icon+label group (centering)
- Pass 4: Targeted crops of every arrow endpoint (connection accuracy)
- Pass 5: Targeted crops of every numbered badge (shape, color, text centering)
- Pass 6: Targeted crops of every cross-container arrow (stops at border, not piercing)
- Pass 7: Targeted crops of every external actor (position, connection entry point)
- Pass 8: Targeted crops of every text-box chain (alignment, spacing uniformity)

Do NOT skip passes. Issues invisible at full-image scale become obvious when zoomed in.

### Phase 3: D2 Structural Compliance Check

Before visual inspection, verify the canvas matches `diagram.d2` structurally:

1. Read `diagram.d2` — list every node and connection
2. Read `icons_graph_structure.md` — list every arrow
3. Call `describe_scene` or `get_elements` to get canvas element list
4. Cross-check:
   - Every leaf node in `diagram.d2` → has a corresponding icon+label on canvas
   - Every container in `diagram.d2` → has a corresponding rectangle on canvas
   - Every connection in `diagram.d2` → has a corresponding arrow on canvas
   - No extra elements on canvas not present in `diagram.d2`

Any mismatch is a **Critical** error → route to Planner if structural, Main if positional.

### Phase 4: Issue Report (Output)

For each issue found, output a structured fix requirement:

```
## Issue: [Short description]
- **Location:** [Which area/element of the diagram]
- **Current state:** [What it looks like now — be specific with positions]
- **Expected state:** [What it should look like — be specific with positions]
- **Fix:** [Exact instructions: move element X from (a,b) to (c,d), resize to WxH, etc.]
- **Severity:** [Critical / Major / Minor / Cosmetic]
- **Route to:** [Planner / Main]
```

Severity guide:
- **Critical:** Incorrect information, missing components, wrong connections
- **Major:** Overlapping elements, unreadable text, broken arrows
- **Minor:** Alignment off by >5px, inconsistent spacing, oval circles
- **Cosmetic:** Slight color inconsistency, font mismatch, minor whitespace

### Phase 5: Summary

End with a summary:
- Total issues found (by severity)
- Overall diagram quality score (1-10)
- Top 3 most important fixes
- Whether the diagram is ready for delivery or needs revision

---

## Hard Rules (Override Reference Images)

Rules in this section take precedence over reference images and must always be enforced.

### HARD RULE: AWS Cloud Boundary Is Always SOLID — Never Dashed

**The AWS Cloud container MUST use `stroke_style="solid"`.** This is the single most
common build mistake. Every other container can be dashed or solid per the reference
image, but the outermost AWS Cloud boundary is ALWAYS a solid, uninterrupted line.

**This rule overrides reference images.** Many reference images incorrectly show a dashed
AWS Cloud boundary. Ignore the reference and use solid. Flag immediately if dashed.

### HARD RULE: Generic Concepts Use Resource Icons, Not Architecture Icons

Items like "Git repository", "Studio IDE", "Tools", "Database assets" are generic concepts.
They MUST use Resource icons (`Res_*`) from the General-Icons category — dark outline icons.
Architecture icons (`Arch_*`) render as colored branded squares and are ONLY for specific
named AWS services (e.g., Amazon S3, AWS IAM Identity Center).

### HARD RULE: All Container Corners Must Be Straight — Never Rounded

Every `container_box()` call MUST use `corner_radius=0`. If any container has
`corner_radius > 0`, that is a bug.

### HARD RULE: No Phantom Arrows — Every Arrow Must Trace to the Reference

Do NOT invent arrows that aren't in `icons_graph_structure.md`. Every arrow must have
a clear source and target that matches the reference. Common violations:
- Adding "external → Service" arrows from the diagram edge that don't exist in reference
- Adding return arrows that aren't shown
- Connecting icons that happen to be near each other but aren't linked

### HARD RULE: All Icons Are 65px — No Exceptions

**ALL icons are 65px.** Grep for `icon_size=` and `icon_header_size=` — every value
must be `ICON_SIZE` (65). Check for: `HDR_ICON = 40`, `icon_size=50` (user icons),
`icon_size=55` (grid icons). This applies to ALL elements — service icons, header icons,
external actor icons.

### HARD RULE: All Text Is 24px — No Exceptions

**ALL text is 24px.** The diagram must use a single `FONT_SIZE = 24` for ALL text —
container headers, icon labels, arrow labels, numbered badge labels. Grep for `font_size=`
and `label_font_size=` — every value must be `FONT_SIZE` (24). Common violations:
separate `FONT_HDR`/`FONT_BODY` constants, hardcoded 18/20/22 for labels or circles.

---

## Arrow Inspection

### Cross-Container Arrow Rule

**HARD RULE: Cross-container arrows stop at the receiving container's border.**
When an arrow connects to a service INSIDE a nested container (e.g., Step Functions,
VPC Private Subnet), it must end at the container's border — not reach deep inside to
the target icon.

Crop and inspect every cross-boundary arrow endpoint:
- Does the arrowhead land on the container border? → Correct
- Does the arrowhead pierce through into the container interior? → Bug

### Arrow Routing Rules

- Arrow doesn't cross any text (icon labels OR container headers)
- **Enter icons from label-free sides** — LEFT or RIGHT edge. Never from below when
  label is below the icon — that forces the arrow through label text
- **Offset vertical segments** to avoid same-x icons — if two icons share the same
  x-coordinate, a vertical segment at that x crosses through labels
- Arrow only crosses container borders it's actually entering/leaving
- Arrows must never cross container header text or icons
- Arrow direction is correct (verify against `icons_graph_structure.md`)
- Arrow doesn't float in empty space

### L-Shaped Arrow Rules

When an arrow approaches an icon from below (label text is between source and icon):

1. **Calculate label exclusion zone** — label center X ± text width/2 + 8px margin
2. **Offset vertical segment** outside the exclusion zone
3. **Horizontal entry at icon_cy** — final segment enters from the side at icon center Y
4. **Minimum 30px final segment** — shorter segments cause visually smaller arrowheads

### Arrow Labels (Italic Text)

For text-labeled arrows (no numbered badge):
- Label is centered between arrow start and end points
- Label sits fully above or below the arrow line — never overlapping it
- No overlap with shapes or other arrows
- Italic styling applied where reference shows italic

### Arrowhead Consistency

**All arrowheads must be the same visual size.** Excalidraw derives arrowhead size from
`strokeWidth` AND final segment length. If any arrowhead looks smaller, the final segment
is too short (<30px). Crop and compare every arrowhead at zoom.

---

## Numbered Badge Inspection

Crop each numbered badge. Check:

- Badge shape matches `components_styling.txt` (circle vs square)
- Badge color matches style (dark `#1a1a1a` vs blue `#147EBA`)
- All badges use the same size, color, and shape — never mixed
- Number is centered and readable (white text on dark background)
- **Badge never touches or overlaps arrow lines** — offset by at least `CIRCLE_R + 5` px
  above/below horizontal arrows, left/right of vertical arrows
- Badge is on the arrow body, away from both endpoints
- Badge doesn't overlap adjacent elements (icons, labels, text)
- Badge is fully inside or fully outside every container — at least 15px from any border
- **Gap-region awareness** — circles in gaps between containers must clear ALL borders
  in that gap, not just the two obvious neighboring containers

---

## External Actor Inspection (Pass 7)

External actors (Users, Mobile client, ML engineers, Data Transfer Hub UI) require
special verification:

- **Position**: Confirm actor is outside container boundaries (or inside, per reference)
  — never assume external actors go outside the AWS Cloud boundary
- **Connection entry**: Arrow from external actor enters the first internal element
  from its nearest edge (left/right/top/bottom) — never from an arbitrary angle
- **Y alignment**: If the actor and its connected element share the same Y in the
  reference, verify they share the same Y on canvas
- **Icon type**: External actors use resource/outline icons — never architecture icons
  (no colored branded squares for Users, Mobile client, etc.)

---

## Text-Box Chain Inspection (Pass 8)

Text-box workflow steps ("extract text", "describe face", etc.) require:

- All boxes have identical width and height
- Vertical spacing between boxes is uniform
- Text is horizontally centered within each box
- Connecting arrows are perfectly vertical (no diagonal)
- Boxes align on a single vertical center axis
- Connecting arrows to external services (from the right side) all enter at the
  correct box's Y center — no diagonal entry

---

## Container Inspection

### Header Rules

- Every solid-border container has a header icon and label
- Header icon is `ICON_SIZE` (65px) — same as service icons
- Header label is `FONT_SIZE` (24px)
- Header label doesn't overflow the container width
- **Text-only containers** (dashed sub-boundaries like "Parallel processing",
  "Storage", "Catalog") may have NO header icon — label only. This is correct,
  not a bug.

### Border and Nesting Rules

- Container borders don't touch or overlap parent borders — minimum 15px clearance
- AWS VPC diagrams may have 4 nesting levels — acceptable exception
- All other diagrams: maximum 3 nesting levels
- `container_box()` silently auto-expands width for header text — verify rendered
  width fits inside parent after build

---

## Styling Consistency

Same-category elements must be uniform:
- All numbered badges: same size, same background color, same shape, same font size
- All service icons + header icons: same size (`ICON_SIZE` = 65)
- All text: same font size (`FONT_SIZE` = 24)
- All arrows of the same type: same stroke width
- Color used semantically (same color = same domain)

### Z-Order (Layer Stacking)

Elements must be layered correctly:
1. **Containers** — bottom layer
2. **Service icons + labels** — above containers
3. **Arrows** — above icons
4. **Numbered badges** — topmost layer (sit ON TOP of arrows)

If an arrow is drawn over a badge, or a container covers an icon, the z-order is wrong.

---

## What NOT to Do

- Don't review only the full image — you WILL miss issues
- Don't assume alignment is correct because it "looks close" at full scale
- Don't skip any of the 8 inspection passes
- Don't report issues without specific fix instructions
- Don't accept ovals as circles for badges
- Don't accept arrows that visually connect to the component center instead of the icon center
- Don't accept badges sitting directly on arrow lines
- Don't accept arrows passing through unrelated containers
- Don't accept text-only container headers for solid-border containers (needs icon)
- Don't accept header icons for dashed text-label-only sub-boundaries (no icon needed)
- Don't accept mixed font sizes — all must be 24px
- Don't accept mixed icon sizes — all must be 65px
- Don't accept double backgrounds on AWS service icons
- Don't accept rounded corners on any container
- Don't accept container borders that touch parent borders (min 15px clearance)
- Don't invent arrows not in `icons_graph_structure.md`
- Don't assume external actors go outside the AWS Cloud boundary — check the reference
- Don't use single-line wide labels in grids — split with `\n`
- Don't trust `container_box` specified width — verify rendered width fits inside parent
- Don't accept cross-container arrows that pierce through container interiors
- Don't accept text-box chains with non-uniform box sizes or uneven spacing
- Don't accept external actor icons using architecture (colored) icons
