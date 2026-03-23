# D4: D3 Syntax + ELK Auto-Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** D4 = D3 syntax with zero coordinates. Same rich element definitions, same nesting, same styling — but ELK Layered handles all positioning and arrow routing automatically.

**Architecture:** New `src/utils/d4/` module with 4 files: parser (adapts D3 parser, strips coordinate attrs), layouter (converts to ELK graph, runs elkjs, extracts coordinates), builder (adapts D3 element builder to use ELK coordinates + edge routes), and index (public API). Reuses icon resolution, text measurement, overlap validation from existing code.

**Tech Stack:** TypeScript, elkjs (new dependency), Vitest

**Branch:** `feat/d4-elk-layout` (off `feat/d3-auto-layout`)

---

## Success Criteria

1. **Data Transfer Hub renders from D4 syntax** — no coordinates anywhere in source
2. **All arrows orthogonal**, no overlaps, no U-turns
3. **All icons render** via existing searchIcons()
4. **Containers properly nested** with header icons
5. **All badges visible** on labeled arrows
6. **57+ existing D3 tests still pass** (no regressions)
7. **New D4 tests pass** (parser, layout, e2e)
8. **`npm run build` clean**

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/d4/types.ts` | Create | D4 graph types (D4Node, D4Edge, D4Graph, D4Result) |
| `src/utils/d4/parser.ts` | Create | Parse D3-like syntax, strip coords, resolve short names in connections |
| `src/utils/d4/layouter.ts` | Create | Convert D4Graph → ELK JSON, run elkjs, extract positions + edge routes |
| `src/utils/d4/builder.ts` | Create | Convert ELK layout → Excalidraw elements (icons, containers, arrows, badges) |
| `src/utils/d4/index.ts` | Create | Public API: `convertD4ToExcalidraw(source: string): D4Result` |
| `src/utils/d4/shared.ts` | Create | Shared constants + measureText (extracted from d3Converter.ts for reuse) |
| `src/server.ts` | Modify | Add `POST /api/elements/from-d4` route |
| `tests/d4-parser.test.ts` | Create | Parser unit tests |
| `tests/d4-layout.test.ts` | Create | Layout + arrow routing tests |
| `tests/d4-e2e.test.ts` | Create | Full pipeline + HTTP API tests |
| `tests/fixtures/data-transfer-hub.d4` | Create | Reference diagram in D4 syntax |

---

## Task 0: Install elkjs + Extract Shared Utilities

**Files:**
- Modify: `package.json`
- Create: `src/utils/d4/shared.ts`

- [ ] **Step 1: Install elkjs**

```bash
npm install elkjs
```

- [ ] **Step 2: Create shared constants and measureText**

Create `src/utils/d4/shared.ts` — extract the constants and `measureText` function from `d3Converter.ts` so both D3 and D4 can use them without duplication:

```typescript
// ─── Shared constants for diagram rendering ─────────────────────────────
export const ICON_SIZE = 98;
export const FONT_SIZE = 24;
export const HEADER_HEIGHT = 108;
export const NODE_W = 160;
export const NODE_H = 136;
export const H_GAP = 60;
export const V_GAP = 60;
export const CONTAINER_PAD = 40;
export const ICON_HALF = ICON_SIZE / 2;
export const EDGE_GAP = 5;

// ─── Helvetica text measurement ─────────────────────────────────────────
const CHAR_WIDTHS: Record<string, number> = {
  ' ': 0.278, '!': 0.278, '"': 0.355, '#': 0.556, '$': 0.556, '%': 0.889,
  '&': 0.667, "'": 0.191, '(': 0.333, ')': 0.333, '*': 0.389, '+': 0.584,
  ',': 0.278, '-': 0.333, '.': 0.278, '/': 0.278, '0': 0.556, '1': 0.556,
  '2': 0.556, '3': 0.556, '4': 0.556, '5': 0.556, '6': 0.556, '7': 0.556,
  '8': 0.556, '9': 0.556, ':': 0.278, 'A': 0.667, 'B': 0.667, 'C': 0.722,
  'D': 0.722, 'E': 0.667, 'F': 0.611, 'G': 0.778, 'H': 0.722, 'I': 0.278,
  'J': 0.500, 'K': 0.667, 'L': 0.556, 'M': 0.833, 'N': 0.722, 'O': 0.778,
  'P': 0.667, 'Q': 0.778, 'R': 0.722, 'S': 0.667, 'T': 0.611, 'U': 0.722,
  'V': 0.667, 'W': 0.944, 'X': 0.667, 'Y': 0.667, 'Z': 0.611,
  'a': 0.556, 'b': 0.556, 'c': 0.500, 'd': 0.556, 'e': 0.556, 'f': 0.278,
  'g': 0.556, 'h': 0.556, 'i': 0.222, 'j': 0.222, 'k': 0.500, 'l': 0.222,
  'm': 0.833, 'n': 0.556, 'o': 0.556, 'p': 0.556, 'q': 0.556, 'r': 0.333,
  's': 0.500, 't': 0.278, 'u': 0.556, 'v': 0.500, 'w': 0.722, 'x': 0.500,
  'y': 0.500, 'z': 0.500,
};

