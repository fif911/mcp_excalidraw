import ELK from 'elkjs';
import type { D4Graph, D4Layout, D4LayoutNode, D4LayoutEdge, D4Node } from './types.js';
import { HEADER_HEIGHT, ICON_SIZE, CONTAINER_PAD, FONT_SIZE, measureText, wrapLabel } from './shared.js';

const elk = new ELK();

// AWS-style containers that get a taller header (icon + label)
const AWS_HEADER_PATTERNS = /^(aws cloud|account|region|vpc|subnet|step functions|availability zone)/i;

function detectHeaderHeight(label: string): number {
  return AWS_HEADER_PATTERNS.test(label) ? HEADER_HEIGHT : 48;
}

function computeLeafSize(node: D4Node): { width: number; height: number } {
  // Node size must account for BOTH the icon AND the label below it.
  // Labels are auto-wrapped to keep nodes compact.
  const ICON = 98;
  const GAP = 8;
  const lines = wrapLabel(node.label || '', FONT_SIZE);

  // Width: max of icon width and widest wrapped line (+ padding)
  let maxLineW = 0;
  for (const line of lines) {
    const w = measureText(line, FONT_SIZE).width;
    if (w > maxLineW) maxLineW = w;
  }
  const width = Math.max(ICON, maxLineW + 20);

  // Height: icon + gap + all wrapped label lines
  const labelH = lines.length * FONT_SIZE * 1.25;
  const height = ICON + GAP + labelH;

  return { width: Math.round(width), height: Math.round(height) };
}

// ─── Full hierarchy ELK graph builder ────────────────────────────────────────

interface ElkChild {
  id: string;
  width?: number;
  height?: number;
  children?: ElkChild[];
  layoutOptions?: Record<string, string>;
}

/** Resolve a node ID to a leaf ID — if it's a container, return its first leaf descendant */
function resolveToLeaf(nodeId: string, allNodes: Record<string, D4Node>): string {
  const node = allNodes[nodeId];
  if (!node) return nodeId;
  if (!node.isGroup || node.children.length === 0) return nodeId;
  return resolveToLeaf(node.children[0]!, allNodes);
}

/**
 * Build the FULL ELK hierarchy — every D4 container becomes an ELK compound node.
 * ELK handles all sizing, spacing, and overlap prevention natively.
 */
function buildFullElkTree(
  nodeIds: string[],
  allNodes: Record<string, D4Node>,
): ElkChild[] {
  const result: ElkChild[] = [];
  for (const id of nodeIds) {
    const node = allNodes[id];
    if (!node) continue;

    if (node.isGroup && node.children.length > 0) {
      // Compound node — recurse into children
      const headerH = detectHeaderHeight(node.label);
      const isAwsHeader = AWS_HEADER_PATTERNS.test(node.label);

      // Container minimum width: header icon + gap + label text + padding
      const headerLabelW = measureText(node.label, FONT_SIZE).width;
      const headerTotalW = (isAwsHeader ? ICON_SIZE + 5 : 10) + headerLabelW + CONTAINER_PAD * 2;
      const minWidth = Math.round(Math.max(headerTotalW, 200));

      const elkNode: ElkChild = {
        id,
        children: buildFullElkTree(node.children, allNodes),
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.padding': `[top=${headerH + CONTAINER_PAD},left=${CONTAINER_PAD},bottom=${CONTAINER_PAD + 40},right=${CONTAINER_PAD}]`,
          'elk.layered.spacing.nodeNodeBetweenLayers': '100',
          'elk.spacing.nodeNode': '50',
          'elk.layered.edgeRouting': 'ORTHOGONAL',
          'elk.nodeSize.constraints': 'MINIMUM_SIZE',
          'elk.nodeSize.minimum': `(${minWidth}, 0)`,
        },
      };
      result.push(elkNode);
    } else {
      // Leaf node
      const size = computeLeafSize(node);
      result.push({ id, width: size.width, height: size.height });
    }
  }
  return result;
}

// ─── Synthetic edge generation for layer spreading ──────────────────────────

