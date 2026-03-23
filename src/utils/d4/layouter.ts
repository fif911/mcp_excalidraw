import ELK from 'elkjs';
import type { D4Graph, D4Layout, D4LayoutNode, D4LayoutEdge, D4Node } from './types.js';
import { HEADER_HEIGHT, CONTAINER_PAD, FONT_SIZE, measureText } from './shared.js';

const elk = new ELK();

// AWS-style containers that get a taller header (icon + label)
const AWS_HEADER_PATTERNS = /^(aws cloud|account|region|vpc|subnet|step functions|availability zone)/i;

function detectHeaderHeight(label: string): number {
  return AWS_HEADER_PATTERNS.test(label) ? HEADER_HEIGHT : 48;
}

function computeLeafSize(_node: D4Node): { width: number; height: number } {
  // Return ICON size so ELK routes arrows directly to icon borders.
  // Labels are placed as separate text elements below the ELK node.
  return { width: 98, height: 98 }; // ICON_SIZE x ICON_SIZE
}

// ─── Flat-inside-containers graph builder ────────────────────────────────────

/** Recursively collect all leaf (non-group) nodes from the hierarchy */
function collectLeafNodes(nodeIds: string[], allNodes: Record<string, D4Node>): D4Node[] {
  const leaves: D4Node[] = [];
  for (const id of nodeIds) {
    const node = allNodes[id];
    if (!node) continue;
    if (node.isGroup && node.children.length > 0) {
      leaves.push(...collectLeafNodes(node.children, allNodes));
    } else {
      leaves.push(node);
    }
  }
  return leaves;
}

/** Resolve a node ID to a leaf ID — if it's a container, return its first leaf descendant */
function resolveToLeaf(nodeId: string, allNodes: Record<string, D4Node>): string {
  const node = allNodes[nodeId];
  if (!node) return nodeId;
  if (!node.isGroup || node.children.length === 0) return nodeId;
  return resolveToLeaf(node.children[0]!, allNodes);
}

interface ElkChild {
  id: string;
  width?: number;
  height?: number;
  children?: ElkChild[];
  layoutOptions?: Record<string, string>;
}

/**
 * Build ELK children with a "shallow hierarchy" approach:
 * - When a container has sibling containers (other containers at the same level),
 *   keep those containers as ELK compound nodes to prevent overlap.
 * - Inside each compound node, flatten ALL descendants to leaves (no deeper nesting).
 * - When a container has no sibling containers, flatten it away entirely.
 *
 * This gives ELK just enough hierarchy to prevent container overlaps while keeping
 * the layout mostly flat for clean edge routing.
 */
function buildShallowElkChildren(
  nodeIds: string[],
  allNodes: Record<string, D4Node>,
): ElkChild[] {
  // Check if there are multiple sibling containers at this level
  const siblingContainers = nodeIds.filter(id => {
    const n = allNodes[id];
    return n?.isGroup && n.children.length > 0;
  });
  const hasSiblingContainers = siblingContainers.length > 1;

  const result: ElkChild[] = [];
  for (const id of nodeIds) {
    const node = allNodes[id];
    if (!node) continue;

    if (node.isGroup && node.children.length > 0) {
      if (hasSiblingContainers) {
        // Keep this container as a compound node — flatten all descendants inside
        const leaves = collectLeafNodes(node.children, allNodes);
        const headerH = detectHeaderHeight(node.label);
        const elkNode: ElkChild = {
          id,
          children: leaves.map(leaf => {
            const size = computeLeafSize(leaf);
            return { id: leaf.id, width: size.width, height: size.height };
          }),
          layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.padding': `[top=${headerH + CONTAINER_PAD},left=${CONTAINER_PAD},bottom=${CONTAINER_PAD},right=${CONTAINER_PAD}]`,
            'elk.layered.spacing.nodeNodeBetweenLayers': '120',
            'elk.spacing.nodeNode': '60',
          },
        };
        result.push(elkNode);
      } else {
        // Only one container (or none) at this level — recurse to find sibling groups deeper
        result.push(...buildShallowElkChildren(node.children, allNodes));
      }
    } else {
      // Leaf node
      const size = computeLeafSize(node);
      result.push({ id, width: size.width, height: size.height });
    }
  }
  return result;
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

/** Check if nodeId is a descendant of ancestorId in the D4 graph hierarchy */
function isDescendantOf(nodeId: string, ancestorId: string, allNodes: Record<string, D4Node>): boolean {
  let current = allNodes[nodeId];
  while (current?.parent) {
    if (current.parent === ancestorId) return true;
    current = allNodes[current.parent];
  }
  return false;
}