export function measureText(text: string, fontSize: number): { width: number; height: number } {
  const lines = text.split('\n');
  let maxW = 0;
  for (const line of lines) {
    let w = 0;
    for (const ch of line) w += (CHAR_WIDTHS[ch] ?? 0.556) * fontSize;
    if (w > maxW) maxW = w;
  }
  return { width: Math.round(maxW * 100) / 100, height: Math.round(lines.length * fontSize * 1.25 * 100) / 100 };
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/utils/d4/shared.ts
git commit -m "chore: install elkjs, extract shared constants for D4"
```

---

## Task 1: D4 Types

**Files:**
- Create: `src/utils/d4/types.ts`

- [ ] **Step 1: Create type definitions**

```typescript
export interface D4Node {
  id: string;              // sanitized unique ID (e.g., "aws_cloud.customer_account.appsync")
  label: string;           // display name (e.g., "AWS AppSync")
  icon?: string;           // explicit icon path (e.g., "custom/icons8-openid.svg")
  iconType?: string;       // "architecture" | "resource"
  iconVariant?: string;    // "Light" | "Dark"
  iconHint?: string;       // free-text icon search (e.g., "CloudFormation Template Orange")
  style: Record<string, string>;  // stroke, stroke-dash, fill, opacity, etc.
  parent?: string;         // parent node ID
  children: string[];      // child node IDs
  isGroup: boolean;        // true if has children (container)
}

export interface D4Edge {
  id: string;
  from: string;            // node ID
  to: string;              // node ID
  label: string;           // badge label (e.g., "1", "2")
  bidirectional: boolean;
  style: Record<string, string>;
  badgeBg?: string;
  badgeColor?: string;
  badgeSize?: number;
  badgeShape?: string;
}

export interface D4ArrowStyle {
  strokeColor: string;
  strokeWidth: number;
  badgeBg: string;
  badgeColor: string;
  badgeSize: number;
  badgeShape: string;
}

export interface D4Graph {
  nodes: Record<string, D4Node>;
  edges: D4Edge[];
  arrowStyle: D4ArrowStyle;
  direction: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
}

export interface D4LayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface D4LayoutEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  points: number[][];     // absolute coordinates from ELK
  sections?: any[];       // raw ELK edge sections
  badgeBg?: string;
  badgeColor?: string;
  badgeSize?: number;
  badgeShape?: string;
}

export interface D4Layout {
  nodes: Record<string, D4LayoutNode>;
  edges: D4LayoutEdge[];
}

export interface D4Result {
  elements: any[];
  files: Array<{ id: string; dataURL: string; mimeType: string }>;
  iconsMissing: string[];
  validationIssues: string[];
  stats: { containers: number; nodes: number; arrows: number; badges: number };
  positions: Array<{
    id: string;
    type: 'container' | 'icon' | 'external';
    label: string;
    x: number; y: number; w: number; h: number;
    icon_cx: number; icon_cy: number;
  }>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/d4/types.ts
git commit -m "feat(d4): add type definitions"
```

---

## Task 2: D4 Parser

**Files:**
- Create: `src/utils/d4/parser.ts`
- Create: `tests/d4-parser.test.ts`

The parser is based on the D3 parser but:
- Ignores `pos`, `layout`, `placement`, `route`, `waypoints`, `badge_pos` attributes
- Adds `direction` statement support
- Resolves short names in connections (e.g., `AppSync` → `aws_cloud.customer_account.appsync`)

- [ ] **Step 1: Write parser tests**

Create `tests/d4-parser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseD4 } from '../src/utils/d4/parser.js';

