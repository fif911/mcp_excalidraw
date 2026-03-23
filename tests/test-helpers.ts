import { parseD3, layoutD3Graph, convertD3ToExcalidraw } from '../src/utils/d3Converter.js';
import type { ConvertResult } from '../src/utils/d3Converter.js';

export { parseD3, layoutD3Graph, convertD3ToExcalidraw };

/** Find element by partial ID match */
export function findElement(result: ConvertResult, idSubstring: string) {
  return result.elements.find((el: any) => el.id?.includes(idSubstring));
}

/** Find all elements of a given type */
export function elementsOfType(result: ConvertResult, type: string) {
  return result.elements.filter((el: any) => el.type === type);
}

/** Check that no two rectangles overlap (ignoring ancestor-descendant nesting).
 *  Uses element IDs to detect ancestry: if a.id is a prefix of b.id (or vice versa),
 *  they are in a parent-child relationship and overlap is expected. */
export function findOverlappingContainers(result: ConvertResult): Array<[string, string]> {
  const rects = result.elements.filter((el: any) => el.type === 'rectangle' && el.strokeColor !== 'transparent');
  const overlaps: Array<[string, string]> = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const aId = a.id || '';
      const bId = b.id || '';
      if (aId.startsWith(bId) || bId.startsWith(aId)) continue;
      if (contains(a, b) || contains(b, a)) continue;
      if (intersects(a, b)) overlaps.push([a.id, b.id]);
    }
  }
  return overlaps;
}

function contains(outer: any, inner: any): boolean {
  return outer.x <= inner.x && outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height;
}

function intersects(a: any, b: any): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Check all arrow segments are orthogonal (no diagonals) */
export function findDiagonalArrows(result: ConvertResult): string[] {
  const arrows = result.elements.filter((el: any) => el.type === 'arrow');
  const diagonals: string[] = [];
  for (const arrow of arrows) {
    if (!arrow.points || arrow.points.length < 2) continue;
    for (let i = 0; i < arrow.points.length - 1; i++) {
      const [x1, y1] = arrow.points[i];
      const [x2, y2] = arrow.points[i + 1];
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      if (dx > 3 && dy > 3) {
        diagonals.push(arrow.id);
        break;
      }
    }
  }
  return diagonals;
}

/** Verify result has expected element counts */
export function assertCounts(result: ConvertResult, expected: {
  minContainers?: number;
  minNodes?: number;
  minArrows?: number;
  minBadges?: number;
}) {
  if (expected.minContainers !== undefined) {
    if (result.stats.containers < expected.minContainers) {
      throw new Error(`Expected >= ${expected.minContainers} containers, got ${result.stats.containers}`);
    }
  }
  if (expected.minNodes !== undefined) {
    if (result.stats.nodes < expected.minNodes) {
      throw new Error(`Expected >= ${expected.minNodes} nodes, got ${result.stats.nodes}`);
    }
  }
  if (expected.minArrows !== undefined) {
    if (result.stats.arrows < expected.minArrows) {
      throw new Error(`Expected >= ${expected.minArrows} arrows, got ${result.stats.arrows}`);
    }
  }
  if (expected.minBadges !== undefined) {
    if (result.stats.badges < expected.minBadges) {
      throw new Error(`Expected >= ${expected.minBadges} badges, got ${result.stats.badges}`);
    }
  }
}
