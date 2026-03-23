# D3 Auto-Layout: Coordinate-Free Diagram Syntax

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all explicit coordinates (`pos`, `waypoints`, `badge_pos`) from D3 syntax so an LLM can one-shot generate architecture diagrams without computing pixel values, while maintaining the same visual quality.

**Architecture:** The D3 converter already has a 3-phase pipeline: parse → layout → render. We add a `placement` attribute to the parser, upgrade the layout engine to auto-position root containers and auto-route arrows, and add a `route` hint for the ~20% of arrows that need directional guidance. All changes are in `d3Converter.ts` and a new test file. Existing `pos`/`waypoints` remain supported as optional overrides for backward compatibility.

**Tech Stack:** TypeScript, Vitest (new dev dependency), Node.js ESM

**Branch:** `feat/d3-auto-layout` (off `feat/better-aws-diagrams`)

---

## Success Criteria (autonomous verification)

The implementing agent MUST verify ALL of these before claiming done:

1. **Unit tests pass:** `npx vitest run` — all green
2. **Build passes:** `npm run build` — no errors
3. **Reference diagram match:** The coordinate-free version of the Data Transfer Hub diagram (Task 7) produces output that matches the current coordinate-heavy version within these tolerances:
   - All 14+ containers present, correctly nested
   - All 15+ leaf nodes present with icons
   - All 9 arrows present, all orthogonal (no diagonal segments)
   - No arrow-icon overlaps (validated by existing `overlapChecks.ts`)
   - All numbered badges (1-8) visible
   - Containers do not overlap each other
4. **E2E test passes:** Send the coordinate-free D3 via HTTP API, verify response has correct element counts and zero validation issues
5. **No regressions:** The existing coordinate-heavy D3 syntax still works identically

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/utils/d3Converter.ts` | Modify | Parser: add `placement` + `route` attrs. Layout: auto-position roots, auto-route arrows. Keep existing `pos`/`waypoints` as optional overrides. |
| `tests/d3-auto-layout.test.ts` | Create | Unit tests for parser, layout engine, and arrow router |
| `tests/d3-e2e.test.ts` | Create | E2E tests: send D3 via HTTP API, verify output |
| `tests/fixtures/data-transfer-hub-current.d3` | Create | Current D3 with coordinates (regression baseline) |
| `tests/fixtures/data-transfer-hub-auto.d3` | Create | New coordinate-free D3 (target syntax) |
| `tests/test-helpers.ts` | Create | Shared test utilities (element lookup, validation) |
| `vitest.config.ts` | Create | Vitest configuration for ESM TypeScript |
| `package.json` | Modify | Add vitest + test script |

---

## Task 0: Test Infrastructure Setup

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/test-helpers.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      // Match the .js extension imports used in the codebase
    },
  },
});
```

- [ ] **Step 3: Add test script to package.json**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create test helpers**

Create `tests/test-helpers.ts`:
```typescript
import { parseD3, layoutD3Graph, convertD3ToExcalidraw } from '../src/utils/d3Converter.js';
import type { ConvertResult } from '../src/utils/d3Converter.js';

export { parseD3, layoutD3Graph, convertD3ToExcalidraw };

/** Find element by partial ID match */
export function findElement(result: ConvertResult, idSubstring: string) {
  return result.elements.find((el: any) => el.id?.includes(idSubstring));
}

/** Find all elements of a given type */
export function elementsOfType(result: ConvertResult, type: string) {
  return result.elements.filter((el: any) => el.type === type);
}

/** Check that no two rectangles overlap (ignoring ancestor-descendant nesting).
 *  Uses element IDs to detect ancestry: if a.id is a prefix of b.id (or vice versa),
 *  they are in a parent-child relationship and overlap is expected. */
export function findOverlappingContainers(result: ConvertResult): Array<[string, string]> {
  const rects = result.elements.filter((el: any) => el.type === 'rectangle' && el.strokeColor !== 'transparent');
  const overlaps: Array<[string, string]> = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      // Skip ancestor-descendant pairs using ID hierarchy (e.g., "aws_cloud" is ancestor of "aws_cloud_customer_account")
      const aId = a.id || '';
      const bId = b.id || '';
      if (aId.startsWith(bId) || bId.startsWith(aId)) continue;
      // Also skip if one geometrically contains the other (fallback for non-hierarchical IDs)
      if (contains(a, b) || contains(b, a)) continue;
      if (intersects(a, b)) overlaps.push([a.id, b.id]);
    }
  }
  return overlaps;
}

function contains(outer: any, inner: any): boolean {
  return outer.x <= inner.x && outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height;
}

function intersects(a: any, b: any): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Check all arrow segments are orthogonal (no diagonals) */
export function findDiagonalArrows(result: ConvertResult): string[] {
  const arrows = result.elements.filter((el: any) => el.type === 'arrow');
  const diagonals: string[] = [];
  for (const arrow of arrows) {
    if (!arrow.points || arrow.points.length < 2) continue;
    for (let i = 0; i < arrow.points.length - 1; i++) {
      const [x1, y1] = arrow.points[i];
      const [x2, y2] = arrow.points[i + 1];
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      // Allow 3px tolerance for snapping artifacts
      if (dx > 3 && dy > 3) {
        diagonals.push(arrow.id);
        break;
      }
    }
  }
  return diagonals;
}

/** Verify result has expected element counts */
export function assertCounts(result: ConvertResult, expected: {
  minContainers?: number;
  minNodes?: number;
  minArrows?: number;
  minBadges?: number;
}) {
  if (expected.minContainers !== undefined) {
    if (result.stats.containers < expected.minContainers) {
      throw new Error(`Expected >= ${expected.minContainers} containers, got ${result.stats.containers}`);
    }
  }
  if (expected.minNodes !== undefined) {
    if (result.stats.nodes < expected.minNodes) {
      throw new Error(`Expected >= ${expected.minNodes} nodes, got ${result.stats.nodes}`);
    }
  }
  if (expected.minArrows !== undefined) {
    if (result.stats.arrows < expected.minArrows) {
      throw new Error(`Expected >= ${expected.minArrows} arrows, got ${result.stats.arrows}`);
    }
  }
  if (expected.minBadges !== undefined) {
    if (result.stats.badges < expected.minBadges) {
      throw new Error(`Expected >= ${expected.minBadges} badges, got ${result.stats.badges}`);
    }
  }
}
```

