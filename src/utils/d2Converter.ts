import { generateId } from '../types.js';
import fs from 'fs';
import path from 'path';
import { searchIcons } from './aws-icon-index.js';
import logger from './logger.js';

// ─── Constants (matching components.py) ─────────────────────────────────

const ICON_SIZE = 65;
const FONT_SIZE = 24;
const HEADER_HEIGHT = 75;
const NODE_W = 140;
const NODE_H = 110; // icon (65) + gap (8) + label (~30)
const H_GAP = 40;
const V_GAP = 40;
const CONTAINER_PAD = 40;
const R = 33; // Arrow endpoint offset from icon center (half icon + gap)

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

interface D2Graph {
  shapes: Record<string, D2Shape>;
  connections: D2Connection[];
}

// ─── D2 Syntax Parser ───────────────────────────────────────────────────

export function parseD2(source: string): D2Graph {
  const shapes: Record<string, D2Shape> = {};
  const connections: D2Connection[] = [];

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

    // Bare attribute for current context shape (style.*, pos, icon)
    const bareAttrMatch = line.match(/^(style\.[\w-]+|pos|icon):\s*(.+)$/);
    if (bareAttrMatch && contextStack.length > 0) {
      const attr = bareAttrMatch[1]!;
      const value = (bareAttrMatch[2] ?? '').trim().replace(/^["']|["']$/g, '');
      const currentId = contextStack[contextStack.length - 1]!;
      const shape = ensureShape(currentId);
      if (attr === 'pos') shape.pos = value;
      else if (attr === 'icon') shape.icon = value;
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

  return { shapes, connections };
}

// ─── Icon Resolution ────────────────────────────────────────────────────

interface ResolvedIcon {
  fileId: string;
  absolutePath: string;
}

function resolveIconForLabel(label: string): ResolvedIcon | null {
  // Try direct search
  const results = searchIcons({ query: label, resolve: true, limit: 3 });
  if (results.results.length > 0) {
    const r = results.results[0]!;
    if (r.absolute_path) {
      return { fileId: r.suggested_file_id, absolutePath: r.absolute_path };
    }
  }

  // Try with common prefixes removed
  const cleaned = label
    .replace(/^(Amazon|AWS|Amazon Web Services)\s+/i, '')
    .trim();
  if (cleaned !== label) {
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

export function layoutD2Graph(graph: D2Graph): Record<string, LayoutNode> {
  const layout: Record<string, LayoutNode> = {};
  const roots = Object.values(graph.shapes).filter(s => !s.parent);

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

    // ── Container: check for explicit pos ──
    let containerX = x, containerY = y;
    let explicitW: number | undefined, explicitH: number | undefined;
    if (shape.pos) {
      const parts = shape.pos.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 4) {
        containerX = parts[0]!;
        containerY = parts[1]!;
        explicitW = parts[2]!;
        explicitH = parts[3]!;
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

    const headerH = HEADER_HEIGHT;
    let contentW = 0;
    let contentH = 0;

    // Layout sub-containers in a row first
    let childX = containerX + CONTAINER_PAD;
    let childY = containerY + headerH + CONTAINER_PAD;
    let rowMaxH = 0;

    for (const cid of containerIds) {
      const child = graph.shapes[cid];
      if (!child) continue;
      const childNode = layoutShape(child, childX, childY);
      // Use actual placed position for next sibling
      childX = childNode.x + childNode.w + H_GAP;
      rowMaxH = Math.max(rowMaxH, childNode.h);
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

    // Layout leaf nodes in rows below sub-containers
    const leafStartY = subContainerBottom;
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

    // Auto-expand for header text
    const headerTextW = measureText(shape.label, FONT_SIZE).width + ICON_SIZE + 20;
    contentW = Math.max(contentW, headerTextW);

    const w = explicitW ?? (contentW + CONTAINER_PAD * 2);
    const h = explicitH ?? (headerH + CONTAINER_PAD + contentH + CONTAINER_PAD);
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
    // Place unpositioned roots (external actors) to the left, stacked vertically
    const minPosX = Math.min(...positionedRoots.map(r => {
      const p = r.pos!.split(',').map(s => parseFloat(s.trim()));
      return p[0]!;
    }));
    let extX = Math.max(CONTAINER_PAD, minPosX - NODE_W - H_GAP * 2);
    let extY = CONTAINER_PAD;
    for (const root of unpositionedRoots) {
      const node = layoutShape(root, extX, extY);
      extY += node.h + V_GAP;
    }
  } else {
    for (const root of unpositionedRoots) {
      const node = layoutShape(root, rootX, CONTAINER_PAD);
      rootX += node.w + H_GAP;
    }
  }

  return layout;
}

// ─── Element Builder ────────────────────────────────────────────────────

export interface ConvertResult {
  elements: any[];
  files: Array<{ id: string; dataURL: string; mimeType: string }>;
  iconsMissing: string[];
  validationIssues: string[];
  stats: { containers: number; nodes: number; arrows: number; badges: number };
}

export function convertD2ToExcalidraw(source: string): ConvertResult {
  const graph = parseD2(source);
  const layout = layoutD2Graph(graph);
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

    } else {
      // ── Leaf node ──
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
        resolved = resolveIconForLabel(shape.label);
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
  const BADGE_SIZE = 38;
  const BADGE_BG = '#232F3E';
  const BADGE_COLOR = '#ffffff';
  const BADGE_SHAPE = 'circle'; // circle, square, rounded, diamond

  function pathMidpoint(pts: number[][]): { mx: number; my: number; dx: number; dy: number } {
    let totalLen = 0;
    const segs: Array<{ x1: number; y1: number; x2: number; y2: number; len: number }> = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i]!;
      const [x2, y2] = pts[i + 1]!;
      const len = Math.sqrt((x2! - x1!) ** 2 + (y2! - y1!) ** 2);
      segs.push({ x1: x1!, y1: y1!, x2: x2!, y2: y2!, len });
      totalLen += len;
    }
    if (totalLen === 0) return { mx: pts[0]![0]!, my: pts[0]![1]!, dx: 1, dy: 0 };
    const half = totalLen / 2;
    let walked = 0;
    for (const s of segs) {
      if (walked + s.len >= half) {
        const t = s.len > 0 ? (half - walked) / s.len : 0.5;
        return { mx: s.x1 + t * (s.x2 - s.x1), my: s.y1 + t * (s.y2 - s.y1), dx: s.x2 - s.x1, dy: s.y2 - s.y1 };
      }
      walked += s.len;
    }
    return { mx: pts[pts.length - 1]![0]!, my: pts[pts.length - 1]![1]!, dx: 0, dy: -1 };
  }

  function perpOffset(segDx: number, segDy: number, offset: number): { offX: number; offY: number } {
    const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
    let px: number, py: number;
    if (segLen > 0) {
      px = -segDy / segLen;
      py = segDx / segLen;
      if (Math.abs(segDx) >= Math.abs(segDy)) {
        if (py > 0) { px = -px; py = -py; }
      } else {
        if (px < 0) { px = -px; py = -py; }
      }
    } else {
      px = 0; py = -1;
    }
    return { offX: px * offset, offY: py * offset };
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
      // Container source: use nearest border edge toward first waypoint or target
      const targetX = (conn.waypoints?.length ? conn.waypoints[0]![0] : toPos.x + toPos.w / 2)!;
      const targetY = (conn.waypoints?.length ? conn.waypoints[0]![1] : toPos.y + toPos.h / 2)!;
      cx1 = fromPos.x + fromPos.w / 2;
      cy1 = fromPos.y + fromPos.h / 2;
      // Determine which border edge is closest to target
      const dLeft = Math.abs(targetX - fromPos.x);
      const dRight = Math.abs(targetX - (fromPos.x + fromPos.w));
      const dTop = Math.abs(targetY - fromPos.y);
      const dBottom = Math.abs(targetY - (fromPos.y + fromPos.h));
      const minD = Math.min(dLeft, dRight, dTop, dBottom);
      if (minD === dBottom) { cx1 = targetX; cy1 = fromPos.y + fromPos.h; }
      else if (minD === dTop) { cx1 = targetX; cy1 = fromPos.y; }
      else if (minD === dLeft) { cx1 = fromPos.x; cy1 = targetY; }
      else { cx1 = fromPos.x + fromPos.w; cy1 = targetY; }
    }

    if (toIsLeaf) {
      cx2 = toPos.x + toPos.w / 2;
      cy2 = (toPos.y + toPos.h / 2) - (gap + toTextH) / 2;
    } else {
      // Container target: use nearest border edge toward last waypoint or source
      const srcX = (conn.waypoints?.length ? conn.waypoints[conn.waypoints.length - 1]![0] : fromPos.x + fromPos.w / 2)!;
      const srcY = (conn.waypoints?.length ? conn.waypoints[conn.waypoints.length - 1]![1] : fromPos.y + fromPos.h / 2)!;
      cx2 = toPos.x + toPos.w / 2;
      cy2 = toPos.y + toPos.h / 2;
      const dLeft = Math.abs(srcX - toPos.x);
      const dRight = Math.abs(srcX - (toPos.x + toPos.w));
      const dTop = Math.abs(srcY - toPos.y);
      const dBottom = Math.abs(srcY - (toPos.y + toPos.h));
      const minD = Math.min(dLeft, dRight, dTop, dBottom);
      if (minD === dLeft) { cx2 = toPos.x; cy2 = srcY; }
      else if (minD === dRight) { cx2 = toPos.x + toPos.w; cy2 = srcY; }
      else if (minD === dTop) { cx2 = srcX; cy2 = toPos.y; }
      else { cx2 = srcX; cy2 = toPos.y + toPos.h; }
    }

    // Build full path at centers first, then offset endpoints by R
    let allPts: number[][];

    if (conn.waypoints && conn.waypoints.length > 0) {
      allPts = [[cx1, cy1], ...conn.waypoints, [cx2, cy2]];
    } else {
      const dx = Math.abs(cx2 - cx1);
      const dy = Math.abs(cy2 - cy1);

      if (dx < 5) {
        allPts = [[cx1, cy1], [cx2, cy2]];
      } else if (dy < 5) {
        allPts = [[cx1, cy1], [cx2, cy2]];
      } else {
        allPts = [[cx1, cy1], [cx2, cy1], [cx2, cy2]];
      }
    }

    // Snap waypoints to orthogonal: each segment must be horizontal or vertical
    // Forward pass: align each waypoint with its predecessor
    for (let k = 1; k < allPts.length - 1; k++) {
      const prev = allPts[k - 1]!;
      const cur = allPts[k]!;
      if (Math.abs(cur[0]! - prev[0]!) < Math.abs(cur[1]! - prev[1]!)) {
        cur[0] = prev[0]!; // snap X to make vertical
      } else {
        cur[1] = prev[1]!; // snap Y to make horizontal
      }
    }
    // Backward pass: align last waypoint with end point
    if (allPts.length >= 3) {
      const lastWp = allPts[allPts.length - 2]!;
      const end = allPts[allPts.length - 1]!;
      if (Math.abs(lastWp[0]! - end[0]!) < Math.abs(lastWp[1]! - end[1]!)) {
        lastWp[0] = end[0]!; // snap X to make vertical
      } else {
        lastWp[1] = end[1]!; // snap Y to make horizontal
      }
    }

    // Offset endpoints: R for leaf nodes (icon edge), small gap for containers (border)
    const startR = fromIsLeaf ? R : 5;
    const endR = toIsLeaf ? R : 5;

    if (allPts.length >= 2) {
      const [s0x, s0y] = allPts[0]!;
      const [n1x, n1y] = allPts[1]!;
      const fdx = n1x! - s0x!;
      const fdy = n1y! - s0y!;
      const flen = Math.sqrt(fdx * fdx + fdy * fdy);
      if (flen > startR) {
        allPts[0] = [s0x! + (fdx / flen) * startR, s0y! + (fdy / flen) * startR];
      }
    }

    if (allPts.length >= 2) {
      const last = allPts.length - 1;
      const [e0x, e0y] = allPts[last]!;
      const [p1x, p1y] = allPts[last - 1]!;
      const ldx = p1x! - e0x!;
      const ldy = p1y! - e0y!;
      const llen = Math.sqrt(ldx * ldx + ldy * ldy);
      if (llen > endR) {
        allPts[last] = [e0x! + (ldx / llen) * endR, e0y! + (ldy / llen) * endR];
      }
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

    // Convert to relative points
    const relPts = allPts.map(p => [p[0]! - allPts[0]![0]!, p[1]! - allPts[0]![1]!]);

    elements.push({
      id: conn.id,
      type: 'arrow',
      x: allPts[0]![0]!, y: allPts[0]![1]!,
      width: Math.abs(cx2 - cx1),
      height: Math.abs(cy2 - cy1),
      points: relPts,
      strokeColor: '#545B64',
      strokeWidth: 2,
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
        badgeCx = Math.round(mid.mx + off.offX);
        badgeCy = Math.round(mid.my + off.offY);
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
      // Non-numeric label — text annotation near midpoint
      const mid = pathMidpoint(allPts);
      elements.push({
        id: `${conn.id}-label`,
        type: 'text',
        x: mid.mx, y: mid.my - 20,
        text: conn.label,
        fontSize: 16, fontFamily: 2,
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

  return {
    elements,
    files: fileUploads,
    iconsMissing,
    validationIssues,
    stats: { containers: containerCount, nodes: nodeCount, arrows: arrowCount, badges: badgeCount },
  };
}
