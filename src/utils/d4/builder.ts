/**
 * D4 Excalidraw Element Builder
 *
 * Converts ELK layout coordinates + D4Graph into Excalidraw elements.
 * Positions come from ELK (D4Layout), NOT custom routing.
 */
import fs from 'fs';
import path from 'path';
import { generateId } from '../../types.js';
import { searchIcons } from '../aws-icon-index.js';
import { ICON_SIZE, FONT_SIZE, HEADER_HEIGHT, measureText } from './shared.js';
import type { D4Graph, D4Node, D4Edge, D4Layout, D4LayoutEdge, D4Result, D4ArrowStyle } from './types.js';

// ─── Icon Resolution (adapted from d3Converter.ts) ──────────────────────

interface ResolvedIcon {
  fileId: string;
  absolutePath: string;
}

interface IconHints {
  iconType?: string;
  iconVariant?: string;
  iconHint?: string;
}

function resolveIconForLabel(label: string, hints?: IconHints): ResolvedIcon | null {
  const query = hints?.iconHint ?? label;

  const searchOpts: any = { query, resolve: true, limit: 5 };
  if (hints?.iconType) searchOpts.icon_type = hints.iconType;

  const results = searchIcons(searchOpts);

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

// AWS container detection — explicit icon paths for group icons
const ICONS_BASE = 'aws-icons-official/Architecture-Group-Icons_01302026';
const AWS_CONTAINER_PATTERNS: Array<{ pattern: RegExp; headerIcon: string; strokeColor: string }> = [
  { pattern: /aws\s+cloud/i, headerIcon: `${ICONS_BASE}/AWS-Cloud-logo_32.svg`, strokeColor: '#232F3E' },
  { pattern: /account/i, headerIcon: `${ICONS_BASE}/AWS-Cloud_32.svg`, strokeColor: '#232F3E' },
  { pattern: /region/i, headerIcon: `${ICONS_BASE}/Region_32.svg`, strokeColor: '#147EBA' },
  { pattern: /vpc/i, headerIcon: `${ICONS_BASE}/Virtual-private-cloud-VPC_32.svg`, strokeColor: '#248814' },
  { pattern: /step\s*functions/i, headerIcon: '', strokeColor: '#E7157B' },
];

function detectContainerType(label: string): { headerIcon: string; strokeColor: string } | null {
  for (const p of AWS_CONTAINER_PATTERNS) {
    if (p.pattern.test(label)) return { headerIcon: p.headerIcon, strokeColor: p.strokeColor };
  }
  return null;
}

// ─── Arrow helpers ──────────────────────────────────────────────────────

function pathMidpoint(pts: number[][]): { mx: number; my: number; dx: number; dy: number } {
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number; len: number }> = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[i + 1]!;
    const len = Math.sqrt((x2! - x1!) ** 2 + (y2! - y1!) ** 2);
    segs.push({ x1: x1!, y1: y1!, x2: x2!, y2: y2!, len });
  }
  if (segs.length === 0) return { mx: pts[0]![0]!, my: pts[0]![1]!, dx: 1, dy: 0 };

  let longest = segs[0]!;
  for (const s of segs) {
    if (s.len > longest.len) longest = s;
  }
  const mx = (longest.x1 + longest.x2) / 2;
  const my = (longest.y1 + longest.y2) / 2;
  return { mx, my, dx: longest.x2 - longest.x1, dy: longest.y2 - longest.y1 };
}

function perpOffset(segDx: number, segDy: number, offset: number): { offX: number; offY: number } {
  if (Math.abs(segDx) >= Math.abs(segDy)) {
    return { offX: 0, offY: -offset };
  } else {
    return { offX: offset, offY: 0 };
  }
}

// ─── Main Builder ───────────────────────────────────────────────────────

