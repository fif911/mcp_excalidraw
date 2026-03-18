/**
 * Enhanced D2 Builder
 *
 * Pure TypeScript builder that translates an EnhancedD2Graph AST into
 * Excalidraw elements via REST API calls. Ports the component logic from
 * Python components.py — no Python subprocess needed.
 */

import fs from 'fs';
import path from 'path';
import { measureText } from './textMeasure.js';
import { searchIcons, NAMED_COLORS, invalidateIndex, getIconsBaseDir } from './aws-icon-index.js';
import type { EnhancedD2Graph, EnhancedNode, EnhancedContainer, EnhancedConnection, ArrowStyleBlock } from './enhancedD2Parser.js';
import logger from './logger.js';

// ── Constants (locked, matching components.py) ──────────────────────────

const ICON_SIZE = 65;
const FONT_SIZE = 24;
const HEADER_HEIGHT = 75; // ICON_SIZE + 10

// ── REST API helpers ────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const API_BASE = `http://${HOST}:${PORT}/api`;

async function apiPost(urlPath: string, data: any): Promise<any> {
  const resp = await fetch(`${API_BASE}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return resp.json();
}

async function apiDelete(urlPath: string): Promise<any> {
  const resp = await fetch(`${API_BASE}${urlPath}`, { method: 'DELETE' });
  return resp.json();
}

async function apiGet(urlPath: string): Promise<any> {
  const resp = await fetch(`${API_BASE}${urlPath}`);
  return resp.json();
}

// ── Low-level element helpers ───────────────────────────────────────────

async function createElement(element: Record<string, any>): Promise<any> {
  return apiPost('/elements', element);
}

async function clearCanvas(): Promise<void> {
  await apiDelete('/elements/clear');
}

async function uploadSvg(fileId: string, svgPath: string): Promise<void> {
  const data = fs.readFileSync(svgPath);
  const b64 = data.toString('base64');
  await apiPost('/files', [{
    id: fileId,
    dataURL: `data:image/svg+xml;base64,${b64}`,
    mimeType: 'image/svg+xml',
  }]);
}

// ── SVG recolor utility ─────────────────────────────────────────────────

function recolorSvg(srcPath: string, targetColorHex: string, outputPath: string): void {
  let svg = fs.readFileSync(srcPath, 'utf-8');
  // Find dominant fill color (most frequent fill="#XXXXXX")
  const fills = svg.match(/fill="#[0-9A-Fa-f]{6}"/g) ?? [];
  const counts = new Map<string, number>();
  fills.forEach(f => counts.set(f, (counts.get(f) ?? 0) + 1));
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (dominant) {
    svg = svg.replaceAll(dominant, `fill="${targetColorHex}"`);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, svg);
}

// ── Component: icon + label ─────────────────────────────────────────────

interface ComponentResult {
  iconId: string;
  labelId: string | null;
  groupId: string;
  bbox: {
    x: number; y: number; w: number; h: number;
    cx: number; cy: number;
    icon_cx: number; icon_cy: number;
  };
}

async function iconLabelComponent(
  prefix: string,
  fileId: string | null,
  labelText: string,
  cx: number,
  cy: number,
  textColor: string = '#000000',
): Promise<ComponentResult> {
  const iconSize = ICON_SIZE;
  const fontSize = FONT_SIZE;
  const gap = 8;
  const iconId = `img-${prefix}`;
  const labelId = `${prefix}-lbl`;
  const groupId = `g-${prefix}`;

  labelText = labelText.replace(/\\n/g, '\n');
  const hasLabel = Boolean(labelText && labelText.trim());
  let iconX: number, iconY: number, labelX: number, labelY: number;
  let textW = 0, textH = 0, totalH: number, componentW: number;

  if (hasLabel) {
    const m = measureText(labelText, fontSize);
    textW = m.width;
    textH = m.height;
    totalH = iconSize + gap + textH;
    componentW = Math.max(iconSize, textW);
    iconX = cx - iconSize / 2;
    iconY = cy - totalH / 2;
    labelX = cx - textW / 2;
    labelY = iconY + iconSize + gap;
  } else {
    totalH = iconSize;
    componentW = iconSize;
    iconX = cx - iconSize / 2;
    iconY = cy - iconSize / 2;
    labelX = 0;
    labelY = 0;
  }

  // Create icon image
  if (fileId) {
    await createElement({
      id: iconId, type: 'image',
      x: Math.round(iconX * 10) / 10, y: Math.round(iconY * 10) / 10,
      width: iconSize, height: iconSize,
      fileId, status: 'saved', scale: [1, 1],
      strokeWidth: 0,
      groupIds: [groupId],
    });
  }

  // Create label text
  if (hasLabel) {
    const lines = labelText.split('\n');
    const lineH = fontSize * 1.25;

    if (lines.length === 1) {
      await createElement({
        id: labelId, type: 'text',
        x: Math.round(labelX * 10) / 10, y: Math.round(labelY * 10) / 10,
        text: labelText,
        fontSize, fontFamily: '2',
        strokeColor: textColor,
        groupIds: [groupId],
      });
    } else {
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li]!;
        const lineW = measureText(line, fontSize).width;
        const lineX = cx - lineW / 2;
        const lineY = labelY + li * lineH;
        const lid = li > 0 ? `${labelId}-${li}` : labelId;
        await createElement({
          id: lid, type: 'text',
          x: Math.round(lineX * 10) / 10, y: Math.round(lineY * 10) / 10,
          text: line,
          fontSize, fontFamily: '2',
          strokeColor: textColor,
          groupIds: [groupId],
        });
      }
    }
  }

  const iconCx = cx;
  const iconCy = iconY + iconSize / 2;

  return {
    iconId,
    labelId: hasLabel ? labelId : null,
    groupId,
    bbox: {
      x: hasLabel ? Math.min(iconX, labelX) : iconX,
      y: iconY,
      w: componentW,
      h: totalH,
      cx, cy,
      icon_cx: iconCx,
      icon_cy: iconCy,
    },
  };
}

// ── Component: container box ────────────────────────────────────────────

interface ContainerResult {
  boxId: string;
  iconId: string | null;
  labelId: string | null;
  groupId: string;
  bbox: { x: number; y: number; w: number; h: number };
}

async function containerBox(
  cid: string,
  x: number, y: number, w: number, h: number,
  strokeColor: string,
  opts: {
    fillColor?: string;
    iconFileId?: string;
    labelText?: string;
    labelColor?: string;
    strokeWidth?: number;
    strokeStyle?: string;
  } = {},
): Promise<ContainerResult> {
  const groupId = `g-${cid}`;
  const fillColor = opts.fillColor ?? 'transparent';
  const strokeWidth = opts.strokeWidth ?? 2;
  const strokeStyle = opts.strokeStyle ?? 'solid';
  const iconSz = ICON_SIZE;
  const labelFontSize = FONT_SIZE;
  let iconId: string | null = null;
  let labelId: string | null = null;

  // Convert \n escapes to real newlines
  if (opts.labelText) opts.labelText = opts.labelText.replace(/\\n/g, '\n');

  // Auto-expand width to fit header text
  if (opts.labelText) {
    const { width: tw } = measureText(opts.labelText, labelFontSize);
    const minW = opts.iconFileId ? (iconSz + 5 + tw + 20) : (10 + tw + 20);
    w = Math.max(w, minW);
  }

  // Box rectangle
  await createElement({
    id: cid, type: 'rectangle',
    x, y, width: w, height: h,
    strokeColor,
    backgroundColor: fillColor,
    strokeWidth,
    strokeStyle,
    roughness: 0,
    fillStyle: fillColor !== 'transparent' ? 'solid' : 'hachure',
    roundness: null,  // corner_radius always 0
    groupIds: [groupId],
  });

  // Header icon (flush top-left)
  if (opts.iconFileId) {
    iconId = `img-${cid}-hdr`;
    await createElement({
      id: iconId, type: 'image',
      x, y,
      width: iconSz, height: iconSz,
      fileId: opts.iconFileId, status: 'saved', scale: [1, 1],
      strokeWidth: 0,
      groupIds: [groupId],
    });
  }

  // Header label
  if (opts.labelText) {
    labelId = `${cid}-lbl`;
    const { width: tw, height: th } = measureText(opts.labelText, labelFontSize);
    let lx: number, ly: number;
    if (opts.iconFileId) {
      lx = x + iconSz + 5;
      const centerH = HEADER_HEIGHT;
      ly = y + (centerH - th) / 2 - labelFontSize * 0.1;
    } else {
      lx = x + (w - tw) / 2;
      ly = y + 8;
    }
    await createElement({
      id: labelId, type: 'text',
      x: lx, y: Math.round(ly * 10) / 10,
      text: opts.labelText,
      fontSize: labelFontSize, fontFamily: '2',
      strokeColor: opts.labelColor ?? strokeColor,
      groupIds: [groupId],
    });
  }

  return { boxId: cid, iconId, labelId, groupId, bbox: { x, y, w, h } };
}

// ── Component: numbered circle/badge ────────────────────────────────────

async function numberedCircle(
  prefix: string,
  number: number,
  cx: number,
  cy: number,
  size: number,
  bgColor: string,
  textColor: string,
  shape: string = 'circle',
): Promise<void> {
  const fontSize = FONT_SIZE;
  const bgId = `${prefix}-bg`;
  const textId = `${prefix}-tx`;
  const groupId = `g-${prefix}`;

  let elType: string;
  let roundness: any = null;
  if (shape === 'circle') {
    elType = 'ellipse';
  } else if (shape === 'square') {
    elType = 'rectangle';
  } else if (shape === 'rounded') {
    elType = 'rectangle';
    roundness = { type: 3, value: Math.round(size * 0.3) };
  } else if (shape === 'diamond') {
    elType = 'diamond';
  } else {
    elType = 'ellipse'; // fallback
  }

  const bgProps: Record<string, any> = {
    id: bgId, type: elType,
    x: cx - size / 2, y: cy - size / 2,
    width: size, height: size,
    backgroundColor: bgColor, strokeColor: 'transparent',
    strokeWidth: 0, fillStyle: 'solid', roughness: 0,
    groupIds: [groupId],
  };
  if (roundness) bgProps['roundness'] = roundness;
  await createElement(bgProps);

  // Text centering
  const txt = String(number);
  const { height: th } = measureText(txt, fontSize);
  const finalTh = th > 0 ? th : fontSize * 1.25;
  const vertCorrection = fontSize * 0.05;

  await createElement({
    id: textId, type: 'text',
    x: cx, y: cy - finalTh / 2 + vertCorrection,
    text: txt,
    fontSize, fontFamily: '2',
    textAlign: 'center',
    strokeColor: textColor,
    groupIds: [groupId],
  });
}

// ── Arrow helpers ───────────────────────────────────────────────────────

interface Segment {
  index: number;
  start: [number, number];
  end: [number, number];
  dx: number;
  dy: number;
  length: number;
  orientation: string;
  midpoint: [number, number];
}

function buildSegments(allPts: Array<[number, number]>): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < allPts.length - 1; i++) {
    const [x1, y1] = allPts[i]!;
    const [x2, y2] = allPts[i + 1]!;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    segments.push({
      index: i,
      start: [x1, y1],
      end: [x2, y2],
      dx, dy,
      length: Math.round(len * 10) / 10,
      orientation: Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical',
      midpoint: [Math.round((x1 + x2) / 2 * 10) / 10, Math.round((y1 + y2) / 2 * 10) / 10],
    });
  }
  return segments;
}

function pathMidpoint(allPts: Array<[number, number]>): { mx: number; my: number; dx: number; dy: number } {
  const segments: Array<{ x1: number; y1: number; x2: number; y2: number; len: number }> = [];
  let totalLen = 0;
  for (let i = 0; i < allPts.length - 1; i++) {
    const [x1, y1] = allPts[i]!;
    const [x2, y2] = allPts[i + 1]!;
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    segments.push({ x1, y1, x2, y2, len });
    totalLen += len;
  }
  if (totalLen === 0) return { mx: allPts[0]![0], my: allPts[0]![1], dx: 1, dy: 0 };

  const half = totalLen / 2;
  let walked = 0;
  for (const seg of segments) {
    if (walked + seg.len >= half) {
      const remain = half - walked;
      const t = seg.len > 0 ? remain / seg.len : 0.5;
      return {
        mx: seg.x1 + t * (seg.x2 - seg.x1),
        my: seg.y1 + t * (seg.y2 - seg.y1),
        dx: seg.x2 - seg.x1,
        dy: seg.y2 - seg.y1,
      };
    }
    walked += seg.len;
  }
  return { mx: allPts[allPts.length - 1]![0], my: allPts[allPts.length - 1]![1], dx: 0, dy: -1 };
}

function perpOffset(segDx: number, segDy: number, offset: number): { offX: number; offY: number } {
  const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
  let perpX: number, perpY: number;
  if (segLen > 0) {
    perpX = -segDy / segLen;
    perpY = segDx / segLen;
    if (Math.abs(segDx) >= Math.abs(segDy)) {
      if (perpY > 0) { perpX = -perpX; perpY = -perpY; }
    } else {
      if (perpX < 0) { perpX = -perpX; perpY = -perpY; }
    }
  } else {
    perpX = 0; perpY = -1;
  }
  return { offX: perpX * offset, offY: perpY * offset };
}

// ── Component: arrow ────────────────────────────────────────────────────

async function createArrow(
  aid: string,
  startX: number, startY: number,
  endX: number, endY: number,
  arrowStyle: ArrowStyleBlock,
  opts: {
    waypoints?: Array<{ x: number; y: number }>;
    labelNumber?: number;
    badgePos?: { cx: number; cy: number };
    bidirectional?: boolean;
  } = {},
): Promise<void> {
  let allPts: Array<[number, number]>;
  if (opts.waypoints && opts.waypoints.length > 0) {
    allPts = [[startX, startY], ...opts.waypoints.map(w => [w.x, w.y] as [number, number]), [endX, endY]];
  } else {
    allPts = [[startX, startY], [endX, endY]];
  }

  // Collapse degenerate segments (< 3px)
  const cleaned: Array<[number, number]> = [allPts[0]!];
  for (let i = 1; i < allPts.length; i++) {
    const pt = allPts[i]!;
    const prev = cleaned[cleaned.length - 1]!;
    const dx = pt[0] - prev[0];
    const dy = pt[1] - prev[1];
    if (dx * dx + dy * dy >= 9) {
      cleaned.push(pt);
    }
  }
  if (cleaned.length < 2) {
    allPts = [[startX, startY], [endX, endY]]; // fallback
  } else {
    allPts = cleaned;
  }

  const points = allPts.map(([px, py]) => [px - allPts[0]![0], py - allPts[0]![1]]);

  await createElement({
    id: aid, type: 'arrow',
    x: allPts[0]![0], y: allPts[0]![1],
    width: Math.abs(endX - startX), height: Math.abs(endY - startY),
    strokeColor: arrowStyle.stroke,
    strokeWidth: arrowStyle.stroke_width,
    strokeStyle: 'solid',
    roughness: 0,
    startArrowhead: opts.bidirectional ? 'arrow' : null,
    endArrowhead: 'arrow',
    points,
  });

  // Optional numbered badge
  if (opts.labelNumber != null) {
    const labelOffset = arrowStyle.badge_size / 2 + 5;
    let badgeCx: number, badgeCy: number;

    if (opts.badgePos) {
      // Manual override
      badgeCx = opts.badgePos.cx;
      badgeCy = opts.badgePos.cy;
    } else {
      // Path midpoint
      const mid = pathMidpoint(allPts);
      const off = perpOffset(mid.dx, mid.dy, labelOffset);
      badgeCx = mid.mx + off.offX;
      badgeCy = mid.my + off.offY;
    }

    await numberedCircle(
      `${aid}-lbl`,
      opts.labelNumber,
      Math.round(badgeCx),
      Math.round(badgeCy),
      arrowStyle.badge_size,
      arrowStyle.badge_bg,
      arrowStyle.badge_color,
      arrowStyle.badge_shape,
    );
  }
}

// ── Border point computation ────────────────────────────────────────────

function containerBorderPoint(
  containerPos: { x: number; y: number; w: number; h: number },
  side: 'left' | 'right' | 'top' | 'bottom',
  atY?: number,
  atX?: number,
): { x: number; y: number } {
  const { x, y, w, h } = containerPos;
  switch (side) {
    case 'left':   return { x, y: atY ?? (y + h / 2) };
    case 'right':  return { x: x + w, y: atY ?? (y + h / 2) };
    case 'top':    return { x: atX ?? (x + w / 2), y };
    case 'bottom': return { x: atX ?? (x + w / 2), y: y + h };
  }
}

// ── External actor validation ───────────────────────────────────────────

function externalActorCheck(
  actorCx: number,
  actorCy: number,
  containers: Map<string, EnhancedContainer>,
): string[] {
  const half = ICON_SIZE / 2;
  const issues: string[] = [];
  for (const [cid, c] of containers) {
    const { x, y, w, h } = c.pos;
    if (x <= actorCx + half && actorCx - half <= x + w &&
        y <= actorCy + half && actorCy - half <= y + h) {
      issues.push(`External actor at (${actorCx}, ${actorCy}) overlaps container "${cid}" [${x},${y} ${w}x${h}]`);
    }
  }
  return issues;
}

// ── Icon resolution ─────────────────────────────────────────────────────

interface ResolvedIcon {
  fileId: string;
  absolutePath: string;
}

function resolveIcon(
  query: string,
  iconColor?: string,
  iconVariant?: string,
): ResolvedIcon | null {
  // Step 1: if icon_color, search custom variants first
  if (iconColor) {
    const results = searchIcons({ query, color: iconColor, resolve: true, limit: 1 });
    if (results.results.length > 0) {
      const r = results.results[0]!;
      if (r.absolute_path) {
        return { fileId: r.suggested_file_id, absolutePath: r.absolute_path };
      }
    }

    // Not found — search standard icon and recolor
    const stdResults = searchIcons({ query, resolve: true, limit: 1 });
    if (stdResults.results.length > 0) {
      const std = stdResults.results[0]!;
      if (std.absolute_path) {
        const colorHex = NAMED_COLORS[iconColor.toLowerCase()];
        if (colorHex) {
          // Build output path in icons/custom/
          const baseName = path.basename(std.filename, '.svg');
          const outputName = `${baseName}_${iconColor}.svg`;
          const iconsBase = getIconsBaseDir();
          const outputPath = path.join(iconsBase, 'custom', outputName);
          recolorSvg(std.absolute_path, colorHex, outputPath);
          invalidateIndex(); // force re-scan
          // Re-search to get the new entry's suggested_file_id
          const newResults = searchIcons({ query, color: iconColor, resolve: true, limit: 1 });
          if (newResults.results.length > 0 && newResults.results[0]!.absolute_path) {
            return { fileId: newResults.results[0]!.suggested_file_id, absolutePath: newResults.results[0]!.absolute_path };
          }
          // Fallback: use the output path directly
          const fileId = `file-${baseName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${iconColor.toLowerCase()}`;
          return { fileId, absolutePath: outputPath };
        }
      }
    }
  }

  // Step 2: standard search
  const params: any = { query, resolve: true, limit: 1 };
  if (iconVariant) params.variant = iconVariant;
  const results = searchIcons(params);
  if (results.results.length > 0) {
    const r = results.results[0]!;
    if (r.absolute_path) {
      return { fileId: r.suggested_file_id, absolutePath: r.absolute_path };
    }
  }

  return null;
}

// ── Post-build badge centering ──────────────────────────────────────────

async function centerAllBadgeTexts(): Promise<number> {
  // Give the browser a moment to render
  await new Promise(resolve => setTimeout(resolve, 500));

  const resp = await apiGet('/elements');
  const els: any[] = resp.elements ?? [];
  const elMap = new Map<string, any>();
  els.forEach(e => elMap.set(e.id, e));

  let centered = 0;
  for (const el of els) {
    if (el.id?.endsWith('-bg') && ['ellipse', 'rectangle', 'diamond'].includes(el.type)) {
      const txId = el.id.slice(0, -3) + '-tx';
      if (elMap.has(txId)) {
        try {
          await apiPost('/align', {
            parentId: el.id,
            childIds: [txId],
            alignment: 'center',
          });
          centered++;
        } catch {
          // Browser not connected or timeout — skip silently
        }
      }
    }
  }
  return centered;
}

// ── Main build function ─────────────────────────────────────────────────

export interface BuildResult {
  success: boolean;
  elementCount: number;
  containers: number;
  nodes: number;
  arrows: number;
  iconsMissing: string[];
  validationIssues: string[];
  badgesCentered: number;
}

export async function buildFromEnhancedD2(
  graph: EnhancedD2Graph,
  options?: { export?: boolean },
): Promise<BuildResult> {
  const iconsMissing: string[] = [];
  const validationIssues: string[] = [];

  // 1. Clear canvas
  await clearCanvas();

  // 2. Resolve & upload icons
  const iconMap = new Map<string, string>(); // shortId → fileId
  const uploadedPaths = new Set<string>();   // dedup

  // Gather all icon queries: nodes + container headers
  const iconQueries: Array<{ id: string; query: string; color?: string; variant?: string }> = [];

  for (const [id, node] of graph.nodes) {
    if (node.icon) {
      iconQueries.push({ id, query: node.icon, color: node.icon_color, variant: node.icon_variant });
    }
  }
  for (const [id, container] of graph.containers) {
    if (container.header_icon) {
      iconQueries.push({ id: `hdr-${id}`, query: container.header_icon });
    }
  }

  for (const iq of iconQueries) {
    const resolved = resolveIcon(iq.query, iq.color, iq.variant);
    if (resolved) {
      iconMap.set(iq.id, resolved.fileId);
      if (!uploadedPaths.has(resolved.absolutePath)) {
        await uploadSvg(resolved.fileId, resolved.absolutePath);
        uploadedPaths.add(resolved.absolutePath);
      }
    } else {
      iconsMissing.push(`${iq.id}: "${iq.query}"${iq.color ? ` (color: ${iq.color})` : ''}`);
      logger.warn(`Icon not found for "${iq.id}": query="${iq.query}"`);
    }
  }

  // 3. Build containers (outermost first — sorted by nesting depth)
  const containersByDepth = [...graph.containers.values()].sort((a, b) => {
    const depthA = a.qualifiedId.split('.').length;
    const depthB = b.qualifiedId.split('.').length;
    return depthA - depthB;
  });

  for (const c of containersByDepth) {
    await containerBox(c.id, c.pos.x, c.pos.y, c.pos.w, c.pos.h, c.stroke, {
      fillColor: c.fill,
      iconFileId: iconMap.get(`hdr-${c.id}`),
      labelText: c.label,
      strokeWidth: c.stroke_width,
      strokeStyle: c.stroke_style,
    });
  }

  // 4. Place service nodes
  const componentMap = new Map<string, ComponentResult>();

  for (const [id, node] of graph.nodes) {
    const fileId = iconMap.get(id) ?? null;
    const comp = await iconLabelComponent(id, fileId, node.label, node.pos.cx, node.pos.cy);
    componentMap.set(id, comp);
  }

  // 5. Validate external actors
  for (const [id, node] of graph.nodes) {
    if (node.external) {
      const comp = componentMap.get(id);
      if (comp) {
        const issues = externalActorCheck(comp.bbox.icon_cx, comp.bbox.icon_cy, graph.containers);
        validationIssues.push(...issues);
      }
    }
  }

  // 6. Draw arrows
  for (const conn of graph.connections) {
    const aid = `a-${conn.from}-${conn.to}`;

    // Resolve start coordinates
    let startX: number, startY: number;
    const fromComp = componentMap.get(conn.from);
    const fromContainer = graph.containers.get(conn.from);
    if (fromComp) {
      startX = fromComp.bbox.icon_cx;
      startY = fromComp.bbox.icon_cy;
    } else if (fromContainer) {
      startX = fromContainer.pos.x + fromContainer.pos.w / 2;
      startY = fromContainer.pos.y + fromContainer.pos.h / 2;
    } else {
      validationIssues.push(`Arrow ${aid}: cannot resolve start element "${conn.from}"`);
      continue;
    }

    // Resolve end coordinates
    let endX: number, endY: number;
    if (conn.border_stop) {
      const bsContainer = graph.containers.get(conn.border_stop.containerId);
      if (!bsContainer) {
        validationIssues.push(`Arrow ${aid}: border_stop container "${conn.border_stop.containerId}" not found`);
        continue;
      }
      const side = conn.border_stop.side;
      const atY = (side === 'left' || side === 'right') ? startY : undefined;
      const atX = (side === 'top' || side === 'bottom') ? startX : undefined;
      const bp = containerBorderPoint(bsContainer.pos, side, atY, atX);
      endX = bp.x;
      endY = bp.y;
    } else {
      const toComp = componentMap.get(conn.to);
      const toContainer = graph.containers.get(conn.to);
      if (toComp) {
        endX = toComp.bbox.icon_cx;
        endY = toComp.bbox.icon_cy;
      } else if (toContainer) {
        endX = toContainer.pos.x + toContainer.pos.w / 2;
        endY = toContainer.pos.y + toContainer.pos.h / 2;
      } else {
        validationIssues.push(`Arrow ${aid}: cannot resolve end element "${conn.to}"`);
        continue;
      }
    }

    await createArrow(aid, startX, startY, endX, endY, graph.arrow_style, {
      waypoints: conn.waypoints,
      labelNumber: conn.plain ? undefined : conn.label_number,
      badgePos: conn.badge_pos,
      bidirectional: conn.bidirectional,
    });
  }

  // 7. Post-build badge centering
  const badgesCentered = await centerAllBadgeTexts();

  // 8. Basic validation
  const resp = await apiGet('/elements');
  const elementCount = resp.elements?.length ?? 0;

  // Verify arrow count
  const expectedArrows = graph.connections.length;
  const actualArrows = (resp.elements ?? []).filter((e: any) => e.type === 'arrow').length;
  if (actualArrows !== expectedArrows) {
    validationIssues.push(`Arrow count mismatch: expected ${expectedArrows}, found ${actualArrows}`);
  }

  // 9. Optional export
  if (options?.export) {
    try {
      await apiPost('/export/image', { format: 'png', background: true });
    } catch (err) {
      validationIssues.push(`Export failed: ${(err as Error).message}`);
    }
  }

  return {
    success: validationIssues.length === 0,
    elementCount,
    containers: graph.containers.size,
    nodes: graph.nodes.size,
    arrows: graph.connections.length,
    iconsMissing,
    validationIssues,
    badgesCentered,
  };
}