describe('D4 parser: nodes', () => {
  it('parses bare nodes', () => {
    const g = parseD4(`a: Service A\nb: Service B`);
    expect(g.nodes['a']).toBeDefined();
    expect(g.nodes['a'].label).toBe('Service A');
    expect(g.nodes['b'].label).toBe('Service B');
  });

  it('parses nested containers', () => {
    const g = parseD4(`cloud: AWS Cloud {\n  svc: Service\n}`);
    expect(g.nodes['cloud'].isGroup).toBe(true);
    expect(g.nodes['cloud'].children).toContain('cloud.svc');
    expect(g.nodes['cloud.svc'].parent).toBe('cloud');
  });

  it('parses icon attributes', () => {
    const g = parseD4(`svc: Lambda {\n  icon_type: architecture\n  icon_hint: "lambda"\n}`);
    expect(g.nodes['svc'].iconType).toBe('architecture');
    expect(g.nodes['svc'].iconHint).toBe('lambda');
  });

  it('parses style attributes', () => {
    const g = parseD4(`box: Auth {\n  style.stroke-dash: 5\n  style.stroke: "#E7157B"\n}`);
    expect(g.nodes['box'].style['stroke-dash']).toBe('5');
    expect(g.nodes['box'].style['stroke']).toBe('#E7157B');
  });

  it('ignores coordinate attributes (pos, layout, placement, route)', () => {
    const g = parseD4(`box: Box {\n  pos: "100,200"\n  layout: layers\n  placement: right-of foo\n  svc: S\n}`);
    expect(g.nodes['box'].isGroup).toBe(true);
    // pos/layout/placement should NOT appear as properties
  });
});

describe('D4 parser: connections', () => {
  it('parses basic connection', () => {
    const g = parseD4(`a: A\nb: B\na -> b: 1`);
    expect(g.edges.length).toBe(1);
    expect(g.edges[0].from).toBe('a');
    expect(g.edges[0].to).toBe('b');
    expect(g.edges[0].label).toBe('1');
  });

  it('resolves short names in connections', () => {
    const g = parseD4(`cloud: Cloud {\n  svc: AppSync\n  db: DynamoDB\n}\nAppSync -> DynamoDB: 1`);
    expect(g.edges[0].from).toBe('cloud.svc');
    expect(g.edges[0].to).toBe('cloud.db');
  });

  it('resolves ambiguous short names with parent prefix', () => {
    const g = parseD4(`
      a: Parent A { lambda: Lambda }
      b: Parent B { lambda: Lambda }
    `);
    // Both "Lambda" exist — need disambiguation later (or use full path)
    expect(Object.keys(g.nodes).filter(k => k.includes('lambda')).length).toBe(2);
  });

  it('parses arrow_style block', () => {
    const g = parseD4(`arrow_style {\n  stroke_color: "#545B64"\n  badge_bg: "#232F3E"\n}`);
    expect(g.arrowStyle.strokeColor).toBe('#545B64');
    expect(g.arrowStyle.badgeBg).toBe('#232F3E');
  });

  it('parses connection with block properties', () => {
    const g = parseD4(`a: A\nb: B\na -> b: 1 {\n  badge_bg: "#FF0000"\n}`);
    expect(g.edges[0].badgeBg).toBe('#FF0000');
  });

  it('ignores waypoints and badge_pos in connection blocks', () => {
    const g = parseD4(`a: A\nb: B\na -> b: 1 {\n  waypoints: "100,200"\n  badge_pos: "150,180"\n}`);
    expect(g.edges.length).toBe(1);
    // waypoints and badge_pos should be silently ignored
  });
});

describe('D4 parser: direction', () => {
  it('defaults to RIGHT', () => {
    const g = parseD4(`a: A`);
    expect(g.direction).toBe('RIGHT');
  });

  it('parses direction down', () => {
    const g = parseD4(`direction down\na: A`);
    expect(g.direction).toBe('DOWN');
  });

  it('parses direction right', () => {
    const g = parseD4(`direction right\na: A`);
    expect(g.direction).toBe('RIGHT');
  });
});
```

- [ ] **Step 2: Run tests, see them fail**

```bash
npx vitest run tests/d4-parser.test.ts
```

- [ ] **Step 3: Implement the parser**

Create `src/utils/d4/parser.ts`. This is adapted from the D3 parser (lines 123-333 of d3Converter.ts) with these changes:

1. Add `direction` statement parsing (before shape parsing)
2. In bare attribute parsing, IGNORE: `pos`, `layout`, `placement`, `route`
3. In connection block parsing, IGNORE: `waypoints`, `badge_pos`, `route`
4. After all parsing, run **short name resolution** on connection endpoints:
   - For each edge `from`/`to`, if the ID doesn't exist in `nodes`:
     - Search for a node whose label matches (case-insensitive, spaces→underscores)
     - Search for a node whose last ID segment matches
     - If exactly one match, resolve to that node's full ID
     - If ambiguous, try prefixing with parent context
5. Mark `isGroup: true` for nodes that have children

Key function signatures:
```typescript
export function parseD4(source: string): D4Graph

// Internal: resolve short name "AppSync" to full ID "cloud.customer_account.appsync"
function resolveShortName(name: string, nodes: Record<string, D4Node>, contextStack: string[]): string
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npx vitest run tests/d4-parser.test.ts
```

- [ ] **Step 5: Build check**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/d4/parser.ts tests/d4-parser.test.ts
git commit -m "feat(d4): parser with short name resolution"
```

---

