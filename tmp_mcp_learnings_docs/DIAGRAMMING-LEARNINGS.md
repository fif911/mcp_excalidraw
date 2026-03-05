# Excalidraw Diagramming — Technical Learnings

**Last updated:** 2026-03-03
**Excalidraw versions tested:** 0.18.0 (npm stable), 0.18.0-60b2758 (npm next)
**MCP Server version:** 1.0.2 (fork: `fif911/mcp_excalidraw`, branch: `teamclaw`)

---

## 1. Elbowed Arrow Routing

### What we tested

Created rectangles + elbowed arrows via every available method:
- Batch API (`POST /api/elements/batch`) with `elbowed: true`
- Single API (`POST /api/elements`) with `elbowed: true`
- Direct `updateScene()` via Puppeteer with full binding objects
- UI arrow tool (mouse drag) + clicking "Elbow arrow" button
- `actionManager.executeAction(changeArrowType, 'elbow')`
- Nudging bound elements via `updateScene()` and mouse drag

### Results by version

#### v0.18.0 (npm stable) — Routing completely broken

Every method produces **2-point straight lines**. The `elbowed: true` flag is stored but routing never triggers.

**Root cause:** `routeElbowArrow()` (A* pathfinding) exists in the minified source but is only called from `createFlowchartElement()` (Cmd+Arrow shortcut). It is never called from:
- Arrow type change via UI button
- Element drag events
- `updateScene()` calls
- `convertToExcalidrawElements()`

The routing trigger in v0.18.0 was `LinearElementEditor.movePoints()`, but it was broken — only invoked in the flowchart creation path.

#### v0.18.0-60b2758 (npm next) — Routing works via UI only

Clicking the "Elbow arrow" button in the properties panel produces **4-point right-angle paths**. The routing logic was fixed for UI interactions.

**However:**
- **No collision avoidance.** The router only considers start/end bound elements. Arrows route straight through obstacle elements.
- **API-created arrows still get 2 points.** WebSocket delivery and `updateScene()` do not trigger routing.
- **`convertToExcalidrawElements()` still strips bindings** (see Section 2).

### Conclusion

Excalidraw's elbowed routing is for simple 1-to-1 connections in interactive editing. It cannot replace custom routing for programmatic diagram generation with obstacle avoidance. Use manual waypoints in Python.

---

## 2. Binding Pipeline (API to Frontend)

### The flow

```
Python script → REST API (server.ts) → WebSocket → Frontend (App.tsx)
                                                     → convertToExcalidrawElements()
                                                     → updateScene()
```

### Binding loss problem (FIXED)

**`convertToExcalidrawElements()` strips `startBinding` and `endBinding`.**

When elements arrive via WebSocket, the frontend passes them through Excalidraw's `convertToExcalidrawElements()` function. This function does NOT preserve binding objects — they become `null` on the rendered elements. The `boundElements` array on rectangles is also stripped.

**Fix applied (2026-03-02):** Added `restoreBindings()` helper in `App.tsx` that re-applies `startBinding`, `endBinding`, `boundElements`, and `elbowed` from the original server data after `convertToExcalidrawElements()` runs. Applied to all 4 WebSocket message handlers: `initial_elements`, `element_created`, `element_updated`, `elements_batch_created`.

Also added `startBinding`, `endBinding`, and `boundElements` to the Zod schemas (`CreateElementSchema` and `UpdateElementSchema`) in `server.ts` so the server no longer strips these properties during validation.

Also added `resolveArrowBindings()` call to the single element creation path (`POST /api/elements`), not just batch.

**All 3 binding paths now work:**
1. Batch API with `start: {id}` shorthand → server resolves → frontend preserves
2. Single API with explicit `startBinding`/`endBinding` → schema accepts → frontend preserves
3. Elbowed arrows with bindings → same as above

### Server-side binding resolution

`resolveArrowBindings()` in `server.ts` works for both single and batch creation:
- Converts shorthand `start: { id: 'box-a' }` → full `startBinding: { elementId: 'box-a', focus: 0, gap: 8 }`
- Also adds `boundElements` arrays to the connected rectangles
- Computes edge-to-edge 2-point paths
- For single creation, also checks existing elements in the store for cross-references

### Binding object format

The API uses a simpler format than what Excalidraw stores internally:

```javascript
// API format (server-side)
{ elementId: "box-a", focus: 0, gap: 8 }

// UI-created format (has fixedPoint)
{ elementId: "box-a", mode: "inside", fixedPoint: [1.0325, 0.499] }
```

