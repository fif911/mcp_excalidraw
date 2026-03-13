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
python3 scripts/crop_region.py <image> <x> <y> <width> <height> <output>.png
```

**Minimum inspection passes:**
- Pass 1: 3x3 grid (9 cells) — structural overview
- Pass 2: Targeted crops of every container header (icon+label alignment)
- Pass 3: Targeted crops of every icon+label group (centering)
- Pass 4: Targeted crops of every arrow endpoint (connection accuracy)
- Pass 5: Targeted crops of every numbered circle (roundness, text visibility)

Do NOT skip passes. Issues invisible at full-image scale become obvious when zoomed in.

### Phase 3: Issue Report (Output)

For each issue found, output a structured fix requirement:

```
## Issue: [Short description]
- **Location:** [Which area/element of the diagram]
- **Current state:** [What it looks like now — be specific with positions]
- **Expected state:** [What it should look like — be specific with positions]
- **Fix:** [Exact instructions: move element X from (a,b) to (c,d), resize to WxH, etc.]
- **Severity:** [Critical / Major / Minor / Cosmetic]
```

Severity guide:
- **Critical:** Incorrect information, missing components, wrong connections
- **Major:** Overlapping elements, unreadable text, broken arrows
- **Minor:** Alignment off by >5px, inconsistent spacing, oval circles
- **Cosmetic:** Slight color inconsistency, font mismatch, minor whitespace

### Phase 4: Summary

End with a summary:
- Total issues found (by severity)
- Overall diagram quality score (1-10)
- Top 3 most important fixes
- Whether the diagram is ready for delivery or needs revision

## Hard Rules (Override Reference Images)

Rules in this section take precedence over reference images and must always be enforced.

### HARD RULE: AWS Cloud Boundary Is Always SOLID — Never Dashed (OVERRIDES REFERENCE IMAGE)

**The AWS Cloud container MUST use `stroke_style="solid"`.** This is the single most common build mistake. Every other container can be dashed or solid per the reference image, but the outermost AWS Cloud boundary is ALWAYS a solid, uninterrupted line. If the build script has `stroke_style="dashed"` for the AWS Cloud container, that is a bug — flag it immediately.

**This rule overrides reference images.** Many reference images incorrectly show a dashed AWS Cloud boundary. Ignore the reference and use solid. Do NOT note this as a "conflict" or defer to the reference — just enforce solid.

### HARD RULE: Generic Concepts Use Resource Icons, Not Architecture Icons

Items like "Git repository", "Studio IDE", "Tools", "Database assets" are generic concepts. They MUST use Resource icons (`Res_*`) from the General-Icons category — dark outline icons. Architecture icons (`Arch_*`) render as colored branded squares and are ONLY for specific named AWS services (e.g., Amazon S3, AWS IAM Identity Center). If the build script uses an Architecture icon for a generic concept, that is a bug.

## Container Inspection

Rules for verifying container hierarchy, nesting, headers, and content centering.

### Container Hierarchy & Nesting
The cloud provider boundary (e.g. "AWS Cloud") must be the **outermost** container. All service containers are nested inside it, never as siblings. Only external elements (users, mobile apps) sit outside.

**What to check:**
- Every sub-section is fully inside its parent — at least 15px clearance from parent border on all sides
- No element straddles a container border (partially inside, partially outside)
- Cloud boundary is visibly larger than all nested containers
- When a gap between siblings seems too tight, the fix should be expanding the parent outward — not shrinking it
- **No disproportionate gaps:** When aligning a stack item with an external icon pushes `start_y` far from the container top, move the entire container (Y position) down instead of leaving a large header-to-content gap. The header-to-first-icon offset should stay consistent (~80-120px). Never stretch just the content offset while leaving the container border in place
- **Watch for auto-expanded containers:** `container_box` silently expands width to fit header text + icon. A container set to 230px wide may render at 283px, causing it to overflow its parent. Zoom into the right/bottom edges of nested containers to verify they don't touch or cross the parent border
- **Initial dimension arithmetic:** Before running the build script, manually verify every nesting level: `child_Y + child_H + padding ≤ parent_Y + parent_H`. The auto-sizer (`fit_container`) may not grow parent containers enough if the initial dimensions are too far off. Always compute bottom edges for each nested container and confirm they fit within the parent with at least 20px clearance
- **Minimum 20px gap between adjacent header icons:** When a child container's header sits directly below its parent's header (e.g., Region → SageMaker), there must be at least 20px of clear space between the parent header icon bottom and the child header icon top. Formula: `child_Y ≥ parent_Y + ICON_SIZE + 20`. Cramped headers are a bug — push the child container down

### Container Headers
**HARD RULE: Structural containers (AWS Cloud, Region, capability groups, Lakehouse, etc.) MUST have their title and header icon set directly on the `container_box()` call via `label_text` and `icon_file_id` — NEVER as a separate floating `icon_label_component()`.** **Exception:** Service-boundary containers (e.g., SageMaker Unified Studio) where the reference shows a full-size service icon (48px+) inside — these use `icon_label_component()` as a service icon inside the container, not a header. Structural headers = small icons (32–40px) flush with border; service icons = full-size (48px+) inside the container area.

Crop the top-left corner of every container. Check:
- Every container has a header icon — text-only headers are a bug
- Icon touches the border (0px padding between icon edge and container border)
- Label is right of icon with ~5px gap
- Label vertically centered with icon
- Icon size matches header height (not smaller, which creates misalignment)
- Containers at the same level share the same Y position and header height
- Icon-less sub-sections (like "Authentication") have centered labels instead

### Icon+Label Centering
**HARD RULE: If a subsection/container has only one icon (with or without a text label), that icon MUST be centered both horizontally and vertically within the container's content area (below the header).** Calculate: `cx = container_x + container_w / 2`, `cy = container_y + header_height + (container_h - header_height) / 2`. A single icon off-center inside a box is always wrong.

For each service icon inside a container:
- Crop the container content area
- Icon should be horizontally centered
- Label below icon, also centered on same vertical axis
- Both centered vertically in available space (below container header)
- Every icon+label pair must be grouped — they move together

### Container Border Color Must Match Header Icon Color
The `stroke_color` of a container MUST match the color of its header icon's AWS category (teal for AI/ML, red for Security, purple for Analytics, etc.). A container with a teal SageMaker icon but a gray border is wrong. Verify each container's border color against its header icon.

### Container Header Text Color
**HARD RULE: Container header `label_color` is black (#1a1a1a) by default.** Colored header text is the exception, not the rule. If most container headers use colored text (matching stroke_color), that's a bug — flag it. Only containers explicitly specified in the plan as having colored text should be non-black.

## Icon Inspection

Rules for verifying icon sizes, backgrounds, variants, and label clearance.

### HARD RULE: ALL Icons Are 65px — No Exceptions
**Every icon in the diagram MUST be 65px.** Grep the build script for `icon_size=` and `icon_header_size=` — every value must be `ICON_SIZE` (65). Common violations that get past planning:
- `HDR_ICON = 40` — header icons set smaller than service icons
- `icon_size=50` — user/external icons made smaller
- `icon_size=55` — grid items made "slightly smaller"
- `grid_2x2(..., icon_size=55)` — grid function with hardcoded smaller size
- Multiple `HALF` aliases (`HALF_G = 55/2`, `HALF_U = 50/2`) — these indicate different icon sizes
- Styling spec listing different sizes per icon category — the spec itself is wrong if it does this

If ANY of these appear in the build script, flag as a bug. The styling spec must define a single `ICON_SIZE = 65` with no `HDR_ICON_SIZE` or per-category sizes.

### Icon Backgrounds & Borders
- **HARD RULE: No icon may have a visible border/stroke.** All image elements must have `strokeWidth: 0`. If any icon shows a thin gray border, check: (1) the Excalidraw element's `strokeWidth` — must be 0, (2) the SVG file itself — AWS Category icons (`Arch-Category_*`) have a baked-in `#879196` border rect that must be removed by creating a custom copy in `icons/custom/`
- AWS official SVG icons already include colored background fills (S3=green, Cognito=red, etc.)
- If you see a **double background** (colored square behind the icon's built-in color), that's a bug — `icon_bg_color` should not be used for AWS icons
- Icon background rectangles and circle ellipses must also have `strokeWidth: 0` and `strokeColor: "transparent"`

### Icon Variant Correctness
Icons can have **Light/Dark variants** and exist in **multiple icon types**. Both must be verified:

**Light vs Dark variants:**
- `_Light` or no suffix = designed for light/white backgrounds (dark/visible icon)
- `_Dark` = designed for dark backgrounds (faint/invisible on white canvas)
- If an icon appears washed out, barely visible, or as a faint outline on a white canvas, it's likely the `_Dark` variant — **this is a bug**
- Group icons (`AWS-Cloud_32.svg` vs `AWS-Cloud_32_Dark.svg`) and general Resource icons (`Res_User_48_Light.svg` vs `Res_User_48_Dark.svg`) are the most common offenders

**Architecture vs Resource icon types:**
- **Architecture icons** (`Arch_*`): colored square background + white icon inside — use for service-level representation
- **Resource icons** (`Res_*`): outline/flat icon with no square background — use for specific instances (a bucket, a template, an image)
- If the reference shows an outline-style icon but the diagram shows a colored square, the wrong icon type was used (Architecture instead of Resource), or vice versa
- **Common mistake — S3 buckets:** AWS architecture diagrams typically use Architecture icons (`Arch_Amazon-Simple-Storage-Service_48.svg`) which render as green filled squares — NOT Resource bucket icons (`Res_*_S3-Bucket_48.svg`) which render as thin outlines only. Always verify S3 and similar high-frequency services against the reference
- **Color mismatch between icon types:** Resource icons inherit their category color (e.g., Management-Governance = pink, Storage = green, Containers = orange). If the reference shows an icon in a different color than what appears in the diagram, the icon may be from the wrong category or the wrong icon type entirely
- **Custom color variants for color mismatches:** When no matching color exists in the AWS icon library, create a custom recolored SVG in `icons/custom/` — copy the original SVG, change the `fill` color, and add the color name to the filename (e.g., `Res_{ServiceName}_{ResourceType}_{Size}_{Color}.svg`). This is the correct approach when an icon's category color doesn't match the visual context in the reference diagram
- **Non-AWS icons:** Open standards (OpenID Connect, SAML, Docker, etc.) are not in the AWS icon library. Use custom SVGs from `icons/custom/` for these — do NOT substitute a vaguely similar AWS icon

### Label Width Near Borders
Service labels can be much wider than their icons (e.g. "Amazon Rekognition" ~190px). Check that:
- Label text does not extend past container borders
- At least 30px clearance between label edge and nearest container border

## Arrow Inspection

Rules for verifying arrow endpoints, routing, label-crossing avoidance, and entry direction.

### HARD RULE: No Diagonal Arrow Segments
**Every arrow segment must be perfectly horizontal (same Y) or perfectly vertical (same X). Diagonal lines are NEVER allowed.** If any arrow segment appears diagonal — even slightly — it means the connected icons are misaligned. For multi-icon chains (e.g., User → IAM → Studio), ALL icons must share the same `icon_cy`. Zoom into each arrow and verify start/end Y (horizontal) or X (vertical) coordinates match exactly.

### Arrow Endpoints & Alignment
Crop each arrow's start and end points. Check:
- **Arrows connect at icon image centers**, not at the component center (which includes the label below). When an icon has a label, the component center is between icon and label — but arrows should aim at the icon's visual center, which is higher up
- **Label-side approach rule**: when an arrow approaches an icon from the LABEL side (e.g., from below when the label is below the icon), the arrow must NOT end at the icon edge — it would cross through the label text. Instead, end the arrow at the component's label bottom edge: `component["bbox"]["y"] + component["bbox"]["h"] + 2`. The arrowhead stops just below the text. Alternatively, use an L-shape to approach the icon from a non-label side
- **Connected icons should be aligned on the arrow's perpendicular axis** — for a horizontal arrow, both icons share the same Y; for a vertical arrow, both share the same X. Use `icy_to_cy()` to place icon image centers at exact target positions. **Exceptions**: break alignment when (a) the arrow is L-shaped in the reference, (b) layout constraints make it impossible, or (c) the reference shows a clear visual hierarchy (e.g., parent icon above child icons). In exception cases, use L-shaped arrows with waypoints
- **vertical_stack alignment** — when a stack item connects to an external icon via a horizontal arrow, adjust the stack's `start_y` so that item's `icon_cy` matches the external icon's Y. Always read actual `icon_cy` from stack bbox for arrow endpoints
- Arrow doesn't float in empty space
- Arrow direction is correct (verify against reference)
- Arrow only crosses container borders it's actually entering/leaving — never passes through unrelated containers
- **Cross-container arrows stop at the border** — when an arrow connects to a service inside a nested container (e.g., Step Functions), it must end at the container's border, not reach deep inside to the target icon. If an arrow visually pierces through a container to reach an internal service, that's a bug
- **Arrows must never cross container header text or icons** — when an arrow exits a container, it must not pass through the header band (icon + label at the top of the container). Route arrows through the non-header portion of the border. Use `check_arrow_header_overlaps()` to verify

### HARD RULE: Arrows Must Never Cross Icon Label Text
**When an arrow approaches an icon from below (or any direction where the label text sits between the arrow source and the icon), a straight line WILL cross the label text. This is NEVER acceptable.** Use L-shaped routing with waypoints to approach the icon from the SIDE instead:

1. **Calculate the label bounding box** — label center X, estimated text width, + 8px margin on each side. This is the exclusion zone.
2. **Offset the vertical segment** — place the vertical part of the L at an X coordinate fully outside the label exclusion zone (e.g., `icon_cx - icon_radius - 40` or more).
3. **Horizontal entry at icon Y** — the final segment goes horizontally into the icon's left (or right) edge at `icon_cy`. Since `icon_cy` is above the label, this segment clears the text.
4. **Minimum 30px final segment** — the horizontal segment entering the icon must be at least 30px long, otherwise the arrowhead renders smaller than other arrows. Short segments (<20px) cause visually inconsistent arrowhead sizes.
5. **Standalone circles in the gap** — when the arrow bends in a gap between containers, place the numbered circle as a standalone `numbered_circle()` at the bend point, NOT as `label_number` on the arrow. This prevents the auto-positioned circle from landing on the icon or its label.
6. **Check container borders** — ensure standalone circles in gaps don't straddle nearby container borders (e.g., a parent container's bottom edge might cut through the gap). Offset the circle Y to maintain at least `CIRCLE_R + 5` from any border.
7. **Bidirectional arrow direction** — for L-shaped bidirectional arrows, ensure the first segment goes in the correct direction so the start arrowhead points the right way. E.g., if the start is at Lakehouse top, the first segment should go UP so the start arrowhead points DOWN toward Lakehouse.

