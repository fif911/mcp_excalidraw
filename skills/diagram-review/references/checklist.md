# Diagram Review Checklist

## Bounding Boxes & Containers
- [ ] Cloud provider boundary (AWS Cloud, Azure, GCP) is the outermost container encompassing ALL cloud services
- [ ] Service-specific containers (Step Functions, VPC, ECS, etc.) are nested INSIDE the cloud boundary, never as siblings
- [ ] Only external/on-premise elements (users, mobile clients, third-party APIs) sit outside the cloud boundary
- [ ] Cloud boundary is visibly larger than nested service containers on ALL sides (top, bottom, left, right) — at least 30px clearance so nesting is obvious
- [ ] Icons flush with top-left corner (0px gap between icon and border)
- [ ] Label text right of icon, vertically centered with icon
- [ ] No background fill on logical containers (Cloud, Region, service groups) — only sub-sections like Storage/Catalog get fills
- [ ] Borders use correct styles: Cloud=gray solid, sub-sections=gray dashed, branded services=colored solid
- [ ] Nested containers have clear visual hierarchy
- [ ] No duplicate borders from icon library elements

## Icons & Labels
- [ ] Service icons centered horizontally AND vertically within their container's content area
- [ ] Icon + label form a vertically stacked group: icon on top, text below, both centered on same axis
- [ ] Use generic icons for generic concepts (Git repo, IDE, Tools) — NOT service-branded icons
- [ ] Use service icons ONLY for specific AWS/GCP/Azure services
- [ ] Icon sizes consistent: header icons ~55px, service icons ~65px
- [ ] Labels use clean sans-serif font (Helvetica/fontFamily 2)

## Text
- [ ] All text readable at export resolution — not too small
- [ ] No text overlapping borders, lines, or other text
- [ ] Multi-line text properly wrapped and centered
- [ ] Text not cut off by container boundaries
- [ ] Font consistent across entire diagram

## Numbered Step Circles
- [ ] Perfect circles (not ovals) — increase size if text makes them oval
- [ ] White number on black filled circle
- [ ] Numbers not overlapping arrows, icons, or text
- [ ] Numbers positioned adjacent to their associated flow arrow

## Arrows & Lines
- [ ] Arrows connect to center of source/target components
- [ ] Arrow start/end at container edges (not floating in space)
- [ ] Dashed arrows for indirect/secondary flows
- [ ] Solid arrows for primary flows
- [ ] No arrows crossing through unrelated components
- [ ] Arrow direction makes logical sense for the data/process flow

## Alignment & Spacing
- [ ] Elements at same logical level share consistent vertical/horizontal alignment
- [ ] Consistent spacing between peer containers
- [ ] Content centered within containers (both axes)
- [ ] No elements extending beyond their parent container
- [ ] Diagram has balanced whitespace — not cramped, not too sparse

## Professional Polish
- [ ] Overall layout is clean and scannable
- [ ] Color scheme is consistent and matches cloud provider conventions
- [ ] No orphaned elements (disconnected from the diagram flow)
- [ ] Diagram tells a clear story when read left-to-right, top-to-bottom