## Task 3: D4 Layouter (ELK Integration)

**Files:**
- Create: `src/utils/d4/layouter.ts`
- Create: `tests/d4-layout.test.ts`

This converts the D4Graph into ELK JSON format, runs ELK Layered, and extracts coordinates.

- [ ] **Step 1: Write layout tests**

Create `tests/d4-layout.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseD4 } from '../src/utils/d4/parser.js';
import { layoutD4Graph } from '../src/utils/d4/layouter.js';

describe('D4 layout: basic positioning', () => {
  it('assigns positions to all nodes', async () => {
    const graph = parseD4(`a: Service A\nb: Service B\na -> b: 1`);
    const layout = await layoutD4Graph(graph);
    expect(layout.nodes['a']).toBeDefined();
    expect(layout.nodes['b']).toBeDefined();
    expect(layout.nodes['a'].x).toBeGreaterThanOrEqual(0);
    expect(layout.nodes['b'].x).toBeGreaterThan(layout.nodes['a'].x);
  });

  it('positions containers around their children', async () => {
    const graph = parseD4(`box: Container {\n  a: Service A\n  b: Service B\n}\nbox.a -> box.b: 1`);
    const layout = await layoutD4Graph(graph);
    const box = layout.nodes['box'];
    const a = layout.nodes['box.a'];
    expect(box).toBeDefined();
    expect(a).toBeDefined();
    // Children should be inside container bounds
    expect(a.x).toBeGreaterThanOrEqual(box.x);
    expect(a.y).toBeGreaterThanOrEqual(box.y);
    expect(a.x + a.w).toBeLessThanOrEqual(box.x + box.w + 5);
  });

  it('routes edges with bend points', async () => {
    const graph = parseD4(`a: A\nb: B\nc: C\na -> b: 1\na -> c: 2`);
    const layout = await layoutD4Graph(graph);
    expect(layout.edges.length).toBe(2);
    for (const edge of layout.edges) {
      expect(edge.points.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('respects direction down', async () => {
    const graph = parseD4(`direction down\na: A\nb: B\na -> b: 1`);
    const layout = await layoutD4Graph(graph);
    // B should be below A, not to the right
    expect(layout.nodes['b'].y).toBeGreaterThan(layout.nodes['a'].y);
  });
});

describe('D4 layout: nested containers', () => {
  it('handles 3-level nesting', async () => {
    const graph = parseD4(`
      cloud: AWS Cloud {
        account: Account {
          svc: Service
        }
      }
    `);
    const layout = await layoutD4Graph(graph);
    const cloud = layout.nodes['cloud'];
    const account = layout.nodes['cloud.account'];
    const svc = layout.nodes['cloud.account.svc'];
    expect(cloud).toBeDefined();
    expect(account).toBeDefined();
    expect(svc).toBeDefined();
    // Nesting: svc inside account inside cloud
    expect(svc.x).toBeGreaterThanOrEqual(account.x);
    expect(account.x).toBeGreaterThanOrEqual(cloud.x);
  });
});

describe('D4 layout: arrows', () => {
  it('all edge points are finite numbers', async () => {
    const graph = parseD4(`a: A\nb: B\nc: C\na -> b: 1\nb -> c: 2`);
    const layout = await layoutD4Graph(graph);
    for (const edge of layout.edges) {
      for (const pt of edge.points) {
        expect(Number.isFinite(pt[0])).toBe(true);
        expect(Number.isFinite(pt[1])).toBe(true);
      }
    }
  });

  it('cross-container edges have valid points', async () => {
    const graph = parseD4(`
      left: Left { svc: Service A }
      right: Right { target: Service B }
      Service_A -> Service_B: 1
    `);
    const layout = await layoutD4Graph(graph);
    expect(layout.edges.length).toBe(1);
    expect(layout.edges[0].points.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run tests, see them fail**

```bash
npx vitest run tests/d4-layout.test.ts
```

- [ ] **Step 3: Implement the layouter**

Create `src/utils/d4/layouter.ts`:

```typescript
import ELK from 'elkjs';
import type { D4Graph, D4Layout, D4LayoutNode, D4LayoutEdge } from './types.js';
import { measureText, FONT_SIZE, ICON_SIZE, NODE_W, NODE_H, HEADER_HEIGHT, CONTAINER_PAD, H_GAP, V_GAP } from './shared.js';

const elk = new ELK();

export async function layoutD4Graph(graph: D4Graph): Promise<D4Layout> {
  const elkGraph = buildElkGraph(graph);
  const result = await elk.layout(elkGraph);
  return extractLayout(result, graph);
}

