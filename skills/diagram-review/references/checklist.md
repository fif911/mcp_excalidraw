# Diagram Quality Checklist

Two-layer validation for architecture diagrams. Run all checks before marking
a diagram ready for delivery.

---

## Layer 0: D2 Structural Compliance

Before any visual checks, verify the canvas matches `diagram.d2`:

- [ ] Every leaf node in `diagram.d2` has a corresponding icon+label on canvas
- [ ] Every container in `diagram.d2` has a corresponding rectangle on canvas
- [ ] Every connection in `diagram.d2` has a corresponding arrow on canvas
- [ ] No extra elements on canvas not present in `diagram.d2`
- [ ] Every arrow in `icons_graph_structure.md` is present — correct source, target, direction, and badge number
- [ ] No arrows on canvas that are NOT in `icons_graph_structure.md`
- [ ] **Standalone elements have zero arrows** — elements in the "Standalone Elements" section of `icons_graph_structure.md` must not be the source or target of any arrow on canvas
- [ ] Every leaf node in `diagram.d2` accounted for in exactly one of: numbered arrows, unlabeled arrows, or standalone elements
- [ ] Every connection in `icons_graph_structure.md` verified against reference image before build (Phase 0)
- [ ] No external arrows — every arrow start/end point is on a real element, never in empty canvas space or at the diagram edge
- [ ] No internal stub arrows — no arrows drawn purely inside a container going to its own border (these are ghost stubs; cross-container exits start FROM the border)

---

## Layer 1: Structural (from Excalidraw JSON)

### Completeness
- [ ] Every component from the spec has a corresponding element on canvas
- [ ] Every actor (user, external system) is present at correct position
- [ ] All data flows have a matching arrow
- [ ] Title or heading element identifies the diagram

### Arrow Integrity
- [ ] Every arrow has `startBinding.elementId` and `endBinding.elementId` (no floating endpoints)
- [ ] Bound target elements exist in the elements array (no dangling references)
- [ ] Bidirectional: if arrow binds to element X, X's `boundElements` includes the arrow
- [ ] No duplicate arrows (same start AND end)
- [ ] Arrow segments are orthogonal (dx=0 or dy=0) — no diagonal segments
- [ ] No zero-length arrows
- [ ] All final arrow segments are ≥30px (shorter segments produce smaller arrowheads)

### Cross-Container Arrow Rule
- [ ] Arrows entering a nested container end at the container's BORDER — not inside it
- [ ] No arrow pierces through a container to reach an internal service icon

### Container Hierarchy
- [ ] Nested containers reflect logical grouping from `diagram.d2`
- [ ] Every icon+label pair shares a `groupIds` entry
- [ ] Container labels don't overlap child elements
- [ ] No element sits partially inside and partially outside a container
- [ ] Container borders have minimum 15px clearance from parent border on all sides

### External Actor Rules
- [ ] External actors (Users, mobile client, ML engineers) positioned correctly per reference image
- [ ] External actors use resource/outline icons — NOT architecture (colored) icons
- [ ] External actor arrow enters the first internal element from its nearest edge
- [ ] External actors are NOT assumed to be outside AWS Cloud — position verified against reference

### Text-Box Chain Rules (if present)
- [ ] All text boxes in the chain have identical width and height
- [ ] Vertical spacing between boxes is uniform
- [ ] Boxes align on a single vertical center axis
- [ ] Connecting arrows between boxes are perfectly vertical (no diagonal)

### Container Header Rules
- [ ] `header_bg_color` not set on any container — no filled header bars
- [ ] `external_actor_inside_container()` called and returned no violations
- [ ] All cross-boundary arrow badges use manual `label_cx`/`label_cy` overrides

### Element Hygiene
- [ ] Consistent `fontFamily` across all text (one font, not mixed)
- [ ] `FONT_SIZE = 22` for ALL text — no exceptions (grep for `font_size=`, `label_font_size=`)
- [ ] `ICON_SIZE = 65` for ALL icons — no exceptions (grep for `icon_size=`, `icon_header_size=`)
- [ ] No overlapping bounding boxes between siblings
- [ ] No orphan text elements unassociated with any group
- [ ] All elements have non-zero width and height
- [ ] `corner_radius=0` on all containers — no rounded corners
- [ ] No explicit size parameters passed to component functions (all ignored anyway)

### Programmatic Checks
```python
issues = validate_arrow_paths()
issues += validate_diagram()
report = run_all_overlap_checks()
assert len(issues) == 0, f"Validation failed: {issues}"
```

---

## Layer 2: Visual (from screenshot)

### Layout & Flow
- [ ] Diagram reads left-to-right or top-to-bottom
- [ ] External actors on LEFT/TOP edge; outputs on RIGHT/BOTTOM
- [ ] Related components spatially clustered
- [ ] Whitespace separates logical zones
- [ ] No overcrowded areas with empty areas elsewhere

