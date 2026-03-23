import ELK from 'elkjs';
import type { D4Graph, D4Layout, D4LayoutNode, D4LayoutEdge, D4Node } from './types.js';
import { measureText, NODE_W, NODE_H, FONT_SIZE, HEADER_HEIGHT, CONTAINER_PAD } from './shared.js';

const elk = new ELK();

// AWS-style containers that get a taller header (icon + label)
const AWS_HEADER_PATTERNS = /^(aws cloud|account|region|vpc|subnet|step functions|availability zone)/i;

function detectHeaderHeight(label: string): number {
  return AWS_HEADER_PATTERNS.test(label) ? HEADER_HEIGHT : 48;
}

function computeLeafSize(node: D4Node): { width: number; height: number } {
  const textMeasure = measureText(node.label, FONT_SIZE);
  const w = Math.max(NODE_W, textMeasure.width + 40);
  const h = NODE_H;
  return { width: Math.round(w), height: h };
}

interface ElkNode {
  id: string;
  width?: number;
  height?: number;
  children?: ElkNode[];
  layoutOptions?: Record<string, string>;
  labels?: Array<{ text: string; width: number; height: number }>;
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
}

function buildElkChildren(
  nodeIds: string[],
  allNodes: Record<string, D4Node>,
): ElkNode[] {
  const result: ElkNode[] = [];
  for (const id of nodeIds) {
    const node = allNodes[id];
    if (!node) continue;

    const elkNode: ElkNode = { id };

    if (node.isGroup && node.children.length > 0) {
      // Container node — no fixed width/height, ELK computes from children
      const headerH = detectHeaderHeight(node.label);
      elkNode.children = buildElkChildren(node.children, allNodes);
      elkNode.layoutOptions = {
        'elk.padding': `[top=${headerH + CONTAINER_PAD},left=${CONTAINER_PAD},bottom=${CONTAINER_PAD},right=${CONTAINER_PAD}]`,
        'elk.algorithm': 'layered',
      };
    } else {
      // Leaf node — fixed dimensions
      const size = computeLeafSize(node);
      elkNode.width = size.width;
      elkNode.height = size.height;
    }

    result.push(elkNode);
  }
  return result;
}

function collectAbsolutePositions(
  elkChildren: any[],
  offsetX: number,
  offsetY: number,
  result: Record<string, D4LayoutNode>,
): void {
  if (!elkChildren) return;
  for (const child of elkChildren) {
    const absX = offsetX + (child.x ?? 0);
    const absY = offsetY + (child.y ?? 0);
    result[child.id] = {
      id: child.id,
      x: absX,
      y: absY,
      w: child.width ?? 0,
      h: child.height ?? 0,
    };
    if (child.children) {
      collectAbsolutePositions(child.children, absX, absY, result);
    }
  }
}

function extractEdgePoints(
  elkEdges: any[],
  containerOffsetX: number,
  containerOffsetY: number,
): number[][] {
  const points: number[][] = [];
  if (!elkEdges || elkEdges.length === 0) return points;

  for (const edge of elkEdges) {
    if (!edge.sections) continue;
    for (const section of edge.sections) {
      if (section.startPoint) {
        points.push([
          containerOffsetX + section.startPoint.x,
          containerOffsetY + section.startPoint.y,
        ]);
      }
      if (section.bendPoints) {
        for (const bp of section.bendPoints) {
          points.push([containerOffsetX + bp.x, containerOffsetY + bp.y]);
        }
      }
      if (section.endPoint) {
        points.push([
          containerOffsetX + section.endPoint.x,
          containerOffsetY + section.endPoint.y,
        ]);
      }
    }
  }
  return points;
}

export async function layoutD4Graph(graph: D4Graph): Promise<D4Layout> {
  // Find root-level nodes (no parent)
  const rootNodeIds = Object.keys(graph.nodes).filter(id => !graph.nodes[id]!.parent);

  // Build ELK edges at root level
  const elkEdges: ElkEdge[] = graph.edges.map((e, i) => ({
    id: e.id || `edge_${i}`,
    sources: [e.from],
    targets: [e.to],
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
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '30',
    },
    children: buildElkChildren(rootNodeIds, graph.nodes),
    edges: elkEdges,
  };

  const result = await elk.layout(elkGraph as any);

  // Extract absolute positions
  const nodes: Record<string, D4LayoutNode> = {};
  collectAbsolutePositions(result.children ?? [], 0, 0, nodes);

  // Extract edge routes — ELK may place edges at any level in the hierarchy
  // when using INCLUDE_CHILDREN, so we must walk the entire result tree
  const elkEdgeMap = new Map<string, { elkEdge: any; offsetX: number; offsetY: number }>();
  function collectEdges(elkNode: any, offsetX: number, offsetY: number) {
    const nodeOffsetX = elkNode.id === 'root' ? 0 : (elkNode.x ?? 0);
    const nodeOffsetY = elkNode.id === 'root' ? 0 : (elkNode.y ?? 0);
    const absX = offsetX + nodeOffsetX;
    const absY = offsetY + nodeOffsetY;

    if (elkNode.edges) {
      for (const elkEdge of elkNode.edges) {
        elkEdgeMap.set(elkEdge.id, { elkEdge, offsetX: absX, offsetY: absY });
      }
    }
    if (elkNode.children) {
      for (const child of elkNode.children) {
        collectEdges(child, absX, absY);
      }
    }
  }
  collectEdges(result, 0, 0);

  const edges: D4LayoutEdge[] = [];
  for (const d4Edge of graph.edges) {
    const entry = elkEdgeMap.get(d4Edge.id);
    const points = entry
      ? extractEdgePoints([entry.elkEdge], entry.offsetX, entry.offsetY)
      : [];

    edges.push({
      id: d4Edge.id,
      from: d4Edge.from,
      to: d4Edge.to,
      label: d4Edge.label,
      points,
      badgeBg: d4Edge.badgeBg,
      badgeColor: d4Edge.badgeColor,
      badgeSize: d4Edge.badgeSize,
      badgeShape: d4Edge.badgeShape,
    });
  }

  return { nodes, edges };
}