The `fixedPoint` indicates exactly where on the element boundary the arrow connects. The `mode` can be `"inside"` (start) or `"orbit"` (end). These are only set by UI interactions.

---

## 3. Excalidraw API Surface

### `window.excalidrawAPI` (exposed by App.tsx at line 143)

Available methods:
- `getSceneElements()` — all elements (including deleted ones)
- `getAppState()` — zoom, scroll, selection, active tool
- `updateScene({ elements, appState })` — batch update elements and/or state
- `scrollToContent(elements, { fitToViewport: true })` — center view

### Active tool management

```javascript
// Set active tool
window.excalidrawAPI.updateScene({
  appState: {
    activeTool: { type: 'arrow', customType: null, locked: false, lastActiveTool: null }
  }
});
```

Tool types: `selection`, `rectangle`, `diamond`, `ellipse`, `arrow`, `line`, `freedraw`, `text`, `image`

### Element selection

```javascript
window.excalidrawAPI.updateScene({
  appState: { selectedElementIds: { [elementId]: true } }
});
```

### React fiber access (advanced)

The App component's `stateNode` can be accessed via React fiber tree walk. This gives access to `actionManager` which has all Excalidraw actions. However, calling `executeAction()` directly fails because `perform()` needs the App instance as `this` context.

---

## 4. Arrow Properties Reference

```javascript
{
  type: "arrow",
  x: 100, y: 200,               // Start position (scene coords)
  points: [[0,0], [300, 150]],   // Relative to x,y
  elbowed: true,                 // Enable elbowed routing (UI only)
  strokeColor: "#1e1e1e",
  strokeWidth: 2,
  strokeStyle: "solid",          // "solid", "dashed", "dotted"
  startArrowhead: null,          // null, "arrow", "bar", "dot", "triangle"
  endArrowhead: "arrow",
  roundness: { type: 2 },        // Round corners on path
  startBinding: {
    elementId: "box-a",
    focus: 0,                    // -1 to 1, where on the element face
    gap: 8                       // Gap between arrow and element
  },
  endBinding: { elementId: "box-b", focus: 0, gap: 8 },
}
```

### Waypoints for manual routing

The `points` array supports multiple intermediate points:
```javascript
// Right-angle path: right → down → right
points: [[0,0], [200, 0], [200, 150], [400, 150]]
```

Each point is relative to the arrow's `x, y` position.

---

## 5. UI Element Discovery

### Arrow type buttons

When an arrow is selected, the properties panel shows "Arrow type" with 3 labels:
- "Sharp arrow" — straight line segments
- "Curved arrow" — bezier curves
- "Elbow arrow" — right-angle elbowed path

These are `<label>` elements with `title` attributes. Find them:
```javascript
document.querySelectorAll('label').forEach(el => {
  if (el.title === 'Elbow arrow') el.click();
});
```

### Arrow tool activation

The toolbar uses `<label class="ToolIcon">` elements. The arrow tool has `title="Arrow — A or 5"`.

---

## 6. Text Element Gotchas

- **`textAlign: "center"` does NOT work** for multi-line text. Split into separate single-line text elements instead.
- **Never set explicit `width`** on text elements. Excalidraw calculates width from content.
- **Server doesn't know text dimensions.** The server stores text without rendered `width`/`height`. Only the browser knows actual pixel dimensions after Excalidraw renders the text. This affects any operation that needs text size (alignment, centering, collision detection).
- **Font family IDs:** 1 = Virgil (hand-drawn), 2 = Helvetica, 3 = Cascadia (code), 5 = Excalifont, 6 = Nunito, 7 = Lilita One, 8 = Comic Shanns
- **`containerId`**: Excalidraw supports binding text to a container via `containerId`. Added to Zod schemas. However, `containerId` does NOT auto-position the text — it only affects sizing/rendering style. You still need explicit positioning (see Section 8).

---

## 7. Practical Arrow Routing Strategy

For architecture diagrams with obstacles:

1. **Simple direct connections** (no obstacles between): Use `elbowed_arrow()` from components.py. Sets `elbowed: true` — won't auto-route via API but will look correct if the user edits in UI later.

2. **Connections with obstacles**: Use `arrow()` with explicit `waypoints` parameter. Compute right-angle waypoints in Python based on element positions. Example:
   ```python
   # Route around an obstacle: right side of A → above obstacle → left side of B
   arrow("a1", ax+aw, ay+ah/2, bx, by+bh/2,
         waypoints=[(mid_x, ay+ah/2), (mid_x, obstacle_y-20), (bx-20, obstacle_y-20), (bx-20, by+bh/2)])
   ```

