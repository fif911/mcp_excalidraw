# Elbowed Arrow Routing Test Results

**Date:** 2026-03-02
**Excalidraw version:** 0.18.0 (`@excalidraw/excalidraw`)
**MCP Server version:** 1.0.2

## Summary

**Elbowed arrows do NOT auto-route when created via the API.** The `elbowed: true` flag is accepted and stored, but the actual path routing (computing intermediate waypoints to create right-angle segments that avoid obstacles) only happens through Excalidraw's interactive editing system -- specifically through the internal `movePoints()` function that runs during drag operations in the UI.

## Test Details

### Test 1: Batch API with `elbowed: true`
- Created 4 rectangles + 4 elbowed arrows via `POST /api/elements/batch`
- **Result:** All arrows stored with `elbowed: true` but only 2-point paths (straight lines)
- Bindings (`startBinding`/`endBinding`) were correctly set by the server's `resolveArrowBindings()`
- However, bindings were **lost** after `convertToExcalidrawElements()` on the frontend

### Test 2: Obstacle avoidance
- Created source, target, and obstacle rectangle with elbowed arrow through obstacle
- **Result:** Arrow rendered as straight line cutting directly through the obstacle
- No routing around the obstacle occurred

### Test 3: Nested containers
- Arrow from inner container to external element
- **Result:** Straight line, no routing around container boundary

### Test 4: Direct `updateScene()` with proper bindings
- Bypassed the server entirely, created elements directly in the Excalidraw frontend via puppeteer
- Set `elbowed: true`, `fixedSegments: []`, proper `startBinding`/`endBinding` with `fixedPoint: null`
- **Result:** Still straight lines. Bindings were preserved (unlike the API path), but no routing.

### Test 5: Single element creation
- Created arrow via `POST /api/elements` (non-batch) with `elbowed: true` and `start`/`end` bindings
- **Result:** Server did NOT resolve bindings for single-element creation (only batch has `resolveArrowBindings`). Arrow stored with raw `start`/`end` refs. `elbowed: true` preserved but no routing.

## Root Cause Analysis

Examined the minified Excalidraw v0.18.0 source code (`dist/prod/index.js`). Found that elbowed arrow routing is triggered by:

```javascript
// Internal Excalidraw code (deobfuscated):
// After creating an elbowed arrow interactively:
arrow.elbowed = true;
bindArrowToElement(arrow, sourceElement, "start", elementsMap);
bindArrowToElement(arrow, targetElement, "end", elementsMap);
LinearElementEditor.movePoints(arrow, [{index: 1, point: arrow.points[1]}]);
```

The `movePoints()` call is the **routing trigger**. It computes the actual elbowed path (multiple waypoints forming right-angle segments) and updates the `points` array. This function is part of `LinearElementEditor`, which is Excalidraw's interactive element editing system.

**Key finding:** `movePoints()` is called during:
1. Interactive arrow creation (mouse drag in UI)
2. Arrow type change (via the toolbar dropdown)
3. Element dragging (when bound elements move)

It is **NOT called** when:
- Elements are set via `updateScene()`
- Elements are loaded from saved data (`.excalidraw` files)
- Elements are created via `convertToExcalidrawElements()`

This means elbowed routing is fundamentally a **client-side interactive feature**, not a data format feature. Setting `elbowed: true` on an arrow with 2 points results in a straight line that is "marked as elbowed" but has no actual elbowed routing applied.

## Binding Loss Issue

Additionally, there is a binding resolution problem in the API pipeline:

1. **Server-side:** `resolveArrowBindings()` in `server.ts` correctly computes `startBinding`/`endBinding` for batch-created arrows. However:
   - It only runs for `POST /api/elements/batch`, not for single `POST /api/elements`
   - It deletes `start`/`end` shorthand refs after resolution
   - It only computes 2-point straight paths (edge-to-edge)

2. **Frontend-side:** When the frontend receives elements via WebSocket, it passes them through `convertToExcalidrawElements()`. This function appears to strip or not properly preserve `startBinding`/`endBinding` in some code paths, resulting in `null` bindings on the rendered elements.

## Screenshots

- `tests/screenshot_elbowed_test.png` -- API-created elbowed arrows (straight lines through obstacle)
- `tests/screenshot_elbowed_v2.png` -- Direct updateScene elbowed arrows (still straight lines)

## Recommendation: Keep SmartArrowRouter

**Do NOT replace SmartArrowRouter with `elbowed: true`.** The reasons:

1. **Elbowed routing does not work via API.** The routing algorithm is embedded in Excalidraw's interactive editing system and cannot be triggered programmatically without significant hacking.

2. **No obstacle avoidance.** Even if elbowed routing were triggered, Excalidraw's implementation routes around bound elements but does NOT have general obstacle avoidance. The `SmartArrowRouter` already handles this.

3. **Loss of control.** Elbowed routing would give unpredictable results for complex diagrams. SmartArrowRouter allows explicit waypoints and exit sides.

### Possible hybrid approach (future)
If a future version of Excalidraw exposes the routing algorithm as a public API (e.g., `computeElbowedPath(arrow, elements)`), it could be used as a fallback for simple arrows while keeping SmartArrowRouter for complex routing with explicit waypoints. But as of v0.18.0, this is not available.

### What `elbowed: true` IS useful for
- If the user manually edits arrows in the Excalidraw UI after they are created, having `elbowed: true` set means the arrow will use elbowed routing when dragged. This could be useful for "draft" diagrams that will be manually refined.
- It does NOT help for fully automated diagram generation.
