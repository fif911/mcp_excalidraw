# Diagram Review Checklist

## Bounding Boxes & Containers

### Hierarchy & Nesting
- [ ] Cloud provider boundary (AWS Cloud, Azure, GCP) is the **outermost** container encompassing ALL cloud services
- [ ] Service-specific containers (Step Functions, VPC, ECS, etc.) are nested INSIDE the cloud boundary, never as siblings
- [ ] Only external/on-premise elements (users, mobile clients, third-party APIs) sit outside the cloud boundary
- [ ] **External element gap** — icons that are by design outside the main diagram boundary (Users, on-prem servers, etc.) must have a visible gap of at least 10px from the boundary border, but not excessively large (10–25px ideal)
- [ ] Cloud boundary is visibly larger than nested containers on ALL sides — at least 30px clearance so nesting is obvious
- [ ] Every nested sub-section is **fully contained** within its parent container — at least 15px clearance from parent border on all sides
- [ ] No element sits partially inside and partially outside a container
- [ ] Nested containers have clear visual hierarchy (max 3 nesting levels)
- [ ] **No auto-expansion overflow** — `container_box` silently expands width to fit header text + icon. Verify rendered container edges don't touch or cross parent borders (zoom into right/bottom edges)
- [ ] **Cascade check on resize** — when enlarging a container in any direction, verify it does not overlap neighboring containers. If it does, push neighbors away. If neighbors no longer fit in their parent, enlarge the parent. Repeat until no overlaps remain at any level. Never enlarge a container without checking the cascade
- [ ] **Initial dimension arithmetic** — before running the build script, manually verify every nesting level: `child_Y + child_H + padding ≤ parent_Y + parent_H`. The auto-sizer (`fit_container`) may not grow parent containers enough if the initial dimensions are too far off. Example: if Discovery is at y=880, h=300 (bottom=1180) but Private subnet is y=415, h=700 (bottom=1115), the child extends 65px below the parent — increase the parent's H to at least `child_bottom + 20 - parent_Y`

### Header Styling
- [ ] Every container header has an icon — no text-only headers (inconsistent visual pattern)
- [ ] Header icons flush with top-left corner (0px gap between icon and border)
- [ ] Header label text right of icon, vertically centered with icon
- [ ] Header icon size matches header height (`icon_header_size = header_height`) — icon not smaller than header band
- [ ] Icon-less sub-sections (e.g. "Authentication") have label **horizontally centered** within container width
- [ ] Containers at the same nesting level share the same `y` position and `header_height`

### Border Styles
- [ ] Cloud provider boundary: gray solid, 2px stroke
- [ ] Service-specific boundary (Step Functions, VPC): solid, 2px stroke, brand color
- [ ] Logical sub-sections: gray dashed, 1px stroke
- [ ] No background fill on logical containers (Cloud, Region, service groups) — only sub-sections like Storage/Catalog get fills
- [ ] No duplicate borders from icon library elements

## Icons & Labels

### Positioning
- [ ] Service icons centered horizontally AND vertically within their container's content area
- [ ] Icon + label form a vertically stacked group: icon on top, text below, both centered on same vertical axis
- [ ] Icon sizes consistent: all service icons use the same size, all header icons use the same size
- [ ] **Icon sizing reference (minimum sizes, enlarge if reference image demands it):**
  - `SVC_ICON` ≥ 65px — service icons (AWS Architecture 48px SVGs rendered at 65px+)
  - `HDR_ICON` ≥ 40px — container header icons (AWS Cloud logo, etc.)
  - Group icons ≥ 32px — VPC, Private subnet header icons (AWS Group Icons 32px SVGs)
  - User/external icons ≥ 50px
  - Always compare against the reference image — if icons look smaller, increase sizes proportionally
- [ ] Every icon+label pair is grouped (`groupIds`) — moving one moves both

### Icon Rules
- [ ] Use generic icons for generic concepts (Git repo, IDE, Tools) — NOT service-branded icons
- [ ] Use service icons ONLY for specific AWS/GCP/Azure services
- [ ] AWS official SVG icons already include colored backgrounds — no extra `icon_bg_color` rectangle visible (double background = bug)
- [ ] No visible borders/strokes on icon background rectangles or numbered circle ellipses (`strokeWidth: 0`)

