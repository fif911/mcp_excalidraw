# Diagram Review Checklist

## Bounding Boxes & Containers

### Hierarchy & Nesting
- [ ] Cloud provider boundary (AWS Cloud, Azure, GCP) is the **outermost** container encompassing ALL cloud services
- [ ] Service-specific containers (Step Functions, VPC, ECS, etc.) are nested INSIDE the cloud boundary, never as siblings
- [ ] Only external/on-premise elements (users, mobile clients, third-party APIs) sit outside the cloud boundary
- [ ] Cloud boundary is visibly larger than nested containers on ALL sides — at least 30px clearance so nesting is obvious
- [ ] Every nested sub-section is **fully contained** within its parent container — at least 15px clearance from parent border on all sides
- [ ] No element sits partially inside and partially outside a container
- [ ] Nested containers have clear visual hierarchy (max 3 nesting levels)

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
- [ ] Every icon+label pair is grouped (`groupIds`) — moving one moves both

### Icon Rules
- [ ] Use generic icons for generic concepts (Git repo, IDE, Tools) — NOT service-branded icons
- [ ] Use service icons ONLY for specific AWS/GCP/Azure services
- [ ] AWS official SVG icons already include colored backgrounds — no extra `icon_bg_color` rectangle visible (double background = bug)
- [ ] No visible borders/strokes on icon background rectangles or numbered circle ellipses (`strokeWidth: 0`)

### Label Width Near Borders
- [ ] Service icon labels (e.g. "Amazon Rekognition" ~190px wide) do not extend past container borders — at least 30px clearance between label edge and nearest container border

## Text

### Readability
- [ ] All text readable at export resolution — not too small
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
- [ ] Circles are **offset from arrows**, not overlapping them — visible gap (~5px) between circle edge and arrow line
- [ ] Circles sit adjacent to their associated flow arrow (above/below for horizontal arrows, left/right for vertical arrows)
- [ ] Circles are on the arrow **body**, away from both endpoints — arrowhead triangles extend ~10px back and must not touch circles
- [ ] Circles do not overlap icons, labels, or other text
- [ ] Every circle is fully inside or fully outside every container — at least 15px clearance from container borders (no border crossings)

## Arrows & Lines

### Endpoints & Routing
- [ ] Arrow endpoints connect at **icon image centers**, not at the component center (which includes the label) — if an icon has a label below it, the arrow should aim at the icon's visual center, not midway between icon and label
- [ ] Arrow start/end at element edges (not floating in space)
- [ ] Arrows do NOT cross through unrelated containers — an arrow only crosses a container border when entering/leaving that container
- [ ] No arrows passing through icons, labels, or text they don't connect to

### Style
- [ ] Arrow color and width consistent across same-type connections
- [ ] Dashed arrows for indirect/secondary flows, solid for primary flows
- [ ] Arrow direction makes logical sense for the data/process flow
- [ ] Arrow direction (which end has arrowhead) matches the reference — verify every arrow

### Labels
- [ ] Arrow annotation labels centered between arrow start and end points
- [ ] Arrow labels positioned fully above or below the arrow line (not overlapping the line)
- [ ] Arrow labels don't overlap shapes or other arrows

## Alignment & Spacing
- [ ] Elements at same logical level share consistent vertical/horizontal alignment
- [ ] Consistent spacing between peer containers
- [ ] Content centered within containers (both axes)
- [ ] No elements extending beyond their parent container
- [ ] Diagram has balanced whitespace — not cramped, not too sparse
- [ ] At least 40px gap between sibling elements

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