### Arrows & Connections
- [ ] Arrows visually traceable from source to destination
- [ ] Minimal arrow crossings
- [ ] Arrow labels (if any) don't overlap shapes or other arrows
- [ ] Dashed vs solid distinction is clear and intentional
- [ ] Arrows connect TO service icon centers — not to empty container borders
- [ ] **Cross-container arrows stop at container border** — arrowhead does not pierce inside
- [ ] All arrowheads are the same visual size (no smaller arrowheads from short segments)
- [ ] Italic text labels on arrows are positioned above/below the line — not overlapping it

### Numbered Badges
- [ ] All badges use the same style: color, shape (`circle` vs `square`), size
- [ ] Badge shape matches `components_styling.txt` (dark circle vs blue square)
- [ ] Numbers are centered and readable inside badges
- [ ] Badges do not touch or overlap arrow lines (offset ≥ `CIRCLE_R + 5` px)
- [ ] Badges are on the arrow body — not at endpoints
- [ ] Badges don't overlap adjacent icons, labels, or text
- [ ] Badges fully inside or fully outside every container (≥15px from any border, including AWS Cloud outer boundary)
- [ ] Badges in container gaps clear ALL borders in the gap region

### Labels & Readability
- [ ] Every box and icon has a readable label
- [ ] Labels don't overflow parent shapes
- [ ] Container headers visually distinct from child labels
- [ ] All text horizontal (no rotated text)
- [ ] At 50% zoom, all labels still legible
- [ ] Wide grid labels split across two lines with `\n` (no single-line overflow)
- [ ] Multi-line text is properly centered

### Icon Rules
- [ ] AWS service icons: colored branded appearance (Architecture icons)
- [ ] Generic concepts (Git repo, Studio IDE, Tools, Database assets): dark outline (Resource icons)
- [ ] External actors: dark outline silhouette (Resource icons) — no colored backgrounds
- [ ] No double backgrounds on AWS service icons
- [ ] All icons consistent size within same hierarchy level
- [ ] **Icon color matches reference image** — crop each icon and compare its color against the reference. The same icon shape can exist in multiple color variants (e.g., CloudFormation Template in pink vs orange). If colors differ, check `icons/custom/` for a recolored variant with a `_Orange`, `_Green`, etc. suffix

### Container Visual Rules
- [ ] Solid-border containers have header icon + label
- [ ] Dashed text-label-only sub-boundaries have NO header icon — label only (correct, not a bug)
- [ ] AWS Cloud boundary is SOLID — never dashed
- [ ] All corners are sharp 90-degree (no rounding)
- [ ] Nested containers use color/dashed borders for depth distinction
- [ ] Max 3 nesting levels for general diagrams (4 levels acceptable for VPC diagrams only)

### Z-Order (Layer Stacking)
- [ ] Containers at bottom layer
- [ ] Service icons + labels above containers
- [ ] Arrows above icons
- [ ] Numbered badges topmost (sit ON TOP of arrows)

### Proposal Fitness
- [ ] Non-technical stakeholder understands main actors in 10 seconds
- [ ] Diagram answers "what connects to what" (not internal implementation detail)
- [ ] 8-20 components for a standard proposal
- [ ] Matches SOW scope — no out-of-scope components shown

---

## Common Failures Reference

| Failure | Layer | Detection method |
|---------|-------|-----------------|
| Node in `diagram.d2` missing from canvas | L0 | D2 compliance check |
| Arrow in `icons_graph_structure.md` missing | L0 | D2 compliance check |
| Cross-container arrow pierces container interior | L1+L2 | Arrow endpoint check + visual crop |
| External actor uses architecture (colored) icon | L1+L2 | Icon type check |
| External actor position wrong (inside vs outside) | L1+L2 | Reference image comparison |
| Text-box chain non-uniform sizes | L1+L2 | Element dimension check |
| Arrow exits through source icon | L1 | Arrow path crosses source bbox |
| Arrow stops at container border instead of icon | L1 | `endBinding` targets container |
| Arrow merged with container border | L2 | Arrow within 25px of container edge |
| Text crossed by arrow | L1 | `validate_arrow_paths()` TEXT_OVERLAP |
| Diagonal arrow segment | L1 | `validate_arrow_paths()` DIAGONAL |
| Icon drifted from label | L1 | Icon and label not in same `groupIds` |
| Rounded container corners | L1+L2 | `corner_radius > 0` |
| Mixed badge styles (circle + square) | L2 | Visual crop of all badges |
| Small arrowhead (short final segment) | L2 | Visual crop of all arrowheads |
| Wide single-line grid label overflow | L1+L2 | Label width vs cell width |
| Font size not 22px | L1 | Grep for `font_size=` in build script |
| Icon size not 65px | L1 | Grep for `icon_size=` in build script |
| Dashed AWS Cloud boundary | L2 | Visual inspection of outermost border |
| Too detailed for proposal | L2 | >20 components or 4+ nesting levels (non-VPC) |
| No external actors shown | L2 | Missing user/client elements on periphery |
| Phantom arrow to standalone element | L0+L1 | Element in "Standalone Elements" list has arrow — delete arrow |
| Icon color mismatch vs reference | L2 | Crop each icon, compare color against reference — check custom/ for recolored variants |