### Icon Variant Correctness
- [ ] **No `_Dark` icons on light canvas** — if any icon appears washed out, faint, or barely visible, it's likely using the `_Dark` variant (designed for dark backgrounds). Replace with `_Light` or no-suffix variant
- [ ] **Correct icon type** — Architecture icons (`Arch_*`) show as colored squares with white icons; Resource icons (`Res_*`) show as outline/flat icons. Match the reference diagram's style:
  - Reference shows outline icon → use Resource icon
  - Reference shows colored square icon → use Architecture icon
  - **Common mistake**: S3 buckets in AWS architecture diagrams typically use Architecture icons (`Arch_Amazon-Simple-Storage-Service_48.svg`) which render as green filled squares — NOT Resource bucket icons (`Res_*_S3-Bucket_48.svg`) which render as thin outlines only. Always verify S3 and similar high-frequency services against the reference
- [ ] **Icon color matches reference** — Resource icons inherit category colors (e.g., Management-Governance = pink, Storage = green, Containers = orange). If the reference shows a different color, the icon may be from the wrong category or wrong icon type. When no matching color exists in the AWS icon library, create a custom recolored SVG in `icons/custom/` with the color name in the filename (e.g., `Res_{ServiceName}_{ResourceType}_{Size}_{Color}.svg`)
- [ ] **Non-AWS icons use custom SVGs** — Open standards (OpenID Connect, Docker, etc.) are not in the AWS icon library. Check `icons/custom/` for existing custom icons or create new ones
- [ ] **Group icons use correct variant** — `AWS-Cloud_32.svg` (light bg) vs `AWS-Cloud_32_Dark.svg` (dark bg). Container header icons on white canvas must use the non-Dark variant

### Label Width Near Borders
- [ ] Service icon labels (e.g. "Amazon Rekognition" ~190px wide) do not extend past container borders — at least 30px clearance between label edge and nearest container border

## Text

### Readability
- [ ] All text readable at export resolution — not too small (minimum `FONT_BODY >= 18`, `FONT_HDR >= 20`)
- [ ] No text overlapping borders, lines, or other text
- [ ] Multi-line text properly wrapped and centered
- [ ] Text not cut off by container boundaries
- [ ] Labels use clean sans-serif font (Helvetica/fontFamily 2)

### Consistency
- [ ] Font consistent across entire diagram — all text uses the same `fontFamily`
- [ ] Exactly **2 font sizes** used: one for container headers (`FONT_HDR`), one for everything else (`FONT_BODY`)
- [ ] No mixed font sizes within the same category (e.g. all circle numbers same size, all icon labels same size)

## Numbered Step Circles

### Shape & Style
- [ ] Perfect circles (not ovals) — width === height
- [ ] White number on dark filled circle
- [ ] All circles use the **same size and color** — uniform across the diagram
- [ ] No visible border/stroke on circle background

### Placement
- [ ] **HARD RULE: Numbered circles must NEVER touch or overlap arrow lines** — always offset by at least `CIRCLE_R + 5` pixels above/below (for horizontal arrows) or left/right (for vertical arrows). If there is no room to place a circle without touching an arrow, rearrange the diagram layout to create space. Never violate this rule.
- [ ] **Every numbered circle MUST be adjacent to a visible arrow** — circles represent flow steps and must visually associate with a specific arrow connection. A circle floating near an icon without a nearby arrow is incorrect. If no arrow exists for a circle, add one first.
- [ ] Circles sit adjacent to their associated flow arrow — **above** for horizontal arrows, **to the right** for vertical arrows
- [ ] Circles are on the arrow **body**, away from both endpoints — arrowhead triangles extend ~10px back and must not touch circles
- [ ] Circles do not overlap icons, labels, container headers, or other text
- [ ] Every circle is fully inside or fully outside every container — at least 15px clearance from container borders (no border crossings)

## Arrows & Lines

### Endpoints & Routing
- [ ] **Connected icons should be aligned on the arrow's perpendicular axis** — for a horizontal arrow, both icons should share the same icon image center Y. For a vertical arrow, both icons should share the same icon image center X. Use `icy_to_cy()` helper to compute the component `cy` that places the icon image center at the desired target Y, regardless of label line count. **Exceptions**: break alignment when (a) the arrow is bent/L-shaped in the reference image, (b) layout constraints make it impossible, or (c) the reference shows a clear visual hierarchy where icons are intentionally at different heights. In exception cases, use an L-shaped arrow with a waypoint to connect icons at different Y/X positions
- [ ] **vertical_stack alignment with external icons** — when a `vertical_stack` item connects to an icon outside the stack via a horizontal arrow, adjust the stack's `start_y` so that item's `icon_cy` matches the external icon's Y. Calculate backwards: determine the offset from `start_y` to the target item's `icon_cy`, then set `start_y = target_Y - offset`. After creation, verify with `stack["components"][i]["bbox"]["icon_cy"]`. Always read the actual `icon_cy` from the stack bbox for arrow endpoints
- [ ] **Arrow endpoints: edge on travel axis, center on cross axis** — for horizontal arrows: X at icon edge (`cx ± ICON_R`), Y at icon image center. For vertical arrows: Y at icon edge, X at icon image center
- [ ] **Text-side exception**: When an arrow exits from the same side as the text label (e.g., going DOWN when label is below icon), the arrow must start from the **text edge + small gap** (not the icon edge). Calculate: `icon_radius + label_gap + label_height + 5px`. This prevents arrows from crossing through label text
- [ ] Arrow start/end at element edges (not floating in space)
- [ ] **Arrows connecting section icons must be fully within the section** — all arrows between icons inside a container must stay within that container's borders. If the container is too small to fit the arrows, enlarge the container
- [ ] Arrows do NOT cross through unrelated containers — an arrow only crosses a container border when entering/leaving that container
- [ ] **Cross-container arrows stop at the border** — arrows targeting a service inside a nested container must end at that container's border, not reach deep inside to the icon
- [ ] No arrows passing through icons, labels, or text they don't connect to
- [ ] **Every standalone service must have at least one arrow** — no orphaned icons floating without connections