### Arrow Entry Direction
**HARD RULE: Enter icons from label-free sides.** When connecting an arrow to an icon, prefer entering from a side where no label text exists (LEFT or RIGHT edge). Entering from below when the label is below the icon forces the arrow through the label text — always a bug. When an old arrow path is removed, its entry point becomes a clean route for a replacement arrow.

**Offset vertical segments to avoid same-x icons.** If two icons share the same x-coordinate (e.g., stacked in a grid column), a vertical arrow segment at that x will cross through the lower icon's label. Route the vertical segment at a different x — e.g., the midpoint between grid columns. Before committing to a vertical segment x, verify no other icons/labels exist along the path.

### Arrow Labels
- Labels must be centered between arrow start and end points (use `measure_text` width)
- Labels sit fully above or below the arrow line — never overlapping it
- No overlap with shapes or other arrows

## Numbered Circle Inspection

Rules for verifying numbered circle shape, placement, sizing, and border clearance.

### Numbered Circles
Crop each numbered circle. Check:
- Circle is perfectly round (width === height)
- Number is centered (white on black)
- **HARD RULE: Circles must NEVER touch or overlap arrow lines** — always offset by at least `CIRCLE_R + 5` pixels above/below (for horizontal arrows) or left/right (for vertical arrows). Place circles **above** horizontal arrows, **to the right** of vertical arrows. If there is no room, rearrange the layout — never violate this rule
- **HARD RULE: Non-standalone numbered circles MUST be created via the `arrow()` component's `label_number` parameter — NEVER via manual `numbered_circle()` calls.** If a numbered circle is associated with an arrow, pass `label_number=N` to that `arrow()` call. Use `label_cx`/`label_cy` to override position if needed. Only truly standalone circles (not associated with ANY arrow) may use direct `numbered_circle()`. This ensures correct positioning relative to arrows and automatic updates when arrows move.
- Circle is on the arrow **body**, away from both endpoints — arrowhead triangles extend ~10px back from the tip and must have clear space
- Circle doesn't overlap adjacent elements (icons, labels, text)
- **Circle-label text overlap** — verify circles don't overlap icon label text using `check_circle_label_overlaps()`. Auto-positioned circles on waypoint arrows frequently land on labels — use standalone circles with manual coords instead
- Circle is fully inside or fully outside every container — at least 15px from any container border
- **Gap-region awareness** — gaps between containers may contain intermediate borders (e.g., a parent container's bottom edge). Circles must clear ALL borders in the gap, not just the two obvious neighboring containers
- All circles use the same size and color

## Text, Styling & Z-Order

Rules for verifying text readability, consistent styling across element categories, and correct layer stacking.

### Text Readability
At every zoom level, verify:
- **HARD RULE: No arrow may cross ANY text — icon labels OR container headers.**
  - **Icon label text** (below service icons) crossed by arrows = BUG, always fix with L-shaped routing
  - **Container header text** (on container borders) crossed by arrows = BUG. Route arrows to enter/exit containers through non-header portions of the border (sides or bottom). Container headers occupy the top-left area — route arrows through the right side, bottom, or left side away from the header. Use `check_arrow_header_overlaps()` to verify
  - When the overlap checker flags TEXT_OVERLAP or ARROW_HEADER_OVERLAP, ALL must be fixed — no exceptions
- Text isn't clipped by containers
- Multi-line text is properly centered

### Consistent Styling
**HARD RULE: ALL icons are 65px — no exceptions.** Grep for `icon_size=` and `icon_header_size=` — every value must be `ICON_SIZE` (65). Check for: `HDR_ICON = 40`, `icon_size=50` (user icons), `icon_size=55` (grid icons), `HALF_G`/`HALF_U` aliases. This applies to ALL containers — AWS Cloud, Region, sub-containers, sub-boxes.

**HARD RULE: ALL text is 24px — no exceptions.** The diagram must use a single `FONT_SIZE = 24` for ALL text — container headers, icon labels, arrow labels, numbered circle labels. Grep for `font_size=` and `label_font_size=` — every value must be `FONT_SIZE` (24). Common violations: separate `FONT_HDR`/`FONT_BODY` constants, hardcoded 18/20/22 for labels or circles.

Same-category elements must be uniform:
- All numbered circles: same size, same background color, same font size
- All icons (service + header): same size via single `ICON_SIZE` constant — no separate `SVC_ICON`/`HDR_ICON`
- All arrows of the same type: same stroke width
- **All arrowheads: same visual size** — Excalidraw derives arrowhead size from strokeWidth AND final segment length. If any arrowhead looks smaller, the final segment is too short (<30px). Crop and compare every arrowhead at zoom
- Color used semantically (same color = same domain)

### Z-Order (Layer Stacking)
Elements must be layered correctly:
1. **Containers** — bottom layer
2. **Service icons + labels** — above containers
3. **Arrows** — above icons
4. **Numbered circles** — topmost layer (circles sit ON TOP of arrows)

If an arrow is drawn over a circle, or a container covers an icon, the z-order is wrong.

## What NOT to Do

- Don't review only the full image — you WILL miss issues
- Don't assume alignment is correct because it "looks close" at full scale
- Don't skip the grid inspection
- Don't report issues without specific fix instructions
- Don't accept ovals as circles
- Don't accept icons with gaps from their container borders
- Don't accept arrows that visually connect to the component center instead of the icon center
- Don't accept circles sitting directly on arrow lines (must be offset with gap)
- Don't accept arrows passing through unrelated containers
- Don't accept text-only container headers (every container needs a header icon)
- Don't accept mixed font sizes within the same category — grep for `font_size=` and `label_font_size=` in the build script; if more than 2 distinct values exist, it's wrong
- Don't accept different sizes for service icons vs header icons — both must use the same `ICON_SIZE` constant
- Don't accept mixed header heights or header icon sizes — every `container_box()` must use the same `icon_header_size`, `header_height`, and `label_font_size`
- Don't accept double backgrounds on AWS service icons