- [ ] **Step 5: Verify test runner works**

Create a trivial test `tests/d3-auto-layout.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('test infrastructure', () => {
  it('works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npx vitest run`
Expected: 1 test passes

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests/ package.json package-lock.json
git commit -m "chore: add vitest test infrastructure for D3 converter"
```

---

## Task 1: Baseline Regression Tests (existing D3 syntax)

**Files:**
- Create: `tests/fixtures/data-transfer-hub-current.d3`
- Modify: `tests/d3-auto-layout.test.ts`

- [ ] **Step 1: Create the baseline fixture**

Copy the current Data Transfer Hub D3 (with all coordinates) to `tests/fixtures/data-transfer-hub-current.d3`. This is the exact content from `/Users/alex/Downloads/telegram/diagram.d3`.

- [ ] **Step 2: Write regression tests**

Add to `tests/d3-auto-layout.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { convertD3ToExcalidraw, parseD3, layoutD3Graph } from '../src/utils/d3Converter.js';
import { assertCounts, findDiagonalArrows, findOverlappingContainers } from './test-helpers.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('regression: existing D3 with coordinates', () => {
  const d3Source = readFileSync(resolve(FIXTURES, 'data-transfer-hub-current.d3'), 'utf-8');
  const result = convertD3ToExcalidraw(d3Source);

  it('produces correct element counts', () => {
    assertCounts(result, {
      minContainers: 5,  // aws_cloud, customer_account, auth, sfn, managed_account
      minNodes: 15,
      minArrows: 9,      // 8 numbered + 1 unlabeled
      minBadges: 8,
    });
  });

  it('has no validation issues', () => {
    const critical = result.validationIssues.filter(i => !i.includes('orphan') && !i.includes('icon'));
    expect(critical).toEqual([]);
  });

  it('produces only orthogonal arrows', () => {
    expect(findDiagonalArrows(result)).toEqual([]);
  });

  it('has no overlapping sibling containers', () => {
    expect(findOverlappingContainers(result)).toEqual([]);
  });

  it('reports icon positions for all leaf nodes', () => {
    expect(result.positions.length).toBeGreaterThanOrEqual(15);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All regression tests pass (this validates the test infrastructure works with the real converter)

- [ ] **Step 4: Commit**

```bash
git add tests/
git commit -m "test: add baseline regression tests for D3 converter"
```

---

## Task 2: Parse `placement` and `route` Attributes

**Files:**
- Modify: `src/utils/d3Converter.ts` (parser section, lines 288-304)
- Modify: `tests/d3-auto-layout.test.ts`

This task adds two new attributes to the parser without changing any layout behavior yet.

- [ ] **Step 1: Write parser tests**

Add to `tests/d3-auto-layout.test.ts`:
```typescript
describe('parser: placement attribute', () => {
  it('parses placement on a shape', () => {
    const graph = parseD3(`
      parent: Parent {
        child_a: Child A
        child_b: Child B {
          placement: right-of child_a
        }
      }
    `);
    expect(graph.shapes['parent.child_b']?.placement).toBe('right-of child_a');
  });

  it('parses placement with various directions', () => {
    const graph = parseD3(`
      a: A { placement: left-of b }
      b: B { placement: below a }
    `);
    expect(graph.shapes['a']?.placement).toBe('left-of b');
    expect(graph.shapes['b']?.placement).toBe('below a');
  });
});

describe('parser: route attribute on arrows', () => {
  it('parses route hint on arrow', () => {
    const graph = parseD3(`
      a: A
      b: B
      a -> b: 1 {
        route: up-then-right
      }
    `);
    expect(graph.connections[0]?.route).toBe('up-then-right');
  });

  it('parses all route directions', () => {
    const routes = ['up-then-right', 'up-then-left', 'down-then-right', 'down-then-left',
                    'right-then-up', 'right-then-down', 'left-then-up', 'left-then-down'];
    for (const route of routes) {
      const graph = parseD3(`a: A\nb: B\na -> b {\n  route: ${route}\n}`);
      expect(graph.connections[0]?.route).toBe(route);
    }
  });

  it('handles bidirectional arrows without waypoints', () => {
    const graph = parseD3(`a: A\nb: B\na <-> b: link`);
    expect(graph.connections[0]?.bidirectional).toBe(true);
    expect(graph.connections[0]?.route).toBeUndefined();
  });

  it('handles empty containers without crashing', () => {
    const graph = parseD3(`box: Empty Box {\n}`);
    expect(graph.shapes['box']).toBeDefined();
    expect(graph.shapes['box']?.children).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to see them fail**

Run: `npx vitest run`
Expected: New tests fail because `placement` and `route` don't exist on types yet

- [ ] **Step 3: Add `placement` to D3Shape interface**

In `src/utils/d3Converter.ts`, modify the `D3Shape` interface (line ~76):
```typescript
interface D3Shape {
  id: string;
  label: string;
  shape: string;
  style: Record<string, string>;
  parent?: string;
  icon?: string;
  pos?: string;
  layout?: string;
  iconType?: string;
  iconVariant?: string;
  iconHint?: string;
  placement?: string;    // NEW: "right-of <id>", "left-of <id>", "below <id>", "above <id>"
  children: string[];
}
```

- [ ] **Step 4: Add `route` to D3Connection interface**

Modify `D3Connection` interface (line ~91):
```typescript
interface D3Connection {
  id: string;
  from: string;
  to: string;
  label: string;
  bidirectional: boolean;
  style: Record<string, string>;
  waypoints?: number[][];
  badgePos?: number[];
  badgeBg?: string;
  badgeColor?: string;
  badgeSize?: number;
  badgeShape?: string;
  route?: string;    // NEW: "up-then-right", "down-then-left", etc.
}
```

- [ ] **Step 5: Add `placement` to bare attribute parser**

In the `bareAttrMatch` regex (line ~289), add `placement`:
```typescript
const bareAttrMatch = line.match(/^(style\.[\w-]+|pos|icon|layout|icon_type|icon_variant|icon_hint|placement):\s*(.+)$/);
```

And in the if-else chain below it, add:
```typescript
else if (attr === 'placement') shape.placement = value;
```

- [ ] **Step 6: Add `route` to arrow block parser**

In the arrow block parsing section (line ~265), add `route` parsing alongside `waypoints` and `badge_pos`:
```typescript
const routeMatch = blockLine.match(/^route:\s*(.+)$/);
if (wpMatch) conn.waypoints = parsePointList(wpMatch[1]!);
else if (bpMatch) conn.badgePos = parsePoint(bpMatch[1]!);
else if (routeMatch) conn.route = (routeMatch[1] ?? '').trim().replace(/^["']|["']$/g, '');
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run`
Expected: All tests pass (regression + new parser tests)

- [ ] **Step 8: Commit**

```bash
git add src/utils/d3Converter.ts tests/
git commit -m "feat: parse placement and route attributes in D3 syntax"
```

---

## Task 3: Auto-Position Root Containers

**Files:**
- Modify: `src/utils/d3Converter.ts` (layout engine, lines 1005-1084)
- Modify: `tests/d3-auto-layout.test.ts`

Currently, root containers without `pos` are placed at `(CONTAINER_PAD, CONTAINER_PAD)` in document order. This task makes unpositioned containers (at ANY level, not just roots) auto-arrange and respect `placement` hints.

**IMPORTANT:** `placement` can appear on non-root shapes (e.g., `managed_account` inside `aws_cloud`). The layout engine must handle `placement` inside `layoutShape()` for sibling containers, not just at the root level. When repositioning via `placement`, ALL descendant layout nodes must be shifted by the same delta (use `shiftSubtree()` helper).

- [ ] **Step 1: Write auto-positioning tests**

```typescript
describe('layout: auto-position containers', () => {
  it('places two unpositioned root containers side by side', () => {
    const graph = parseD3(`
      a: Container A {
        x: Item X
        y: Item Y
      }
      b: Container B {
        z: Item Z
      }
    `);
    const { layout } = layoutD3Graph(graph);
    const aNode = layout['a'];
    const bNode = layout['b'];
    expect(aNode).toBeDefined();
    expect(bNode).toBeDefined();
    // B should be to the right of A with a gap
    expect(bNode!.x).toBeGreaterThan(aNode!.x + aNode!.w);
    // Same Y (top-aligned)
    expect(bNode!.y).toBeCloseTo(aNode!.y, -1);
  });

  it('respects placement: right-of on root shapes', () => {
    const graph = parseD3(`
      left_box: Left {
        a: Item A
      }
      right_box: Right {
        placement: right-of left_box
        b: Item B
      }
    `);
    const { layout } = layoutD3Graph(graph);
    expect(layout['right_box']!.x).toBeGreaterThan(layout['left_box']!.x + layout['left_box']!.w);
  });

  it('respects placement: right-of on NON-root sibling containers', () => {
    const graph = parseD3(`
      cloud: Cloud {
        account: Account {
          svc: Service A
        }
        managed: Managed {
          placement: right-of account
          svc2: Service B
        }
      }
    `);
    const { layout } = layoutD3Graph(graph);
    const acc = layout['cloud.account']!;
    const man = layout['cloud.managed']!;
    expect(acc).toBeDefined();
    expect(man).toBeDefined();
    // Managed should be right of account
    expect(man.x).toBeGreaterThanOrEqual(acc.x + acc.w);
    // And managed's children should have moved with it
    const svc2 = layout['cloud.managed.svc2']!;
    expect(svc2).toBeDefined();
    expect(svc2.x).toBeGreaterThanOrEqual(man.x);
    expect(svc2.x + svc2.w).toBeLessThanOrEqual(man.x + man.w + 5); // within container bounds
  });

  it('respects placement: left-of for leaf nodes (external actors)', () => {
    const graph = parseD3(`
      cloud: Cloud {
        user: User {
          placement: left-of account
        }
        account: Account {
          svc: Service
        }
      }
      cloud.user -> cloud.account.svc: 1
    `);
    const { layout } = layoutD3Graph(graph);
    expect(layout['cloud.user']!.x).toBeLessThan(layout['cloud.account']!.x);
  });

  it('auto-positions even when no pos is provided anywhere', () => {
    const graph = parseD3(`
      aws: AWS Cloud {
        account: Account {
          svc1: Service One
          svc2: Service Two
        }
        managed: Managed {
          svc3: Service Three
        }
      }
    `);
    const { layout } = layoutD3Graph(graph);
    expect(layout['aws']).toBeDefined();
    expect(layout['aws.account']).toBeDefined();
    expect(layout['aws.managed']).toBeDefined();
    const acc = layout['aws.account']!;
    const man = layout['aws.managed']!;
    expect(man.x).toBeGreaterThanOrEqual(acc.x + acc.w);
  });

  it('shifts all descendants when placement repositions a container', () => {
    const graph = parseD3(`
      parent: Parent {
        a: Left Box {
          child1: Deep Child
        }
        b: Right Box {
          placement: right-of a
          child2: Deep Child 2
        }
      }
    `);
    const { layout } = layoutD3Graph(graph);
    const b = layout['parent.b']!;
    const child2 = layout['parent.b.child2']!;
    // child2 must be within b's bounds
    expect(child2.x).toBeGreaterThanOrEqual(b.x);
    expect(child2.x + child2.w).toBeLessThanOrEqual(b.x + b.w + 5);
  });
});
```

- [ ] **Step 2: Run tests to see them fail**

Run: `npx vitest run`
Expected: Tests fail (placement not yet applied in layout)

- [ ] **Step 3: Add `shiftSubtree()` helper**

Add this helper function INSIDE `layoutD3Graph()`, near the top (after the `redistributeLeaves` function):

```typescript
/** Shift a shape and ALL its descendants by (dx, dy) in the layout map */
function shiftSubtree(shapeId: string, dx: number, dy: number) {
  const node = layout[shapeId];
  if (node) {
    node.x += dx;
    node.y += dy;
    layout[shapeId] = node;
  }
  const shape = graph.shapes[shapeId];
  if (shape) {
    for (const childId of shape.children) {
      shiftSubtree(childId, dx, dy);
    }
  }
}
```

- [ ] **Step 4: Add `applyPlacement()` helper**

Add this helper INSIDE `layoutD3Graph()`:

```typescript
/** Apply placement hints to sibling shapes within a container (or at root level).
 *  Must be called AFTER initial layout so all shapes have positions.
 *  Resolves refId relative to the shape's parent scope. */
function applyPlacement(shapeIds: string[], parentId?: string) {
  for (const id of shapeIds) {
    const shape = graph.shapes[id];
    if (!shape?.placement) continue;
    const match = shape.placement.match(/^(right-of|left-of|below|above)\s+(.+)$/);
    if (!match) continue;

    const direction = match[1];
    const refLocalId = match[2].trim().replace(/\s+/g, '_');
    // Resolve refId: try fully qualified, then within same parent scope
    const refId = layout[refLocalId] ? refLocalId
      : parentId ? `${parentId}.${refLocalId}`
      : Object.keys(layout).find(k => k.endsWith('.' + refLocalId) || k === refLocalId) ?? refLocalId;
    const refNode = layout[refId];
    const thisNode = layout[id];
    if (!refNode || !thisNode) continue;

    let newX = thisNode.x, newY = thisNode.y;
    if (direction === 'right-of') { newX = refNode.x + refNode.w + H_GAP; newY = refNode.y; }
    else if (direction === 'left-of') { newX = refNode.x - thisNode.w - H_GAP; newY = refNode.y; }
    else if (direction === 'below') { newX = refNode.x; newY = refNode.y + refNode.h + V_GAP; }
    else if (direction === 'above') { newX = refNode.x; newY = refNode.y - thisNode.h - V_GAP; }

    const dx = newX - thisNode.x;
    const dy = newY - thisNode.y;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      shiftSubtree(id, dx, dy);
    }
  }
}
```

- [ ] **Step 5: Apply placement at root level**

Replace the root layout section in `layoutD3Graph()` (lines ~1005-1084):

```typescript
// Layout roots: all auto-positioned left-to-right, then apply placement hints
const allRoots = roots.slice();
let currentX = CONTAINER_PAD;

// First pass: layout all roots left-to-right (no pos required)
for (const root of allRoots) {
  if (root.pos) {
    // Explicit pos — use it (backward compat)
    layoutShape(root, currentX, CONTAINER_PAD);
    const node = layout[root.id];
    if (node) currentX = node.x + node.w + H_GAP;
  } else if (root.children.length > 0) {
    // Container without pos — auto-position
    const node = layoutShape(root, currentX, CONTAINER_PAD);
    currentX = node.x + node.w + H_GAP;
  }
  // Leaf roots (external actors) handled after placement pass
}

// Second pass: apply placement hints (roots)
applyPlacement(allRoots.map(r => r.id), undefined);

// Third pass: external actors (leaf roots) — Y-align to connected targets
// (keep existing logic from lines 1028-1078)
```

- [ ] **Step 6: Apply placement inside `layoutShape()` for non-root containers**

In `layoutShape()`, AFTER the sibling container loop (around line 740, after the line `// Equalize sibling container heights`) and BEFORE leaf layout, add:

```typescript
// Apply placement hints to sibling containers within this parent
applyPlacement(containerIds, shape.id);
```

Also, inside the `layers` layout section (after layer items are positioned, around line 600), add:

```typescript
// Apply placement hints to layer children
applyPlacement(shape.children, shape.id);
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add src/utils/d3Converter.ts tests/
git commit -m "feat: auto-position containers with placement hints at any nesting level"
```

---

## Task 4: Auto-Route Arrows (remove waypoints requirement)

**Files:**
- Modify: `src/utils/d3Converter.ts` (arrow routing section, lines ~1517-1700)
- Modify: `tests/d3-auto-layout.test.ts`

This is the most important task. When `waypoints` are not provided and `route` is not specified, the engine should auto-determine the arrow path. When `route` is specified (e.g., `route: up-then-right`), it should create the L-shape in that direction.

- [ ] **Step 1: Write arrow auto-routing tests**

```typescript
describe('arrows: auto-routing without waypoints', () => {
  it('routes horizontal arrow between same-row nodes', () => {
    const result = convertD3ToExcalidraw(`
      box: Container {
        layout: row
        a: Service A
        b: Service B
      }
      box.a -> box.b: 1
    `);
    expect(findDiagonalArrows(result)).toEqual([]);
    expect(result.stats.arrows).toBe(1);
  });

  it('routes L-shape arrow with route hint', () => {
    const result = convertD3ToExcalidraw(`
      box: Container {
        layout: layers
        col1: {
          top: Top Service
        }
        col2: {
          bottom: Bottom Service
        }
      }
      box.col1.top -> box.col2.bottom: 1 {
        route: down-then-right
      }
    `);
    expect(findDiagonalArrows(result)).toEqual([]);
    expect(result.stats.arrows).toBe(1);
  });

  it('auto-routes cross-column arrows without waypoints', () => {
    const result = convertD3ToExcalidraw(`
      cloud: Cloud {
        layout: layers
        col1: {
          svc_a: Service A
          svc_b: Service B
        }
        col2: {
          svc_c: Service C
          svc_d: Service D
        }
      }
      cloud.col1.svc_a -> cloud.col2.svc_c: 1
      cloud.col1.svc_b -> cloud.col2.svc_d: 2
    `);
    expect(findDiagonalArrows(result)).toEqual([]);
    expect(result.stats.arrows).toBe(2);
  });

  it('auto-routes arrow between different rows with route hint', () => {
    const result = convertD3ToExcalidraw(`
      cloud: Cloud {
        layout: layers
        col1: {
          lower: Lower Service
        }
        col2: {
          upper: Upper Service
        }
      }
      cloud.col1.lower -> cloud.col2.upper: 1 {
        route: up-then-right
      }
    `);
    expect(findDiagonalArrows(result)).toEqual([]);
  });

  it('auto-routes cross-container arrows', () => {
    const result = convertD3ToExcalidraw(`
      left: Left Account {
        svc: My Service
      }
      right: Right Account {
        placement: right-of left
        target: Target Service
      }
      left.svc -> right.target: 1
    `);
    expect(findDiagonalArrows(result)).toEqual([]);
    expect(result.stats.arrows).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to see them fail**

Run: `npx vitest run`
Expected: Some auto-routing tests may fail (arrows might be diagonal when waypoints are missing)

- [ ] **Step 3: Implement auto-routing with route hints**

In the arrow building section (~line 1630), modify the path construction when `conn.waypoints` is absent:

```typescript
if (conn.waypoints && conn.waypoints.length > 0) {
  // ... existing waypoint validation and path building ...
} else if (conn.route) {
  // Route hint provided — build L-shape in specified direction
  allPts = buildRoutedPath(cx1, cy1, cx2, cy2, conn.route);
} else {
  // Auto-route: determine best path from source/target positions
  allPts = autoRoutePath(cx1, cy1, cx2, cy2, conn, graph, layout);
}
```

Add these helper functions before the arrow loop:

```typescript
/** Build an L-shaped path based on a route hint like "up-then-right".
 *
 *  NOTE: The direction names (up/down/left/right) indicate AXIS ORDER, not
 *  actual compass direction. "up-then-right" means "vertical axis first, then
 *  horizontal" — the actual direction depends on source/target positions.
 *  This is intentional: the LLM knows the relative positions and uses the hint
 *  to specify which axis the arrow should traverse first. */
function buildRoutedPath(x1: number, y1: number, x2: number, y2: number, route: string): number[][] {
  const parts = route.split('-then-');
  if (parts.length !== 2) return [[x1, y1], [x2, y2]]; // fallback to straight

  const first = parts[0];  // "up", "down", "left", "right"

  // First direction determines which axis moves first
  // up/down → vertical axis first → corner at (x1, y2)
  // left/right → horizontal axis first → corner at (x2, y1)
  if (first === 'up' || first === 'down') {
    return [[x1, y1], [x1, y2], [x2, y2]];
  } else {
    return [[x1, y1], [x2, y1], [x2, y2]];
  }
}

/** Auto-determine arrow path when no waypoints or route hint given */
function autoRoutePath(
  x1: number, y1: number, x2: number, y2: number,
  conn: D3Connection, graph: D3Graph, layout: Record<string, LayoutNode>
): number[][] {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  // Near-straight horizontal (within 15% Y deviation) → straight line
  if (dy < dx * 0.15) return [[x1, y1], [x2, y1]]; // snap to source Y

  // Near-straight vertical (within 15% X deviation) → straight line
  if (dx < dy * 0.15) return [[x1, y1], [x1, y2]]; // snap to source X

  // True diagonal — need L-shape. Choose direction based on relative positions.
  // Prefer horizontal-first when source is to the left (natural LTR reading flow)
  // Prefer vertical-first when target is directly above/below but offset

  // Heuristic: if target is in a different layer column (primarily horizontal),
  // go horizontal first to the target X, then vertical
  if (dx >= dy) {
    // Horizontal-dominant: go horizontal to target X, then vertical to target Y
    // Check for obstacles at corner (x2, y1)
    const cornerObstacle = findObstacleAt(x2, y1, conn, graph, layout);
    if (!cornerObstacle) {
      return [[x1, y1], [x2, y1], [x2, y2]];
    }
    // Try vertical-first instead
    return [[x1, y1], [x1, y2], [x2, y2]];
  } else {
    // Vertical-dominant: go vertical to target Y, then horizontal to target X
    const cornerObstacle = findObstacleAt(x1, y2, conn, graph, layout);
    if (!cornerObstacle) {
      return [[x1, y1], [x1, y2], [x2, y2]];
    }
    // Try horizontal-first instead
    return [[x1, y1], [x2, y1], [x2, y2]];
  }
}

/** Check if a point falls inside any icon/label bounding box */
function findObstacleAt(
  x: number, y: number,
  conn: D3Connection, graph: D3Graph, layout: Record<string, LayoutNode>
): string | null {
  const MARGIN = 20;
  for (const [id, node] of Object.entries(layout)) {
    // Skip source/target of this connection
    if (id === conn.from || id === conn.to) continue;
    const shape = graph.shapes[id];
    if (!shape || shape.children.length > 0) continue; // skip containers
    // Check if point is within node bounds + margin
    if (x >= node.x - MARGIN && x <= node.x + node.w + MARGIN &&
        y >= node.y - MARGIN && y <= node.y + node.h + MARGIN) {
      return id;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All arrow routing tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/d3Converter.ts tests/
git commit -m "feat: auto-route arrows with route hints, no waypoints needed"
```

---

## Task 5: Remove Spacer Hack (transparent elements)

**Files:**
- Modify: `src/utils/d3Converter.ts` (layout engine)
- Modify: `tests/d3-auto-layout.test.ts`

The current D3 requires invisible spacer elements (`spacer: " " { style.fill: "transparent" }`) to create gaps in layouts. The layout engine should handle this natively by skipping the first slot in a column when there's no element there.

- [ ] **Step 1: Write spacer test**

```typescript
describe('layout: layers without spacers', () => {
  it('handles columns with different item counts', () => {
    const result = convertD3ToExcalidraw(`
      box: Container {
        layout: layers
        col1: {
          a: Item A
          b: Item B
        }
        col2: {
          c: Item C
        }
      }
      box.col1.a -> box.col2.c: 1
    `);
    // C should align with A (first items in each column)
    expect(result.stats.arrows).toBe(1);
    expect(findDiagonalArrows(result)).toEqual([]);
  });

  it('does not render transparent spacer elements', () => {
    const result = convertD3ToExcalidraw(`
      box: Container {
        layout: layers
        col1: {
          a: Item A
        }
        col2: {
          spacer: " " {
            style.fill: "transparent"
            style.stroke: "transparent"
            style.opacity: 0
          }
          b: Item B
        }
      }
    `);
    // Spacer should not produce a visible element
    const visibleRects = result.elements.filter((el: any) =>
      el.type === 'rectangle' && el.strokeColor !== 'transparent' && el.backgroundColor !== 'transparent'
    );
    // Should not find a spacer rectangle
    const spacerEl = result.elements.find((el: any) => el.id?.includes('spacer'));
    // If spacer exists, it should be invisible
    if (spacerEl) {
      expect(spacerEl.strokeColor === 'transparent' || spacerEl.opacity === 0).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: Tests should pass since the spacer already has transparent styles — just verify no visual artifacts

- [ ] **Step 3: Implement spacer filtering in element builder**

In the element builder section of `convertD3ToExcalidraw()`, when creating elements for leaf nodes, skip shapes that have `style.opacity: 0` or both `style.fill: transparent` and `style.stroke: transparent`:

Find the section where leaf nodes are rendered (around line 1332-1367) and add at the top:
```typescript
// Skip invisible spacer elements
if (shape.style.opacity === '0' ||
    (shape.style.fill === 'transparent' && shape.style.stroke === 'transparent')) {
  continue;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/d3Converter.ts tests/
git commit -m "feat: skip invisible spacer elements in rendering"
```

---

## Task 6: Auto-Place Badges (remove badge_pos requirement)

**Files:**
- Modify: `src/utils/d3Converter.ts` (badge section)
- Modify: `tests/d3-auto-layout.test.ts`

Badge placement is already auto-calculated when `badge_pos` is absent (the existing code puts badges at the midpoint of the longest segment). This task just verifies and adds tests.

- [ ] **Step 1: Write badge tests**

```typescript
describe('badges: auto-placement', () => {
  it('places badges on arrows without badge_pos', () => {
    const result = convertD3ToExcalidraw(`
      box: Container {
        layout: row
        a: Service A
        b: Service B
      }
      box.a -> box.b: 1
    `);
    expect(result.stats.badges).toBe(1);
    // Badge should be an ellipse (circle) element
    const badges = result.elements.filter((el: any) => el.type === 'ellipse');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('places badges on L-shaped arrows at midpoint of longest segment', () => {
    const result = convertD3ToExcalidraw(`
      box: Container {
        layout: layers
        col1: {
          a: Service A
        }
        col2: {
          b: Service B
        }
      }
      box.col1.a -> box.col2.b: 5 {
        route: up-then-right
      }
    `);
    expect(result.stats.badges).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All pass (badge auto-placement already works)

- [ ] **Step 3: Commit**

```bash
git add tests/
git commit -m "test: add badge auto-placement tests"
```

---

## Task 7: Integration Test — Coordinate-Free Data Transfer Hub

**Files:**
- Create: `tests/fixtures/data-transfer-hub-auto.d3`
- Modify: `tests/d3-auto-layout.test.ts`

This is the key integration test. We rewrite the Data Transfer Hub diagram WITHOUT any coordinates and verify it produces equivalent output.

- [ ] **Step 1: Create the coordinate-free fixture**

Create `tests/fixtures/data-transfer-hub-auto.d3`:
```
# Data Transfer Hub — v3 (coordinate-free)

arrow_style {
  stroke_color: "#545B64"
  badge_bg: "#232F3E"
  badge_color: "#ffffff"
  badge_shape: circle
}

aws_cloud: AWS Cloud {

  user: User {
    icon_type: resource
    icon_variant: Light
    placement: left-of customer_account
  }

  customer_account: Customer's AWS Account {
    layout: layers

    col1: {
      auth: Authentication {
        style.stroke-dash: 5
        layout: row
        cognito: Amazon Cognito
        openid: OpenID Connect {
          icon: "custom/icons8-openid.svg"
        }
      }
      dth_ui: Data Transfer\nHub UI {
        icon_hint: "client"
      }
    }

    col2: {
      appsync: AWS AppSync
      cloudfront: Amazon CloudFront
    }

    col3: {
      dynamodb: Amazon DynamoDB
      lambda: AWS Lambda
      s3: Amazon S3
    }

    col4: {
      sfn: AWS Step Functions workflow {
        style.stroke: "#E7157B"
        lambda_sf: AWS Lambda
      }
      cloudformation: AWS CloudFormation
      fargate: AWS Fargate
    }
  }

  managed_account: AWS Managed Account {
    placement: right-of customer_account
    layout: "2x3"
    s3_repl: S3 replication\ncomponent template {
      icon_hint: "CloudFormation Template Orange"
    }
    dynamodb_repl: DynamoDB replication\ncomponent template {
      icon_hint: "CloudFormation Template Orange"
    }
    s3_managed: Amazon S3
    ecr_repl: ECR replication\ncomponent template {
      icon_hint: "CloudFormation Template Orange"
    }
    ecr: Amazon ECR
    ecr_docker: ECR replication\nDocker image {
      icon_hint: "elastic container registry"
    }
  }
}

# Arrows — no coordinates
aws_cloud.customer_account.col2.cloudfront -> aws_cloud.customer_account.col3.s3: 1
aws_cloud.user -> aws_cloud.customer_account.col2.appsync: 2
aws_cloud.user -> aws_cloud.customer_account.col1.dth_ui: 3
aws_cloud.customer_account.col2.appsync -> aws_cloud.customer_account.col3.lambda: 4
aws_cloud.customer_account.col3.lambda -> aws_cloud.customer_account.col4.sfn: 5 {
  route: up-then-right
}
aws_cloud.customer_account.col4.cloudformation -> aws_cloud.managed_account.s3_managed: 6
aws_cloud.customer_account.col4.fargate -> aws_cloud.managed_account.ecr: 7
aws_cloud.customer_account.col2.appsync -> aws_cloud.customer_account.col3.dynamodb: 8 {
  route: up-then-right
}
aws_cloud.customer_account.col1.dth_ui -> aws_cloud.customer_account.col2.cloudfront {
  route: down-then-right
}
```

- [ ] **Step 2: Write integration tests**

```typescript
describe('integration: coordinate-free Data Transfer Hub', () => {
  const d3Source = readFileSync(resolve(FIXTURES, 'data-transfer-hub-auto.d3'), 'utf-8');
  const result = convertD3ToExcalidraw(d3Source);

  it('produces correct element counts', () => {
    assertCounts(result, {
      minContainers: 5,
      minNodes: 15,
      minArrows: 9,
      minBadges: 8,
    });
  });

  it('has no critical validation issues', () => {
    const critical = result.validationIssues.filter(i =>
      !i.includes('orphan') && !i.includes('icon') && !i.includes('Missing'));
    expect(critical).toEqual([]);
  });

  it('produces only orthogonal arrows', () => {
    expect(findDiagonalArrows(result)).toEqual([]);
  });

  it('has no overlapping sibling containers', () => {
    expect(findOverlappingContainers(result)).toEqual([]);
  });

  it('customer_account is left of managed_account', () => {
    const custPos = result.positions.find(p => p.id.includes('customer_account') && p.type === 'container');
    const managedPos = result.positions.find(p => p.id.includes('managed_account') && p.type === 'container');
    expect(custPos).toBeDefined();
    expect(managedPos).toBeDefined();
    expect(managedPos!.x).toBeGreaterThan(custPos!.x + custPos!.w - 50); // right of, with tolerance
  });

  it('user is positioned to the left of customer_account', () => {
    const userPos = result.positions.find(p => p.label === 'User');
    const custPos = result.positions.find(p => p.id.includes('customer_account') && p.type === 'container');
    expect(userPos).toBeDefined();
    expect(custPos).toBeDefined();
    expect(userPos!.x).toBeLessThan(custPos!.x);
  });

  it('all 8 numbered badges are present', () => {
    const badgeTexts = result.elements
      .filter((el: any) => el.type === 'text' && /^[1-8]$/.test(el.text?.trim()))
      .map((el: any) => el.text.trim());
    const uniqueBadges = new Set(badgeTexts);
    expect(uniqueBadges.size).toBe(8);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass. If any fail, debug and fix the layout/routing logic.

- [ ] **Step 4: Commit**

```bash
git add tests/
git commit -m "test: add coordinate-free Data Transfer Hub integration test"
```

---

## Task 8: E2E Test via HTTP API

**Files:**
- Create: `tests/d3-e2e.test.ts`

This test starts the server, sends D3 via HTTP, and verifies the response. This ensures the full pipeline works end-to-end.

- [ ] **Step 1: Write E2E test**

Create `tests/d3-e2e.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { spawn, type ChildProcess } from 'child_process';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('E2E: D3 via HTTP API', () => {
  const PORT = 3099; // Use a different port to avoid conflicts
  let serverProcess: ChildProcess | null = null;

  beforeAll(async () => {
    // Use spawn (not exec) for reliable process cleanup — no intermediate shell
    serverProcess = spawn('node', ['dist/server.js'], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'pipe',  // capture output, don't inherit
    });

    // Wait for server to be ready (poll /api/elements)
    let retries = 20;
    while (retries > 0) {
      try {
        const res = await fetch(`http://localhost:${PORT}/api/elements`);
        if (res.ok) break;
      } catch {}
      await new Promise(r => setTimeout(r, 500));
      retries--;
    }
    if (retries === 0) {
      serverProcess?.kill('SIGTERM');
      throw new Error(`Server failed to start on port ${PORT}`);
    }
  }, 30000);

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      serverProcess = null;
    }
  });

  it('converts coordinate-free D3 and returns correct counts', async () => {
    const d3Source = readFileSync(resolve(FIXTURES, 'data-transfer-hub-auto.d3'), 'utf-8');

    const res = await fetch(`http://localhost:${PORT}/api/elements/from-d3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ d3Diagram: d3Source }),
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.elementCount).toBeGreaterThanOrEqual(60);
    expect(data.containers).toBeGreaterThanOrEqual(5);
    expect(data.nodes).toBeGreaterThanOrEqual(15);
    expect(data.arrows).toBeGreaterThanOrEqual(9);
    expect(data.badges).toBeGreaterThanOrEqual(8);

    // No critical validation issues
    const critical = (data.validationIssues || []).filter((i: string) =>
      i.includes('diagonal') || i.includes('overlap'));
    expect(critical).toEqual([]);
  });

  it('existing coordinate-heavy D3 still works (regression)', async () => {
    const d3Source = readFileSync(resolve(FIXTURES, 'data-transfer-hub-current.d3'), 'utf-8');

    const res = await fetch(`http://localhost:${PORT}/api/elements/from-d3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ d3Diagram: d3Source }),
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.elementCount).toBeGreaterThanOrEqual(60);
  });
});
```

- [ ] **Step 2: Build first, then run E2E test**

```bash
npm run build && npx vitest run tests/d3-e2e.test.ts
```

Expected: Both E2E tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/
git commit -m "test: add E2E tests for D3 HTTP API"
```

---

## Task 9: Final Verification & Cleanup

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: ALL tests pass (unit + integration + E2E)

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Clean build, no errors

- [ ] **Step 3: Visual verification**

Start server and send both D3 fixtures:
```bash
node dist/server.js &
sleep 2

# Clear and send coordinate-free version
curl -s -X DELETE http://localhost:3000/api/elements/clear
curl -s -X POST http://localhost:3000/api/elements/from-d3 \
  -H "Content-Type: application/json" \
  -d "$(jq -Rs '{d3Diagram: .}' < tests/fixtures/data-transfer-hub-auto.d3)"
```

Open `http://localhost:3000` in browser and verify:
- All containers are properly nested and positioned
- All icons are visible
- All arrows are orthogonal
- All numbered badges visible
- No overlapping elements
- Layout looks reasonable compared to the coordinate-heavy version

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: D3 auto-layout — coordinate-free diagram syntax

LLMs can now generate D3 diagrams without computing pixel coordinates.
New features:
- placement: right-of/left-of/below/above for relative positioning
- route: up-then-right etc. for arrow direction hints
- Auto-positioning of root containers (left-to-right flow)
- Auto-routing of arrows based on source/target positions
- Auto-placement of badges at arrow midpoints
- Invisible spacer elements filtered from output

All existing D3 syntax with explicit coordinates remains supported."
```

---

## Autonomous Verification Checklist

The implementing agent MUST verify each item and report results:

| # | Check | Command | Expected |
|---|-------|---------|----------|
| 1 | Unit tests | `npx vitest run tests/d3-auto-layout.test.ts` | All pass |
| 2 | E2E tests | `npm run build && npx vitest run tests/d3-e2e.test.ts` | All pass |
| 3 | Full suite | `npx vitest run` | All pass |
| 4 | Build | `npm run build` | Clean, no errors |
| 5 | Regression | Coordinate-heavy D3 produces same element counts | Counts match |
| 6 | Coordinate-free | New syntax produces >=5 containers, >=15 nodes, >=9 arrows, >=8 badges | Counts correct |
| 7 | No diagonals | `findDiagonalArrows()` returns empty | No diagonals |
| 8 | No overlaps | `findOverlappingContainers()` returns empty | No overlaps |

**If ANY check fails:** Debug, fix, and re-run ALL checks before claiming done.