export async function layoutD4Graph(graph: D4Graph): Promise<D4Layout> {
  // Find root-level nodes (no parent)
  const rootNodeIds = Object.keys(graph.nodes).filter(id => !graph.nodes[id]!.parent);

  // ─── 1. Build shallow-hierarchy ELK graph ──────────────────────────────
  const elkChildren = buildShallowElkChildren(rootNodeIds, graph.nodes);

  // Resolve edge endpoints: if an edge connects to a container, redirect to
  // its first leaf descendant so ELK can route it.
  const elkEdges = graph.edges.map((e, i) => ({
    id: e.id || `edge_${i}`,
    sources: [resolveToLeaf(e.from, graph.nodes)],
    targets: [resolveToLeaf(e.to, graph.nodes)],
  }));

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
    edges: elkEdges,
  };

  const result = await elk.layout(elkGraph as any);

  // ─── 2. Extract positions from ELK result ──────────────────────────────
  // Walk the (shallow) ELK tree to get absolute positions for all nodes
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

  // ─── 3. Compute bounding boxes for containers NOT in the ELK tree ──────
  // ELK only knows about "sibling group" containers. Other containers
  // (single-child wrappers like aws_cloud, or sub-containers like auth/sfn)
  // need their bounds computed from descendant positions.
  function computeContainerBounds(containerId: string): D4LayoutNode | null {
    // If ELK already positioned this container, use that
    if (nodes[containerId]) return nodes[containerId];

    const container = graph.nodes[containerId];
    if (!container || !container.isGroup) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const childId of container.children) {
      const childNode = graph.nodes[childId];
      if (!childNode) continue;

      if (childNode.isGroup) {
        const childBounds = computeContainerBounds(childId);
        if (childBounds) {
          minX = Math.min(minX, childBounds.x);
          minY = Math.min(minY, childBounds.y);
          maxX = Math.max(maxX, childBounds.x + childBounds.w);
          maxY = Math.max(maxY, childBounds.y + childBounds.h);
        }
      } else {
        const leafPos = nodes[childId];
        if (leafPos) {
          const labelH = measureText(childNode.label, FONT_SIZE).height + 8;
          const labelW = measureText(childNode.label, FONT_SIZE).width;
          const nodeRight = leafPos.x + Math.max(leafPos.w, labelW);
          const nodeBottom = leafPos.y + leafPos.h + labelH;
          minX = Math.min(minX, leafPos.x);
          minY = Math.min(minY, leafPos.y);
          maxX = Math.max(maxX, nodeRight);
          maxY = Math.max(maxY, nodeBottom);
        }
      }
    }

    if (minX === Infinity) return null;

    const headerH = detectHeaderHeight(container.label);
    const pad = CONTAINER_PAD;
    const bounds: D4LayoutNode = {
      id: containerId,
      x: minX - pad,
      y: minY - headerH - pad,
      w: (maxX - minX) + pad * 2,
      h: (maxY - minY) + headerH + pad * 2,
    };

    nodes[containerId] = bounds;
    return bounds;
  }

  // Walk all containers and compute bounds for those not already positioned by ELK
  function ensureAllContainers(nodeIds: string[]) {
    for (const id of nodeIds) {
      const node = graph.nodes[id];
      if (node?.isGroup) {
        ensureAllContainers(node.children);
        computeContainerBounds(id);
      }
    }
  }
  ensureAllContainers(rootNodeIds);

  // ─── 4. Extract edges ──────────────────────────────────────────────────
  // With INCLUDE_CHILDREN, ELK may place edges at root level even when both
  // endpoints are inside a container. The edge coordinates are relative to the
  // container that holds the source node (the LCA of source/target in ELK's tree).
  // We need to find each ELK compound node's absolute position to offset edges.

  // Build a map of ELK compound node absolute positions
  const elkContainerPositions = new Map<string, { x: number; y: number }>();
  function collectContainerPositions(elkChildren: any[], offsetX: number, offsetY: number) {
    for (const child of elkChildren) {
      const absX = offsetX + (child.x ?? 0);
      const absY = offsetY + (child.y ?? 0);
      if (child.children && child.children.length > 0) {
        elkContainerPositions.set(child.id, { x: absX, y: absY });
        collectContainerPositions(child.children, absX, absY);
      }
    }
  }
  collectContainerPositions(result.children ?? [], 0, 0);

  // Collect all edges from the ELK result tree
  const allElkEdges: any[] = [];
  function collectEdges(elkNode: any) {
    if (elkNode.edges) {
      for (const e of elkNode.edges) allElkEdges.push(e);
    }
    if (elkNode.children) {
      for (const child of elkNode.children) collectEdges(child);
    }
  }
  collectEdges(result);

  // With INCLUDE_CHILDREN, ELK uses two coordinate systems:
  // - Edges where BOTH endpoints are in the same ELK compound node:
  //   coordinates are relative to that compound node.
  // - Cross-container edges (endpoints in different containers or at root):
  //   coordinates are absolute (root-relative).
  // We detect which case applies and offset accordingly.

  function findElkContainer(leafId: string): string | null {
    // Find the ELK compound node that directly contains this leaf
    for (const [containerId] of elkContainerPositions) {
      if (isDescendantOf(leafId, containerId, graph.nodes)) {
        return containerId;
      }
    }
    return null;
  }

  function computeEdgeOffset(fromId: string, toId: string): { x: number; y: number } {
    const fromContainer = findElkContainer(fromId);
    const toContainer = findElkContainer(toId);

    // Both in the same ELK compound node — coordinates are container-relative
    if (fromContainer && fromContainer === toContainer) {
      return elkContainerPositions.get(fromContainer) ?? { x: 0, y: 0 };
    }

    // Different containers or root level — coordinates are absolute
    return { x: 0, y: 0 };
  }

  const edges: D4LayoutEdge[] = [];
  for (const d4Edge of graph.edges) {
    const elkEdge = allElkEdges.find((e: any) => e.id === d4Edge.id);
    const points: number[][] = [];

    if (elkEdge && elkEdge.sections) {
      const resolvedFrom = resolveToLeaf(d4Edge.from, graph.nodes);
      const resolvedTo = resolveToLeaf(d4Edge.to, graph.nodes);
      const offset = computeEdgeOffset(resolvedFrom, resolvedTo);

      for (const section of elkEdge.sections) {
        if (section.startPoint) points.push([offset.x + section.startPoint.x, offset.y + section.startPoint.y]);
        if (section.bendPoints) {
          for (const bp of section.bendPoints) points.push([offset.x + bp.x, offset.y + bp.y]);
        }
        if (section.endPoint) points.push([offset.x + section.endPoint.x, offset.y + section.endPoint.y]);
      }
    }

    // Clamp endpoints to node borders if they fall inside the source/target node
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
