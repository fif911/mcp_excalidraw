/**
 * Overlap detection utilities for Excalidraw diagrams (TypeScript port).
 *
 * Checks for:
 * 1. Sections (containers) crossing into each other (full nesting is OK)
 * 2. Icons overlapping each other
 * 3. Text-under-icons overlapping other text-under-icons
 * 4. Text-under-icons overlapping arrows
 * 5. Numbered circles (arrow labels) overlapping section borders or other arrows
 * 6. Numbered circles overlapping icons
 * 7. Arrow endpoints penetrating into icons
 * 8. Icons/labels crossing container borders
 * 9. Numbered circles overlapping icon labels
 * 10. Arrows crossing container header text/icons
 * 11. Diagonal (non-orthogonal) arrow segments
 * 12. Container children overflowing container bounds
 */

// ──────────────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────────────

export interface OverlapIssue {
  type: string;
  severity: 'error' | 'warning';
  message: string;
  fix?: string;
}

export interface OverlapReport {
  totalErrors: number;
  totalWarnings: number;
  issues: OverlapIssue[];
  summary: string;
}

/** Bounding box: [x1, y1, x2, y2] */
type BBox = [number, number, number, number];

/** Line segment: [x1, y1, x2, y2] */
type Segment = [number, number, number, number];

/** An Excalidraw element (loose typing since we accept any[]) */
interface Elem {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  points?: number[][];
  groupIds?: string[];
  [key: string]: any;
}

interface ClassifiedElements {
  byId: Record<string, Elem>;
  groups: Record<string, Set<string>>;
  containers: Elem[];
  icons: Elem[];
  iconLabelTexts: Elem[];
  numberedCircles: [Elem, Elem][]; // [ellipse, text] pairs
  ncElementIds: Set<string>;
  arrows: Elem[];
}

// ──────────────────────────────────────────────────────────────────────
//  Text measurement (simple estimation)
// ──────────────────────────────────────────────────────────────────────

function estimateTextSize(text: string, fontSize: number): { width: number; height: number } {
  const lines = text.split('\n');
  let maxW = 0;
  for (const line of lines) {
    // Use 0.6 * fontSize per character as a reasonable approximation
    const w = line.length * fontSize * 0.6;
    if (w > maxW) maxW = w;
  }
  return {
    width: Math.round(maxW),
    height: Math.round(lines.length * fontSize * 1.25),
  };
}

// ──────────────────────────────────────────────────────────────────────
//  Geometry helpers
// ──────────────────────────────────────────────────────────────────────

function bbox(e: Elem): BBox {
  let w = e.width ?? 0;
  let h = e.height ?? 0;
  if (e.type === 'text' && (!w || w === 0)) {
    const measured = estimateTextSize(e.text ?? '', e.fontSize ?? 22);
    w = measured.width;
    h = measured.height;
  }
  return [e.x, e.y, e.x + w, e.y + h];
}