export function buildD4Elements(graph: D4Graph, layout: D4Layout): D4Result {
  const elements: any[] = [];
  const files: Array<{ id: string; dataURL: string; mimeType: string }> = [];
  const iconsMissing: string[] = [];
  const validationIssues: string[] = [];
  const positions: D4Result['positions'] = [];
  const uploadedPaths = new Map<string, string>(); // absolutePath → fileId

  let containerCount = 0;
  let nodeCount = 0;
  let arrowCount = 0;
  let badgeCount = 0;

  // Helper: upload icon SVG and return fileId (deduplicates by path)
  const uploadIcon = (resolved: ResolvedIcon): string => {
    if (uploadedPaths.has(resolved.absolutePath)) {
      return uploadedPaths.get(resolved.absolutePath)!;
    }
    try {
      const data = fs.readFileSync(resolved.absolutePath);
      const b64 = data.toString('base64');
      files.push({
        id: resolved.fileId,
        dataURL: `data:image/svg+xml;base64,${b64}`,
        mimeType: 'image/svg+xml',
      });
      uploadedPaths.set(resolved.absolutePath, resolved.fileId);
    } catch {
      validationIssues.push(`Failed to read icon: ${resolved.absolutePath}`);
    }
    return resolved.fileId;
  };

  const iconsDir = path.resolve(process.cwd(), 'icons');

  // ── Build shapes ────────────────────────────────────────────────────

  for (const [nodeId, node] of Object.entries(graph.nodes)) {
    const pos = layout.nodes[nodeId];
    if (!pos) {
      validationIssues.push(`No layout position for node: ${nodeId}`);
      continue;
    }

    const safeId = nodeId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const isDashed = Boolean(node.style['stroke-dash']);
    const strokeColor = node.style['stroke'] ?? (node.isGroup ? '#545B64' : '#1a1a1a');

    if (node.isGroup) {
      // ── Container ──
      containerCount++;
      const groupId = `g-${safeId}`;
      const containerType = detectContainerType(node.label);

      // Container rectangle
      elements.push({
        id: safeId,
        type: 'rectangle',
        x: pos.x, y: pos.y,
        width: pos.w, height: pos.h,
        strokeColor: node.style['stroke'] ?? containerType?.strokeColor ?? strokeColor,
        backgroundColor: 'transparent',
        strokeWidth: 2,
        strokeStyle: isDashed ? 'dashed' : 'solid',
        roughness: 0,
        fillStyle: 'solid',
        roundness: null,
        groupIds: [groupId],
      });

      // Header icon (for detected AWS containers, not for dashed sub-boundaries)
      if (containerType && !isDashed) {
        let headerResolved: ResolvedIcon | null = null;
        if (containerType.headerIcon) {
          const fullPath = path.resolve(iconsDir, containerType.headerIcon);
          if (fs.existsSync(fullPath)) {
            headerResolved = { fileId: `file-hdr-${safeId}`, absolutePath: fullPath };
          }
        }
        if (!headerResolved) {
          headerResolved = resolveIconForLabel(node.label);
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
      const { width: tw, height: th } = measureText(node.label, FONT_SIZE);
      const hasHeaderIcon = containerType && !isDashed;
      const lx = hasHeaderIcon ? pos.x + ICON_SIZE + 5 : pos.x + 10;
      const ly = hasHeaderIcon
        ? pos.y + (HEADER_HEIGHT - th) / 2 - FONT_SIZE * 0.1
        : pos.y + 8;

      elements.push({
        id: `${safeId}-lbl`,
        type: 'text',
        x: lx, y: Math.round(ly * 10) / 10,
        text: node.label,
        fontSize: FONT_SIZE, fontFamily: 2,
        strokeColor: '#1a1a1a',
        roughness: 0,
        groupIds: [groupId],
      });

      // Position record
      positions.push({
        id: nodeId,
        type: 'container',
        label: node.label,
        x: pos.x, y: pos.y, w: pos.w, h: pos.h,
        icon_cx: pos.x + pos.w / 2,
        icon_cy: pos.y + pos.h / 2,
      });

    } else {
      // ── Leaf node (icon + label) ──
      nodeCount++;
      const groupId = `g-${safeId}`;
      const cx = pos.x + pos.w / 2;
      const cy = pos.y + pos.h / 2;

      // Try explicit icon path first, then auto-resolve from label
      let resolved: ResolvedIcon | null = null;
      if (node.icon) {
        const fullPath = path.resolve(iconsDir, node.icon);
        if (fs.existsSync(fullPath)) {
          resolved = { fileId: `file-${safeId}`, absolutePath: fullPath };
        } else {
          // Try as search query
          const sr = searchIcons({ query: node.icon, resolve: true, limit: 1 });
          if (sr.results.length > 0 && sr.results[0]!.absolute_path) {
            resolved = { fileId: sr.results[0]!.suggested_file_id, absolutePath: sr.results[0]!.absolute_path };
          }
        }
      }
      if (!resolved) {
        resolved = resolveIconForLabel(node.label, {
          iconType: node.iconType,
          iconVariant: node.iconVariant,
          iconHint: node.iconHint,
        });
      }

      const gap = 8;

      if (resolved) {
        const fid = uploadIcon(resolved);
        const { height: textH } = measureText(node.label, FONT_SIZE);
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
        const lines = node.label.split('\n');
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

        // Position record
        positions.push({
          id: nodeId,
          type: 'icon',
          label: node.label,
          x: pos.x, y: pos.y, w: pos.w, h: pos.h,
          icon_cx: Math.round(cx),
          icon_cy: Math.round(iconY + ICON_SIZE / 2),
        });

      } else {
        // No icon found — bordered rectangle with centered text
        iconsMissing.push(node.label);
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
        const { width: fbTextW, height: fbTextH } = measureText(node.label, FONT_SIZE);
        elements.push({
          id: `${safeId}-lbl`,
          type: 'text',
          x: cx - fbTextW / 2, y: cy - fbTextH / 2,
          text: node.label,
          fontSize: FONT_SIZE, fontFamily: 2,
          textAlign: 'center',
          strokeColor: '#1a1a1a',
          roughness: 0,
          groupIds: [groupId],
        });

        // Position record for fallback
        positions.push({
          id: nodeId,
          type: 'icon',
          label: node.label,
          x: pos.x, y: pos.y, w: pos.w, h: pos.h,
          icon_cx: Math.round(cx),
          icon_cy: Math.round(cy),
        });
      }
    }
  }

  // ── Build arrows ──────────────────────────────────────────────────────

  const ARROW_STROKE = graph.arrowStyle.strokeColor;
  const ARROW_WIDTH = graph.arrowStyle.strokeWidth;
  const BADGE_SIZE = graph.arrowStyle.badgeSize;
  const BADGE_BG = graph.arrowStyle.badgeBg;
  const BADGE_COLOR = graph.arrowStyle.badgeColor;
  const BADGE_SHAPE = graph.arrowStyle.badgeShape;

  for (const layoutEdge of layout.edges) {
    // Find the matching D4Edge for bidirectional/style info
    const graphEdge = graph.edges.find(e => e.id === layoutEdge.id);
    if (!graphEdge) {
      validationIssues.push(`No graph edge found for layout edge: ${layoutEdge.id}`);
      continue;
    }

    let pts = layoutEdge.points;
    if (!pts || pts.length < 2) {
      validationIssues.push(`Edge ${layoutEdge.id} has fewer than 2 points`);
      continue;
    }

    arrowCount++;

    // ELK places arrow endpoints at node BORDERS, but we want arrows to reach
    // icon edges (the visual element inside the node box). Snap endpoints
    // from ELK border positions to icon edges for leaf nodes.
    //
    // IMPORTANT: We compute snap directions from the ORIGINAL ELK points before
    // any snapping, then apply both snaps. Using post-snap coordinates for the
    // second snap would corrupt the direction when snapping moves a point far
    // from its original position.
    const fromPos = layout.nodes[layoutEdge.from];
    const toPos = layout.nodes[layoutEdge.to];
    const fromNode = graph.nodes[layoutEdge.from];
    const toNode = graph.nodes[layoutEdge.to];

    // Save original ELK points for direction computation
    const origPts = pts.map(p => [...p]);

    if (fromPos && fromNode && !fromNode.isGroup) {
      // Snap start to source icon edge
      const fromCx = fromPos.x + fromPos.w / 2;
      const fromTextH = measureText(fromNode.label, FONT_SIZE).height;
      const fromIconCy = fromPos.y + fromPos.h / 2 - (8 + fromTextH) / 2;

      // Use original ELK points for direction, falling back to target node
      // center when ELK points don't clearly indicate direction
      const firstPt = origPts[0]!;
      const nextPt = origPts.length > 1 ? origPts[1]! : firstPt;
      let dx = nextPt[0]! - firstPt[0]!;
      let dy = nextPt[1]! - firstPt[1]!;

      // If ELK points are nearly coincident, use target node center for direction
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && toPos) {
        dx = (toPos.x + toPos.w / 2) - fromCx;
        dy = (toPos.y + toPos.h / 2) - fromIconCy;
      }

      if (Math.abs(dx) >= Math.abs(dy)) {
        const signX = dx > 0 ? 1 : -1;
        pts = [[fromCx + signX * (ICON_SIZE / 2 + 5), fromIconCy], ...pts.slice(1)];
      } else {
        const signY = dy > 0 ? 1 : -1;
        pts = [[fromCx, fromIconCy + signY * (ICON_SIZE / 2 + 5)], ...pts.slice(1)];
      }
    }

    if (toPos && toNode && !toNode.isGroup) {
      // Snap end to target icon edge
      const toCx = toPos.x + toPos.w / 2;
      const toTextH = measureText(toNode.label, FONT_SIZE).height;
      const toIconCy = toPos.y + toPos.h / 2 - (8 + toTextH) / 2;

      // Use ORIGINAL ELK points for direction (not post-snap), falling back
      // to source node center when ELK points are nearly coincident
      const lastOrigPt = origPts[origPts.length - 1]!;
      const prevOrigPt = origPts.length > 1 ? origPts[origPts.length - 2]! : lastOrigPt;
      let dx = lastOrigPt[0]! - prevOrigPt[0]!;
      let dy = lastOrigPt[1]! - prevOrigPt[1]!;

      // If ELK points are nearly coincident, use source node center for direction
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && fromPos) {
        dx = toCx - (fromPos.x + fromPos.w / 2);
        dy = toIconCy - (fromPos.y + fromPos.h / 2);
      }

      if (Math.abs(dx) >= Math.abs(dy)) {
        // Horizontal entry — arrow arrives from the direction of prevPt
        const signX = dx > 0 ? -1 : 1;
        pts = [...pts.slice(0, -1), [toCx + signX * (ICON_SIZE / 2 + 5), toIconCy]];
      } else {
        // Vertical entry
        const signY = dy > 0 ? -1 : 1;
        pts = [...pts.slice(0, -1), [toCx, toIconCy + signY * (ICON_SIZE / 2 + 5)]];
      }
    }

    // Fix any diagonals created by snapping — insert orthogonal bends
    const fixedPts: number[][] = [pts[0]!];
    for (let k = 1; k < pts.length; k++) {
      const prev = fixedPts[fixedPts.length - 1]!;
      const cur = pts[k]!;
      const adx = Math.abs(cur[0]! - prev[0]!);
      const ady = Math.abs(cur[1]! - prev[1]!);
      if (adx > 3 && ady > 3) {
        // Diagonal — insert L-shape bend
        if (adx >= ady) {
          fixedPts.push([cur[0]!, prev[1]!]);
        } else {
          fixedPts.push([prev[0]!, cur[1]!]);
        }
      }
      fixedPts.push(cur);
    }
    pts = fixedPts;

    // Remove U-turns: if a point reverses direction from the previous segment, remove it
    for (let pass = 0; pass < 5; pass++) {
      let removed = false;
      for (let i = 1; i < pts.length - 1; i++) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        const c = pts[i + 1]!;
        const dxAB = b[0]! - a[0]!;
        const dxBC = c[0]! - b[0]!;
        const dyAB = b[1]! - a[1]!;
        const dyBC = c[1]! - b[1]!;
        const xRev = (dxAB > 10 && dxBC < -10) || (dxAB < -10 && dxBC > 10);
        const yRev = (dyAB > 10 && dyBC < -10) || (dyAB < -10 && dyBC > 10);
        if (xRev || yRev) {
          pts.splice(i, 1);
          removed = true;
          break;
        }
      }
      if (!removed) break;
    }

    // Collapse near-duplicate points (< 5px apart)
    const collapsed: number[][] = [pts[0]!];
    for (let i = 1; i < pts.length; i++) {
      const prev = collapsed[collapsed.length - 1]!;
      const cur = pts[i]!;
      const dist = Math.abs(cur[0]! - prev[0]!) + Math.abs(cur[1]! - prev[1]!);
      if (dist >= 5) collapsed.push(cur);
    }
    if (collapsed.length >= 2) pts = collapsed;

    // Convert absolute ELK points to Excalidraw relative format
    const origin = pts[0]!;
    const relPts = pts.map(p => [p[0]! - origin[0]!, p[1]! - origin[1]!]);

    // Compute bounding box for width/height
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of relPts) {
      if (p[0]! < minX) minX = p[0]!;
      if (p[0]! > maxX) maxX = p[0]!;
      if (p[1]! < minY) minY = p[1]!;
      if (p[1]! > maxY) maxY = p[1]!;
    }

    const edgeStrokeColor = graphEdge.style['stroke'] ?? ARROW_STROKE;

    elements.push({
      id: layoutEdge.id,
      type: 'arrow',
      x: origin[0]!, y: origin[1]!,
      width: maxX - minX,
      height: maxY - minY,
      points: relPts,
      strokeColor: edgeStrokeColor,
      strokeWidth: ARROW_WIDTH,
      strokeStyle: 'solid',
      roughness: 0,
      startArrowhead: graphEdge.bidirectional ? 'arrow' : null,
      endArrowhead: 'arrow',
      groupIds: [],
    });

    // ── Badges ──
    if (layoutEdge.label && /^\d+$/.test(layoutEdge.label)) {
      badgeCount++;

      const labelOffset = 25;
      const mid = pathMidpoint(pts);
      const off = perpOffset(mid.dx, mid.dy, labelOffset);
      const badgeCx = Math.round(mid.mx + off.offX);
      const badgeCy = Math.round(mid.my + off.offY);

      const badgeGroupId = `g-${layoutEdge.id}-badge`;
      const bSize = layoutEdge.badgeSize ?? BADGE_SIZE;
      const bBg = layoutEdge.badgeBg ?? BADGE_BG;
      const bColor = layoutEdge.badgeColor ?? BADGE_COLOR;
      const bShape = layoutEdge.badgeShape ?? BADGE_SHAPE;

      // Determine element type from shape
      let bgType = 'ellipse';
      let bgRoundness: any = null;
      if (bShape === 'square') { bgType = 'rectangle'; }
      else if (bShape === 'rounded') { bgType = 'rectangle'; bgRoundness = { type: 3, value: Math.round(bSize * 0.3) }; }
      else if (bShape === 'diamond') { bgType = 'diamond'; }

      const bgProps: any = {
        id: `${layoutEdge.id}-bg`,
        type: bgType,
        x: badgeCx - bSize / 2, y: badgeCy - bSize / 2,
        width: bSize, height: bSize,
        backgroundColor: bBg, strokeColor: 'transparent',
        strokeWidth: 0, fillStyle: 'solid', roughness: 0,
        groupIds: [badgeGroupId],
      };
      if (bgRoundness) bgProps.roundness = bgRoundness;
      elements.push(bgProps);

      // Text centered in badge
      const { height: bth } = measureText(layoutEdge.label, FONT_SIZE);
      const finalTh = bth > 0 ? bth : FONT_SIZE * 1.25;
      elements.push({
        id: `${layoutEdge.id}-tx`,
        type: 'text',
        x: badgeCx, y: badgeCy - finalTh / 2 + FONT_SIZE * 0.05,
        text: layoutEdge.label,
        fontSize: FONT_SIZE, fontFamily: 2,
        textAlign: 'center',
        strokeColor: bColor,
        roughness: 0,
        groupIds: [badgeGroupId],
      });
    } else if (layoutEdge.label) {
      // Non-numeric label — text annotation near arrow midpoint
      const mid = pathMidpoint(pts);
      const { width: labelW } = measureText(layoutEdge.label, FONT_SIZE);
      const isHorizontal = Math.abs(mid.dx) >= Math.abs(mid.dy);
      const labelX = isHorizontal ? mid.mx - labelW / 2 : mid.mx + 10;
      const labelY = isHorizontal ? mid.my - FONT_SIZE * 1.5 : mid.my - FONT_SIZE * 0.6;
      elements.push({
        id: `${layoutEdge.id}-label`,
        type: 'text',
        x: Math.round(labelX), y: Math.round(labelY),
        text: layoutEdge.label,
        fontSize: FONT_SIZE, fontFamily: 2,
        textAlign: 'center',
        strokeColor: '#1a1a1a',
        roughness: 0,
        groupIds: [],
      });
    }
  }

  // ── Validation ──────────────────────────────────────────────────────

  if (arrowCount !== graph.edges.length) {
    validationIssues.push(`Arrow count mismatch: built ${arrowCount}, expected ${graph.edges.length}`);
  }

  for (const [nodeId, node] of Object.entries(graph.nodes)) {
    if (!node.isGroup && !layout.nodes[nodeId]) {
      validationIssues.push(`Leaf node "${nodeId}" has no layout position`);
    }
  }

  return {
    elements,
    files,
    iconsMissing,
    validationIssues,
    stats: { containers: containerCount, nodes: nodeCount, arrows: arrowCount, badges: badgeCount },
    positions,
  };
}