3. **Validation**: Use `validate_arrow_paths()` to check arrows don't overlap with text elements. For full collision detection against rectangles, implement in the build script.

---

## 8. Browser-Delegated Operations (WebSocket Roundtrip Pattern)

### The problem

Some operations need information that only the browser has — rendered text dimensions, pixel-accurate element sizes, the Excalidraw rendering engine. The server stores elements but doesn't render them, so it can't know a text element's actual `width`/`height`.

### The pattern

Used by `export_image`, `set_viewport`, and `align_in_parent`:

```
MCP tool call
  → POST /api/{operation} (server.ts creates a pending promise + timeout)
    → WebSocket broadcast to all connected browser clients
      → Browser executes operation using Excalidraw API
      → POST /api/{operation}/result back to server
    → Server resolves the pending promise, returns result to MCP
```

Each operation has:
- A `Pending{Op}` interface with `resolve`, `reject`, `timeout`
- A `pending{Op}s` Map keyed by `requestId`
- A request endpoint that creates the promise and broadcasts
- A result endpoint that resolves/rejects the promise

### `align_in_parent` tool (added 2026-03-03)

**Purpose:** Position child elements inside a parent element. Essential for centering text inside shapes (numbered circles, labels in boxes).

**Why browser-delegated:** The server doesn't store rendered text `width`/`height`. The browser reads actual dimensions from Excalidraw's scene elements and computes the correct position.

**Supports 9 alignment modes:** `center`, `top`, `bottom`, `left`, `right`, `top-left`, `top-right`, `bottom-left`, `bottom-right`. Default: `center`. Non-center modes use 4px padding from parent edges.

**Flow:**
```
MCP: align_in_parent(parentId, childIds, alignment?)
  → POST /api/align → WS broadcast "align_elements_request"
    → Browser: reads parent + child dimensions from scene
    → Computes: childX = f(parentX, parentW, childW, alignment)
    → Updates scene, POSTs position updates back
  → Server syncs new x/y to in-memory storage
  → Returns updates to MCP
```

**Example:**
```bash
# Center text "3" inside a circle
curl -X POST /api/align -d '{"parentId":"circle1","childIds":["text1"]}'

# Top-left align a label inside a rectangle
curl -X POST /api/align -d '{"parentId":"rect1","childIds":["label"],"alignment":"top-left"}'
```

### `align_in_parent` vs `align_elements` — when to use which

| Tool | Use case | How it works |
|------|----------|--------------|
| `align_elements` | Align elements relative to **each other** (e.g., line up 3 boxes by left edges) | Server-side. Reads stored width/height. Works for shapes. Does NOT work for text. |
| `align_in_parent` | Position children **inside** a parent (e.g., center text in circle, label in box) | Browser-delegated. Reads actual rendered dimensions. Works for all elements including text. |

---

## 9. Image Element Support (PR #58)

Added image element support to the MCP server (upstream PR: `yctimlin/mcp_excalidraw#58`).

- **Files API:** `GET/POST/DELETE /api/files` — stores binary file data (base64 dataURLs) in memory
- **Image elements:** `type: "image"` with `fileId` linking to a stored file, `status: "saved"`, `scale: [1, 1]`
- **Frontend handling:** Image elements bypass `convertToExcalidrawElements()` (which strips `fileId`/`status`). Instead, they're constructed directly with all required Excalidraw properties.
- **File delivery:** Files are sent alongside elements in `initial_elements` WebSocket message and via `files_added` broadcast.

---

## 10. Upstream PRs (fif911 → yctimlin/mcp_excalidraw)

| PR | Branch | Status | Description |
|----|--------|--------|-------------|
| #57 | `fix/arrow-binding-preservation-v2` | Open | Preserves `startBinding`/`endBinding`/`boundElements` through API→frontend pipeline. Adds `restoreBindings()` helper, Zod schema updates, single-element binding resolution. |
| #58 | `feat/image-element-support` | Open | Adds image element support with file storage API (`/api/files`), proper frontend handling bypassing `convertToExcalidrawElements()` for images. |

### Local-only changes (teamclaw branch, not yet PR'd)

- **`containerId` support:** Added to Zod schemas and `restoreBindings()` — text elements can reference a container.
- **`align_in_parent` tool:** Full browser-delegated alignment with 9 modes + configurable padding (see Section 8).
- **`export_image` tool:** WebSocket roundtrip to browser for PNG/SVG export.
- **`set_viewport` tool:** WebSocket roundtrip to browser for scroll/zoom control.
- **`align_elements_request` WebSocket message type** added to types.ts.
- **Label fontFamily/fontSize/strokeColor support:** Labels on shapes accept `fontFamily`, `fontSize`, `strokeColor` (see Section 11).

