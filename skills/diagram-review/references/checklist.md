# Diagram Review Checklist

## CRITICAL — Check These First (override reference images)

These rules override what the reference image shows. If the reference image contradicts any of these, the rule wins. Flag violations immediately — do not note them as "conflicts" or defer to the reference.

- [ ] **AWS Cloud boundary is SOLID** — if `stroke_style="dashed"` exists for the AWS Cloud container in the build script, that is a bug. Fix it to `"solid"`. Even if the reference image shows dashed, AWS Cloud is always solid. This is the #1 most common mistake.
- [ ] **Generic concepts use Resource icons (`Res_*`), not Architecture icons (`Arch_*`)** — items like "Git repository", "Studio IDE", "Tools", "Database assets" are generic concepts and MUST use generic Resource icons from the General-Icons category. Architecture icons (colored branded squares) are ONLY for specific named AWS services.

## Bounding Boxes & Containers

### Hierarchy & Nesting
- [ ] Cloud provider boundary (AWS Cloud, Azure, GCP) is the **outermost** container encompassing ALL cloud services
- [ ] Service-specific containers (Step Functions, VPC, ECS, etc.) are nested INSIDE the cloud boundary, never as siblings
- [ ] **Element placement (inside/outside) matches reference** — do NOT assume users/clients go outside the cloud boundary. If the reference shows User inside Customer's AWS Account, place it inside. Getting this wrong changes architectural meaning
- [ ] **External element gap** — icons that are by design outside the main diagram boundary (Users, on-prem servers, etc.) must have a visible gap of at least 10px from the boundary border, but not excessively large (10–25px ideal)
- [ ] Cloud boundary is visibly larger than nested containers on ALL sides — at least 30px clearance so nesting is obvious
- [ ] Every nested sub-section is **fully contained** within its parent container — at least 15px clearance from parent border on all sides
- [ ] No element sits partially inside and partially outside a container
- [ ] Nested containers have clear visual hierarchy (max 3 nesting levels)
- [ ] **No auto-expansion overflow** — `container_box` silently expands width to fit header text + icon. Verify rendered container edges don't touch or cross parent borders (zoom into right/bottom edges)
- [ ] **Cascade check on resize** — when enlarging a container in any direction, verify it does not overlap neighboring containers. If it does, push neighbors away. If neighbors no longer fit in their parent, enlarge the parent. Repeat until no overlaps remain at any level. Never enlarge a container without checking the cascade
- [ ] **Initial dimension arithmetic** — before running the build script, manually verify every nesting level: `child_Y + child_H + padding ≤ parent_Y + parent_H`. The auto-sizer (`fit_container`) may not grow parent containers enough if the initial dimensions are too far off. Example: if Discovery is at y=880, h=300 (bottom=1180) but Private subnet is y=415, h=700 (bottom=1115), the child extends 65px below the parent — increase the parent's H to at least `child_bottom + 20 - parent_Y`
- [ ] **Minimum 20px gap between adjacent header icons** — when a child container header sits directly below its parent's header (e.g., Region → SageMaker), at least 20px clear space between parent header icon bottom and child header icon top. Formula: `child_Y ≥ parent_Y + ICON_SIZE + 20`

### Header Styling
- [ ] **HARD RULE: Structural containers (AWS Cloud, Region, capability groups, Lakehouse, etc.) MUST have their title and header icon set directly on the `container_box()` call via `label_text` and `icon_file_id` — NEVER as a separate floating `icon_label_component()`.** A container with `label_text=""` and a separate icon placed inside to fake a header is wrong for structural containers. **Exception:** Service-boundary containers (e.g., SageMaker Unified Studio) where the reference image shows a full-size service icon (48px+) inside the container — these use `icon_label_component()` placed inside the container as a service icon, not a small header icon. The distinction: structural headers use small icons (32–40px) flush with the border; service icons are full-size (48px+) positioned inside the container area.
- [ ] Every container header has an icon — no text-only headers (inconsistent visual pattern)
- [ ] Header icons flush with top-left corner (0px gap between icon and border)
- [ ] Header label text right of icon, vertically centered with icon
- [ ] Header icon size matches header height (`icon_header_size = header_height`) — icon not smaller than header band
- [ ] Icon-less sub-sections (e.g. "Authentication") have label **horizontally centered** within container width
- [ ] Containers at the same nesting level share the same `y` position and `header_height`

