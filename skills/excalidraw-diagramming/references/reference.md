# Excalidraw Diagramming Reference

Quick-reference for MCP tools, REST API, scripts, and diagram quality validation.

---

## MCP Tools

### Element CRUD

| Tool | Description | Required params |
|------|-------------|-----------------|
| `create_element` | Create shape/text/arrow/line | `type`, `x`, `y` |
| `get_element` | Get single element by ID | `id` |
| `update_element` | Update element properties | `id` |
| `delete_element` | Delete element | `id` |
| `query_elements` | Query by type/filters | (optional) `type`, `filter` |
| `batch_create_elements` | Create many at once | `elements[]` |
| `duplicate_elements` | Clone with offset | `elementIds[]`, (optional) `offsetX`, `offsetY` |

### Layout & Organization

| Tool | Description | Required params |
|------|-------------|-----------------|
| `align_elements` | Align to left/center/right/top/middle/bottom | `elementIds[]`, `alignment` |
| `align_in_parent` | Center element(s) inside a parent container | `elementIds[]`, `parentId` |
| `distribute_elements` | Even spacing horizontal/vertical | `elementIds[]`, `direction` |
| `group_elements` | Group elements | `elementIds[]` |
| `ungroup_elements` | Ungroup | `groupId` |
| `lock_elements` | Lock elements | `elementIds[]` |
| `unlock_elements` | Unlock elements | `elementIds[]` |

### Scene Awareness

| Tool | Description | Required params |
|------|-------------|-----------------|
| `describe_scene` | AI-readable scene description (types, positions, labels, connections, bounding box) | (none) |
| `get_canvas_screenshot` | Returns PNG image of canvas for visual verification | (optional) `background` |
| `get_resource` | Get scene/library/theme/elements | `resource` |

### File I/O & Export

| Tool | Description | Required params |
|------|-------------|-----------------|
| `export_scene` | Export to .excalidraw JSON | (optional) `filePath` |
| `import_scene` | Import from .excalidraw JSON | `mode` ("replace"\|"merge"), `filePath` or `data` |
| `export_to_image` | Export to PNG/SVG (needs browser) | `format` ("png"\|"svg"), (optional) `filePath`, `background` |
| `export_to_excalidraw_url` | Upload & get shareable excalidraw.com URL | (none) |

### State Management

| Tool | Description | Required params |
|------|-------------|-----------------|
| `clear_canvas` | Remove all elements | (none) |
| `snapshot_scene` | Save named snapshot | `name` |
| `restore_snapshot` | Restore from snapshot | `name` |

### Viewport & Camera

| Tool | Description | Required params |
|------|-------------|-----------------|
| `set_viewport` | Zoom-to-fit, center on element, manual zoom/scroll (needs browser) | (optional) `scrollToContent`, `scrollToElementId`, `zoom`, `offsetX`, `offsetY` |

### Other

| Tool | Description | Required params |
|------|-------------|-----------------|
| `read_diagram_guide` | Get design best practices (colors, sizing, layout, anti-patterns) | (none) |
| `create_from_mermaid` | Mermaid diagram to Excalidraw | `mermaidDiagram` |

### Key MCP Notes

- Set `text` field on shapes to label them (auto-converts to `label.text`).
- Use `startElementId`/`endElementId` on arrows for binding.
- `fontFamily` must be a string (e.g. `"1"`) — do NOT pass a number.
- `points` accepts both `[[x,y]]` tuples and `[{x,y}]` objects.
- **Curved arrows**: `"roundness": {"type": 2}` with 3+ points for smooth curves. `"elbowed": true` for right-angle routing.
- Create shapes first, then arrows, then alignment/grouping.

---

## Canvas REST API

Base URL: `EXPRESS_SERVER_URL` (default `http://localhost:3000`). Health: `GET /health`.

### Elements

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/elements` | List all elements |
| `GET` | `/api/elements/:id` | Get element by ID |
| `POST` | `/api/elements` | Create element |
| `PUT` | `/api/elements/:id` | Update element |
| `DELETE` | `/api/elements/:id` | Delete element |
| `DELETE` | `/api/elements/clear` | Clear all elements |
| `GET` | `/api/elements/search?type=...` | Search with filters |
| `POST` | `/api/elements/batch` | Batch create |
| `POST` | `/api/elements/sync` | Overwrite import (clear + write) |
| `POST` | `/api/elements/from-mermaid` | Mermaid conversion via frontend |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/export/image` | Request image export (needs frontend) |
| `POST` | `/api/export/image/result` | Frontend posts export result back |