const SYNTHETIC_EDGE_PREFIX = '_synthetic_';

/**
 * Generate synthetic (invisible) edges to spread disconnected nodes across layers.
 *
 * With ELK's INCLUDE_CHILDREN mode, disconnected nodes inside compound containers
 * all land in layer 0 and stack vertically. Synthetic edges chain them together
 * so ELK assigns them to successive layers, producing a wider horizontal layout.
 *
 * Recurses into all compound nodes at every level of the hierarchy.
 */
function generateSyntheticEdges(
  elkChildren: ElkChild[],
  realEdges: Array<{ sources: string[]; targets: string[] }>,
): Array<{ id: string; sources: string[]; targets: string[] }> {
  const synthetic: Array<{ id: string; sources: string[]; targets: string[] }> = [];

  // Build set of all leaf IDs that participate in real edges
  const connectedLeaves = new Set<string>();
  for (const e of realEdges) {
    for (const s of e.sources) connectedLeaves.add(s);
    for (const t of e.targets) connectedLeaves.add(t);
  }

  function walkTree(children: ElkChild[]) {
    for (const elkChild of children) {
      if (!elkChild.children || elkChild.children.length < 2) {
        // Still recurse into single-child compounds
        if (elkChild.children) walkTree(elkChild.children);
        continue;
      }

      // Find disconnected leaves (direct children only, not sub-compounds)
      const disconnected = elkChild.children.filter(
        c => !c.children && !connectedLeaves.has(c.id),
      );
      if (disconnected.length >= 2) {
        // Chain disconnected nodes: a -> b -> c -> ...
        for (let i = 0; i < disconnected.length - 1; i++) {
          synthetic.push({
            id: `${SYNTHETIC_EDGE_PREFIX}${elkChild.id}_${i}`,
            sources: [disconnected[i]!.id],
            targets: [disconnected[i + 1]!.id],
          });
        }
      }

      // Recurse into sub-compounds
      walkTree(elkChild.children);
    }
  }

  walkTree(elkChildren);
  return synthetic;
}

/**
 * If an edge endpoint falls inside a node, snap it to the nearest node border.
 * This fixes rare ELK cases where edge start/end points land inside icons.
 */
function clampEndpointToNodeBorder(
  points: number[][],
  index: number,
  node: D4LayoutNode | undefined,
): void {
  if (!node || !points[index]) return;
  const px = points[index]![0]!;
  const py = points[index]![1]!;
  const margin = 2; // slight inset tolerance

  // Check if point is inside the node
  if (px <= node.x + margin || px >= node.x + node.w - margin ||
      py <= node.y + margin || py >= node.y + node.h - margin) {
    return; // already outside or on border
  }

  // Find nearest border and snap to it
  const distLeft = px - node.x;
  const distRight = (node.x + node.w) - px;
  const distTop = py - node.y;
  const distBottom = (node.y + node.h) - py;
  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  if (minDist === distLeft) {
    points[index] = [node.x, py];
  } else if (minDist === distRight) {
    points[index] = [node.x + node.w, py];
  } else if (minDist === distTop) {
    points[index] = [px, node.y];
  } else {
    points[index] = [px, node.y + node.h];
  }
}