function buildElkGraph(graph: D4Graph): any {
  // Recursively build ELK JSON from D4 nodes
  const roots = Object.values(graph.nodes).filter(n => !n.parent);

  function buildNode(nodeId: string): any {
    const node = graph.nodes[nodeId];
    if (!node) return null;

    const elkNode: any = {
      id: nodeId,
      layoutOptions: {},
    };

    if (node.isGroup) {
      // Container: size determined by children
      elkNode.children = node.children.map(cid => buildNode(cid)).filter(Boolean);
      elkNode.layoutOptions = {
        'elk.algorithm': 'layered',
        'elk.direction': graph.direction,
        'elk.padding': `[top=${HEADER_HEIGHT},left=${CONTAINER_PAD},bottom=${CONTAINER_PAD},right=${CONTAINER_PAD}]`,
        'elk.layered.spacing.nodeNodeBetweenLayers': String(H_GAP),
        'elk.spacing.nodeNode': String(V_GAP),
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
        'elk.layered.edgeRouting': 'ORTHOGONAL',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      };

      // Containers without children that are themselves groups get
      // a text-only header (smaller padding)
      const hasHeaderIcon = detectContainerHeader(node.label);
      if (!hasHeaderIcon) {
        const textHeaderH = Math.round(FONT_SIZE * 1.5 + 10);
        elkNode.layoutOptions['elk.padding'] =
          `[top=${textHeaderH},left=${CONTAINER_PAD},bottom=${CONTAINER_PAD},right=${CONTAINER_PAD}]`;
      }

      // Also add edges that are internal to this container
      const internalEdges = graph.edges.filter(e => {
        const fromNode = graph.nodes[e.from];
        const toNode = graph.nodes[e.to];
        // Edge is internal if both endpoints are descendants of this container
        return fromNode && toNode &&
          isDescendant(e.from, nodeId, graph) &&
          isDescendant(e.to, nodeId, graph) &&
          // But only if both are DIRECT children or the edge crosses sub-containers
          findNearestAncestor(e.from, nodeId, graph) !== findNearestAncestor(e.to, nodeId, graph);
      });

      // Don't add edges at this level — add them at root level with hierarchical routing
    } else {
      // Leaf node: fixed size based on icon + label
      const labelW = measureText(node.label, FONT_SIZE).width;
      elkNode.width = Math.max(NODE_W, labelW + 20);
      elkNode.height = NODE_H;
    }

    return elkNode;
  }

  // Build root ELK graph
  const elkRoot: any = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': graph.direction,
      'elk.layered.spacing.nodeNodeBetweenLayers': String(H_GAP),
      'elk.spacing.nodeNode': String(V_GAP),
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.edgeRouting': 'ORTHOGONAL',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: roots.map(r => buildNode(r.id)).filter(Boolean),
    edges: graph.edges.map(e => ({
      id: e.id,
      sources: [e.from],
      targets: [e.to],
    })),
  };

  return elkRoot;
}

function extractLayout(elkResult: any, graph: D4Graph): D4Layout {
  const nodes: Record<string, D4LayoutNode> = {};
  const edges: D4LayoutEdge[] = [];

  // Recursively extract node positions (ELK gives positions relative to parent)
  function extractNodes(elkNode: any, offsetX: number, offsetY: number) {
    if (elkNode.id !== 'root') {
      const absX = (elkNode.x || 0) + offsetX;
      const absY = (elkNode.y || 0) + offsetY;
      nodes[elkNode.id] = {
        id: elkNode.id,
        x: absX,
        y: absY,
        w: elkNode.width || 0,
        h: elkNode.height || 0,
      };
      offsetX = absX;
      offsetY = absY;
    }
    if (elkNode.children) {
      for (const child of elkNode.children) {
        extractNodes(child, offsetX, offsetY);
      }
    }
  }
  extractNodes(elkResult, 0, 0);

  // Extract edge routes
  function extractEdges(elkNode: any, offsetX: number, offsetY: number) {
    if (elkNode.id !== 'root') {
      offsetX += elkNode.x || 0;
      offsetY += elkNode.y || 0;
    }
    if (elkNode.edges) {
      for (const elkEdge of elkNode.edges) {
        const graphEdge = graph.edges.find(e => e.id === elkEdge.id);
        const points: number[][] = [];

        if (elkEdge.sections) {
          for (const section of elkEdge.sections) {
            points.push([section.startPoint.x + offsetX, section.startPoint.y + offsetY]);
            if (section.bendPoints) {
              for (const bp of section.bendPoints) {
                points.push([bp.x + offsetX, bp.y + offsetY]);
              }
            }
            points.push([section.endPoint.x + offsetX, section.endPoint.y + offsetY]);
          }
        }

        edges.push({
          id: elkEdge.id,
          from: elkEdge.sources[0],
          to: elkEdge.targets[0],
          label: graphEdge?.label || '',
          points: points.length >= 2 ? points : [[0, 0], [100, 0]],
          badgeBg: graphEdge?.badgeBg,
          badgeColor: graphEdge?.badgeColor,
          badgeSize: graphEdge?.badgeSize,
          badgeShape: graphEdge?.badgeShape,
        });
      }
    }
    if (elkNode.children) {
      for (const child of elkNode.children) {
        extractEdges(child, offsetX, offsetY);
      }
    }
  }
  extractEdges(elkResult, 0, 0);

  return { nodes, edges };
}