### Viewport

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/viewport` | Set viewport/camera (needs frontend) |
| `POST` | `/api/viewport/result` | Frontend posts viewport result back |

### Snapshots

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/snapshots` | Save snapshot `{name}` |
| `GET` | `/api/snapshots` | List snapshots |
| `GET` | `/api/snapshots/:name` | Get snapshot by name |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/sync/status` | Memory/WebSocket stats |

### REST API vs MCP Difference

- **REST**: Use `"label": {"text": "..."}` for shape labels. Use `"start": {"id": "..."}` / `"end": {"id": "..."}` for arrow binding.
- **MCP**: Use `text` for labels and `startElementId`/`endElementId` for arrows.

---

## Skill Scripts

All scripts accept `--url <canvasUrl>` (defaults to `EXPRESS_SERVER_URL`).

```bash
node scripts/healthcheck.cjs
node scripts/clear-canvas.cjs
node scripts/export-elements.cjs --out diagram.elements.json
node scripts/import-elements.cjs --in diagram.elements.json --mode batch|sync
node scripts/create-element.cjs --data '{...}'
node scripts/update-element.cjs --id <id> --data '{...}'
node scripts/delete-element.cjs --id <id>
```

---

## Diagram Quality Checklist

Two-layer validation for architecture diagrams.

### Layer 1: Structural (from Excalidraw JSON)

#### Completeness
- [ ] Every component from the spec has a corresponding element on canvas
- [ ] Every actor (user, external system) is present
- [ ] All data flows have a matching arrow
- [ ] Title or heading element identifies the diagram

#### Arrow Integrity
- [ ] Every arrow has `startBinding.elementId` and `endBinding.elementId` (no floating endpoints)
- [ ] Bound target elements exist in the elements array (no dangling references)
- [ ] Bidirectional: if arrow binds to element X, X's `boundElements` includes the arrow
- [ ] No duplicate arrows (same start AND end)
- [ ] Arrow segments are orthogonal (dx=0 or dy=0) unless using elbowed routing
- [ ] No zero-length arrows

#### Container Hierarchy
- [ ] Nested containers reflect logical grouping
- [ ] Every icon+label pair shares a `groupIds` entry
- [ ] Container labels don't overlap child elements
- [ ] No element sits partially inside and partially outside a container

#### Element Hygiene
- [ ] Consistent `fontFamily` across all text (one font, not mixed)
- [ ] Consistent `fontSize` for same-level labels
- [ ] No overlapping bounding boxes between siblings
- [ ] No orphan text elements unassociated with any group
- [ ] All elements have non-zero width and height

#### Programmatic Checks
```python
issues = validate_arrow_paths()
issues += validate_diagram()
assert len(issues) == 0, f"Validation failed: {issues}"
```

### Layer 2: Visual (from screenshot)

#### Layout & Flow
- [ ] Diagram reads left-to-right or top-to-bottom
- [ ] External actors on LEFT/TOP edge; outputs on RIGHT/BOTTOM
- [ ] Related components spatially clustered
- [ ] Whitespace separates logical zones (2-4 major sections visible)
- [ ] No overcrowded areas with empty areas elsewhere

#### Arrows & Connections
- [ ] Arrows visually traceable from source to destination
- [ ] Minimal arrow crossings
- [ ] Arrow labels (if any) don't overlap shapes or other arrows
- [ ] Dashed vs solid distinction is clear and intentional
- [ ] Arrows connect TO service icons, not to empty container borders

#### Labels & Readability
- [ ] Every box and icon has a readable label
- [ ] Labels don't overflow parent shapes
- [ ] Container headers visually distinct from child labels
- [ ] All text horizontal (no rotated text)
- [ ] At 50% zoom, all labels still legible

#### Visual Hierarchy
- [ ] Nested containers use color/dashed borders for depth distinction
- [ ] Max 3 nesting levels (deeper = too detailed for proposals)
- [ ] Icons consistent in size within same hierarchy level
- [ ] Color used semantically (same color = same domain)

#### Proposal Fitness
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
