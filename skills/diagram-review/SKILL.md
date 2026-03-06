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

Review architecture diagrams using an agentic **Think → Act → Observe** loop inspired by
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
- Pass 1: 3×3 grid (9 cells) — structural overview
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

### Container Headers
Crop the top-left corner of every container. Check:
- Icon touches the border (0px padding)
- Label is right of icon with ~5px gap
- Label vertically centered with icon

### Icon+Label Centering
For each service icon inside a container:
- Crop the container content area
- Icon should be horizontally centered
- Label below icon, also centered on same vertical axis
- Both centered vertically in available space (below container header)

### Arrow Endpoints
Crop each arrow's start and end points. Check:
- Arrow starts/ends at component edge or center
- Arrow doesn't float in empty space
- Arrow direction is correct

### Numbered Circles
Crop each numbered circle. Check:
- Circle is perfectly round (width === height)
- Number is centered (white on black)
- Circle doesn't overlap adjacent elements

### Text Readability
At every zoom level, verify:
- Text doesn't overlap any borders or lines
- Text isn't clipped by containers
- Multi-line text is properly centered

## What NOT to Do

- Don't review only the full image — you WILL miss issues
- Don't assume alignment is correct because it "looks close" at full scale
- Don't skip the grid inspection
- Don't report issues without specific fix instructions
- Don't accept ovals as circles
- Don't accept icons with gaps from their container borders