// Helper: check if nodeId is a descendant of ancestorId
function isDescendant(nodeId: string, ancestorId: string, graph: D4Graph): boolean {
  return nodeId.startsWith(ancestorId + '.') || nodeId === ancestorId;
}

// Helper: find the direct child of ancestor that contains nodeId
function findNearestAncestor(nodeId: string, ancestorId: string, graph: D4Graph): string {
  const parts = nodeId.replace(ancestorId + '.', '').split('.');
  return ancestorId + '.' + parts[0];
}

// Helper: detect if label matches a known AWS container type (for header icon sizing)
function detectContainerHeader(label: string): boolean {
  return /aws\s*cloud|account|region|vpc|subnet|security|step\s*functions/i.test(label);
}
```

**IMPORTANT NOTE TO IMPLEMENTER:** The ELK graph construction above is a starting point. The key challenge is getting edges to route correctly across container boundaries with `elk.hierarchyHandling: INCLUDE_CHILDREN`. You may need to adjust:
- Where edges are defined (at root level vs. inside containers)
- Port constraints for clean entry/exit points
- Padding values for aesthetic spacing

Test iteratively: run the layout, check coordinates, adjust ELK options.

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/d4-layout.test.ts
```

Note: `layoutD4Graph` is async (ELK returns a Promise). Tests need `async/await`.

- [ ] **Step 5: Build check**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/d4/layouter.ts tests/d4-layout.test.ts
git commit -m "feat(d4): ELK-based layout engine"
```

---

## Task 4: D4 Element Builder

**Files:**
- Create: `src/utils/d4/builder.ts`

This converts ELK layout coordinates + D4Graph into Excalidraw elements. Heavily adapted from the D3 element builder (d3Converter.ts lines 1297-2500) but uses ELK positions and edge routes instead of custom layout.

- [ ] **Step 1: Implement the builder**

Create `src/utils/d4/builder.ts`. The builder needs these sections:

**A. Icon Resolution** — reuse `searchIcons()` and `detectContainerType()` from d3Converter.ts. Import `searchIcons` from `../aws-icon-index.js`. Copy the `resolveIconForLabel()` and `detectContainerType()` functions from d3Converter.ts (lines 335-401).

**B. Container Rendering** — for each group node in D4Graph:
- Rectangle element (layout.x, layout.y, layout.w, layout.h)
- Header icon (if AWS container type detected)
- Header label text
- Apply styles (stroke-dash, stroke color)

**C. Leaf Node Rendering** — for each leaf node:
- Icon image (98x98, centered in layout box)
- Label text (below icon, centered)
- If icon not found, fallback to labeled rectangle

**D. Arrow Rendering** — for each D4LayoutEdge:
- Convert ELK's absolute bend points to Excalidraw relative points
- Apply icon-edge snapping: adjust first/last point to icon edge instead of center
- Arrow element with points array

**E. Badge Rendering** — for each labeled edge:
- Find midpoint of longest segment
- Place badge (ellipse/rectangle) with text

Key function:
```typescript
export function buildD4Elements(
  graph: D4Graph,
  layout: D4Layout
): D4Result
```

The implementer should reference these sections of d3Converter.ts for patterns:
- Container rendering: lines 1347-1415
- Leaf node rendering: lines 1454-1557
- Badge placement: lines 2146-2331 (adapt to use ELK points)
- Icon resolution: lines 335-401

**CRITICAL:** Do NOT copy the D3 arrow routing pipeline (steps 1-10). ELK already routes the edges. Only adapt the endpoint snapping to icon edges.

- [ ] **Step 2: Build check**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/d4/builder.ts
git commit -m "feat(d4): Excalidraw element builder using ELK layout"
```

---

## Task 5: D4 Public API + Server Route

**Files:**
- Create: `src/utils/d4/index.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: Create public API**

Create `src/utils/d4/index.ts`:
```typescript
import { parseD4 } from './parser.js';
import { layoutD4Graph } from './layouter.js';
import { buildD4Elements } from './builder.js';
import type { D4Result } from './types.js';

export type { D4Result } from './types.js';
export { parseD4 } from './parser.js';
export { layoutD4Graph } from './layouter.js';