### Header Text Color
- [ ] **HARD RULE: Container header `label_color` is black (`#1a1a1a`) by default.** Colored header text should be the exception, not the rule. Only containers explicitly specified in the plan/reference as having colored text should use non-black `label_color`. Do NOT match `label_color` to `stroke_color` automatically — if most headers are colored (teal, purple, etc.), that's a bug.

### Border Styles
- [ ] **HARD RULE: All container corners MUST be straight (corner_radius=0) — NEVER rounded.** AWS architecture diagrams use sharp 90-degree corners on all containers. If any `container_box()` call uses `corner_radius` > 0, that is a bug. This applies to ALL containers: AWS Cloud, Region, sub-containers, dashed boundaries — everything.
- [ ] **HARD RULE: Container `stroke_color` MUST match the header icon's category color.** AWS icons have built-in category colors (teal for AI/ML, red for Security, purple for Analytics, etc.). The container border color must match. If the header icon is teal, the border is teal. If the header icon is red, the border is red. Do NOT use a generic color (e.g., dark gray) when the icon has a category color.
- [ ] **HARD RULE: The AWS Cloud boundary container MUST always use a SOLID border — NEVER dashed.** AWS Region and service-group containers (like SageMaker Unified Studio) can use dashed borders, but they can also be solid — follow the reference image. The outermost cloud boundary is always solid. This is non-negotiable. Getting this wrong makes the diagram look unprofessional and inconsistent with AWS reference architecture standards.
- [ ] Cloud provider boundary: solid, 2px stroke, brand color (teal for AWS)
- [ ] AWS Region: dashed, 2px stroke, brand color
- [ ] Service-specific boundary (Step Functions, VPC): solid, 2px stroke, brand color
- [ ] Logical sub-sections: gray dashed, 1px stroke
- [ ] No background fill on logical containers (Cloud, Region, service groups) — only sub-sections like Storage/Catalog get fills
- [ ] No duplicate borders from icon library elements
- [ ] **HARD RULE: No container borders may overlap or touch.** Every child container must have at least 15px clearance from its parent container's border on ALL sides. The `validate_diagram()` check `CONTAINER_OVERLAP` detects this. If the outer container is too small, enlarge it — never let nested borders share the same edge.

## Icons & Labels

### Positioning
- [ ] Service icons centered horizontally AND vertically within their container's content area
- [ ] **HARD RULE: If a subsection/container has only one icon (with or without a text label), that icon MUST be centered both horizontally and vertically within the container's content area (below the header).** Calculate: `cx = container_x + container_w / 2`, `cy = container_y + header_height + (container_h - header_height) / 2`. No exceptions — a single icon off-center inside a box is always wrong.
- [ ] Icon + label form a vertically stacked group: icon on top, text below, both centered on same vertical axis
- [ ] **HARD RULE: ALL icons are 65px — no exceptions.** Grep the build script for `icon_size=` and `icon_header_size=`. Every value must reference `ICON_SIZE` (65). Common violations to check for: `HDR_ICON = 40` (header icons), `icon_size=50` (user/external icons), `icon_size=55` (grid icons), `grid_2x2(..., icon_size=55)`. Also check for multiple `HALF` aliases (`HALF_G`, `HALF_U`) which indicate different icon sizes were used for arrow calculations. If the styling spec lists different sizes for different icon categories, the spec is wrong.
- [ ] Every icon+label pair is grouped (`groupIds`) — moving one moves both

### Icon Rules
- [ ] Use generic icons for generic concepts (Git repo, IDE, Tools) — NOT service-branded icons
- [ ] Use service icons ONLY for specific AWS/GCP/Azure services
- [ ] AWS official SVG icons already include colored backgrounds — no extra `icon_bg_color` rectangle visible (double background = bug)
- [ ] **HARD RULE: No icon may have a visible border.** ALL image elements must have `strokeWidth: 0`. Check both the Excalidraw element property AND the SVG source — AWS Category icons (`Arch-Category_*`) have a baked-in gray `#879196` border rect that must be removed via custom SVG copy
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
- [ ] **Grid layout label width** — in multi-column grids, the widest label line must not overlap with adjacent column labels. Estimate: `chars × fontSize × 0.6` per line. If overlap occurs, split long lines (e.g., "component template" → "component\ntemplate") or increase column spacing