function rectsOverlap(a: BBox, b: BBox): boolean {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

function rectContains(outer: BBox, inner: BBox): boolean {
  return inner[0] >= outer[0] && inner[2] <= outer[2] &&
         inner[1] >= outer[1] && inner[3] <= outer[3];
}

function rectArea(r: BBox): number {
  return Math.max(0, r[2] - r[0]) * Math.max(0, r[3] - r[1]);
}

function overlapArea(a: BBox, b: BBox): number {
  const ox1 = Math.max(a[0], b[0]);
  const oy1 = Math.max(a[1], b[1]);
  const ox2 = Math.min(a[2], b[2]);
  const oy2 = Math.min(a[3], b[3]);
  return Math.max(0, ox2 - ox1) * Math.max(0, oy2 - oy1);
}

function overlapPct(a: BBox, b: BBox): number {
  const oa = overlapArea(a, b);
  if (oa === 0) return 0;
  const smaller = Math.min(rectArea(a), rectArea(b));
  if (smaller === 0) return 0;
  return (oa / smaller) * 100;
}

function segmentIntersectsRect(seg: Segment, rect: BBox): boolean {
  const [x1, y1, x2, y2] = seg;
  const [bx1, by1, bx2, by2] = rect;

  function outcode(x: number, y: number): number {
    let code = 0;
    if (x < bx1) code |= 1;
    else if (x > bx2) code |= 2;
    if (y < by1) code |= 4;
    else if (y > by2) code |= 8;
    return code;
  }

  const c1 = outcode(x1, y1);
  const c2 = outcode(x2, y2);
  if (c1 === 0 || c2 === 0) return true;
  if (c1 & c2) return false;

  // Check edge intersections
  const dx = x2 - x1;
  const dy = y2 - y1;
  const edges: Segment[] = [
    [bx1, by1, bx1, by2],
    [bx2, by1, bx2, by2],
    [bx1, by1, bx2, by1],
    [bx1, by2, bx2, by2],
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    const dex = ex2 - ex1;
    const dey = ey2 - ey1;
    const denom = dx * dey - dy * dex;
    if (Math.abs(denom) < 0.001) continue;
    const t = ((ex1 - x1) * dey - (ey1 - y1) * dex) / denom;
    const u = ((ex1 - x1) * dy - (ey1 - y1) * dx) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}

function arrowSegments(arrowEl: Elem): Segment[] {
  const ox = arrowEl.x;
  const oy = arrowEl.y;
  const pts = arrowEl.points ?? [];
  const absPts = pts.map(p => [ox + (p[0] ?? 0), oy + (p[1] ?? 0)]);
  const segs: Segment[] = [];
  for (let i = 0; i < absPts.length - 1; i++) {
    const cur = absPts[i]!;
    const nxt = absPts[i + 1]!;
    segs.push([cur[0]!, cur[1]!, nxt[0]!, nxt[1]!]);
  }
  return segs;
}

function segmentMinDistToPoint(seg: Segment, px: number, py: number): number {
  const [x1, y1, x2, y2] = seg;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

// ──────────────────────────────────────────────────────────────────────
//  Element classification
// ──────────────────────────────────────────────────────────────────────

function classifyElements(elements: Elem[]): ClassifiedElements {
  const byId: Record<string, Elem> = {};
  for (const e of elements) byId[e.id] = e;

  // Build group membership: groupId -> set of element ids
  const groups: Record<string, Set<string>> = {};
  for (const e of elements) {
    for (const gid of e.groupIds ?? []) {
      if (!groups[gid]) groups[gid] = new Set();
      groups[gid].add(e.id);
    }
  }

  // Containers: rectangles with substantial size
  const containers = elements.filter(
    e => e.type === 'rectangle' && (e.width ?? 0) > 80 && (e.height ?? 0) > 50
  );

  // Icons: image elements
  const icons = elements.filter(e => e.type === 'image');

  // Find which text elements are icon labels (grouped with an image)
  const iconGroupIds = new Set<string>();
  for (const ic of icons) {
    for (const gid of ic.groupIds ?? []) {
      iconGroupIds.add(gid);
    }
  }
  const iconLabelTexts: Elem[] = [];
  for (const e of elements) {
    if (e.type === 'text') {
      for (const gid of e.groupIds ?? []) {
        if (iconGroupIds.has(gid)) {
          iconLabelTexts.push(e);
          break;
        }
      }
    }
  }

  // Numbered circles: ellipses grouped with text (arrow step labels)
  const ellipseGroups = new Set<string>();
  for (const e of elements) {
    if (e.type === 'ellipse') {
      for (const gid of e.groupIds ?? []) {
        ellipseGroups.add(gid);
      }
    }
  }
  const numberedCircles: [Elem, Elem][] = [];
  const ncElementIds = new Set<string>();
  for (const e of elements) {
    if (e.type === 'ellipse') {
      for (const gid of e.groupIds ?? []) {
        if (ellipseGroups.has(gid)) {
          // Find the text in same group
          const memberIds = groups[gid];
          if (memberIds) {
            for (const tid of memberIds) {
              const t = byId[tid];
              if (t && t.type === 'text') {
                numberedCircles.push([e, t]);
                ncElementIds.add(e.id);
                ncElementIds.add(t.id);
                break;
              }
            }
          }
          break;
        }
      }
    }
  }

  const arrows = elements.filter(e => e.type === 'arrow');

  return {
    byId,
    groups,
    containers,
    icons,
    iconLabelTexts,
    numberedCircles,
    ncElementIds,
    arrows,
  };
}

// ──────────────────────────────────────────────────────────────────────
//  Check 1: Section (container) crossing
// ──────────────────────────────────────────────────────────────────────

function checkSectionCrossings(elements: Elem[], margin = 3): OverlapIssue[] {
  const info = classifyElements(elements);
  const containers = info.containers;
  const issues: OverlapIssue[] = [];

  for (let i = 0; i < containers.length; i++) {
    const c1 = containers[i]!;
    const bb1 = bbox(c1);
    for (let j = i + 1; j < containers.length; j++) {
      const c2 = containers[j]!;
      const bb2 = bbox(c2);
      if (!rectsOverlap(bb1, bb2)) continue;
      // Full containment is OK
      if (rectContains(bb1, bb2) || rectContains(bb2, bb1)) continue;
      // Partial overlap is an error
      const pct = overlapPct(bb1, bb2);
      const overlapX = Math.min(bb1[2], bb2[2]) - Math.max(bb1[0], bb2[0]);
      const overlapY = Math.min(bb1[3], bb2[3]) - Math.max(bb1[1], bb2[1]);
      issues.push({
        type: 'SECTION_CROSSING',
        severity: 'error',
        message: `Section '${c1.id}' and '${c2.id}' partially overlap (${pct.toFixed(0)}% of smaller section).`,
        fix: `Increase gap between containers — reduce width by ${Math.ceil(overlapX)}px or increase vertical spacing by ${Math.ceil(overlapY)}px.`,
      });
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Check 2: Icon-to-icon overlap
// ──────────────────────────────────────────────────────────────────────

function checkIconOverlaps(elements: Elem[], margin = 5): OverlapIssue[] {
  const info = classifyElements(elements);
  const icons = info.icons;
  const issues: OverlapIssue[] = [];

  for (let i = 0; i < icons.length; i++) {
    const ic1 = icons[i]!;
    const bb1 = bbox(ic1);
    const bb1m: BBox = [bb1[0] - margin, bb1[1] - margin, bb1[2] + margin, bb1[3] + margin];
    for (let j = i + 1; j < icons.length; j++) {
      const ic2 = icons[j]!;
      const bb2 = bbox(ic2);
      if (!rectsOverlap(bb1m, bb2)) continue;

      const oa = overlapArea(bb1, bb2);
      if (oa > 0) {
        issues.push({
          type: 'ICON_OVERLAP',
          severity: 'error',
          message: `Icon '${ic1.id}' overlaps icon '${ic2.id}' by ${oa.toFixed(0)}px\u00b2 area.`,
          fix: `Increase container width or change layout hint to add more columns (e.g., layout: "3x2" instead of "2x3").`,
        });
      } else {
        // Within margin but not truly overlapping — too close
        const dx = Math.max(0, Math.max(bb2[0] - bb1[2], bb1[0] - bb2[2]));
        const dy = Math.max(0, Math.max(bb2[1] - bb1[3], bb1[1] - bb2[3]));
        const gap = Math.sqrt(dx ** 2 + dy ** 2);
        issues.push({
          type: 'ICON_TOO_CLOSE',
          severity: 'warning',
          message: `Icon '${ic1.id}' is only ${gap.toFixed(0)}px from icon '${ic2.id}' (min recommended: ${margin}px).`,
          fix: `Widen container or adjust layout hint to spread elements further apart.`,
        });
      }
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Check 3: Text-under-icon overlaps
// ──────────────────────────────────────────────────────────────────────

function checkIconLabelOverlaps(elements: Elem[], margin = 3): OverlapIssue[] {
  const info = classifyElements(elements);
  const labels = info.iconLabelTexts;
  const issues: OverlapIssue[] = [];

  for (let i = 0; i < labels.length; i++) {
    const t1 = labels[i]!;
    const bb1 = bbox(t1);
    const bb1m: BBox = [bb1[0] - margin, bb1[1] - margin, bb1[2] + margin, bb1[3] + margin];
    for (let j = i + 1; j < labels.length; j++) {
      const t2 = labels[j]!;
      const bb2 = bbox(t2);
      if (!rectsOverlap(bb1m, bb2)) continue;
      const text1 = (t1.text ?? '').slice(0, 40);
      const text2 = (t2.text ?? '').slice(0, 40);
      const oa = overlapArea(bb1, bb2);
      const labelIsSingleLine1 = !(t1.text ?? '').includes('\n') && (t1.text ?? '').length > 15;
      issues.push({
        type: 'LABEL_OVERLAP',
        severity: 'error',
        message: `Label '${text1}' (${t1.id}) overlaps label '${text2}' (${t2.id}) by ${oa.toFixed(0)}px\u00b2.`,
        fix: labelIsSingleLine1
          ? `Split long label "${text1}" with \\n to reduce width, or widen container.`
          : `Widen container or adjust layout to increase spacing between elements.`,
      });
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Check 4: Text-under-icon overlapping with arrows
// ──────────────────────────────────────────────────────────────────────

function checkLabelArrowOverlaps(elements: Elem[], margin = 8): OverlapIssue[] {
  const info = classifyElements(elements);
  const labels = info.iconLabelTexts;
  const arrows = info.arrows;
  const ncIds = info.ncElementIds;
  const issues: OverlapIssue[] = [];

  for (const t of labels) {
    if (ncIds.has(t.id)) continue; // skip numbered circle text
    const bb = bbox(t);
    const bbm: BBox = [bb[0] - margin, bb[1] - margin, bb[2] + margin, bb[3] + margin];
    const textPreview = (t.text ?? '').slice(0, 40);

    for (const a of arrows) {
      const segs = arrowSegments(a);
      for (const seg of segs) {
        if (segmentIntersectsRect(seg, bbm)) {
          issues.push({
            type: 'LABEL_ARROW_OVERLAP',
            severity: 'error',
            message: `Label '${textPreview}' (${t.id}) overlaps arrow '${a.id}'.`,
            fix: `Add waypoint to arrow '${a.id}' to route around label '${textPreview}'.`,
          });
          break; // one hit per arrow is enough
        }
      }
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Check 5: Numbered circles overlapping section borders or arrows
// ──────────────────────────────────────────────────────────────────────

/**
 * Determine which arrow a numbered circle belongs to using badge group IDs.
 * Badge groups are named `g-{arrowId}-badge`.
 */
function findParentArrow(ellipse: Elem, arrows: Elem[], groups: Record<string, Set<string>>): string | null {
  const ellGroups = new Set(ellipse.groupIds ?? []);

  // Check for badge group naming convention: g-{arrowId}-badge
  for (const a of arrows) {
    const badgeGroup = `g-${a.id}-badge`;
    if (ellGroups.has(badgeGroup)) {
      return a.id;
    }
  }

  // Also check the older convention: g-{arrowId}-lbl
  for (const a of arrows) {
    const lblGroup = `g-${a.id}-lbl`;
    if (ellGroups.has(lblGroup)) {
      return a.id;
    }
  }

  return null;
}

function checkNumberedCircleOverlaps(
  elements: Elem[],
  borderMargin = 5,
  arrowMargin = 3,
): OverlapIssue[] {
  const info = classifyElements(elements);
  const numberedCircles = info.numberedCircles;
  const containers = info.containers;
  const arrows = info.arrows;
  const issues: OverlapIssue[] = [];

  for (const [ellipse, textEl] of numberedCircles) {
    const circBb = bbox(ellipse);
    const circLabel = textEl.text ?? '?';

    // Determine which arrow this circle belongs to
    const parentArrowId = findParentArrow(ellipse, arrows, info.groups);

    // 5a: Check against container borders
    for (const c of containers) {
      const cBb = bbox(c);
      // Circle is OK if fully inside or fully outside the container
      if (rectContains(cBb, circBb)) continue;
      if (!rectsOverlap(circBb, cBb)) continue;
      // Crosses the border
      issues.push({
        type: 'CIRCLE_BORDER_OVERLAP',
        severity: 'error',
        message: `Step circle '${circLabel}' (${ellipse.id}) crosses border of section '${c.id}'.`,
        fix: `Add explicit badge_pos to move badge '${circLabel}' away from container '${c.id}' border.`,
      });
    }

    // 5b: Check against other arrows (not the parent arrow)
    const circBbm: BBox = [
      circBb[0] - arrowMargin,
      circBb[1] - arrowMargin,
      circBb[2] + arrowMargin,
      circBb[3] + arrowMargin,
    ];
    for (const a of arrows) {
      if (a.id === parentArrowId) continue;
      const segs = arrowSegments(a);
      for (const seg of segs) {
        if (segmentIntersectsRect(seg, circBbm)) {
          issues.push({
            type: 'CIRCLE_ARROW_OVERLAP',
            severity: 'warning',
            message: `Step circle '${circLabel}' (${ellipse.id}) overlaps arrow '${a.id}' (not its parent arrow).`,
            fix: `Move badge_pos for badge '${circLabel}' perpendicular to arrow to avoid overlap.`,
          });
          break;
        }
      }
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Check 6: Numbered circles overlapping icons
// ──────────────────────────────────────────────────────────────────────

function checkCircleIconOverlaps(elements: Elem[], margin = 3): OverlapIssue[] {
  const info = classifyElements(elements);
  const numberedCircles = info.numberedCircles;
  const icons = info.icons;
  const issues: OverlapIssue[] = [];

  for (const [ellipse, textEl] of numberedCircles) {
    const circBb = bbox(ellipse);
    const circLabel = textEl.text ?? '?';

    for (const ic of icons) {
      const icBb = bbox(ic);
      const icBbm: BBox = [icBb[0] - margin, icBb[1] - margin, icBb[2] + margin, icBb[3] + margin];
      if (!rectsOverlap(circBb, icBbm)) continue;

      const oa = overlapArea(circBb, icBb);
      if (oa > 0) {
        issues.push({
          type: 'CIRCLE_ICON_OVERLAP',
          severity: 'error',
          message: `Step circle '${circLabel}' (${ellipse.id}) overlaps icon '${ic.id}' by ${oa.toFixed(0)}px\u00b2.`,
          fix: `Move badge_pos for badge '${circLabel}' away from icon '${ic.id}'.`,
        });
      } else {
        // Within margin but not overlapping — too close
        const dx = Math.max(0, Math.max(icBb[0] - circBb[2], circBb[0] - icBb[2]));
        const dy = Math.max(0, Math.max(icBb[1] - circBb[3], circBb[1] - icBb[3]));
        const gap = Math.sqrt(dx ** 2 + dy ** 2);
        issues.push({
          type: 'CIRCLE_ICON_TOO_CLOSE',
          severity: 'warning',
          message: `Step circle '${circLabel}' (${ellipse.id}) is only ${gap.toFixed(0)}px from icon '${ic.id}' (min: ${margin}px).`,
          fix: `Adjust badge_pos to increase distance from icon.`,
        });
      }
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Check 7: Arrow endpoints penetrating into icons
// ──────────────────────────────────────────────────────────────────────

function checkArrowIconPenetration(elements: Elem[], penetrationThreshold = 5): OverlapIssue[] {
  const info = classifyElements(elements);
  const arrows = info.arrows;
  const icons = info.icons;
  const issues: OverlapIssue[] = [];

  for (const a of arrows) {
    const segs = arrowSegments(a);
    if (segs.length === 0) continue;

    // Get absolute start and end points
    const firstSeg = segs[0]!;
    const lastSeg = segs[segs.length - 1]!;
    const startX = firstSeg[0];
    const startY = firstSeg[1];
    const endX = lastSeg[2];
    const endY = lastSeg[3];

    const endpoints: [string, number, number][] = [
      ['start', startX, startY],
      ['end', endX, endY],
    ];

    for (const [epName, px, py] of endpoints) {
      for (const ic of icons) {
        const icBb = bbox(ic);
        // Check if the endpoint is inside the icon bbox
        if (icBb[0] < px && px < icBb[2] && icBb[1] < py && py < icBb[3]) {
          // Calculate how deep it penetrates
          const penX = Math.min(px - icBb[0], icBb[2] - px);
          const penY = Math.min(py - icBb[1], icBb[3] - py);
          const penetration = Math.min(penX, penY);

          if (penetration > penetrationThreshold) {
            issues.push({
              type: 'ARROW_PENETRATES_ICON',
              severity: 'error',
              message: `Arrow '${a.id}' ${epName} point penetrates ${penetration.toFixed(0)}px into icon '${ic.id}'.`,
              fix: `Tool should auto-snap arrow endpoint to icon edge. If this persists, adjust waypoints.`,
            });
          } else if (penetration > 0) {
            issues.push({
              type: 'ARROW_PENETRATES_ICON',
              severity: 'warning',
              message: `Arrow '${a.id}' ${epName} point slightly penetrates (${penetration.toFixed(0)}px) into icon '${ic.id}'.`,
              fix: `Minor penetration — may resolve with waypoint adjustment.`,
            });
          }
        }
      }
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Check 8: Icons and labels crossing container borders
// ──────────────────────────────────────────────────────────────────────

function checkIconBorderCrossings(elements: Elem[], margin = 2): OverlapIssue[] {
  const info = classifyElements(elements);
  const icons = info.icons;
  const labels = info.iconLabelTexts;
  const containers = info.containers;
  const issues: OverlapIssue[] = [];

  // Check icons against container borders
  for (const ic of icons) {
    const icBb = bbox(ic);
    for (const c of containers) {
      const cBb = bbox(c);
      if (!rectsOverlap(icBb, cBb)) continue;
      if (rectContains(cBb, icBb)) continue; // fully inside — OK

      // Icon partially overlaps container — crosses border
      const oa = overlapArea(icBb, cBb);
      const icArea = rectArea(icBb);
      if (oa > 0 && oa < icArea) {
        issues.push({
          type: 'ICON_BORDER_CROSSING',
          severity: 'error',
          message: `Icon '${ic.id}' crosses border of container '${c.id}' (${oa.toFixed(0)}px\u00b2 inside, ${(icArea - oa).toFixed(0)}px\u00b2 outside).`,
          fix: `Expand container '${c.id}' or adjust layout to keep element fully inside.`,
        });
      }
    }
  }

  // Check icon labels against container borders
  for (const t of labels) {
    const tBb = bbox(t);
    const textPreview = (t.text ?? '').slice(0, 40);
    for (const c of containers) {
      const cBb = bbox(c);
      if (!rectsOverlap(tBb, cBb)) continue;
      if (rectContains(cBb, tBb)) continue; // fully inside — OK

      const oa = overlapArea(tBb, cBb);
      const tArea = rectArea(tBb);
      if (oa > 0 && oa < tArea) {
        const labelIsSingleLine = !(t.text ?? '').includes('\n') && (t.text ?? '').length > 15;
        issues.push({
          type: 'LABEL_BORDER_CROSSING',
          severity: 'error',
          message: `Label '${textPreview}' (${t.id}) crosses border of container '${c.id}'.`,
          fix: labelIsSingleLine
            ? `Split label "${textPreview}" with \\n to reduce width, or expand container '${c.id}'.`
            : `Expand container '${c.id}' to fit label, or adjust layout.`,
        });
      }
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Check 9: Numbered circles overlapping icon labels (text)
// ──────────────────────────────────────────────────────────────────────

function checkCircleLabelOverlaps(elements: Elem[], margin = 3): OverlapIssue[] {
  const info = classifyElements(elements);
  const numberedCircles = info.numberedCircles;
  const labels = info.iconLabelTexts;
  const ncIds = info.ncElementIds;
  const issues: OverlapIssue[] = [];

  for (const [ellipse, textEl] of numberedCircles) {
    const circBb = bbox(ellipse);
    const circLabel = textEl.text ?? '?';

    for (const lbl of labels) {
      // Skip if this label IS the circle's own text
      if (ncIds.has(lbl.id)) continue;

      const lblBb = bbox(lbl);
      const lblBbm: BBox = [lblBb[0] - margin, lblBb[1] - margin, lblBb[2] + margin, lblBb[3] + margin];
      if (!rectsOverlap(circBb, lblBbm)) continue;

      const lblText = (lbl.text ?? '').slice(0, 40);
      const oa = overlapArea(circBb, lblBb);
      if (oa > 0) {
        issues.push({
          type: 'CIRCLE_LABEL_OVERLAP',
          severity: 'error',
          message: `Step circle '${circLabel}' (${ellipse.id}) overlaps label '${lblText}' (${lbl.id}) by ${oa.toFixed(0)}px\u00b2.`,
          fix: `Adjust badge_pos for badge '${circLabel}' to clear label '${lblText}'.`,
        });
      } else {
        const dx = Math.max(0, Math.max(lblBb[0] - circBb[2], circBb[0] - lblBb[2]));
        const dy = Math.max(0, Math.max(lblBb[1] - circBb[3], circBb[1] - lblBb[3]));
        const gap = Math.sqrt(dx ** 2 + dy ** 2);
        issues.push({
          type: 'CIRCLE_LABEL_TOO_CLOSE',
          severity: 'warning',
          message: `Step circle '${circLabel}' (${ellipse.id}) is only ${gap.toFixed(0)}px from label '${lblText}' (${lbl.id}) (min: ${margin}px).`,
          fix: `Adjust badge_pos to increase distance from label.`,
        });
      }
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Check 10: Arrows crossing container header text/icons
// ──────────────────────────────────────────────────────────────────────

function checkArrowHeaderOverlaps(elements: Elem[], margin = 4): OverlapIssue[] {
  const info = classifyElements(elements);
  const containers = info.containers;
  const arrows = info.arrows;
  const groups = info.groups;

  const containerIds = new Set(containers.map(c => c.id));

  // Collect (headerElement, containerId) pairs
  const headerElements: [Elem, string][] = [];
  for (const e of elements) {
    if (e.type !== 'text' && e.type !== 'image') continue;
    let matched = false;
    for (const gid of e.groupIds ?? []) {
      if (matched) break;
      const memberIds = groups[gid];
      if (!memberIds) continue;
      for (const mid of memberIds) {
        if (containerIds.has(mid) && mid !== e.id) {
          // For images, keep only small header icons (<=45px)
          if (e.type === 'image') {
            if ((e.width ?? 0) <= 45 && (e.height ?? 0) <= 45) {
              headerElements.push([e, mid]);
              matched = true;
            }
          } else {
            headerElements.push([e, mid]);
            matched = true;
          }
          break;
        }
      }
    }
  }

  const issues: OverlapIssue[] = [];
  for (const [headerEl, containerId] of headerElements) {
    const hbb = bbox(headerEl);
    const hbbm: BBox = [hbb[0] - margin, hbb[1] - margin, hbb[2] + margin, hbb[3] + margin];

    const elType = headerEl.type === 'text' ? 'header text' : 'header icon';
    const elLabel = headerEl.type === 'text'
      ? (headerEl.text ?? headerEl.id).slice(0, 40)
      : headerEl.id;

    for (const a of arrows) {
      const segs = arrowSegments(a);
      for (const seg of segs) {
        if (segmentIntersectsRect(seg, hbbm)) {
          issues.push({
            type: 'ARROW_HEADER_OVERLAP',
            severity: 'error',
            message: `Arrow '${a.id}' crosses ${elType} '${elLabel}' (${headerEl.id}) of container '${containerId}'.`,
            fix: `Add waypoint to arrow to route above or below header of container '${containerId}'.`,
          });
          break; // one hit per arrow per header element
        }
      }
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Check 11: Diagonal arrow segments (non-orthogonal)
// ──────────────────────────────────────────────────────────────────────

function checkDiagonalArrows(elements: Elem[]): OverlapIssue[] {
  const info = classifyElements(elements);
  const issues: OverlapIssue[] = [];

  for (const a of info.arrows) {
    const segs = arrowSegments(a);
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]!;
      const dx = Math.abs(seg[2] - seg[0]);
      const dy = Math.abs(seg[3] - seg[1]);
      if (dx > 1 && dy > 1) {
        issues.push({
          type: 'DIAGONAL_SEGMENT',
          severity: 'warning',
          message: `Arrow '${a.id}' segment ${i} is diagonal: (${seg[0].toFixed(0)},${seg[1].toFixed(0)})→(${seg[2].toFixed(0)},${seg[3].toFixed(0)}).`,
          fix: `Remove unnecessary waypoints from arrow, or fix waypoint coordinates to share X or Y with neighbors.`,
        });
      }
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Check 12: Container children overflow (fit_container validation)
// ──────────────────────────────────────────────────────────────────────

function checkContainerOverflow(elements: Elem[], padding = 15): OverlapIssue[] {
  const info = classifyElements(elements);
  const containers = info.containers;
  const issues: OverlapIssue[] = [];

  // Build set of container IDs for quick lookup
  const containerIds = new Set(containers.map(c => c.id));

  // Build container group membership: elements in each container's group
  const containerGroupMembers: Record<string, Set<string>> = {};
  for (const c of containers) {
    const groupId = `g-${c.id}`;
    containerGroupMembers[c.id] = info.groups[groupId] ?? new Set();
  }

  // For each container, find leaf children geometrically inside it
  for (const c of containers) {
    const cBb = bbox(c);
    const ownGroupMembers = containerGroupMembers[c.id]!;

    for (const e of elements) {
      // Skip the container itself and its header group members
      if (e.id === c.id || ownGroupMembers.has(e.id)) continue;
      // Skip arrows and other containers
      if (e.type === 'arrow') continue;
      if (e.type === 'rectangle' && containerIds.has(e.id)) continue;

      const eBb = bbox(e);
      const eCx = (eBb[0] + eBb[2]) / 2;
      const eCy = (eBb[1] + eBb[3]) / 2;

      // Check if element center is inside this container
      if (eCx > cBb[0] && eCx < cBb[2] && eCy > cBb[1] && eCy < cBb[3]) {
        // Check if it overflows the container bounds (with padding)
        if (eBb[0] < cBb[0] + padding || eBb[2] > cBb[2] - padding ||
            eBb[1] < cBb[1] + padding || eBb[3] > cBb[3] - padding) {
          const label = e.type === 'text' ? (e.text ?? '').slice(0, 30) : e.id;
          const isWideText = e.type === 'text' && !(e.text ?? '').includes('\n') && (e.text ?? '').length > 15;
          issues.push({
            type: 'CONTAINER_OVERFLOW',
            severity: 'warning',
            message: `Element '${label}' (${e.id}) overflows container '${c.id}' bounds (needs ≥${padding}px padding).`,
            fix: isWideText
              ? `Split label "${label}" with \\n to reduce width.`
              : `Expand container '${c.id}' pos width/height, or adjust layout hint.`,
          });
        }
      }
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Check 13: Icons inside wrong container (not their parent)
// ──────────────────────────────────────────────────────────────────────

function checkIconWrongContainer(elements: Elem[]): OverlapIssue[] {
  const info = classifyElements(elements);
  const containers = info.containers;
  const icons = info.icons;
  const issues: OverlapIssue[] = [];

  for (const ic of icons) {
    const icBb = bbox(ic);
    const icCx = (icBb[0] + icBb[2]) / 2;
    const icCy = (icBb[1] + icBb[3]) / 2;

    // Find which container group this icon belongs to
    const iconGroups = new Set(ic.groupIds ?? []);

    for (const c of containers) {
      const cBb = bbox(c);
      // Check if icon center is inside this container
      if (icCx > cBb[0] && icCx < cBb[2] && icCy > cBb[1] && icCy < cBb[3]) {
        // Check if the icon belongs to this container (shares a group)
        const containerGroup = `g-${c.id}`;
        if (!iconGroups.has(containerGroup)) {
          // Check if icon is a descendant of this container via ID prefix
          // Icon IDs: "img-parent_child_leaf", Container IDs: "parent_child"
          const iconBaseId = ic.id.replace(/^img-/, '');
          const isDescendant = iconBaseId.startsWith(c.id + '_');
          if (isDescendant) continue; // legitimate nested child — skip

          // Fallback: check if icon belongs to any child container
          let belongsToChild = false;
          for (const childC of containers) {
            if (childC.id === c.id) continue;
            const childBb = bbox(childC);
            if (rectContains(cBb, childBb)) {
              const childGroup = `g-${childC.id}`;
              if (iconGroups.has(childGroup)) {
                belongsToChild = true;
                break;
              }
            }
          }
          if (!belongsToChild) {
            issues.push({
              type: 'ICON_WRONG_CONTAINER',
              severity: 'error',
              message: `Icon '${ic.id}' is visually inside container '${c.id}' but doesn't belong to it. Move the icon outside this container or fix its nesting.`,
              fix: `Move icon outside container '${c.id}' bounds, or change the D2 nesting so the icon is a child of this container.`,
            });
          }
        }
      }
    }
  }

  return issues;
}

// ──────────────────────────────────────────────────────────────────────
//  Main: run all checks and produce report
// ──────────────────────────────────────────────────────────────────────

export function runAllOverlapChecks(elements: any[]): OverlapReport {
  const elems = elements as Elem[];

  const checks: [string, OverlapIssue[]][] = [
    ['Section crossings', checkSectionCrossings(elems)],
    ['Icon overlaps', checkIconOverlaps(elems)],
    ['Icon-label overlaps', checkIconLabelOverlaps(elems)],
    ['Label-arrow overlaps', checkLabelArrowOverlaps(elems)],
    ['Numbered-circle overlaps', checkNumberedCircleOverlaps(elems)],
    ['Circle-icon overlaps', checkCircleIconOverlaps(elems)],
    ['Arrow-icon penetration', checkArrowIconPenetration(elems)],
    ['Icon/label border crossings', checkIconBorderCrossings(elems)],
    ['Circle-label overlaps', checkCircleLabelOverlaps(elems)],
    ['Arrow-header overlaps', checkArrowHeaderOverlaps(elems)],
    ['Diagonal arrow segments', checkDiagonalArrows(elems)],
    ['Container overflow', checkContainerOverflow(elems)],
    ['Icons in wrong container', checkIconWrongContainer(elems)],
  ];

  let totalErrors = 0;
  let totalWarnings = 0;
  const allIssues: OverlapIssue[] = [];
  const lines: string[] = [];

  lines.push('=== OVERLAP CHECK REPORT ===');
  // Placeholder for counts line — we'll replace after tallying
  const countsIdx = lines.length;
  lines.push('');
  lines.push('');

  for (const [name, issues] of checks) {
    const errs = issues.filter(i => i.severity === 'error').length;
    const warns = issues.filter(i => i.severity === 'warning').length;
    totalErrors += errs;
    totalWarnings += warns;
    allIssues.push(...issues);

    const status = issues.length === 0 ? 'PASS' : errs > 0 ? 'FAIL' : 'WARN';
    const icon = { PASS: '[OK]', FAIL: '[FAIL]', WARN: '[WARN]' }[status];
    lines.push(`${icon} ${name}: ${issues.length} issue(s)`);

    for (const issue of issues) {
      const prefix = issue.severity === 'error' ? '  ERROR' : '  WARN';
      lines.push(`  ${prefix}: ${issue.message}`);
      if (issue.fix) lines.push(`    FIX: ${issue.fix}`);
    }
  }

  // Fill in counts
  lines[countsIdx] = `Errors: ${totalErrors}  |  Warnings: ${totalWarnings}`;

  if (totalErrors === 0 && totalWarnings === 0) {
    lines.push('');
    lines.push('All overlap checks passed. No issues found.');
  }

  return {
    totalErrors,
    totalWarnings,
    issues: allIssues,
    summary: lines.join('\n'),
  };
}
