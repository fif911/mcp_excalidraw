# Lessons Learned: AWS Architecture Diagrams in Excalidraw

## Label Text on Shapes
- Use `"label": {"text": "..."}` for REST API (NOT `"text"`)
- Label properties like `color`, `fontSize` often get stripped by the API
- For white text on dark backgrounds: use separate `text` elements overlaid on shapes instead of label properties

## Numbered Circles (Step indicators)
- Don't use `label` with `color: "#ffffff"` on dark ellipses — it doesn't render white
- Instead: create ellipse (bg + stroke both dark) + separate text element (strokeColor: "#ffffff") positioned on top
- Size: 34x34 ellipse, 16px font, offset text ~8px from ellipse x/y

## Container Labels (AWS Cloud, AWS Region, etc.)
- Don't use `label` with `textAlign: "left", verticalAlign: "top"` on rectangles — positioning is unreliable
- Instead: create rectangle WITHOUT label + separate text element positioned at top-left inside the box
- This gives precise control over label placement

## Color Reference (AWS diagrams)
- AWS Cloud border: `#868e96` (gray), dashed
- AWS Region border: `#0d9488` (teal), dashed  
- SageMaker boxes: `#0d9488` (teal), solid
- Sales Forecasting Project: `#7c3aed` (purple), solid
- Coding capabilities: `#1e1e1e` (black), solid
- IAM Identity Center: stroke `#e03131`, bg `#ffc9c9` (red)
- Amazon Redshift: `#7c3aed` (purple)
- Amazon S3: `#6b8e23` / `#8b8e23` (olive/yellow-green)
- AWS Glue: `#7c3aed` (purple)
- Storage/Catalog boxes: stroke `#d1d5db`, bg `#f3f4f6` (light gray)

## Layout Strategy
- Plan coordinate grid before creating elements
- Outer containers first (AWS Cloud → Region), then inner boxes
- Use separate text elements for all container labels
- Numbered circles: separate ellipse + text pairs
- Arrows last, using manual points (binding can be unreliable)

## REST API Gotchas
- `fontFamily` must be string `"1"` not number
- Arrow `startArrowhead`/`endArrowhead` accepted but bidirectional arrows render as `<>`
- `fillStyle: "solid"` required for background colors to show
- Export image requires browser open at localhost:3000
