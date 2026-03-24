import ELK from 'elkjs';
import type { D4Graph, D4Layout, D4LayoutNode, D4LayoutEdge, D4Node } from './types.js';
import { HEADER_HEIGHT, ICON_SIZE, CONTAINER_PAD, FONT_SIZE, measureText, wrapLabel } from './shared.js';

const elk = new ELK();

// AWS-style containers that get a taller header (icon + label)
const AWS_HEADER_PATTERNS = /^(aws cloud|account|region|vpc|subnet|step functions|availability zone)/i;

function detectHeaderHeight(label: string): number {
  return AWS_HEADER_PATTERNS.test(label) ? HEADER_HEIGHT : 48;
}

/**
 * Compute the ELK label dimensions for a leaf node.
 * The label is placed OUTSIDE, below the icon, centered.
 * ELK uses this to add spacing between nodes without inflating the node itself.
 */
function computeLeafLabel(node: D4Node): { width: number; height: number } {
  const lines = wrapLabel(node.label || '', FONT_SIZE);
  let maxLineW = 0;
  for (const line of lines) {
    const w = measureText(line, FONT_SIZE).width;
    if (w > maxLineW) maxLineW = w;
  }
  const labelH = lines.length * FONT_SIZE * 1.25;
  return { width: Math.round(maxLineW), height: Math.round(labelH) };
}

// ─── Full hierarchy ELK graph builder ────────────────────────────────────────

interface ElkChild {
  id: string;
  width?: number;
  height?: number;
  labels?: Array<{ text: string; width: number; height: number }>;
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
 *
 * Leaf nodes are sized to the ICON (98×98) with labels attached as ELK labels
 * placed OUTSIDE below. This way ELK routes arrows to the actual icon border
 * and adds spacing for labels without inflating the node.
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
      const minWidth = Math.round(Math.max(headerTotalW + 20, 200));

      const elkNode: ElkChild = {
        id,
        children: buildFullElkTree(node.children, allNodes),
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          // INCLUDE_CHILDREN reduces effective padding (~60% of requested).
          // Add 30px extra so children clear the header icon (98px tall).
          'elk.padding': `[top=${headerH + CONTAINER_PAD + 30},left=${CONTAINER_PAD},bottom=${CONTAINER_PAD + 40},right=${CONTAINER_PAD}]`,
          'elk.layered.spacing.nodeNodeBetweenLayers': '100',
          'elk.spacing.nodeNode': '50',
          'elk.layered.edgeRouting': 'ORTHOGONAL',
          'elk.nodeSize.constraints': 'MINIMUM_SIZE',
          'elk.nodeSize.minimum': `(${minWidth}, 0)`,
        },
      };
      result.push(elkNode);
    } else {
      // Leaf node — icon size with external label for spacing
      const label = computeLeafLabel(node);
      const elkNode: ElkChild = {
        id,
        width: ICON_SIZE,
        height: ICON_SIZE,
        labels: [{
          text: node.label || '',
          width: label.width,
          height: label.height,
        }],
        layoutOptions: {
          'elk.nodeLabels.placement': 'OUTSIDE V_BOTTOM H_CENTER',
        },
      };
      result.push(elkNode);
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

export async function layoutD4Graph(graph: D4Graph): Promise<D4Layout> {
  // Find root-level nodes (no parent)
  const rootNodeIds = Object.keys(graph.nodes).filter(id => !graph.nodes[id]!.parent);

  // ─── 1. Build FULL ELK hierarchy ───────────────────────────────────────
  // Leaf nodes = icon size (98×98) with ELK labels for spacing.
  // ELK routes arrows to icon borders and adds label spacing automatically.
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
  // ELK nodes are now icon-sized (98×98). Positions map directly to icons.
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
  // With INCLUDE_CHILDREN, ELK hoists all edges to the root but uses
  // coordinate spaces relative to the lowest common ancestor (LCA) of
  // source and target. We need to find the LCA compound node and use
  // its absolute position as the offset for edge coordinates.
  //
  // Build maps: leaf ID → chain of ancestor compound IDs + their abs positions
  const nodeAbsPositions = new Map<string, { x: number; y: number }>();
  const nodeParentChain = new Map<string, string[]>(); // node ID → [parent, grandparent, ...]

  function buildAncestorMaps(elkNode: any, offsetX: number, offsetY: number, ancestors: string[]) {
    const ax = elkNode.id === 'root' ? 0 : (elkNode.x ?? 0);
    const ay = elkNode.id === 'root' ? 0 : (elkNode.y ?? 0);
    const absX = offsetX + ax;
    const absY = offsetY + ay;
    nodeAbsPositions.set(elkNode.id, { x: absX, y: absY });
    const chain = elkNode.id === 'root' ? [] : [...ancestors, elkNode.id];
    if (elkNode.children) {
      for (const child of elkNode.children) {
        if (!child.children) {
          // Leaf node — record its ancestor chain
          nodeParentChain.set(child.id, chain);
          nodeAbsPositions.set(child.id, { x: absX + (child.x ?? 0), y: absY + (child.y ?? 0) });
        }
        buildAncestorMaps(child, absX, absY, chain);
      }
    }
  }
  buildAncestorMaps(result, 0, 0, []);

  // Find LCA of two leaf nodes and return its absolute position
  function findLcaOffset(srcId: string, tgtId: string): { x: number; y: number } {
    const srcChain = nodeParentChain.get(srcId) || [];
    const tgtChain = nodeParentChain.get(tgtId) || [];
    // Walk both chains to find deepest common ancestor
    let lcaId = 'root';
    for (let i = 0; i < Math.min(srcChain.length, tgtChain.length); i++) {
      if (srcChain[i] === tgtChain[i]) lcaId = srcChain[i]!;
      else break;
    }
    return nodeAbsPositions.get(lcaId) || { x: 0, y: 0 };
  }

  // Collect all edges from the ELK result tree
  const elkEdgeMap = new Map<string, { elkEdge: any; srcId: string; tgtId: string }>();
  function collectEdgesFromTree(elkNode: any) {
    if (elkNode.edges) {
      for (const e of elkNode.edges) {
        elkEdgeMap.set(e.id, {
          elkEdge: e,
          srcId: e.sources?.[0] ?? '',
          tgtId: e.targets?.[0] ?? '',
        });
      }
    }
    if (elkNode.children) {
      for (const child of elkNode.children) collectEdgesFromTree(child);
    }
  }
  collectEdgesFromTree(result);

  const edges: D4LayoutEdge[] = [];
  for (const d4Edge of graph.edges) {
    const entry = elkEdgeMap.get(d4Edge.id);
    const points: number[][] = [];

    if (entry) {
      const { elkEdge, srcId, tgtId } = entry;
      // Edge coordinates are relative to the LCA compound of source and target
      const resolvedSrc = resolveToLeaf(d4Edge.from, graph.nodes);
      const resolvedTgt = resolveToLeaf(d4Edge.to, graph.nodes);
      const lca = findLcaOffset(resolvedSrc, resolvedTgt);
      const offsetX = lca.x;
      const offsetY = lca.y;

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
