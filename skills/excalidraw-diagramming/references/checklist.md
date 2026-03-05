# Diagram Quality Checklist

Two-layer validation for Excalidraw architecture diagrams.

---

## Layer 1: Structural (from Excalidraw JSON — deterministic)

### Completeness
- [ ] Every component from the spec has a corresponding element on canvas
- [ ] Every actor (user, external system) is present
- [ ] All data flows have a matching arrow
- [ ] Title or heading element identifies the diagram

### Arrow Integrity
- [ ] Every arrow has `startBinding.elementId` and `endBinding.elementId` (no floating endpoints)
- [ ] Bound target elements exist in the elements array (no dangling references)
- [ ] Bidirectional: if arrow binds to element X, X's `boundElements` includes the arrow
- [ ] No duplicate arrows (same start AND end)
- [ ] Arrow segments are orthogonal (dx=0 or dy=0) — unless using elbowed routing
- [ ] No zero-length arrows

### Container Hierarchy
- [ ] Nested containers reflect logical grouping
- [ ] Every icon+label pair shares a `groupIds` entry
- [ ] Container labels don't overlap child elements
- [ ] No element sits partially inside and partially outside a container

### Element Hygiene
- [ ] Consistent `fontFamily` across all text (one font, not mixed)
- [ ] Consistent `fontSize` for same-level labels
- [ ] No overlapping bounding boxes between siblings
- [ ] No orphan text elements unassociated with any group
- [ ] All elements have non-zero width and height

### Programmatic Checks
Run these from your build script:
```python
issues = validate_arrow_paths()
issues += validate_diagram()
assert len(issues) == 0, f"Validation failed: {issues}"
```

---

## Layer 2: Visual (from screenshot — human/VLM evaluation)

### Layout & Flow
- [ ] Diagram reads left-to-right or top-to-bottom
- [ ] External actors on LEFT/TOP edge; outputs on RIGHT/BOTTOM
- [ ] Related components spatially clustered
- [ ] Whitespace separates logical zones (2-4 major sections visible)
- [ ] No overcrowded areas with empty areas elsewhere

### Arrows & Connections
- [ ] Arrows visually traceable from source to destination
- [ ] Minimal arrow crossings
- [ ] Arrow labels (if any) don't overlap shapes or other arrows
- [ ] Dashed vs solid distinction is clear and intentional
- [ ] Arrows connect TO service icons, not to empty container borders

### Labels & Readability
- [ ] Every box and icon has a readable label
- [ ] Labels don't overflow parent shapes
- [ ] Container headers visually distinct from child labels
- [ ] All text horizontal (no rotated text)
- [ ] At 50% zoom, all labels still legible

### Visual Hierarchy
- [ ] Nested containers use color/dashed borders for depth distinction
- [ ] Max 3 nesting levels (deeper = too detailed for proposals)
- [ ] Icons consistent in size within same hierarchy level
- [ ] Color used semantically (same color = same domain)

### Proposal Fitness
- [ ] Non-technical stakeholder understands main actors in 10 seconds
- [ ] Diagram answers "what connects to what" (not internal implementation)
- [ ] 8-20 components for a standard proposal
- [ ] Matches SOW scope — no out-of-scope components shown

---

## Common Failures

| Failure | Layer | Detection |
|---------|-------|-----------|
| Arrow exits through source icon | L1 | Arrow path crosses source bbox |
| Arrow stops at container border | L1 | `endBinding` targets container, not service |
| Arrow merged with container border | L2 | Arrow within 25px of container edge |
| Text crossed by arrow | L1 | `validate_arrow_paths()` TEXT_OVERLAP |
| Jagged micro-diagonal segments | L1 | `validate_arrow_paths()` DIAGONAL |
| Icon drifted from label | L1 | Icon and label not in same `groupIds` |
| Too detailed for proposal | L2 | >20 components or 4+ nesting levels |
| No external actors shown | L2 | Missing user/client elements on periphery |