## Text

### Readability
- [ ] All text readable at export resolution — all text uses `FONT_SIZE = 24`
- [ ] **HARD RULE: No arrow may cross any text — icon labels OR container headers.**
  - **Icon label text** (below service icons like "Studio IDE", "Tools") must NEVER be crossed by arrow shafts — use L-shaped routing to avoid.
  - **Container header text** (on container top borders like "Coding capabilities", "Amazon SageMaker Lakehouse") must ALSO NEVER be crossed by arrows. Route arrows to enter/exit containers through non-header portions of the border (sides or bottom). Use L-shaped waypoints to steer arrows away from the header band.
  - The `check_arrow_header_overlaps()` utility detects these. All flagged issues must be fixed — no exceptions.
- [ ] No text overlapping borders, lines, or other text (except the container header exception above)
- [ ] Multi-line text properly wrapped and centered
- [ ] Text not cut off by container boundaries
- [ ] Labels use clean sans-serif font (Helvetica/fontFamily 2)

### Consistency
- [ ] Font consistent across entire diagram — all text uses the same `fontFamily`
- [ ] **HARD RULE: ALL text is 24px — no exceptions.** There is exactly 1 font size in the entire diagram: `FONT_SIZE = 24`. Container headers, icon labels, arrow labels, circle numbers — everything uses `FONT_SIZE`. To verify: grep the build script for `font_size=` and `label_font_size=` — every value must reference `FONT_SIZE` (24). Common violations: `FONT_HDR=20` / `FONT_BODY=18` (two-size legacy pattern), `label_font_size=22` on circles, `font_size=18` on icon labels. If you see more than one font-size constant defined, that is a bug.
- [ ] **HARD RULE: Every `container_box()` call MUST use the same `label_font_size=FONT_SIZE`, `icon_header_size=ICON_SIZE`, and `header_height=ICON_SIZE` values.** Define once as constants (e.g., `FONT_SIZE=24`, `ICON_SIZE=65`) and reuse everywhere. No container gets a special size — AWS Cloud, Region, sub-containers, and sub-boxes all share the same header parameters. If any container uses a different value, that is a bug.
- [ ] No mixed font sizes within the same category (e.g. all circle numbers same size, all icon labels same size)

## Numbered Step Circles

### Shape & Style
- [ ] Badge shape matches reference — circles, squares, rounded rectangles, or diamonds as specified in `icons_graph_structure.md` "Number box style" column. Do not assume dark circles by default
- [ ] Badge color matches reference — check `bg_color`/`label_bg` against the plan. Different arrows may use different colors
- [ ] All badges of the same type use **consistent size** — uniform across the diagram
- [ ] White number on filled background (unless reference specifies otherwise)
- [ ] **Number perfectly centered** — `numbered_circle()` uses Excalidraw's built-in `label` property on the shape (not a separate text element). If numbers appear off-center, the function was modified incorrectly — revert to the `label` approach
- [ ] No visible border/stroke on badge background