---

## 11. Label Font Control

### Problem

Shape labels (`"label": {"text": "..."}`) render in Excalidraw's default Virgil (handwritten) font. For professional/technical diagrams, this looks wrong — labels should match the rest of the diagram's font.

### Root cause

`convertToExcalidrawElements()` creates bound text elements from the `label` property. Without explicit `fontFamily`, it defaults to Virgil (fontFamily=1). This is not a bug — it's Excalidraw's default behavior. The server normalizes `fontFamily` on standalone text elements, but labels need their own `fontFamily` field.

### Solution

The `label` object now accepts optional `fontFamily`, `fontSize`, and `strokeColor`:

```json
{
  "type": "rectangle",
  "label": {"text": "API Server", "fontFamily": "helvetica", "fontSize": 16},
  ...
}
```

The server normalizes `label.fontFamily` (string names → numeric IDs) in both single and batch creation endpoints, then passes it to `convertToExcalidrawElements()` which uses it for the bound text element.

### Key rule for Roman

**Always pass `fontFamily` on labels.** Pick one font for the whole diagram and use it consistently on both standalone text elements AND labels:

```python
# Standalone text
{"type": "text", "text": "Title", "fontFamily": "helvetica", ...}
# Shape label
{"type": "rectangle", "label": {"text": "Service", "fontFamily": "helvetica"}, ...}
```

### What does NOT work

- Setting `fontFamily` only on the parent shape (e.g., `"fontFamily": "helvetica"` on the rectangle) — this does NOT propagate to the label. The label has its own separate `fontFamily`.
- Trying to override label font via `align_in_parent` — alignment only changes position, not font.

---

## 12. Stale Frontend Bundle (Dev Pitfall)

### The problem

After rebuilding the frontend (`npm run build`), existing browser tabs keep running the **old** JavaScript bundle. Element data arrives fine via WebSocket, but it's processed by old code — so fixes to `restoreBindings()`, `align_in_parent`, or any frontend handler don't take effect.

Symptoms:
- Elements appear on canvas (WebSocket works) but bindings are broken
- Fonts render wrong (old code, old defaults)
- `align_in_parent` times out (old code doesn't have the handler)
- Behavior doesn't match what you just fixed in `App.tsx`

### Why it happens

Vite produces content-hashed bundles (`index-Ab3Cd4.js`). A new build generates new filenames. But the browser tab already loaded the old bundle — it never fetches the new one. Even `Cmd+R` (regular reload) can serve cached assets.

### The fix

**`Cmd+Shift+R`** (hard reload) in the browser tab. This bypasses the cache and loads the new bundle.

### Key rule

**After any `npm run build` that changes frontend code (`App.tsx`, etc.), hard-reload all browser tabs on localhost:3000.** `npm run canvas` only rebuilds the server (`build:server` = tsc). Frontend changes require `npm run build` (full build including Vite) AND a hard reload.

### What changes need full rebuild vs server-only

| Change | Build command | Browser action |
|--------|--------------|----------------|
| `server.ts` (REST endpoints, Zod schemas) | `npm run build:server` or `npm run canvas` | None needed |
| `index.ts` (MCP tool definitions) | `npm run build:server` | None needed |
| `App.tsx` (WebSocket handlers, restoreBindings, align handler) | `npm run build` (full) | **Cmd+Shift+R** |
| `types.ts` (shared types) | `npm run build` (full) | **Cmd+Shift+R** |

---

## 13. boundElements Must Be Set on Both Sides

### The problem

`resolveArrowBindings()` originally only set `startBinding`/`endBinding` on arrows. It did NOT add `boundElements` to the connected shapes. Without `boundElements` on shapes, Excalidraw doesn't know arrows are connected — dragging a shape leaves arrows behind.

### The fix

`resolveArrowBindings()` now adds `{ id: arrowId, type: 'arrow' }` to the `boundElements` array on both the start and end shapes. Both sides must be set:
- **Arrow** → `startBinding: { elementId: "box-a", ... }` + `endBinding: { elementId: "box-b", ... }`
- **Shape** → `boundElements: [{ id: "arr-1", type: "arrow" }]`

### Verification

After creating bound elements, check both sides:
```bash
# Arrow should have startBinding + endBinding
mcporter call excalidraw.get_element id=arr-1

# Shape should have boundElements with the arrow ID
mcporter call excalidraw.get_element id=box-a
```
