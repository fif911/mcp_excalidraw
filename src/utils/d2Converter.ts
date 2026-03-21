import { generateId } from '../types.js';
import fs from 'fs';
import path from 'path';
import { searchIcons } from './aws-icon-index.js';
import logger from './logger.js';

// ─── Constants (matching components.py) ─────────────────────────────────

const ICON_SIZE = 98;
const FONT_SIZE = 24;
const HEADER_HEIGHT = 108;
const NODE_W = 160;
const NODE_H = 136; // icon (98) + gap (8) + label (~30)
const H_GAP = 60;
const V_GAP = 60;
const CONTAINER_PAD = 40;
const R = 52; // Arrow endpoint offset from icon center (half icon + gap)

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

function measureText(text: string, fontSize: number): { width: number; height: number } {
  const lines = text.split('\n');
  let maxW = 0;
  for (const line of lines) {
    let w = 0;
    for (const ch of line) w += (CHAR_WIDTHS[ch] ?? 0.556) * fontSize;
    if (w > maxW) maxW = w;
  }
  return { width: Math.round(maxW * 100) / 100, height: Math.round(lines.length * fontSize * 1.25 * 100) / 100 };
}

// ─── Point parsing helpers ───────────────────────────────────────────────

function parsePointList(s: string): number[][] {
  const points: number[][] = [];
  for (const m of s.matchAll(/\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/g)) {
    points.push([parseFloat(m[1]!), parseFloat(m[2]!)]);
  }
  return points;
}

function parsePoint(s: string): number[] {
  const m = s.match(/\(?\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)?/);
  if (m) return [parseFloat(m[1]!), parseFloat(m[2]!)];
  return [];
}

// ─── D2 Types ───────────────────────────────────────────────────────────

interface D2Shape {
  id: string;
  label: string;
  shape: string;
  style: Record<string, string>;
  parent?: string;
  icon?: string;
  pos?: string;
  layout?: string;       // Grid layout hint: "2x3", "row", "col"
  iconType?: string;     // "architecture", "resource"
  iconVariant?: string;  // "Light", "Dark"
  iconHint?: string;     // Free-text search hint: "ecr orange"
  children: string[];
}

interface D2Connection {
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
}

interface D2ArrowStyle {
  strokeColor: string;
  strokeWidth: number;
  badgeBg: string;
  badgeColor: string;
  badgeSize: number;
  badgeShape: string;
}

interface D2Graph {
  shapes: Record<string, D2Shape>;
  connections: D2Connection[];
  arrowStyle: D2ArrowStyle;
}

// ─── D2 Syntax Parser ───────────────────────────────────────────────────

