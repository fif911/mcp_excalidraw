import { generateId } from '../types.js';

interface D2Shape {
  id: string;
  label: string;
  shape: string;
  style: Record<string, string>;
  parent?: string;
  icon?: string;
  children: string[];
}

interface D2Connection {
  id: string;
  from: string;
  to: string;
  label: string;
  bidirectional: boolean;
  style: Record<string, string>;
}

interface D2Graph {
  shapes: Record<string, D2Shape>;
  connections: D2Connection[];
}

// ─── D2 Syntax Parser ───

export function parseD2(source: string): D2Graph {
  const shapes: Record<string, D2Shape> = {};
  const connections: D2Connection[] = [];

  // Normalize: strip comments, collapse whitespace
  const lines = source
    .split('\n')
    .map(l => l.replace(/#.*/g, '').trim())
    .filter(Boolean);

  // Stack tracks current container context
  const contextStack: string[] = [];

  const getFullId = (localId: string) =>
    contextStack.length ? `${contextStack.join('.')}.${localId}` : localId;

  const ensureShape = (fullId: string, label?: string): D2Shape => {
    if (!shapes[fullId]) {
      const parts = fullId.split('.');
      const lastPart = parts[parts.length - 1] ?? fullId;
      const parent = parts.length > 1 ? parts.slice(0, -1).join('.') : undefined;
      shapes[fullId] = {
        id: fullId,
        label: label ?? lastPart,
        shape: 'rectangle',
        style: {},
        parent,
        icon: undefined,
        children: [],
      };
      if (parent) {
        ensureShape(parent);
        const parentShape = shapes[parent];
        if (parentShape && !parentShape.children.includes(fullId)) {
          parentShape.children.push(fullId);
        }
      }
    } else if (label) {
      shapes[fullId].label = label;
    }
    return shapes[fullId]!;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    // Opening brace on same line: "key: Label {" or "key {"
    const blockMatch = line.match(/^([\w\s.'-]+?)(?::\s*(.+?))?\s*\{$/);
    if (blockMatch) {
      const localId = (blockMatch[1] ?? '').trim().replace(/\s+/g, '_');
      const label = blockMatch[2]?.trim();
      const fullId = getFullId(localId);
      ensureShape(fullId, label);
      contextStack.push(fullId);
      i++;
      continue;
    }

    // Closing brace
    if (line === '}') {
      contextStack.pop();
      i++;
      continue;
    }

    // Connection: a -> b, a <- b, a <-> b, a -- b
    const connMatch = line.match(/^(.+?)\s*(->|<-|<->|--)\s*(.+?)(?::\s*(.*))?$/);
    if (connMatch) {
      const rawFrom = connMatch[1] ?? '';
      const arrow = connMatch[2] ?? '->';
      const rawTo = connMatch[3] ?? '';
      const label = connMatch[4];
      const from = getFullId(rawFrom.trim().replace(/\s+/g, '_'));
      const to = getFullId(rawTo.trim().replace(/\s+/g, '_'));
      ensureShape(from);
      ensureShape(to);
      const bidirectional = arrow === '<->' || arrow === '--';
      const actualFrom = arrow === '<-' ? to : from;
      const actualTo = arrow === '<-' ? from : to;
      connections.push({
        id: generateId(),
        from: actualFrom,
        to: actualTo,
        label: label?.trim() ?? '',
        bidirectional,
        style: {},
      });
      i++;
      continue;
    }

    // Attribute: key.shape: value OR key.style.X: value
    const attrMatch = line.match(/^([\w.'-]+)\.(shape|style\.[\w-]+|icon|label|width|height):\s*(.+)$/);
    if (attrMatch) {
      const localId = attrMatch[1] ?? '';
      const attr = attrMatch[2] ?? '';
      const value = attrMatch[3] ?? '';
      const fullId = getFullId(localId.replace(/\s+/g, '_'));
      const shape = ensureShape(fullId);
      if (attr === 'shape') shape.shape = value;
      else if (attr === 'icon') shape.icon = value;
      else if (attr === 'label') shape.label = value;
      else shape.style[attr.replace('style.', '')] = value;
      i++;
      continue;
    }

    // Simple shape declaration: "key: Label" or just "key"
    const simpleMatch = line.match(/^([\w\s.'-]+?)(?::\s*(.+))?$/);
    if (simpleMatch) {
      const localId = (simpleMatch[1] ?? '').trim().replace(/\s+/g, '_');
      const label = simpleMatch[2]?.trim();
      ensureShape(getFullId(localId), label);
    }

    i++;
  }

  return { shapes, connections };
}

// ─── Layout Engine ───
// Simple hierarchical layout — left-to-right with containers

const NODE_W = 160;
const NODE_H = 80;
const H_GAP = 60;
const CONTAINER_PAD = 40;

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function layoutD2Graph(graph: D2Graph): Record<string, LayoutNode> {
  const layout: Record<string, LayoutNode> = {};

  // Find root shapes (no parent)
  const roots = Object.values(graph.shapes).filter(s => !s.parent);

  let rootX = CONTAINER_PAD;

  const layoutShape = (shape: D2Shape, x: number, y: number): LayoutNode => {
    if (shape.children.length === 0) {
      // Leaf node
      const node: LayoutNode = { id: shape.id, x, y, w: NODE_W, h: NODE_H };
      layout[shape.id] = node;
      return node;
    }

    // Container: layout children first
    let childX = x + CONTAINER_PAD;
    const childY = y + CONTAINER_PAD + 40; // 40px for header
    let maxH = 0;
    let totalW = 0;

    for (const childId of shape.children) {
      const child = graph.shapes[childId];
      if (!child) continue;
      const childNode = layoutShape(child, childX, childY);
      childX += childNode.w + H_GAP;
      totalW += childNode.w + H_GAP;
      maxH = Math.max(maxH, childNode.h);
    }

    const w = Math.max(totalW + CONTAINER_PAD, NODE_W + CONTAINER_PAD * 2);
    const h = maxH + CONTAINER_PAD * 2 + 40;
    const node: LayoutNode = { id: shape.id, x, y, w, h };
    layout[shape.id] = node;
    return node;
  };

  for (const root of roots) {
    const node = layoutShape(root, rootX, CONTAINER_PAD);
    rootX += node.w + H_GAP;
  }

  return layout;
}

// ─── Excalidraw Element Builder ───

const D2_SHAPE_MAP: Record<string, string> = {
  rectangle: 'rectangle',
  square: 'rectangle',
  circle: 'ellipse',
  oval: 'ellipse',
  diamond: 'diamond',
  cylinder: 'rectangle',
  cloud: 'rectangle',
  hexagon: 'diamond',
  person: 'ellipse',
  image: 'image',
};

const D2_STROKE_MAP: Record<string, string> = {
  dashed: 'dashed',
  dotted: 'dotted',
  solid: 'solid',
};

export function convertD2ToExcalidraw(source: string) {
  const graph = parseD2(source);
  const layout = layoutD2Graph(graph);
  const elements: any[] = [];

  // Build shapes
  for (const shape of Object.values(graph.shapes)) {
    const pos = layout[shape.id];
    if (!pos) continue;

    const isContainer = shape.children.length > 0;
    const excalidrawType = D2_SHAPE_MAP[shape.shape] ?? 'rectangle';
    const strokeStyle = D2_STROKE_MAP[shape.style['stroke-dash'] ? 'dashed' : 'solid'] ?? 'solid';
    const strokeColor = shape.style['stroke'] ?? '#1a1a1a';
    const fillColor = shape.style['fill'] ?? (isContainer ? '#f8f9fa' : 'transparent');
    const opacity = shape.style['opacity'] ? parseFloat(shape.style['opacity']) * 100 : 100;

    elements.push({
      id: shape.id.replace(/[^a-zA-Z0-9_-]/g, '_'),
      type: excalidrawType,
      x: pos.x,
      y: pos.y,
      width: pos.w,
      height: pos.h,
      strokeColor,
      backgroundColor: fillColor,
      strokeWidth: isContainer ? 2 : 1,
      strokeStyle,
      roughness: 0,
      opacity,
      fillStyle: fillColor !== 'transparent' ? 'solid' : 'hachure',
      roundness: isContainer ? { type: 3, value: 8 } : null,
      groupIds: [],
    });

    // Label text element
    if (shape.label) {
      elements.push({
        id: `${shape.id.replace(/[^a-zA-Z0-9_-]/g, '_')}-label`,
        type: 'text',
        x: pos.x + (isContainer ? 8 : pos.w / 4),
        y: pos.y + (isContainer ? 8 : pos.h / 3),
        width: pos.w - 16,
        height: 24,
        text: shape.label,
        fontSize: isContainer ? 16 : 18,
        fontFamily: 2,
        textAlign: isContainer ? 'left' : 'center',
        strokeColor: shape.style['font-color'] ?? '#1a1a1a',
        roughness: 0,
        groupIds: [],
      });
    }
  }

  // Build arrows
  for (const conn of graph.connections) {
    const fromPos = layout[conn.from];
    const toPos = layout[conn.to];
    if (!fromPos || !toPos) continue;

    // Connect center-to-center
    const sx = fromPos.x + fromPos.w / 2;
    const sy = fromPos.y + fromPos.h / 2;
    const ex = toPos.x + toPos.w / 2;
    const ey = toPos.y + toPos.h / 2;

    elements.push({
      id: conn.id,
      type: 'arrow',
      x: sx,
      y: sy,
      width: Math.abs(ex - sx),
      height: Math.abs(ey - sy),
      points: [[0, 0], [ex - sx, ey - sy]],
      strokeColor: conn.style['stroke'] ?? '#1a1a1a',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 0,
      startArrowhead: conn.bidirectional ? 'arrow' : null,
      endArrowhead: 'arrow',
      groupIds: [],
    });

    // Arrow label
    if (conn.label) {
      elements.push({
        id: `${conn.id}-label`,
        type: 'text',
        x: (sx + ex) / 2,
        y: (sy + ey) / 2 - 20,
        width: conn.label.length * 10,
        height: 20,
        text: conn.label,
        fontSize: 14,
        fontFamily: 2,
        textAlign: 'center',
        strokeColor: '#1a1a1a',
        roughness: 0,
        groupIds: [],
      });
    }
  }

  return elements;
}