export async function layoutD4Graph(graph: D4Graph): Promise<D4Layout> {
  // Find root-level nodes (no parent)
  const rootNodeIds = Object.keys(graph.nodes).filter(id => !graph.nodes[id]!.parent);

  // ─── 1. Build FULL ELK hierarchy ───────────────────────────────────────
  // Every D4 container becomes an ELK compound node with proper padding
  // for headers. ELK handles all sizing, spacing, and overlap prevention.
  const elkChildren = buildFullElkTree(rootNodeIds, graph.nodes);

  // Resolve edge endpoints: if an edge connects to a container, redirect to
  // its first leaf descendant so ELK can route it.
  const elkEdges = graph.edges.map((e, i) => ({
    id: e.id || `edge_${i}`,
    sources: [resolveToLeaf(e.from, graph.nodes)],
    targets: [resolveToLeaf(e.to, graph.nodes)],
  }));

  // Generate synthetic edges to spread disconnected nodes across layers.
  const syntheticEdges = generateSyntheticEdges(elkChildren, elkEdges);

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': graph.direction,
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.edgeRouting': 'ORTHOGONAL',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
      'elk.spacing.nodeNode': '60',
    },
    children: elkChildren,
    edges: [...elkEdges, ...syntheticEdges],
  };

  const result = await elk.layout(elkGraph as any);

  // ─── 2. Extract positions from ELK result ──────────────────────────────
  // Walk the full ELK tree to get absolute positions for ALL nodes
  // (both compound and leaf). ELK sizes everything — no post-processing needed.
  const nodes: Record<string, D4LayoutNode> = {};
  function collectPositions(elkChildren: any[], offsetX: number, offsetY: number) {
    for (const child of elkChildren) {
      const absX = offsetX + (child.x ?? 0);
      const absY = offsetY + (child.y ?? 0);
      nodes[child.id] = {
        id: child.id,
        x: absX,
        y: absY,
        w: child.width ?? 0,
        h: child.height ?? 0,
      };
      if (child.children) {
        collectPositions(child.children, absX, absY);
      }
    }
  }
  collectPositions(result.children ?? [], 0, 0);

  // ─── 3. Extract edges ──────────────────────────────────────────────────
  // With INCLUDE_CHILDREN + full hierarchy, ELK hoists all edges to the
  // lowest common ancestor. Walk the full tree to find edges and compute
  // absolute coordinates by accumulating parent offsets.
  const elkEdgeMap = new Map<string, { elkEdge: any; offsetX: number; offsetY: number }>();

  function collectEdgesFromTree(elkNode: any, offsetX: number, offsetY: number) {
    const nodeOffsetX = elkNode.id === 'root' ? 0 : (elkNode.x ?? 0);
    const nodeOffsetY = elkNode.id === 'root' ? 0 : (elkNode.y ?? 0);
    const absX = offsetX + nodeOffsetX;
    const absY = offsetY + nodeOffsetY;
    if (elkNode.edges) {
      for (const e of elkNode.edges) {
        elkEdgeMap.set(e.id, { elkEdge: e, offsetX: absX, offsetY: absY });
      }
    }
    if (elkNode.children) {
      for (const child of elkNode.children) {
        collectEdgesFromTree(child, absX, absY);
      }
    }
  }
  collectEdgesFromTree(result, 0, 0);

  const edges: D4LayoutEdge[] = [];
  for (const d4Edge of graph.edges) {
    const entry = elkEdgeMap.get(d4Edge.id);
    const points: number[][] = [];

    if (entry) {
      const { elkEdge, offsetX, offsetY } = entry;
      if (elkEdge.sections) {
        for (const section of elkEdge.sections) {
          if (section.startPoint) points.push([offsetX + section.startPoint.x, offsetY + section.startPoint.y]);
          if (section.bendPoints) {
            for (const bp of section.bendPoints) points.push([offsetX + bp.x, offsetY + bp.y]);
          }
          if (section.endPoint) points.push([offsetX + section.endPoint.x, offsetY + section.endPoint.y]);
        }
      }
    }

    // Clamp endpoints to node borders if ELK placed them inside
    if (points.length >= 2) {
      const resolvedFrom = resolveToLeaf(d4Edge.from, graph.nodes);
      const resolvedTo = resolveToLeaf(d4Edge.to, graph.nodes);
      clampEndpointToNodeBorder(points, 0, nodes[resolvedFrom]);
      clampEndpointToNodeBorder(points, points.length - 1, nodes[resolvedTo]);
    }

    edges.push({
      id: d4Edge.id,
      from: d4Edge.from,
      to: d4Edge.to,
      label: d4Edge.label,
      points: points.length >= 2 ? points : [[0, 0], [100, 0]],
      badgeBg: d4Edge.badgeBg,
      badgeColor: d4Edge.badgeColor,
      badgeSize: d4Edge.badgeSize,
      badgeShape: d4Edge.badgeShape,
    });
  }

  return { nodes, edges };
}