### Placement
- [ ] **HARD RULE: Numbered circles must NEVER touch or overlap arrow lines** — always offset by at least `CIRCLE_R + 5` pixels above/below (for horizontal arrows) or left/right (for vertical arrows). If there is no room to place a circle without touching an arrow, rearrange the diagram layout to create space. Never violate this rule.
- [ ] **HARD RULE: Non-standalone numbered circles MUST be created via the `arrow()` component's `label_number` parameter — NEVER via manual `numbered_circle()` calls.** If a numbered circle is associated with an arrow (i.e., it labels a flow step on that arrow), it MUST be placed by passing `label_number=N` to the `arrow()` call. Use `label_cx`/`label_cy` overrides on the arrow if the default midpoint position needs adjustment. Only circles that are truly standalone (not associated with ANY arrow) may use direct `numbered_circle()` calls. This ensures circles are always correctly positioned relative to their arrows and automatically updated when arrows change.
- [ ] **Every numbered circle MUST be adjacent to a visible arrow** — circles represent flow steps and must visually associate with a specific arrow connection. A circle floating near an icon without a nearby arrow is incorrect. If no arrow exists for a circle, add one first.
- [ ] **Standalone `numbered_circle()` calls are a red flag** — numbered circles very rarely appear on their own. If any circle is created via `numbered_circle()` instead of `arrow(..., label_number=N)`, double-check that no arrow was missed or accidentally deleted. Cross-reference `icons_graph_structure.md` to verify every arrow is present.
- [ ] Circles sit adjacent to their associated flow arrow — **above** for horizontal arrows, **to the right** for vertical arrows
- [ ] Circles are on the arrow **body**, away from both endpoints — arrowhead triangles extend ~10px back and must not touch circles
- [ ] Circles do not overlap icons, labels, container headers, or other text
- [ ] **Circle-label text overlap** — numbered circles must not overlap icon label text beneath icons. Verify using `check_circle_label_overlaps()` utility. When circles are auto-positioned by `label_number` on arrows with waypoints, they often land on icon labels — use standalone `numbered_circle()` with manual coordinates instead
- [ ] Every circle is fully inside or fully outside every container — at least 15px clearance from container borders (no border crossings)
- [ ] **Gap-region circle placement** — when circles sit in gaps between containers, check for INTERMEDIATE container borders that cut through the gap. E.g., a parent container's bottom border (Unified Studio at y=500) may sit between two child-level containers (Project bottom at y=465, Coding cap top at y=555). The circle must clear ALL borders in the gap, not just the two obvious ones. Calculate: find every container border Y within the gap range, then ensure `circle_cy ± CIRCLE_R` doesn't straddle any of them

## Arrows & Lines

### Completeness & Accuracy
- [ ] **No phantom arrows** — every arrow must trace to a specific connection in the reference image or `icons_graph_structure.md`. Do NOT invent arrows (e.g., "external → Service" from diagram edge when no such connection exists)
- [ ] **Every arrow's source, target, and direction** verified against `icons_graph_structure.md` — common mistakes: reversed direction, wrong source element, fabricated connections
- [ ] **Elements with no arrows in the reference have no arrows in the diagram** — some elements (e.g., User icon) may be purely illustrative with no connections

### Endpoints & Routing
- [ ] **HARD RULE: No diagonal arrow segments** — every arrow segment must be perfectly horizontal (same Y for start and end) or perfectly vertical (same X for start and end). Diagonal lines are NEVER allowed. For multi-icon chains (User → IAM → Studio), ALL icons must share the same `icon_cy`. Even 1px misalignment creates a visible diagonal at full zoom. Zoom into each arrow to verify.
- [ ] **Connected icons should be aligned on the arrow's perpendicular axis** — for a horizontal arrow, both icons should share the same icon image center Y. For a vertical arrow, both icons should share the same icon image center X. Use `icy_to_cy()` helper to compute the component `cy` that places the icon image center at the desired target Y, regardless of label line count. **Exceptions**: break alignment when (a) the arrow is bent/L-shaped in the reference image, (b) layout constraints make it impossible, or (c) the reference shows a clear visual hierarchy where icons are intentionally at different heights. In exception cases, use an L-shaped arrow with a waypoint to connect icons at different Y/X positions
- [ ] **vertical_stack alignment with external icons** — when a `vertical_stack` item connects to an icon outside the stack via a horizontal arrow, adjust the stack's `start_y` so that item's `icon_cy` matches the external icon's Y. Calculate backwards: determine the offset from `start_y` to the target item's `icon_cy`, then set `start_y = target_Y - offset`. After creation, verify with `stack["components"][i]["bbox"]["icon_cy"]`. Always read the actual `icon_cy` from the stack bbox for arrow endpoints
- [ ] **Arrow endpoints: edge on travel axis, center on cross axis** — for horizontal arrows: X at icon edge (`cx ± ICON_R`), Y at icon image center. For vertical arrows: Y at icon edge, X at icon image center
- [ ] **Text-side exception**: When an arrow exits from the same side as the text label (e.g., going DOWN when label is below icon), the arrow must start from the **text edge + small gap** (not the icon edge). Calculate: `icon_radius + label_gap + label_height + 5px`. This prevents arrows from crossing through label text
- [ ] **HARD RULE: Arrows must NEVER cross icon label text.** When an arrow approaches an icon from below (or any direction where label text sits between the source and the icon), a straight line WILL cross the label. Use L-shaped routing with waypoints instead:
  - Calculate the label bounding box (center X, text width + 8px margin each side) — this is the exclusion zone
  - Place the vertical segment at an X fully outside the exclusion zone (e.g., `icon_cx - icon_radius - 40`)
  - Final horizontal segment enters the icon at `icon_cy` (above the label) from the left/right edge
  - Final segment must be ≥30px long — shorter segments cause visually smaller arrowheads
  - Place numbered circles as standalone `numbered_circle()` at the bend point in the gap, NOT as `label_number` on the arrow (auto-positioning lands circles on icons/labels)
  - Verify standalone circles don't straddle container borders in the gap — offset by `CIRCLE_R + 5` from any border
  - For bidirectional L-shaped arrows, ensure the first segment direction matches the desired start arrowhead direction (e.g., first segment goes UP so start arrowhead points DOWN)