export async function convertD4ToExcalidraw(source: string): Promise<D4Result> {
  const graph = parseD4(source);
  const layout = await layoutD4Graph(graph);
  return buildD4Elements(graph, layout);
}
```

- [ ] **Step 2: Add server route**

In `src/server.ts`, add a new route following the pattern of `/api/elements/from-d3` (lines ~813-958). Add near the existing D3 route:

```typescript
import { convertD4ToExcalidraw } from './utils/d4/index.js';

// D4 route — ELK-based auto-layout (no coordinates needed)
app.post('/api/elements/from-d4', async (req, res) => {
  try {
    const { d4Diagram } = req.body;
    if (!d4Diagram || typeof d4Diagram !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing d4Diagram string' });
    }

    const result = await convertD4ToExcalidraw(d4Diagram);

    // Store elements and broadcast (same pattern as D3)
    // Clear existing elements
    elements.length = 0;
    for (const el of result.elements) {
      elements.push(el as any);
    }

    // Upload icon files
    for (const file of result.files) {
      files.set(file.id, file as any);
    }

    // Broadcast to WebSocket clients
    broadcast({
      type: 'd4_convert',
      elements: result.elements,
      files: result.files,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      elementCount: result.elements.length,
      ...result.stats,
      iconsMissing: result.iconsMissing,
      validationIssues: result.validationIssues,
      positions: result.positions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

Also add `d4_convert` handling in `frontend/src/App.tsx` WebSocket message handler (same pattern as `d3_convert`).

- [ ] **Step 3: Build check**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/d4/index.ts src/server.ts frontend/src/App.tsx
git commit -m "feat(d4): public API and server route"
```

---

## Task 6: Integration Test — Data Transfer Hub in D4

**Files:**
- Create: `tests/fixtures/data-transfer-hub.d4`
- Create: `tests/d4-e2e.test.ts`

- [ ] **Step 1: Create the D4 fixture**

Create `tests/fixtures/data-transfer-hub.d4`:
```
# Data Transfer Hub — D4 (zero coordinates)

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
  }

  customer_account: Customer's AWS Account {

    auth: Authentication {
      style.stroke-dash: 5
      cognito: Amazon Cognito
      openid: OpenID Connect {
        icon: "custom/icons8-openid.svg"
      }
    }

    dth_ui: Data Transfer Hub UI {
      icon_hint: "client"
    }

    appsync: AWS AppSync
    dynamodb: Amazon DynamoDB
    lambda: AWS Lambda

    cloudfront: Amazon CloudFront
    s3: Amazon S3

    sfn: AWS Step Functions workflow {
      style.stroke: "#E7157B"
      lambda_sf: AWS Lambda
    }

    cloudformation: AWS CloudFormation
    fargate: AWS Fargate
  }

  managed_account: AWS Managed Account {
    s3_repl: S3 replication component template {
      icon_hint: "CloudFormation Template Orange"
    }
    dynamodb_repl: DynamoDB replication component template {
      icon_hint: "CloudFormation Template Orange"
    }
    s3_managed: Amazon S3
    ecr_repl: ECR replication component template {
      icon_hint: "CloudFormation Template Orange"
    }
    ecr: Amazon ECR
    ecr_docker: ECR replication Docker image {
      icon_hint: "elastic container registry"
    }
  }
}

# Connections — short names, no coordinates
user -> appsync: 2
user -> dth_ui: 3
appsync -> lambda: 4
appsync -> dynamodb: 8
lambda -> sfn: 5
cloudfront -> s3: 1
dth_ui -> cloudfront
cloudformation -> s3_managed: 6
fargate -> ecr: 7
```

- [ ] **Step 2: Write E2E tests**

Create `tests/d4-e2e.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { convertD4ToExcalidraw } from '../src/utils/d4/index.js';
import { findDiagonalArrows, findOverlappingContainers } from './test-helpers.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('D4 E2E: Data Transfer Hub', () => {
  let result: any;

  it('converts without errors', async () => {
    const source = readFileSync(resolve(FIXTURES, 'data-transfer-hub.d4'), 'utf-8');
    result = await convertD4ToExcalidraw(source);
    expect(result).toBeDefined();
    expect(result.elements.length).toBeGreaterThan(0);
  });

  it('has correct element counts', () => {
    expect(result.stats.containers).toBeGreaterThanOrEqual(5);
    expect(result.stats.nodes).toBeGreaterThanOrEqual(15);
    expect(result.stats.arrows).toBeGreaterThanOrEqual(9);
    expect(result.stats.badges).toBeGreaterThanOrEqual(8);
  });

  it('all arrows are orthogonal', () => {
    expect(findDiagonalArrows(result)).toEqual([]);
  });

  it('no sibling container overlaps', () => {
    expect(findOverlappingContainers(result)).toEqual([]);
  });

  it('all 8 numbered badges present', () => {
    const badgeTexts = result.elements
      .filter((el: any) => el.type === 'text' && /^[1-8]$/.test(el.text?.trim()))
      .map((el: any) => el.text.trim());
    expect(new Set(badgeTexts).size).toBe(8);
  });

  it('connections use short names (no full paths in source)', () => {
    const source = readFileSync(resolve(FIXTURES, 'data-transfer-hub.d4'), 'utf-8');
    // Verify no fully-qualified IDs in connection lines
    const connLines = source.split('\n').filter(l => l.includes('->'));
    for (const line of connLines) {
      expect(line).not.toContain('aws_cloud.');
      expect(line).not.toContain('customer_account.');
    }
  });
});