export function parseD2(source: string): D2Graph {
  const shapes: Record<string, D2Shape> = {};
  const connections: D2Connection[] = [];
  const arrowStyle: D2ArrowStyle = {
    strokeColor: '#545B64',
    strokeWidth: 2,
    badgeBg: '#232F3E',
    badgeColor: '#ffffff',
    badgeSize: 38,
    badgeShape: 'circle',
  };

  const lines = source
    .split('\n')
    .map(l => {
      // Strip comments: # at start of line (after whitespace) or # preceded by whitespace
      // but NOT # inside quoted strings (hex colors like "#E7157B")
      let inQuote: string | null = null;
      let commentStart = -1;
      for (let j = 0; j < l.length; j++) {
        const ch = l[j]!;
        if (inQuote) {
          if (ch === inQuote) inQuote = null;
        } else if (ch === '"' || ch === "'") {
          inQuote = ch;
        } else if (ch === '#' && (j === 0 || /\s/.test(l[j - 1]!))) {
          commentStart = j;
          break;
        }
      }
      if (commentStart >= 0) l = l.slice(0, commentStart);
      return l.trim();
    })
    .filter(Boolean);

  const contextStack: string[] = [];

  const getFullId = (localId: string) =>
    contextStack.length ? `${contextStack[contextStack.length - 1]}.${localId}` : localId;

  // Convert literal \n in labels to actual newlines
  const unescapeLabel = (s: string) => s.replace(/\\n/g, '\n');

  const ensureShape = (fullId: string, label?: string): D2Shape => {
    if (!shapes[fullId]) {
      const parts = fullId.split('.');
      const lastPart = parts[parts.length - 1] ?? fullId;
      const parent = parts.length > 1 ? parts.slice(0, -1).join('.') : undefined;
      shapes[fullId] = {
        id: fullId,
        label: unescapeLabel(label ?? lastPart),
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
      shapes[fullId].label = unescapeLabel(label);
    }
    return shapes[fullId]!;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    // Parse arrow_style { } block — global arrow/badge configuration
    if (line === 'arrow_style {' || line === 'arrow_style{') {
      i++;
      while (i < lines.length && lines[i] !== '}') {
        const asLine = lines[i]!;
        const asMatch = asLine.match(/^(stroke_color|stroke_width|badge_bg|badge_color|badge_size|badge_shape):\s*(.+)$/);
        if (asMatch) {
          const val = (asMatch[2] ?? '').trim().replace(/^["']|["']$/g, '');
          if (asMatch[1] === 'stroke_color') arrowStyle.strokeColor = val;
          else if (asMatch[1] === 'stroke_width') arrowStyle.strokeWidth = parseFloat(val);
          else if (asMatch[1] === 'badge_bg') arrowStyle.badgeBg = val;
          else if (asMatch[1] === 'badge_color') arrowStyle.badgeColor = val;
          else if (asMatch[1] === 'badge_size') arrowStyle.badgeSize = parseFloat(val);
          else if (asMatch[1] === 'badge_shape') arrowStyle.badgeShape = val;
        }
        i++;
      }
      i++; // skip closing }
      continue;
    }

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

    if (line === '}') {
      contextStack.pop();
      i++;
      continue;
    }

    const connMatch = line.match(/^(.+?)\s*(->|<-|<->|--)\s*(.+?)(?::\s*(.*))?$/);
    if (connMatch) {
      const rawFrom = connMatch[1] ?? '';
      const arrow = connMatch[2] ?? '->';
      let rawTo = (connMatch[3] ?? '').trim();
      let label = (connMatch[4] ?? '').trim();
      // Detect block opening { in either label or rawTo
      let hasBlock = label.endsWith('{') || rawTo.endsWith('{');
      if (label.endsWith('{')) label = label.replace(/\s*\{$/, '').trim();
      if (rawTo.endsWith('{')) rawTo = rawTo.replace(/\s*\{$/, '').trim();
      const from = getFullId(rawFrom.trim().replace(/\s+/g, '_'));
      const to = getFullId(rawTo.trim().replace(/\s+/g, '_'));
      ensureShape(from);
      ensureShape(to);
      const bidirectional = arrow === '<->' || arrow === '--';
      const actualFrom = arrow === '<-' ? to : from;
      const actualTo = arrow === '<-' ? from : to;
      const conn: D2Connection = {
        id: generateId(),
        from: actualFrom,
        to: actualTo,
        label,
        bidirectional,
        style: {},
      };

      if (hasBlock) {
        i++;
        while (i < lines.length && lines[i]!.trim() !== '}') {
          const blockLine = lines[i]!.trim();
          const wpMatch = blockLine.match(/^waypoints:\s*(.+)$/);
          const bpMatch = blockLine.match(/^badge_pos:\s*(.+)$/);
          if (wpMatch) conn.waypoints = parsePointList(wpMatch[1]!);
          else if (bpMatch) conn.badgePos = parsePoint(bpMatch[1]!);
          else {
            const kvMatch = blockLine.match(/^(badge_bg|badge_color|badge_size|badge_shape):\s*(.+)$/);
            if (kvMatch) {
              const val = (kvMatch[2] ?? '').trim().replace(/^["']|["']$/g, '');
              if (kvMatch[1] === 'badge_bg') conn.badgeBg = val;
              else if (kvMatch[1] === 'badge_color') conn.badgeColor = val;
              else if (kvMatch[1] === 'badge_size') conn.badgeSize = parseFloat(val);
              else if (kvMatch[1] === 'badge_shape') conn.badgeShape = val;
            }
          }
          i++;
        }
      }

      connections.push(conn);
      i++;
      continue;
    }

    // Bare attribute for current context shape (style.*, pos, icon, layout, icon_type, icon_variant, icon_hint)
    const bareAttrMatch = line.match(/^(style\.[\w-]+|pos|icon|layout|icon_type|icon_variant|icon_hint):\s*(.+)$/);
    if (bareAttrMatch && contextStack.length > 0) {
      const attr = bareAttrMatch[1]!;
      const value = (bareAttrMatch[2] ?? '').trim().replace(/^["']|["']$/g, '');
      const currentId = contextStack[contextStack.length - 1]!;
      const shape = ensureShape(currentId);
      if (attr === 'pos') shape.pos = value;
      else if (attr === 'icon') shape.icon = value;
      else if (attr === 'layout') shape.layout = value;
      else if (attr === 'icon_type') shape.iconType = value;
      else if (attr === 'icon_variant') shape.iconVariant = value;
      else if (attr === 'icon_hint') shape.iconHint = value;
      else if (attr.startsWith('style.')) shape.style[attr.replace('style.', '')] = value;
      i++;
      continue;
    }

    const attrMatch = line.match(/^([\w.'-]+)\.(shape|style\.[\w-]+|icon|label|width|height|pos):\s*(.+)$/);
    if (attrMatch) {
      const localId = attrMatch[1] ?? '';
      const attr = attrMatch[2] ?? '';
      const value = attrMatch[3] ?? '';
      const fullId = getFullId(localId.replace(/\s+/g, '_'));
      const shape = ensureShape(fullId);
      if (attr === 'shape') shape.shape = value;
      else if (attr === 'icon') shape.icon = value.replace(/^["']|["']$/g, '');
      else if (attr === 'label') shape.label = value;
      else if (attr === 'pos') shape.pos = value.replace(/^["']|["']$/g, '');
      else shape.style[attr.replace('style.', '')] = value;
      i++;
      continue;
    }

    const simpleMatch = line.match(/^([\w\s.'-]+?)(?::\s*(.+))?$/);
    if (simpleMatch) {
      const localId = (simpleMatch[1] ?? '').trim().replace(/\s+/g, '_');
      const label = simpleMatch[2]?.trim();
      ensureShape(getFullId(localId), label);
    }

    i++;
  }

  return { shapes, connections, arrowStyle };
}

// ─── Icon Resolution ────────────────────────────────────────────────────

interface ResolvedIcon {
  fileId: string;
  absolutePath: string;
}

interface IconHints {
  iconType?: string;     // "architecture" or "resource"
  iconVariant?: string;  // "Light" or "Dark"
  iconHint?: string;     // free-text search override: "ecr orange"
}

function resolveIconForLabel(label: string, hints?: IconHints): ResolvedIcon | null {
  // If icon_hint is set, use it as the search query instead of the label
  const query = hints?.iconHint ?? label;

  // Build search options from hints
  const searchOpts: any = { query, resolve: true, limit: 5 };
  if (hints?.iconType) searchOpts.icon_type = hints.iconType;

  const results = searchIcons(searchOpts);

  // Filter by variant if specified (e.g., "Light" for Res_48_Light icons)
  let candidates = results.results.filter((r: any) => r.absolute_path);
  if (hints?.iconVariant && candidates.length > 1) {
    const variantFiltered = candidates.filter((r: any) =>
      r.absolute_path?.includes(hints.iconVariant!)
    );
    if (variantFiltered.length > 0) candidates = variantFiltered;
  }

  if (candidates.length > 0) {
    const r = candidates[0]!;
    return { fileId: r.suggested_file_id, absolutePath: r.absolute_path! };
  }

  // Try with common prefixes removed
  const cleaned = label
    .replace(/^(Amazon|AWS|Amazon Web Services)\s+/i, '')
    .trim();
  if (cleaned !== label && !hints?.iconHint) {
    const r2 = searchIcons({ query: cleaned, resolve: true, limit: 3 });
    if (r2.results.length > 0 && r2.results[0]!.absolute_path) {
      return { fileId: r2.results[0]!.suggested_file_id, absolutePath: r2.results[0]!.absolute_path };
    }
  }

  return null;
}

// AWS container detection from label — uses explicit icon paths for group icons
const ICONS_BASE = 'aws-icons-official/Architecture-Group-Icons_01302026';
const AWS_CONTAINER_PATTERNS: Array<{ pattern: RegExp; headerIcon: string; strokeColor: string }> = [
  { pattern: /aws\s+cloud/i, headerIcon: `${ICONS_BASE}/AWS-Cloud-logo_32.svg`, strokeColor: '#232F3E' },
  { pattern: /account/i, headerIcon: `${ICONS_BASE}/AWS-Cloud_32.svg`, strokeColor: '#232F3E' },
  { pattern: /region/i, headerIcon: `${ICONS_BASE}/Region_32.svg`, strokeColor: '#147EBA' },
  { pattern: /vpc/i, headerIcon: `${ICONS_BASE}/Virtual-private-cloud-VPC_32.svg`, strokeColor: '#248814' },
  { pattern: /step\s*functions/i, headerIcon: '', strokeColor: '#E7157B' }, // resolved via search
];

function detectContainerType(label: string): { headerIcon: string; strokeColor: string } | null {
  for (const p of AWS_CONTAINER_PATTERNS) {
    if (p.pattern.test(label)) return { headerIcon: p.headerIcon, strokeColor: p.strokeColor };
  }
  return null;
}

// ─── Layout Engine (improved) ───────────────────────────────────────────

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutChange {
  elementId: string;
  change: string;
}

export function layoutD2Graph(graph: D2Graph): { layout: Record<string, LayoutNode>; changes: LayoutChange[] } {
  const layout: Record<string, LayoutNode> = {};
  const changes: LayoutChange[] = [];
  const roots = Object.values(graph.shapes).filter(s => !s.parent);

  // Helper: redistribute leaf items vertically within a container to fill available height
  function redistributeLeaves(containerId: string) {
    const containerNode = layout[containerId];
    const containerShape = graph.shapes[containerId];
    if (!containerNode || !containerShape) return;

    const leafIds = containerShape.children.filter(cid => {
      const s = graph.shapes[cid];
      return s && s.children.length === 0;
    });
    if (leafIds.length === 0) return;

    // Determine grid dimensions
    const layoutType = containerShape.layout;
    const gridMatch = layoutType?.match(/^(\d+)x(\d+)$/);
    let cols = 1, rows = leafIds.length;
    if (gridMatch) {
      cols = parseInt(gridMatch[1]!);
      rows = parseInt(gridMatch[2]!);
    } else if (layoutType === 'row') {
      cols = leafIds.length;
      rows = 1;
    } else if (layoutType === 'col') {
      cols = 1;
      rows = leafIds.length;
    }
    if (rows <= 1) return;

    // Detect header height for this container
    const cType = detectContainerType(containerShape.label);
    const isDashed = Boolean(containerShape.style['stroke-dash']);
    let hasHdrIcon = false;
    if (cType && cType.headerIcon) {
      const icDir = path.resolve(process.cwd(), 'icons');
      hasHdrIcon = fs.existsSync(path.resolve(icDir, cType.headerIcon));
    }
    if (!hasHdrIcon && cType) hasHdrIcon = /step\s*functions|vpc|region/i.test(containerShape.label);
    const hdrH = hasHdrIcon ? HEADER_HEIGHT : Math.round(FONT_SIZE * 1.5 + 10);

    const availH = containerNode.h - hdrH - CONTAINER_PAD * 2;
    const rowSpacing = availH / rows;

    for (let idx = 0; idx < leafIds.length; idx++) {
      const lid = leafIds[idx]!;
      const leafNode = layout[lid];
      if (!leafNode) continue;
      const row = Math.floor(idx / cols);
      const newCy = containerNode.y + hdrH + CONTAINER_PAD + row * rowSpacing + rowSpacing / 2;
      leafNode.y = newCy - leafNode.h / 2;
      layout[lid] = leafNode;
    }
  }

  let rootX = CONTAINER_PAD;

  const layoutShape = (shape: D2Shape, x: number, y: number): LayoutNode => {
    // ── Explicit pos for leaf node ──
    if (shape.pos && shape.children.length === 0) {
      const parts = shape.pos.split(',').map(s => parseFloat(s.trim()));
      if (parts.length >= 2) {
        const labelW = measureText(shape.label, FONT_SIZE).width;
        const w = Math.max(NODE_W, labelW + 20);
        const node: LayoutNode = { id: shape.id, x: parts[0]! - w / 2, y: parts[1]! - NODE_H / 2, w, h: NODE_H };
        layout[shape.id] = node;
        return node;
      }
    }

    if (shape.children.length === 0) {
      // Leaf node — size for icon + label
      const labelW = measureText(shape.label, FONT_SIZE).width;
      const w = Math.max(NODE_W, labelW + 20);
      const node: LayoutNode = { id: shape.id, x, y, w, h: NODE_H };
      layout[shape.id] = node;
      return node;
    }

    // ── Container: check for explicit pos (x,y only — w,h auto-calculated) ──
    let containerX = x, containerY = y;
    const explicitW: number | undefined = undefined;
    const explicitH: number | undefined = undefined;
    if (shape.pos) {
      const parts = shape.pos.split(',').map(s => parseFloat(s.trim()));
      if (parts.length >= 2) {
        containerX = parts[0]!;
        containerY = parts[1]!;
        // w,h ignored — tool auto-calculates from content
      }
    }

    // Separate leaf children from sub-containers
    const leafIds = shape.children.filter(cid => {
      const c = graph.shapes[cid];
      return c && c.children.length === 0;
    });
    const containerIds = shape.children.filter(cid => {
      const c = graph.shapes[cid];
      return c && c.children.length > 0;
    });

    // Containers without header icons have a smaller header (just text)
    const containerType = detectContainerType(shape.label);
    let hasHeaderIcon = false;
    if (containerType && containerType.headerIcon) {
      // Has an explicit group icon path
      const iconsDir = path.resolve(process.cwd(), 'icons');
      const hdrPath = path.resolve(iconsDir, containerType.headerIcon);
      hasHeaderIcon = fs.existsSync(hdrPath);
    }
    if (!hasHeaderIcon && containerType) {
      // Fallback to search (e.g., Step Functions) — if label matches a known pattern, assume it has an icon
      hasHeaderIcon = /step\s*functions|vpc|region/i.test(shape.label);
    }
    const headerH = hasHeaderIcon ? HEADER_HEIGHT : Math.round(FONT_SIZE * 1.5 + 10); // ~46px for text-only
    let contentW = 0;
    let contentH = 0;

    // ── Layers layout: arrange children as left-to-right columns ──
    if (shape.layout === 'layers') {
      // Each direct child is a "layer" (invisible vertical column)
      // Layers are arranged left-to-right, elements within each layer stack top-to-bottom
      let layerX = containerX + CONTAINER_PAD;
      const layerStartY = containerY + headerH + CONTAINER_PAD;
      let maxLayerH = 0;

      for (const childId of shape.children) {
        const layerShape = graph.shapes[childId];
        if (!layerShape) continue;

        // Layout all children of this layer vertically
        let itemY = layerStartY;
        let layerW = 0;

        const layerChildren = layerShape.children.length > 0 ? layerShape.children : [childId];
        const isRealLayer = layerShape.children.length > 0;

        if (!isRealLayer) {
          // Single element, not a layer group — treat as its own layer
          const node = layoutShape(layerShape, layerX, layerStartY);
          layerW = node.w;
          maxLayerH = Math.max(maxLayerH, node.h);
          layerX += layerW + H_GAP;
          contentW += layerW + H_GAP;
          continue;
        }

        // Mark this layer as invisible (won't render borders)
        layerShape.shape = '_layer'; // special marker for element builder

        const layerItemIds: string[] = [];
        for (const itemId of layerShape.children) {
          const itemShape = graph.shapes[itemId];
          if (!itemShape) continue;

          const node = layoutShape(itemShape, layerX, itemY);
          layerW = Math.max(layerW, node.w);
          itemY += node.h + V_GAP;
          layerItemIds.push(itemId);
        }

        // Center all items horizontally within the column
        for (const itemId of layerItemIds) {
          const node = layout[itemId];
          if (node && node.w < layerW) {
            node.x = layerX + (layerW - node.w) / 2;
            layout[itemId] = node;
          }
        }

        const layerH = itemY - layerStartY - V_GAP;
        maxLayerH = Math.max(maxLayerH, layerH);

        // Set the invisible layer's layout node (for reference, won't render)
        layout[childId] = { id: childId, x: layerX, y: layerStartY, w: layerW, h: layerH };

        layerX += layerW + H_GAP;
        contentW += layerW + H_GAP;
      }

      contentW = Math.max(0, contentW - H_GAP); // remove trailing gap

      // ── Row-index alignment across columns ──
      // Collect items by row index across all layers, align to the max Y per row
      const layerItemsByRow: Map<number, Array<{ id: string; layerId: string }>> = new Map();
      for (const childId of shape.children) {
        const layerShape = graph.shapes[childId];
        if (!layerShape || layerShape.children.length === 0) continue;
        for (let rowIdx = 0; rowIdx < layerShape.children.length; rowIdx++) {
          const itemId = layerShape.children[rowIdx]!;
          if (!layerItemsByRow.has(rowIdx)) layerItemsByRow.set(rowIdx, []);
          layerItemsByRow.get(rowIdx)!.push({ id: itemId, layerId: childId });
        }
      }

      // For each row index, find the max Y (bottom edge) and align all items to start at the same Y
      for (const [_rowIdx, items] of layerItemsByRow) {
        let maxY = 0;
        for (const item of items) {
          const node = layout[item.id];
          if (node) maxY = Math.max(maxY, node.y);
        }
        // Shift all items in this row to the max Y
        for (const item of items) {
          const node = layout[item.id];
          if (node && node.y < maxY) {
            const shift = maxY - node.y;
            node.y = maxY;
            layout[item.id] = node;
            // Also shift all items below this one in the same layer
            const layerShape = graph.shapes[item.layerId];
            if (layerShape) {
              const itemIdx = layerShape.children.indexOf(item.id);
              for (let si = itemIdx + 1; si < layerShape.children.length; si++) {
                const belowId = layerShape.children[si]!;
                const belowNode = layout[belowId];
                if (belowNode) {
                  belowNode.y += shift;
                  layout[belowId] = belowNode;
                }
              }
            }
          }
        }
      }

      // Recalculate maxLayerH after alignment
      maxLayerH = 0;
      for (const childId of shape.children) {
        const layerNode = layout[childId];
        if (!layerNode) continue;
        const layerShape = graph.shapes[childId];
        if (!layerShape || layerShape.children.length === 0) {
          maxLayerH = Math.max(maxLayerH, layerNode.h);
          continue;
        }
        let bottomY = layerStartY;
        for (const itemId of layerShape.children) {
          const n = layout[itemId];
          if (n) bottomY = Math.max(bottomY, n.y + n.h);
        }
        const newH = bottomY - layerStartY;
        layerNode.h = newH;
        layout[childId] = layerNode;
        maxLayerH = Math.max(maxLayerH, newH);
      }

      contentH = maxLayerH;

      // Auto-expand for header text
      const headerTextW = measureText(shape.label, FONT_SIZE).width + ICON_SIZE + 20;
      contentW = Math.max(contentW, headerTextW);

      let w = Math.max(explicitW ?? (contentW + CONTAINER_PAD * 2), contentW + CONTAINER_PAD * 2);
      let h = Math.max(explicitH ?? (headerH + CONTAINER_PAD + contentH + CONTAINER_PAD), headerH + CONTAINER_PAD + contentH + CONTAINER_PAD);

      // Cap to parent bounds
      if (shape.parent) {
        const parentNode = layout[shape.parent];
        if (parentNode) {
          const maxW = parentNode.w - (containerX - parentNode.x) - CONTAINER_PAD;
          const maxH = parentNode.h - (containerY - parentNode.y) - CONTAINER_PAD;
          if (maxW > 0) w = Math.min(w, maxW);
          if (maxH > 0) h = Math.min(h, maxH);
        }
      }

      const node: LayoutNode = { id: shape.id, x: containerX, y: containerY, w, h };
      layout[shape.id] = node;
      return node;
    }

    // ── Standard layout (non-layers) ──
    // Layout sub-containers in a row first
    let childX = containerX + CONTAINER_PAD;
    let childY = containerY + headerH + CONTAINER_PAD;
    let rowMaxH = 0;

    // Proportional width allocation for unpositioned sibling containers
    // If parent has explicit width, split available space by leaf child count
    const unpositionedContainerIds = containerIds.filter(cid => !graph.shapes[cid]?.pos);
    if (explicitW && unpositionedContainerIds.length > 1) {
      const availW = explicitW - CONTAINER_PAD * 2 - H_GAP * (unpositionedContainerIds.length - 1);
      // Weight by number of leaf descendants
      const leafCounts = unpositionedContainerIds.map(cid => {
        const countLeaves = (id: string): number => {
          const s = graph.shapes[id];
          if (!s || s.children.length === 0) return 1;
          return s.children.reduce((sum, c) => sum + countLeaves(c), 0);
        };
        return countLeaves(cid);
      });
      const totalLeaves = leafCounts.reduce((a, b) => a + b, 0);

      for (let ci = 0; ci < unpositionedContainerIds.length; ci++) {
        const cid = unpositionedContainerIds[ci]!;
        const child = graph.shapes[cid];
        if (!child) continue;
        const proportion = totalLeaves > 0 ? leafCounts[ci]! / totalLeaves : 1 / unpositionedContainerIds.length;
        const childW = Math.round(availW * proportion);
        // Set a temporary pos so layoutShape uses this width
        child.pos = `${childX},${childY},${childW}`;
        const childNode = layoutShape(child, childX, childY);
        childX = childNode.x + childNode.w + H_GAP;
        rowMaxH = Math.max(rowMaxH, childNode.h);
      }
    }

    // Layout positioned + remaining unpositioned containers
    for (const cid of containerIds) {
      if (layout[cid]) continue; // already laid out above
      const child = graph.shapes[cid];
      if (!child) continue;
      const childNode = layoutShape(child, childX, childY);
      // Use actual placed position for next sibling
      childX = childNode.x + childNode.w + H_GAP;
      rowMaxH = Math.max(rowMaxH, childNode.h);
    }
    // Equalize sibling container heights — all match the tallest
    if (containerIds.length > 1 && rowMaxH > 0) {
      for (const cid of containerIds) {
        const node = layout[cid];
        if (node && node.h < rowMaxH) {
          node.h = rowMaxH;
          layout[cid] = node;
        }
      }
      // Redistribute leaf items in ALL sibling containers to fill available height
      for (const cid of containerIds) {
        redistributeLeaves(cid);
      }

      // Cross-container arrow alignment: align grid items to match their
      // arrow-connected counterparts in sibling containers
      for (const conn of graph.connections) {
        const fromShape = graph.shapes[conn.from];
        const toShape = graph.shapes[conn.to];
        const fromPos = layout[conn.from];
        const toPos = layout[conn.to];
        if (!fromShape || !toShape || !fromPos || !toPos) continue;
        if (fromShape.children.length > 0 || toShape.children.length > 0) continue;

        // Check if source and target are in different sibling containers
        const fromTopContainer = containerIds.find(cid => conn.from.startsWith(cid + '.') || conn.from === cid);
        const toTopContainer = containerIds.find(cid => conn.to.startsWith(cid + '.') || conn.to === cid);
        if (!fromTopContainer || !toTopContainer || fromTopContainer === toTopContainer) continue;

        // Mostly horizontal arrow — align Y
        const dx = Math.abs((fromPos.x + fromPos.w / 2) - (toPos.x + toPos.w / 2));
        const fromTextH = measureText(fromShape.label, FONT_SIZE).height;
        const toTextH = measureText(toShape.label, FONT_SIZE).height;
        const fromIconCy = (fromPos.y + fromPos.h / 2) - (8 + fromTextH) / 2;
        const toIconCy = (toPos.y + toPos.h / 2) - (8 + toTextH) / 2;
        const dy = Math.abs(fromIconCy - toIconCy);

        if (dx > dy && dy > 5) {
          // Shift target to match source Y
          const newY = fromIconCy - toPos.h / 2 + (8 + toTextH) / 2;
          const shift = newY - toPos.y;
          toPos.y = newY;
          layout[conn.to] = toPos;

          // Also shift items in the same grid row within the target container
          const targetContainer = graph.shapes[toTopContainer];
          if (targetContainer) {
            const gridMatch = targetContainer.layout?.match(/^(\d+)x(\d+)$/);
            if (gridMatch) {
              const cols = parseInt(gridMatch[1]!);
              const leafIds = targetContainer.children.filter(cid => {
                const s = graph.shapes[cid];
                return s && s.children.length === 0;
              });
              const targetIdx = leafIds.indexOf(conn.to);
              if (targetIdx >= 0) {
                const targetRow = Math.floor(targetIdx / cols);
                // Shift all items in the same grid row
                for (let i = targetRow * cols; i < Math.min((targetRow + 1) * cols, leafIds.length); i++) {
                  const sibId = leafIds[i]!;
                  if (sibId === conn.to) continue;
                  const sibNode = layout[sibId];
                  if (sibNode) {
                    sibNode.y += shift;
                    layout[sibId] = sibNode;
                  }
                }
              }
            }
          }
        }
      }
    }

    if (containerIds.length > 0) {
      contentW = childX - (containerX + CONTAINER_PAD) - H_GAP;
      contentH = rowMaxH + V_GAP;
    }

    // Find bottom of sub-containers for leaf placement
    let subContainerBottom = containerY + headerH + CONTAINER_PAD;
    for (const cid of containerIds) {
      const cl = layout[cid];
      if (cl) subContainerBottom = Math.max(subContainerBottom, cl.y + cl.h + V_GAP);
    }

    // Layout leaf nodes below sub-containers
    const leafStartY = subContainerBottom;

    // Unpositioned leaves for grid/auto layout
    const unpositionedLeaves = leafIds.filter(lid => !graph.shapes[lid]?.pos);

    // Parse grid layout hint: "2x3" (cols x rows), "row", "col", or auto-detect
    const layoutHint = shape.layout;
    let gridCols = 0;
    let gridRows = 0;
    if (layoutHint) {
      const gridMatch = layoutHint.match(/^(\d+)x(\d+)$/);
      if (gridMatch) {
        gridCols = parseInt(gridMatch[1]!);
        gridRows = parseInt(gridMatch[2]!);
      } else if (layoutHint === 'row') {
        gridCols = unpositionedLeaves.length || 1;
        gridRows = 1;
      } else if (layoutHint === 'col') {
        gridCols = 1;
        gridRows = unpositionedLeaves.length || 1;
      }
    } else if (unpositionedLeaves.length >= 2) {
      // Auto-detect grid: choose cols×rows based on count and container aspect ratio
      const n = unpositionedLeaves.length;
      if (n <= 3) {
        // 1 row
        gridCols = n;
        gridRows = 1;
      } else {
        // Pick cols to make a roughly square grid, prefer wider than tall
        const availWidth = explicitW ? explicitW - CONTAINER_PAD * 2 : 900;
        const availHeight = explicitH ? explicitH - headerH - CONTAINER_PAD * 2 - (containerIds.length > 0 ? rowMaxH + V_GAP : 0) : 600;
        const aspect = availWidth / Math.max(availHeight, 1);
        // Try 2 cols first, then 3
        if (n <= 4) { gridCols = 2; gridRows = Math.ceil(n / 2); }
        else if (n <= 6) { gridCols = aspect > 1.5 ? 3 : 2; gridRows = Math.ceil(n / gridCols); }
        else if (n <= 9) { gridCols = 3; gridRows = Math.ceil(n / 3); }
        else { gridCols = Math.ceil(Math.sqrt(n * aspect)); gridRows = Math.ceil(n / gridCols); }
      }
    }

    if (gridCols > 0 && gridRows > 0 && unpositionedLeaves.length > 0) {
      // Grid layout with label-aware column widths
      // First lay out explicitly positioned leaves normally
      for (const lid of leafIds) {
        const leaf = graph.shapes[lid];
        if (!leaf || !leaf.pos) continue;
        layoutShape(leaf, containerX + CONTAINER_PAD, leafStartY);
      }

      // Measure actual label widths per column to prevent overlap
      const colWidths: number[] = new Array(gridCols).fill(NODE_W);
      const rowHeights: number[] = new Array(gridRows).fill(NODE_H);
      for (let idx = 0; idx < unpositionedLeaves.length && idx < gridCols * gridRows; idx++) {
        const lid = unpositionedLeaves[idx]!;
        const leaf = graph.shapes[lid];
        if (!leaf) continue;
        const labelW = measureText(leaf.label, FONT_SIZE).width;
        const nodeW = Math.max(NODE_W, labelW + 20);
        const col = idx % gridCols;
        colWidths[col] = Math.max(colWidths[col]!, nodeW);
      }

      // Compute column X positions from widths + gaps
      const totalGridW = colWidths.reduce((s, w) => s + w!, 0) + H_GAP * (gridCols - 1);
      const colX: number[] = [];
      let cx = containerX + CONTAINER_PAD;
      for (let c = 0; c < gridCols; c++) {
        colX.push(cx);
        cx += colWidths[c]! + H_GAP;
      }
      const gridW = cx - H_GAP - (containerX + CONTAINER_PAD);
      const gridH = gridRows * (NODE_H + V_GAP) - V_GAP;

      // Place each leaf at its grid cell center
      for (let idx = 0; idx < unpositionedLeaves.length && idx < gridCols * gridRows; idx++) {
        const lid = unpositionedLeaves[idx]!;
        const leaf = graph.shapes[lid];
        if (!leaf) continue;

        const col = idx % gridCols;
        const row = Math.floor(idx / gridCols);
        const cellCx = colX[col]! + colWidths[col]! / 2;
        const cellCy = leafStartY + row * (NODE_H + V_GAP) + NODE_H / 2;

        const labelW = measureText(leaf.label, FONT_SIZE).width;
        const w = Math.max(NODE_W, labelW + 20);
        layout[lid] = { id: lid, x: cellCx - w / 2, y: cellCy - NODE_H / 2, w, h: NODE_H };
      }

      contentW = Math.max(contentW, gridW);
      contentH += gridH;
    } else {
      // Default row-based layout
      let leafX = containerX + CONTAINER_PAD;
      let leafRowMaxH = 0;
      let leafRowW = 0;
      const maxRowW = explicitW
        ? explicitW - CONTAINER_PAD * 2
        : Math.max(contentW, 600);

      for (const lid of leafIds) {
        const leaf = graph.shapes[lid];
        if (!leaf) continue;
        const leafNode = layoutShape(leaf, leafX, leafStartY);

        // Skip row-wrapping for explicitly positioned nodes
        if (leaf.pos) continue;

        // Wrap to next row if too wide
        if (leafRowW > 0 && leafRowW + leafNode.w + H_GAP > maxRowW) {
          leafX = containerX + CONTAINER_PAD;
          leafNode.x = leafX;
          leafNode.y = leafStartY + leafRowMaxH + V_GAP;
          layout[lid] = leafNode;
          contentH += leafRowMaxH + V_GAP;
          leafRowW = 0;
          leafRowMaxH = 0;
        }

        leafX += leafNode.w + H_GAP;
        leafRowW += leafNode.w + H_GAP;
        leafRowMaxH = Math.max(leafRowMaxH, leafNode.h);
      }
      if (leafIds.length > 0) {
        contentH += leafRowMaxH;
      }
      contentW = Math.max(contentW, leafRowW > 0 ? leafRowW - H_GAP : 0);
    }

    // contentW already updated inside both grid and row branches
    const leafContentW = contentW; // save before header expansion

    // Auto-expand for header text
    const headerTextW = measureText(shape.label, FONT_SIZE).width + ICON_SIZE + 20;
    contentW = Math.max(contentW, headerTextW);

    // Auto-expand explicit width/height if too small for header or content
    const minW = contentW + CONTAINER_PAD * 2;
    const minH = headerH + CONTAINER_PAD + contentH + CONTAINER_PAD;
    let w = Math.max(explicitW ?? minW, Math.max(minW, headerTextW + CONTAINER_PAD * 2));
    let h = Math.max(explicitH ?? minH, minH);

    // Center leaf items if container is wider than the actual leaf content
    const finalContentW = w - CONTAINER_PAD * 2;
    if (finalContentW > leafContentW && leafContentW > 0 && unpositionedLeaves.length > 0) {
      const offsetX = (finalContentW - leafContentW) / 2;
      for (const lid of unpositionedLeaves) {
        const node = layout[lid];
        if (node) {
          node.x += offsetX;
          layout[lid] = node;
        }
      }
    }

    // Cap expansion to parent bounds — don't grow beyond parent's available space
    if (shape.parent) {
      const parentNode = layout[shape.parent];
      if (parentNode) {
        const maxW = parentNode.w - (containerX - parentNode.x) - CONTAINER_PAD;
        const maxH = parentNode.h - (containerY - parentNode.y) - CONTAINER_PAD;
        if (maxW > 0 && w > maxW) {
          changes.push({ elementId: shape.id, change: `Width capped from ${Math.round(w)}px to ${Math.round(maxW)}px by parent "${shape.parent}". Expand the parent container.` });
          w = maxW;
        }
        if (maxH > 0 && h > maxH) {
          changes.push({ elementId: shape.id, change: `Height capped from ${Math.round(h)}px to ${Math.round(maxH)}px by parent "${shape.parent}". Expand the parent container.` });
          h = maxH;
        }
      }
    }

    const node: LayoutNode = { id: shape.id, x: containerX, y: containerY, w, h };
    layout[shape.id] = node;
    return node;
  };

  // Layout roots: positioned first, then unpositioned to the left
  const positionedRoots = roots.filter(r => r.pos);
  const unpositionedRoots = roots.filter(r => !r.pos);

  for (const root of positionedRoots) {
    layoutShape(root, rootX, CONTAINER_PAD);
  }

  if (positionedRoots.length > 0 && unpositionedRoots.length > 0) {
    // Place unpositioned roots (external actors) to the left of positioned content
    const minPosX = Math.min(...positionedRoots.map(r => {
      const p = r.pos!.split(',').map(s => parseFloat(s.trim()));
      return p[0]!;
    }));
    const extX = Math.max(CONTAINER_PAD, minPosX - NODE_W - H_GAP * 2);

    // First pass: lay out at default positions
    let extY = CONTAINER_PAD;
    for (const root of unpositionedRoots) {
      const node = layoutShape(root, extX, extY);
      extY += node.h + V_GAP;
    }

    // Second pass: Y-align each external actor to its connected target's icon center
    for (const root of unpositionedRoots) {
      const rootNode = layout[root.id];
      if (!rootNode) continue;

      // Find all targets this root connects to
      const targetYs: number[] = [];
      for (const conn of graph.connections) {
        let targetId: string | null = null;
        if (conn.from === root.id) targetId = conn.to;
        else if (conn.to === root.id) targetId = conn.from;
        if (targetId) {
          const tl = layout[targetId];
          if (tl) {
            const tShape = graph.shapes[targetId];
            const tTextH = tShape ? measureText(tShape.label, FONT_SIZE).height : 0;
            const isLeaf = tShape && tShape.children.length === 0;
            // Use icon center Y (top of node, not label)
            const iconCy = isLeaf
              ? (tl.y + tl.h / 2) - (8 + tTextH) / 2
              : tl.y + tl.h / 2;
            targetYs.push(iconCy);
          }
        }
      }

      if (targetYs.length > 0) {
        // Align to average target Y (centered on icon, not label)
        const avgY = targetYs.reduce((a, b) => a + b, 0) / targetYs.length;
        const rootTextH = measureText(root.label, FONT_SIZE).height;
        const rootIconCy = avgY;
        rootNode.y = rootIconCy - rootNode.h / 2 + (8 + rootTextH) / 2;
        layout[root.id] = rootNode;
      } else {
        // Standalone actor (no connections) — center vertically relative to positioned content
        let maxH = 0;
        let minY = Infinity;
        for (const pr of positionedRoots) {
          const pn = layout[pr.id];
          if (pn) {
            minY = Math.min(minY, pn.y);
            maxH = Math.max(maxH, pn.y + pn.h);
          }
        }
        if (maxH > 0) {
          const centerY = (minY + maxH) / 2;
          rootNode.y = centerY - rootNode.h / 2;
          layout[root.id] = rootNode;
        }
      }
    }
  } else {
    for (const root of unpositionedRoots) {
      const node = layoutShape(root, rootX, CONTAINER_PAD);
      rootX += node.w + H_GAP;
    }
  }

  // ── Post-layout: Y-align connected leaf nodes within SAME container ──
  // Only aligns elements in the same parent container within 50px threshold.
  // Cross-container alignment is the agent's responsibility via pos: values.
  const ALIGN_THRESHOLD = 50;
  for (const conn of graph.connections) {
    const fromShape = graph.shapes[conn.from];
    const toShape = graph.shapes[conn.to];
    const fromPos = layout[conn.from];
    const toPos = layout[conn.to];
    if (!fromShape || !toShape || !fromPos || !toPos) continue;
    const fromIsLeaf = fromShape.children.length === 0;
    const toIsLeaf = toShape.children.length === 0;
    if (!fromIsLeaf || !toIsLeaf) continue;
    // Only same-container alignment
    if (fromShape.parent !== toShape.parent) continue;

    const fromTextH = measureText(fromShape.label, FONT_SIZE).height;
    const toTextH = measureText(toShape.label, FONT_SIZE).height;
    const fromIconCy = (fromPos.y + fromPos.h / 2) - (8 + fromTextH) / 2;
    const toIconCy = (toPos.y + toPos.h / 2) - (8 + toTextH) / 2;
    const dy = Math.abs(fromIconCy - toIconCy);
    const dx = Math.abs((fromPos.x + fromPos.w / 2) - (toPos.x + toPos.w / 2));

    if (dx > dy && dy > 0 && dy < ALIGN_THRESHOLD) {
      // Mostly horizontal, small Y offset — align Y
      const newY = fromIconCy - toPos.h / 2 + (8 + toTextH) / 2;
      toPos.y = newY;
      layout[conn.to] = toPos;
    }
  }

  return { layout, changes };
}

// ─── Element Builder ────────────────────────────────────────────────────

export interface ElementPosition {
  id: string;
  type: 'container' | 'icon' | 'external';
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  icon_cx: number;  // icon center X (for arrows)
  icon_cy: number;  // icon center Y (for arrows)
  borders: {        // exact border coordinates (for container_border_point)
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

export interface ConvertResult {
  elements: any[];
  files: Array<{ id: string; dataURL: string; mimeType: string }>;
  iconsMissing: string[];
  validationIssues: string[];
  stats: { containers: number; nodes: number; arrows: number; badges: number };
  positions: ElementPosition[];
  layoutChanges: LayoutChange[];
}

export function convertD2ToExcalidraw(source: string): ConvertResult {
  const graph = parseD2(source);
  const { layout, changes: layoutChanges } = layoutD2Graph(graph);
  const elements: any[] = [];
  const fileUploads: Array<{ id: string; dataURL: string; mimeType: string }> = [];
  const iconsMissing: string[] = [];
  const validationIssues: string[] = [];
  const uploadedPaths = new Map<string, string>(); // absolutePath → fileId

  let containerCount = 0;
  let nodeCount = 0;
  let arrowCount = 0;
  let badgeCount = 0;

  // Helper: upload icon SVG and return fileId (reuses fileId for same file)
  const uploadIcon = (resolved: ResolvedIcon): string => {
    if (uploadedPaths.has(resolved.absolutePath)) {
      return uploadedPaths.get(resolved.absolutePath)!;
    }
    if (!uploadedPaths.has(resolved.absolutePath)) {
      try {
        const data = fs.readFileSync(resolved.absolutePath);
        const b64 = data.toString('base64');
        fileUploads.push({
          id: resolved.fileId,
          dataURL: `data:image/svg+xml;base64,${b64}`,
          mimeType: 'image/svg+xml',
        });
        uploadedPaths.set(resolved.absolutePath, resolved.fileId);
      } catch (err) {
        logger.warn(`Failed to read icon: ${resolved.absolutePath}`);
      }
    }
    return resolved.fileId;
  };

  // ── Build shapes ──────────────────────────────────────────────────────

  for (const shape of Object.values(graph.shapes)) {
    const pos = layout[shape.id];
    if (!pos) continue;

    const safeId = shape.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const isContainer = shape.children.length > 0;
    const isDashed = Boolean(shape.style['stroke-dash']);
    const strokeColor = shape.style['stroke'] ?? (isContainer ? '#545B64' : '#1a1a1a');

    // Skip invisible layer containers (used by layout: layers)
    if (shape.shape === '_layer') continue;

    if (isContainer) {
      // ── Container ──
      containerCount++;
      const groupId = `g-${safeId}`;
      const containerType = detectContainerType(shape.label);

      // Container rectangle
      elements.push({
        id: safeId,
        type: 'rectangle',
        x: pos.x, y: pos.y,
        width: pos.w, height: pos.h,
        strokeColor: shape.style['stroke'] ?? containerType?.strokeColor ?? strokeColor,
        backgroundColor: 'transparent',
        strokeWidth: 2,
        strokeStyle: isDashed ? 'dashed' : 'solid',
        roughness: 0,
        fillStyle: 'hachure',
        roundness: null, // corner_radius always 0
        groupIds: [groupId],
      });

      // Header icon (for detected AWS containers, not for dashed sub-boundaries)
      if (containerType && !isDashed) {
        let headerResolved: ResolvedIcon | null = null;
        if (containerType.headerIcon) {
          // Explicit group icon path
          const iconsDir = path.resolve(process.cwd(), 'icons');
          const fullPath = path.resolve(iconsDir, containerType.headerIcon);
          if (fs.existsSync(fullPath)) {
            headerResolved = { fileId: `file-hdr-${safeId}`, absolutePath: fullPath };
          }
        }
        if (!headerResolved) {
          // Fallback to search (e.g., Step Functions)
          headerResolved = resolveIconForLabel(shape.label);
        }
        if (headerResolved) {
          const fid = uploadIcon(headerResolved);
          elements.push({
            id: `img-${safeId}-hdr`,
            type: 'image',
            x: pos.x, y: pos.y,
            width: ICON_SIZE, height: ICON_SIZE,
            fileId: fid, status: 'saved', scale: [1, 1],
            strokeWidth: 0,
            groupIds: [groupId],
          });
        }
      }

      // Header label
      const { width: tw, height: th } = measureText(shape.label, FONT_SIZE);
      const hasHeaderIcon = containerType && !isDashed;
      const lx = hasHeaderIcon ? pos.x + ICON_SIZE + 5 : pos.x + 10;
      const ly = hasHeaderIcon
        ? pos.y + (HEADER_HEIGHT - th) / 2 - FONT_SIZE * 0.1
        : pos.y + 8;

      elements.push({
        id: `${safeId}-lbl`,
        type: 'text',
        x: lx, y: Math.round(ly * 10) / 10,
        text: shape.label,
        fontSize: FONT_SIZE, fontFamily: 2,
        strokeColor: '#1a1a1a',
        roughness: 0,
        groupIds: [groupId],
      });

    } else if (shape.shape === 'text_box') {
      // ── Text box (bordered rectangle with centered text, no icon) ──
      nodeCount++;
      const groupId = `g-${safeId}`;
      const cx = pos.x + pos.w / 2;
      const cy = pos.y + pos.h / 2;
      const { width: tbTextW, height: tbTextH } = measureText(shape.label, FONT_SIZE);
      const tbW = Math.max(pos.w, tbTextW + 40);
      const tbH = Math.max(pos.h, tbTextH + 20);

      elements.push({
        id: safeId,
        type: 'rectangle',
        x: cx - tbW / 2, y: cy - tbH / 2,
        width: tbW, height: tbH,
        strokeColor: shape.style['stroke'] ?? '#1a1a1a',
        backgroundColor: 'transparent',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        roundness: null,
        groupIds: [groupId],
      });

      elements.push({
        id: `${safeId}-lbl`,
        type: 'text',
        x: cx - tbTextW / 2, y: cy - tbTextH / 2,
        text: shape.label,
        fontSize: FONT_SIZE, fontFamily: 2,
        textAlign: 'center',
        strokeColor: '#1a1a1a',
        roughness: 0,
        groupIds: [groupId],
      });

    } else {
      // ── Leaf node (icon + label) ──
      nodeCount++;
      const groupId = `g-${safeId}`;
      const cx = pos.x + pos.w / 2;
      const cy = pos.y + pos.h / 2;

      // Try explicit icon path first, then auto-resolve from label
      let resolved: ResolvedIcon | null = null;
      if (shape.icon) {
        const iconsDir = path.resolve(process.cwd(), 'icons');
        const fullPath = path.resolve(iconsDir, shape.icon);
        if (fs.existsSync(fullPath)) {
          resolved = { fileId: `file-${safeId}`, absolutePath: fullPath };
        } else {
          // Try as search query
          const sr = searchIcons({ query: shape.icon, resolve: true, limit: 1 });
          if (sr.results.length > 0 && sr.results[0]!.absolute_path) {
            resolved = { fileId: sr.results[0]!.suggested_file_id, absolutePath: sr.results[0]!.absolute_path };
          }
        }
      }
      if (!resolved) {
        resolved = resolveIconForLabel(shape.label, {
          iconType: shape.iconType,
          iconVariant: shape.iconVariant,
          iconHint: shape.iconHint,
        });
      }
      const gap = 8;

      if (resolved) {
        const fid = uploadIcon(resolved);
        const { height: textH } = measureText(shape.label, FONT_SIZE);
        const totalH = ICON_SIZE + gap + textH;
        const iconX = cx - ICON_SIZE / 2;
        const iconY = cy - totalH / 2;

        // Icon image
        elements.push({
          id: `img-${safeId}`,
          type: 'image',
          x: Math.round(iconX), y: Math.round(iconY),
          width: ICON_SIZE, height: ICON_SIZE,
          fileId: fid, status: 'saved', scale: [1, 1],
          strokeWidth: 0,
          groupIds: [groupId],
        });

        // Label below icon — each line as a separate centered element
        const lines = shape.label.split('\n');
        const lineH = FONT_SIZE * 1.25;
        const labelY = iconY + ICON_SIZE + gap;

        for (let li = 0; li < lines.length; li++) {
          const line = lines[li]!;
          const { width: lineW } = measureText(line, FONT_SIZE);
          const lineX = cx - lineW / 2;
          const lid = li > 0 ? `${safeId}-lbl-${li}` : `${safeId}-lbl`;
          elements.push({
            id: lid,
            type: 'text',
            x: Math.round(lineX), y: Math.round(labelY + li * lineH),
            text: line,
            fontSize: FONT_SIZE, fontFamily: 2,
            strokeColor: '#000000',
            roughness: 0,
            groupIds: [groupId],
          });
        }
      } else {
        // No icon found — text-only rectangle
        iconsMissing.push(shape.label);
        elements.push({
          id: safeId,
          type: 'rectangle',
          x: pos.x, y: pos.y,
          width: pos.w, height: pos.h,
          strokeColor: '#1a1a1a',
          backgroundColor: 'transparent',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 0,
          roundness: null,
          groupIds: [groupId],
        });
        elements.push({
          id: `${safeId}-lbl`,
          type: 'text',
          x: pos.x + pos.w / 4, y: pos.y + pos.h / 3,
          text: shape.label,
          fontSize: FONT_SIZE, fontFamily: 2,
          textAlign: 'center',
          strokeColor: '#1a1a1a',
          roughness: 0,
          groupIds: [groupId],
        });
      }
    }
  }

  // ── Arrow helpers (ported from components.py) ──────────────────────────

  // Badge defaults (can be overridden per-connection via badge_bg, badge_color, badge_size, badge_shape)
  // Use global arrow style from D2 (or defaults)
  const BADGE_SIZE = graph.arrowStyle.badgeSize;
  const BADGE_BG = graph.arrowStyle.badgeBg;
  const BADGE_COLOR = graph.arrowStyle.badgeColor;
  const BADGE_SHAPE = graph.arrowStyle.badgeShape;
  const ARROW_STROKE = graph.arrowStyle.strokeColor;
  const ARROW_WIDTH = graph.arrowStyle.strokeWidth;

  function pathMidpoint(pts: number[][]): { mx: number; my: number; dx: number; dy: number } {
    const segs: Array<{ x1: number; y1: number; x2: number; y2: number; len: number }> = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i]!;
      const [x2, y2] = pts[i + 1]!;
      const len = Math.sqrt((x2! - x1!) ** 2 + (y2! - y1!) ** 2);
      segs.push({ x1: x1!, y1: y1!, x2: x2!, y2: y2!, len });
    }
    if (segs.length === 0) return { mx: pts[0]![0]!, my: pts[0]![1]!, dx: 1, dy: 0 };

    // Place badge at midpoint of the LONGEST segment (most visible, least likely to overlap)
    let longest = segs[0]!;
    for (const s of segs) {
      if (s.len > longest.len) longest = s;
    }
    const mx = (longest.x1 + longest.x2) / 2;
    const my = (longest.y1 + longest.y2) / 2;
    return { mx, my, dx: longest.x2 - longest.x1, dy: longest.y2 - longest.y1 };
  }

  function perpOffset(segDx: number, segDy: number, offset: number): { offX: number; offY: number } {
    // Simple and consistent: horizontal arrows → badge ABOVE, vertical arrows → badge to the RIGHT
    if (Math.abs(segDx) >= Math.abs(segDy)) {
      // Horizontal segment → offset upward (negative Y)
      return { offX: 0, offY: -offset };
    } else {
      // Vertical segment → offset to the right (positive X)
      return { offX: offset, offY: 0 };
    }
  }

  // Detect if a shape is inside a container (for cross-container arrow routing)
  function findContainerOf(shapeId: string): string | undefined {
    const shape = graph.shapes[shapeId];
    return shape?.parent;
  }

  // ── Build arrows ──────────────────────────────────────────────────────

  for (const conn of graph.connections) {
    const fromPos = layout[conn.from];
    const toPos = layout[conn.to];
    if (!fromPos || !toPos) {
      validationIssues.push(`Arrow ${conn.from} -> ${conn.to}: missing layout position`);
      continue;
    }

    arrowCount++;

    // Compute ICON centers (not node centers) for arrow endpoints.
    // Icon sits at top of node; label below. Icon center Y = nodeCy - (gap + textH) / 2
    const gap = 8;
    const fromShape = graph.shapes[conn.from];
    const toShape = graph.shapes[conn.to];
    const fromTextH = fromShape ? measureText(fromShape.label, FONT_SIZE).height : 0;
    const toTextH = toShape ? measureText(toShape.label, FONT_SIZE).height : 0;
    const fromIsLeaf = fromShape && fromShape.children.length === 0;
    const toIsLeaf = toShape && toShape.children.length === 0;

    let cx1: number, cy1: number, cx2: number, cy2: number;

    if (fromIsLeaf) {
      cx1 = fromPos.x + fromPos.w / 2;
      cy1 = (fromPos.y + fromPos.h / 2) - (gap + fromTextH) / 2;
    } else {
      // Container source: pick border based on which side the target is on
      const targetX = (conn.waypoints?.length ? conn.waypoints[0]![0] : toPos.x + toPos.w / 2)!;
      const targetY = (conn.waypoints?.length ? conn.waypoints[0]![1] : toPos.y + toPos.h / 2)!;
      const fromCx = fromPos.x + fromPos.w / 2;
      const fromCy = fromPos.y + fromPos.h / 2;
      cx1 = fromCx;
      cy1 = fromCy;
      // Direction from container center to target
      const dirX = targetX - fromCx;
      const dirY = targetY - fromCy;
      if (Math.abs(dirX) >= Math.abs(dirY)) {
        // Target is primarily to the left or right
        if (dirX < 0) { cx1 = fromPos.x; cy1 = targetY; }       // target is left → exit left border
        else { cx1 = fromPos.x + fromPos.w; cy1 = targetY; }     // target is right → exit right border
      } else {
        // Target is primarily above or below
        if (dirY < 0) { cx1 = targetX; cy1 = fromPos.y; }        // target is above → exit top border
        else { cx1 = targetX; cy1 = fromPos.y + fromPos.h; }      // target is below → exit bottom border
      }
    }

    if (toIsLeaf) {
      cx2 = toPos.x + toPos.w / 2;
      cy2 = (toPos.y + toPos.h / 2) - (gap + toTextH) / 2;
    } else {
      // Container target: pick border based on which side the source is on
      // (relative to container center, not nearest edge)
      const srcX = (conn.waypoints?.length ? conn.waypoints[conn.waypoints.length - 1]![0] : fromPos.x + fromPos.w / 2)!;
      const srcY = (conn.waypoints?.length ? conn.waypoints[conn.waypoints.length - 1]![1] : fromPos.y + fromPos.h / 2)!;
      const toCx = toPos.x + toPos.w / 2;
      const toCy = toPos.y + toPos.h / 2;
      cx2 = toCx;
      cy2 = toCy;
      // Direction from container center to source
      const dirX = srcX - toCx;
      const dirY = srcY - toCy;
      if (Math.abs(dirX) >= Math.abs(dirY)) {
        // Source is primarily to the left or right
        if (dirX < 0) { cx2 = toPos.x; cy2 = srcY; }       // source is left → enter left border
        else { cx2 = toPos.x + toPos.w; cy2 = srcY; }       // source is right → enter right border
      } else {
        // Source is primarily above or below
        if (dirY < 0) { cx2 = srcX; cy2 = toPos.y; }        // source is above → enter top border
        else { cx2 = srcX; cy2 = toPos.y + toPos.h; }        // source is below → enter bottom border
      }
    }

    // Build full path at centers first, then offset endpoints by R
    let allPts: number[][];

    if (conn.waypoints && conn.waypoints.length > 0) {
      allPts = [[cx1, cy1], ...conn.waypoints, [cx2, cy2]];
    } else {
      // No waypoints — straight line. Edge snapping handles endpoints.
      allPts = [[cx1, cy1], [cx2, cy2]];
    }

    // Enforce orthogonal segments: straighten near-straight lines, L-shape true diagonals.
    // L-shape direction matches the SOURCE exit direction:
    // - Source exits horizontally (target primarily left/right) → horizontal first
    // - Source exits vertically (target primarily above/below) → vertical first
    const ortho: number[][] = [allPts[0]!];
    for (let k = 1; k < allPts.length; k++) {
      const prev = ortho[ortho.length - 1]!;
      const cur = allPts[k]!;
      const adx = Math.abs(cur[0]! - prev[0]!);
      const ady = Math.abs(cur[1]! - prev[1]!);
      if (adx > 1 && ady > 1) {
        const minorRatio = Math.min(adx, ady) / Math.max(adx, ady);
        if (minorRatio < 0.15) {
          // Nearly straight — snap the minor axis
          if (adx < ady) {
            cur[0] = prev[0]!;
          } else {
            cur[1] = prev[1]!;
          }
        } else {
          // True diagonal — L-shape matching source exit direction
          if (adx >= ady) {
            // Target primarily horizontal → exit horizontal first, then vertical
            ortho.push([cur[0]!, prev[1]!]);
          } else {
            // Target primarily vertical → exit vertical first, then horizontal
            ortho.push([prev[0]!, cur[1]!]);
          }
        }
      }
      ortho.push(cur);
    }
    allPts = ortho;

    // ── Crossing avoidance: reroute arrows around icons/labels ──
    // Arrows may only cross container borders — not icons, labels, or other elements.
    // If a segment crosses an obstacle, insert extra waypoints to route around it.
    const AVOID_MARGIN = 15; // clearance from obstacle edges
    const sourceId = conn.from;
    const targetId = conn.to;

    function getObstacleBboxes(): Array<{ x1: number; y1: number; x2: number; y2: number; id: string }> {
      const obstacles: Array<{ x1: number; y1: number; x2: number; y2: number; id: string }> = [];
      for (const el of elements) {
        if (el.type === 'arrow' || el.type === 'text') continue;
        // Skip containers (arrows ARE allowed to cross borders)
        if (el.type === 'rectangle' && (el.width as number) > 200 && (el.height as number) > 200) continue;
        // Skip source and target elements
        const elId = el.id as string;
        if (elId.includes(sourceId.replace(/\./g, '_')) || elId.includes(targetId.replace(/\./g, '_'))) continue;
        const ex = el.x as number;
        const ey = el.y as number;
        const ew = (el.width as number) || 0;
        const eh = (el.height as number) || 0;
        if (ew > 0 && eh > 0) {
          obstacles.push({
            x1: ex - AVOID_MARGIN, y1: ey - AVOID_MARGIN,
            x2: ex + ew + AVOID_MARGIN, y2: ey + eh + AVOID_MARGIN,
            id: elId,
          });
        }
      }
      return obstacles;
    }

    function segmentCrossesBox(sx: number, sy: number, ex: number, ey: number, b: { x1: number; y1: number; x2: number; y2: number }): boolean {
      // Check if horizontal or vertical segment intersects the bbox
      const minX = Math.min(sx, ex), maxX = Math.max(sx, ex);
      const minY = Math.min(sy, ey), maxY = Math.max(sy, ey);
      // No overlap at all
      if (maxX < b.x1 || minX > b.x2 || maxY < b.y1 || minY > b.y2) return false;
      // Segment passes through the box
      return true;
    }

    // Crossing avoidance — disabled for now, causes complex reroutes that conflict
    // with endpoint snapping. The validation will flag crossings for the agent to fix.
    if (false && elements.length > 5) {
      const obstacles = getObstacleBboxes();
      let rerouted = false;
      for (let attempt = 0; attempt < 3 && !rerouted; attempt++) {
        let needsReroute = false;
        for (let si = 0; si < allPts.length - 1; si++) {
          const [sx, sy] = allPts[si]!;
          const [ex, ey] = allPts[si + 1]!;
          for (const obs of obstacles) {
            if (segmentCrossesBox(sx!, sy!, ex!, ey!, obs)) {
              needsReroute = true;
              // Route around: for horizontal segment, go above or below
              // For vertical segment, go left or right
              const isHoriz = Math.abs(ey! - sy!) < Math.abs(ex! - sx!);
              if (isHoriz) {
                // Try routing above the obstacle
                const aboveY = obs.y1 - AVOID_MARGIN;
                const belowY = obs.y2 + AVOID_MARGIN;
                // Pick the side closer to the segment's current Y
                const routeY = Math.abs(sy! - aboveY) < Math.abs(sy! - belowY) ? aboveY : belowY;
                // Insert 3-segment route: horizontal to obs edge, vertical past obs, horizontal to end
                allPts.splice(si + 1, 0, [sx!, routeY], [ex!, routeY]);
                rerouted = true;
              } else {
                // Try routing left or right of the obstacle
                const leftX = obs.x1 - AVOID_MARGIN;
                const rightX = obs.x2 + AVOID_MARGIN;
                const routeX = Math.abs(sx! - leftX) < Math.abs(sx! - rightX) ? leftX : rightX;
                allPts.splice(si + 1, 0, [routeX, sy!], [routeX, ey!]);
                rerouted = true;
              }
              break;
            }
          }
          if (rerouted) break;
        }
        if (!needsReroute) break;
      }
    }

    // ── Edge-aware endpoint snapping ──
    // Arrows stop at the icon edge (or container border), centered on the
    // approached side. For bottom approach on leaf nodes, the endpoint
    // accounts for label text height so the arrow doesn't cross the label.
    const ICON_HALF = ICON_SIZE / 2;
    const EDGE_GAP = 5; // gap between arrowhead and icon/container edge

    function snapEndpoint(
      ptIdx: number, neighborIdx: number, isLeaf: boolean,
      centerX: number, centerY: number, textH: number,
      isStartPoint: boolean,
      overallTargetX: number, overallTargetY: number,
      overallSourceX: number, overallSourceY: number
    ) {
      const pt = allPts[ptIdx]!;
      const neighbor = allPts[neighborIdx]!;
      // Use OVERALL source→target direction for snapping, not segment direction.
      // This ensures the arrow exits/enters from the correct side regardless of L-shape routing.
      let dx: number, dy: number;
      if (isLeaf) {
        // Leaf: use overall direction to/from the other endpoint
        dx = isStartPoint ? (overallTargetX - centerX) : (centerX - overallSourceX);
        dy = isStartPoint ? (overallTargetY - centerY) : (centerY - overallSourceY);
      } else {
        // Container: use segment direction
        dx = isStartPoint ? (neighbor[0]! - pt[0]!) : (pt[0]! - neighbor[0]!);
        dy = isStartPoint ? (neighbor[1]! - pt[1]!) : (pt[1]! - neighbor[1]!);
      }

      if (!isLeaf) {
        // Container: just offset 3px from center toward neighbor
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 3) {
          allPts[ptIdx] = [pt[0]! + (dx / len) * 3, pt[1]! + (dy / len) * 3];
        }
        return;
      }

      // Leaf node: determine approach side from segment direction
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx >= absDy) {
        // Horizontal approach → stop at left or right icon edge, centered vertically
        // For start: dx>0 means going right, snap to right edge (+1)
        // For end: dx>0 means approach FROM left, snap to left edge (-1)... wait:
        // dx = approach direction. For end points, dx = pt - neighbor.
        // dx < 0 means approach goes LEFT → arrow comes FROM right → snap to RIGHT edge
        // dx > 0 means approach goes RIGHT → arrow comes FROM left → snap to LEFT edge
        // So for END points, sign is OPPOSITE of dx direction
        const sign = isStartPoint ? (dx > 0 ? 1 : -1) : (dx > 0 ? -1 : 1);
        allPts[ptIdx] = [centerX + sign * (ICON_HALF + EDGE_GAP), centerY];
      } else {
        // Vertical approach — determine if arrow arrives at top or bottom of icon
        // For START: dy>0 = going down = exit from bottom; dy<0 = going up = exit from top
        // For END: dy>0 = pt below neighbor = arrow comes from ABOVE = snap to TOP
        //          dy<0 = pt above neighbor = arrow comes from BELOW = snap BELOW text
        const arrivesFromAbove = isStartPoint ? (dy < 0) : (dy > 0);
        if (arrivesFromAbove) {
          // Arrow comes from above → snap to TOP edge of icon
          allPts[ptIdx] = [centerX, centerY - ICON_HALF - EDGE_GAP];
        } else {
          // Arrow comes from below → snap BELOW label text
          allPts[ptIdx] = [centerX, centerY + ICON_HALF + gap + textH + EDGE_GAP];
        }
      }
    }

    // Snap start endpoint (arrow leaves this element)
    if (allPts.length >= 2) {
      snapEndpoint(0, 1, !!fromIsLeaf, cx1, cy1, fromTextH, true, cx2, cy2, cx1, cy1);
    }

    // Snap end endpoint (arrow arrives at this element)
    if (allPts.length >= 2) {
      const last = allPts.length - 1;
      snapEndpoint(last, last - 1, !!toIsLeaf, cx2, cy2, toTextH, false, cx2, cy2, cx1, cy1);
    }

    // Collapse degenerate segments (< 3px)
    const cleaned: number[][] = [allPts[0]!];
    for (let i = 1; i < allPts.length; i++) {
      const pt = allPts[i]!;
      const prev = cleaned[cleaned.length - 1]!;
      const ddx = pt[0]! - prev[0]!;
      const ddy = pt[1]! - prev[1]!;
      if (ddx * ddx + ddy * ddy >= 9) cleaned.push(pt);
    }
    if (cleaned.length < 2) allPts = [[cx1, cy1], [cx2, cy2]];
    else allPts = cleaned;

    // Ensure final segment ≥ 30px (prevents small arrowheads in Excalidraw)
    if (allPts.length >= 2) {
      const last = allPts.length - 1;
      const prev = allPts[last - 1]!;
      const end = allPts[last]!;
      const fdx = end[0]! - prev[0]!;
      const fdy = end[1]! - prev[1]!;
      const flen = Math.sqrt(fdx * fdx + fdy * fdy);
      if (flen > 0 && flen < 30 && allPts.length >= 3) {
        // Merge the short final segment into the previous one by removing the second-to-last point
        allPts.splice(last - 1, 1);
      }
    }

    // Convert to relative points
    const relPts = allPts.map(p => [p[0]! - allPts[0]![0]!, p[1]! - allPts[0]![1]!]);

    elements.push({
      id: conn.id,
      type: 'arrow',
      x: allPts[0]![0]!, y: allPts[0]![1]!,
      width: Math.abs(cx2 - cx1),
      height: Math.abs(cy2 - cy1),
      points: relPts,
      strokeColor: ARROW_STROKE,
      strokeWidth: ARROW_WIDTH,
      strokeStyle: 'solid',
      roughness: 0,
      startArrowhead: conn.bidirectional ? 'arrow' : null,
      endArrowhead: 'arrow',
      groupIds: [],
    });

    // Numbered badge: explicit badge_pos or perpendicular offset
    if (conn.label && /^\d+$/.test(conn.label)) {
      badgeCount++;
      let badgeCx: number, badgeCy: number;
      if (conn.badgePos && conn.badgePos.length === 2) {
        badgeCx = Math.round(conn.badgePos[0]!);
        badgeCy = Math.round(conn.badgePos[1]!);
      } else {
        const labelOffset = BADGE_SIZE / 2 + 10;
        const mid = pathMidpoint(allPts);
        const off = perpOffset(mid.dx, mid.dy, labelOffset);
        // Try default side first
        let candidateCx = Math.round(mid.mx + off.offX);
        let candidateCy = Math.round(mid.my + off.offY);

        // Check if badge overlaps any existing element — if so, try the other side
        const badgeR = BADGE_SIZE / 2 + 5;
        const overlapsElement = (cx: number, cy: number): boolean => {
          for (const el of elements) {
            if (el.type === 'text') continue;
            if (el.type === 'arrow') {
              // Check if badge overlaps any OTHER arrow (not its own parent)
              if (el.id === conn.id) continue;
              const ox = el.x as number;
              const oy = el.y as number;
              const pts = (el.points as number[][]) || [];
              for (let si = 0; si < pts.length - 1; si++) {
                const sx = ox + pts[si]![0]!;
                const sy = oy + pts[si]![1]!;
                const ex2 = ox + pts[si + 1]![0]!;
                const ey2 = oy + pts[si + 1]![1]!;
                // Simple: check if badge center is within badgeR of the segment line
                const segDx = ex2 - sx;
                const segDy = ey2 - sy;
                const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
                if (segLen > 0) {
                  const t = Math.max(0, Math.min(1, ((cx - sx) * segDx + (cy - sy) * segDy) / (segLen * segLen)));
                  const projX = sx + t * segDx;
                  const projY = sy + t * segDy;
                  const dist = Math.sqrt((cx - projX) ** 2 + (cy - projY) ** 2);
                  if (dist < badgeR) return true;
                }
              }
              continue;
            }
            const ex = el.x as number;
            const ey = el.y as number;
            const ew = (el.width as number) || 0;
            const eh = (el.height as number) || 0;
            // Check if badge circle overlaps element bbox
            if (cx + badgeR > ex && cx - badgeR < ex + ew &&
                cy + badgeR > ey && cy - badgeR < ey + eh) {
              return true;
            }
          }
          return false;
        };

        if (overlapsElement(candidateCx, candidateCy)) {
          // Try the opposite side
          const altCx = Math.round(mid.mx - off.offX);
          const altCy = Math.round(mid.my - off.offY);
          if (!overlapsElement(altCx, altCy)) {
            candidateCx = altCx;
            candidateCy = altCy;
          }
          // If both sides overlap, keep the default — validation will flag it
        }

        badgeCx = candidateCx;
        badgeCy = candidateCy;
      }
      const badgeGroupId = `g-${conn.id}-badge`;
      const bSize = conn.badgeSize ?? BADGE_SIZE;
      const bBg = conn.badgeBg ?? BADGE_BG;
      const bColor = conn.badgeColor ?? BADGE_COLOR;
      const bShape = conn.badgeShape ?? BADGE_SHAPE;

      // Determine element type from shape
      let bgType = 'ellipse';
      let bgRoundness: any = null;
      if (bShape === 'square') { bgType = 'rectangle'; }
      else if (bShape === 'rounded') { bgType = 'rectangle'; bgRoundness = { type: 3, value: Math.round(bSize * 0.3) }; }
      else if (bShape === 'diamond') { bgType = 'diamond'; }

      const bgProps: any = {
        id: `${conn.id}-bg`,
        type: bgType,
        x: badgeCx - bSize / 2, y: badgeCy - bSize / 2,
        width: bSize, height: bSize,
        backgroundColor: bBg, strokeColor: 'transparent',
        strokeWidth: 0, fillStyle: 'solid', roughness: 0,
        groupIds: [badgeGroupId],
      };
      if (bgRoundness) bgProps.roundness = bgRoundness;
      elements.push(bgProps);

      // Text centered in badge — x=cx with textAlign:center (Excalidraw centers AT x)
      // Vertical: cy - lineHeight/2 + small correction for glyph baseline
      const { height: bth } = measureText(conn.label, FONT_SIZE);
      const finalTh = bth > 0 ? bth : FONT_SIZE * 1.25;
      elements.push({
        id: `${conn.id}-tx`,
        type: 'text',
        x: badgeCx, y: badgeCy - finalTh / 2 + FONT_SIZE * 0.05,
        text: conn.label,
        fontSize: FONT_SIZE, fontFamily: 2,
        textAlign: 'center',
        strokeColor: bColor,
        roughness: 0,
        groupIds: [badgeGroupId],
      });
    } else if (conn.label) {
      // Non-numeric label — italic text annotation above/below arrow midpoint
      const mid = pathMidpoint(allPts);
      const { width: labelW } = measureText(conn.label, FONT_SIZE);
      // Position label above horizontal segments, to the side of vertical segments
      const isHorizontal = Math.abs(mid.dx) >= Math.abs(mid.dy);
      const labelX = isHorizontal ? mid.mx - labelW / 2 : mid.mx + 10;
      const labelY = isHorizontal ? mid.my - FONT_SIZE * 1.5 : mid.my - FONT_SIZE * 0.6;
      elements.push({
        id: `${conn.id}-label`,
        type: 'text',
        x: Math.round(labelX), y: Math.round(labelY),
        text: conn.label,
        fontSize: FONT_SIZE, fontFamily: 2,
        textAlign: 'center',
        strokeColor: '#1a1a1a',
        roughness: 0,
        groupIds: [],
      });
    }
  }

  // ── Validation (ported from components.py) ────────────────────────────

  // Check arrow count
  if (arrowCount !== graph.connections.length) {
    validationIssues.push(`Arrow count mismatch: built ${arrowCount}, expected ${graph.connections.length}`);
  }

  // Check all leaf nodes have layout
  for (const shape of Object.values(graph.shapes)) {
    if (shape.children.length === 0 && !layout[shape.id]) {
      validationIssues.push(`Node "${shape.label}" (${shape.id}) has no layout position`);
    }
  }

  // Check orphan nodes: leaf nodes with no connections and no # standalone annotation
  const connectedNodes = new Set<string>();
  for (const conn of graph.connections) {
    connectedNodes.add(conn.from);
    connectedNodes.add(conn.to);
  }
  for (const shape of Object.values(graph.shapes)) {
    if (shape.children.length === 0 && !connectedNodes.has(shape.id)) {
      validationIssues.push(`ORPHAN: node "${shape.label}" (${shape.id}) has no connections — mark with "# standalone: true" or add a connection`);
    }
  }

  // Check diagonal arrow segments
  for (const el of elements) {
    if (el.type !== 'arrow') continue;
    const pts = el.points as number[][];
    for (let i = 0; i < pts.length - 1; i++) {
      const adx = Math.abs(pts[i + 1]![0]! - pts[i]![0]!);
      const ady = Math.abs(pts[i + 1]![1]! - pts[i]![1]!);
      if (adx > 0.5 && ady > 0.5) {
        validationIssues.push(`DIAGONAL: arrow ${el.id} segment ${i} is diagonal`);
      }
    }
  }

  // Check text/arrow overlaps (simplified version of validate_arrow_paths)
  const textEls = elements.filter(e => e.type === 'text');
  const arrowEls = elements.filter(e => e.type === 'arrow');
  for (const a of arrowEls) {
    const ox = a.x as number;
    const oy = a.y as number;
    const absPts = (a.points as number[][]).map(p => [ox + p[0]!, oy + p[1]!]);

    for (const t of textEls) {
      // Skip badge texts (grouped with ellipses)
      if ((t.id as string).endsWith('-tx')) continue;
      const tx = t.x as number;
      const ty = t.y as number;
      const tw = (t.width as number) || measureText(t.text ?? '', t.fontSize ?? FONT_SIZE).width;
      const th = (t.fontSize ?? FONT_SIZE) * 1.4;
      const margin = 10;
      const bx1 = tx - margin;
      const by1 = ty - margin;
      const bx2 = tx + tw + margin;
      const by2 = ty + th + margin;

      for (let i = 0; i < absPts.length - 1; i++) {
        const [sx2, sy2] = absPts[i]!;
        const [ex2, ey2] = absPts[i + 1]!;
        // Simple AABB segment test
        const segMinX = Math.min(sx2!, ex2!);
        const segMaxX = Math.max(sx2!, ex2!);
        const segMinY = Math.min(sy2!, ey2!);
        const segMaxY = Math.max(sy2!, ey2!);
        if (segMaxX >= bx1 && segMinX <= bx2 && segMaxY >= by1 && segMinY <= by2) {
          validationIssues.push(`TEXT_OVERLAP: arrow ${a.id} may cross text "${(t.text ?? '').slice(0, 25)}" (${t.id})`);
          break;
        }
      }
    }
  }

  // ── Build positions map for Main agent ─────────────────────────────────
  const positions: ElementPosition[] = [];
  for (const shape of Object.values(graph.shapes)) {
    const pos = layout[shape.id];
    if (!pos) continue;
    const isContainer = shape.children.length > 0;
    const textH = measureText(shape.label, FONT_SIZE).height;
    const gap = 8;

    // Icon center: for leaf nodes, icon sits at top of node area
    let iconCx = pos.x + pos.w / 2;
    let iconCy = isContainer
      ? pos.y + HEADER_HEIGHT / 2
      : (pos.y + pos.h / 2) - (gap + textH) / 2;

    positions.push({
      id: shape.id,
      type: isContainer ? 'container' : (shape.parent ? 'icon' : 'external'),
      label: shape.label,
      x: pos.x,
      y: pos.y,
      w: pos.w,
      h: pos.h,
      icon_cx: Math.round(iconCx),
      icon_cy: Math.round(iconCy),
      borders: {
        left: pos.x,
        right: pos.x + pos.w,
        top: pos.y,
        bottom: pos.y + pos.h,
      },
    });
  }

  return {
    elements,
    files: fileUploads,
    iconsMissing,
    validationIssues,
    stats: { containers: containerCount, nodes: nodeCount, arrows: arrowCount, badges: badgeCount },
    layoutChanges,
    positions,
  };
}