### Style
- [ ] Arrow color and width consistent across same-type connections
- [ ] **Arrow stroke width uniform** across the entire diagram — all arrows use the same `stroke_width` value (e.g. 2px). No mix of thin and thick arrows unless semantically distinct
- [ ] Dashed arrows for indirect/secondary flows, solid for primary flows
- [ ] Arrow direction makes logical sense for the data/process flow
- [ ] Arrow direction (which end has arrowhead) matches the reference — verify every arrow
- [ ] **Uni- vs bidirectional accuracy** — verify every arrow's directionality against the reference. Bidirectional arrows (↔) must have `start_arrowhead="arrow"` AND `end_arrowhead="arrow"`. Do not default to unidirectional when the reference shows data flowing both ways

### Size & Gaps
- [ ] **No blank gaps** between arrow endpoints and icons — arrows should start/end at icon edges (icon center ± icon_radius), not floating in space
- [ ] **No overlapping with icons** — arrow endpoints stop at the icon edge, never reach inside the icon bounding box
- [ ] **Vertical stack arrows are proportional** — arrows between stacked components must be clearly visible (minimum ~40px length). If spacing between components is too small for visible arrows, increase the spacing

### Routing Direction
- [ ] **Choose arrow direction to avoid overlap** — when routing skip arrows or U-shaped paths, pick the direction (up vs down, left vs right) that avoids overlapping with other elements. For example: if the cost row is near the top of the diagram, route the skip arrow BELOW the row (toward empty space), not above (toward the header). Always survey the surrounding space before choosing direction.
- [ ] **Nested containers must have 20px+ clearance between all borders** — parent containers must be visibly larger than children on ALL sides. If auto-sizing causes border overlap, increase parent container initial dimensions

### Labels
- [ ] Arrow annotation labels centered between arrow start and end points
- [ ] Arrow labels positioned fully above or below the arrow line (not overlapping the line)
- [ ] Arrow labels don't overlap shapes or other arrows

## Alignment & Spacing
- [ ] Elements at same logical level share consistent vertical/horizontal alignment
- [ ] Consistent spacing between peer containers
- [ ] Content centered within containers (both axes)
- [ ] **When containers are resized, reposition icons too** — widening/heightening a container without shifting its content leaves icons off-center. Always recalculate icon positions relative to the new container center after any container size change
- [ ] No elements extending beyond their parent container
- [ ] Diagram has balanced whitespace — not cramped, not too sparse
- [ ] At least 40px gap between sibling elements
- [ ] **No disproportionate gaps** — when aligning a stack item with an external icon pushes `start_y` far from the container top, move the entire container (`Y` position) down instead of leaving a large header-to-content gap. The container header-to-first-icon offset should stay consistent (~80-120px). Never stretch just the content offset while leaving the container border in place

## Z-Order (Layer Stacking)
- [ ] Containers are on the bottom layer (rendered first)
- [ ] Service icons + labels are above containers
- [ ] Arrows are above icons (arrow lines visible over services)
- [ ] Numbered circles are on the topmost layer (above arrows)

## Consistent Styling
- [ ] All numbered circles: same size, same background color, same font size
- [ ] All service icons: same icon size
- [ ] All container headers: same icon size, same label font size
- [ ] Color used semantically (same color = same domain/category)

## Professional Polish
- [ ] Overall layout is clean and scannable
- [ ] Color scheme is consistent and matches cloud provider conventions
- [ ] No orphaned elements (disconnected from diagram flow)
- [ ] Diagram tells a clear story when read left-to-right or top-to-bottom
- [ ] Non-technical stakeholder understands main actors in 10 seconds
- [ ] 8-20 components for a standard proposal diagram