describe('D4 E2E: simple diagram', () => {
  it('renders a minimal 3-node diagram', async () => {
    const result = await convertD4ToExcalidraw(`
      a: Service A
      b: Service B
      c: Service C
      a -> b: 1
      b -> c: 2
    `);
    expect(result.stats.nodes).toBe(3);
    expect(result.stats.arrows).toBe(2);
    expect(result.stats.badges).toBe(2);
  });

  it('renders nested containers', async () => {
    const result = await convertD4ToExcalidraw(`
      cloud: Cloud {
        vpc: VPC {
          server: EC2 Instance
          db: RDS Database
        }
      }
      server -> db: query
    `);
    expect(result.stats.containers).toBeGreaterThanOrEqual(2);
    expect(result.stats.nodes).toBeGreaterThanOrEqual(2);
    expect(result.stats.arrows).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests and iterate**

```bash
npm run build && npx vitest run tests/d4-e2e.test.ts
```

If tests fail, debug and fix. The most likely issues:
- ELK edge routing configuration (adjust layout options)
- Icon resolution for short labels
- Edge point extraction from ELK sections
- Container padding/sizing

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

ALL tests must pass (D3 tests + D4 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/data-transfer-hub.d4 tests/d4-e2e.test.ts
git commit -m "test(d4): E2E tests with Data Transfer Hub diagram"
```

---

## Task 7: Visual Verification + Polish

- [ ] **Step 1: Build and start server**

```bash
npm run build && node dist/server.js &
```

- [ ] **Step 2: Send D4 diagram via API**

```bash
curl -s -X DELETE http://localhost:3000/api/elements/clear
curl -s -X POST http://localhost:3000/api/elements/from-d4 \
  -H "Content-Type: application/json" \
  -d "$(jq -Rs '{d4Diagram: .}' < tests/fixtures/data-transfer-hub.d4)"
```

- [ ] **Step 3: Open browser and visually verify**

Open http://localhost:3000, zoom to fit, screenshot. Check:
- All containers properly nested with headers
- All icons visible
- All arrows clean (orthogonal, no overlaps, no U-turns)
- All numbered badges visible
- Layout flows left-to-right
- Managed Account positioned next to Customer Account

- [ ] **Step 4: Fix any visual issues**

Common ELK tuning:
- `elk.layered.spacing.nodeNodeBetweenLayers` — increase for more horizontal space
- `elk.spacing.nodeNode` — increase for more vertical space
- `elk.padding` — adjust container padding for header icons
- `elk.layered.nodePlacement.strategy` — try `BRANDES_KOEPF` if `NETWORK_SIMPLEX` doesn't look right

- [ ] **Step 5: Run full suite + build**

```bash
npx vitest run && npm run build
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(d4): complete D4 pipeline — D3 syntax + ELK auto-layout

D4 = D3 syntax with zero coordinates. ELK Layered handles all
positioning, layer assignment, crossing minimization, and orthogonal
edge routing. Supports nested containers, AWS icons, numbered badges,
styled arrows, and direction control."
```

---

## Autonomous Verification Checklist

| # | Check | Command | Expected |
|---|-------|---------|----------|
| 1 | D4 parser tests | `npx vitest run tests/d4-parser.test.ts` | All pass |
| 2 | D4 layout tests | `npx vitest run tests/d4-layout.test.ts` | All pass |
| 3 | D4 E2E tests | `npx vitest run tests/d4-e2e.test.ts` | All pass |
| 4 | D3 regression | `npx vitest run tests/d3-auto-layout.test.ts` | All pass |
| 5 | Full suite | `npx vitest run` | All pass |
| 6 | Build | `npm run build` | Clean |
| 7 | Data Transfer Hub | D4 fixture produces >=5 containers, >=15 nodes, >=9 arrows, >=8 badges | Correct |
| 8 | No diagonals | `findDiagonalArrows()` returns [] | Empty |
| 9 | No overlaps | `findOverlappingContainers()` returns [] | Empty |
| 10 | Visual check | Screenshot shows clean layout with all elements | Good |

**If ANY check fails:** Debug, fix, re-run ALL checks.
