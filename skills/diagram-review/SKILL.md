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

## Key Inspection Patterns

### Container Hierarchy & Nesting
The cloud provider boundary (e.g. "AWS Cloud") must be the **outermost** container. All service containers are nested inside it, never as siblings. Only external elements (users, mobile apps) sit outside.

**What to check:**
- Every sub-section is fully inside its parent — at least 15px clearance from parent border on all sides
- No element straddles a container border (partially inside, partially outside)
- Cloud boundary is visibly larger than all nested containers
- When a gap between siblings seems too tight, the fix should be expanding the parent outward — not shrinking it

### Container Headers
Crop the top-left corner of every container. Check:
- Every container has a header icon — text-only headers are a bug
- Icon touches the border (0px padding between icon edge and container border)
- Label is right of icon with ~5px gap
- Label vertically centered with icon
- Icon size matches header height (not smaller, which creates misalignment)
- Containers at the same level share the same Y position and header height
- Icon-less sub-sections (like "Authentication") have centered labels instead

### Icon+Label Centering
For each service icon inside a container:
- Crop the container content area
- Icon should be horizontally centered
- Label below icon, also centered on same vertical axis
- Both centered vertically in available space (below container header)
- Every icon+label pair must be grouped — they move together

### Icon Backgrounds
- AWS official SVG icons already include colored background fills (S3=green, Cognito=red, etc.)
- If you see a **double background** (colored square behind the icon's built-in color), that's a bug — `icon_bg_color` should not be used for AWS icons
- Icon background rectangles and circle ellipses must have **no visible border/stroke**

### Label Width Near Borders
Service labels can be much wider than their icons (e.g. "Amazon Rekognition" ~190px). Check that:
- Label text does not extend past container borders
- At least 30px clearance between label edge and nearest container border

### Arrow Endpoints
Crop each arrow's start and end points. Check:
- **Arrows connect at icon image centers**, not at the component center (which includes the label below). When an icon has a label, the component center is between icon and label — but arrows should aim at the icon's visual center, which is higher up
- Arrow doesn't float in empty space
- Arrow direction is correct (verify against reference)
- Arrow only crosses container borders it's actually entering/leaving — never passes through unrelated containers

### Arrow Labels
- Labels must be centered between arrow start and end points (use `measure_text` width)
- Labels sit fully above or below the arrow line — never overlapping it
- No overlap with shapes or other arrows

### Numbered Circles
Crop each numbered circle. Check:
- Circle is perfectly round (width === height)
- Number is centered (white on black)
- **Circle is offset from its arrow** — not sitting ON the arrow line. There must be a visible ~5px gap between the arrow line and the circle edge
- Circle is on the arrow **body**, away from both endpoints — arrowhead triangles extend ~10px back from the tip and must have clear space
- Circle doesn't overlap adjacent elements (icons, labels, text)
- Circle is fully inside or fully outside every container — at least 15px from any container border
- All circles use the same size and color

### Z-Order (Layer Stacking)
Elements must be layered correctly:
1. **Containers** — bottom layer
2. **Service icons + labels** — above containers
3. **Arrows** — above icons
4. **Numbered circles** — topmost layer (circles sit ON TOP of arrows)

If an arrow is drawn over a circle, or a container covers an icon, the z-order is wrong.

### Text Readability
At every zoom level, verify:
- Text doesn't overlap any borders or lines
- Text isn't clipped by containers
- Multi-line text is properly centered

### Consistent Styling
Same-category elements must be uniform:
- Exactly **2 font sizes** in the diagram: one for container headers, one for everything else
- All numbered circles: same size, same background color, same font size
- All service icons: same icon size
- All container headers: same icon size, same label font size
- All arrows of the same type: same stroke width
- Color used semantically (same color = same domain)

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
- Don't accept mixed font sizes within the same category
- Don't accept double backgrounds on AWS service icons