- [ ] **Enter icons from label-free sides** — when an arrow connects to an icon, it should enter from a side with no label text (typically LEFT or RIGHT). Entering from below when the label is below causes label crossings. When an old arrow is removed, its entry point is a clean path for a replacement
- [ ] **Offset vertical segments to avoid same-x icons** — if two icons share the same x (e.g., grid column), a vertical segment at that x crosses the lower icon's label. Route the vertical segment at a different x (e.g., midpoint between grid columns)
- [ ] Arrow start/end at element edges (not floating in space)
- [ ] **Arrows connecting section icons must be fully within the section** — all arrows between icons inside a container must stay within that container's borders. If the container is too small to fit the arrows, enlarge the container
- [ ] Arrows do NOT cross through unrelated containers — an arrow only crosses a container border when entering/leaving that container
- [ ] **Cross-container arrows stop at the border** — arrows targeting a service inside a nested container must end at that container's border, not reach deep inside to the icon
- [ ] No arrows passing through icons, labels, or text they don't connect to
- [ ] **Every standalone service must have at least one arrow** — no orphaned icons floating without connections

### Style
- [ ] Arrow color and width consistent across same-type connections
- [ ] **Arrow stroke width uniform** across the entire diagram — all arrows use the same `stroke_width` value (e.g. 2px). No mix of thin and thick arrows unless semantically distinct
- [ ] **Arrowhead size uniformity** — all arrowheads must appear visually identical. Excalidraw derives arrowhead size from `strokeWidth` AND the final segment length. If any arrow has a noticeably smaller/larger arrowhead, the final segment is too short. Fix by extending the segment to ≥30px. Compare every arrowhead against each other at zoom
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
- [ ] **Sibling container gap ≥ 100px** — peer containers at the same nesting level (e.g., Coding capabilities ↔ Lakehouse) must have at least 100px horizontal/vertical gap. Gaps < 60px look cramped and block arrow routing
- [ ] **Outer boundary tight fit** — Cloud/Region borders should have no more than ~80px of dead space beyond the rightmost/bottommost element. If there's excess space, either shrink the boundary or spread sibling containers further apart to fill it evenly
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
- [ ] **All icons (service + header) use single `ICON_SIZE` constant** — no separate `SVC_ICON`/`HDR_ICON`. Verify: every `icon_size=`, `icon_header_size=`, and `header_height=` in the build script must reference the same constant.
- [ ] **All container headers: same `label_font_size` (`FONT_SIZE = 24`)** — verify by checking every `container_box()` call in the build script
- [ ] Color used semantically (same color = same domain/category)

## Professional Polish
- [ ] Overall layout is clean and scannable
- [ ] Color scheme is consistent and matches cloud provider conventions
- [ ] No orphaned elements (disconnected from diagram flow)
- [ ] Diagram tells a clear story when read left-to-right or top-to-bottom
- [ ] Non-technical stakeholder understands main actors in 10 seconds
- [ ] 8-20 components for a standard proposal diagram
