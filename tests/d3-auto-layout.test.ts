import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { convertD3ToExcalidraw, parseD3, layoutD3Graph } from '../src/utils/d3Converter.js';
import { assertCounts, findDiagonalArrows, findOverlappingContainers } from './test-helpers.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('test infrastructure', () => {
  it('works', () => {
    expect(1 + 1).toBe(2);
  });
});

describe('regression: existing D3 with coordinates', () => {
  const d3Source = readFileSync(resolve(FIXTURES, 'data-transfer-hub-current.d3'), 'utf-8');
  const result = convertD3ToExcalidraw(d3Source);

  it('produces correct element counts', () => {
    assertCounts(result, {
      minContainers: 5,
      minNodes: 15,
      minArrows: 9,
      minBadges: 8,
    });
  });

  it('has no validation issues', () => {
    const critical = result.validationIssues.filter(i =>
      !i.includes('orphan') && !i.includes('icon') &&
      !i.includes('ORPHAN') && !i.includes('ARROW_REROUTED')
    );
    expect(critical).toEqual([]);
  });

  it('produces only orthogonal arrows', () => {
    expect(findDiagonalArrows(result)).toEqual([]);
  });

  it('has no overlapping sibling containers', () => {
    expect(findOverlappingContainers(result)).toEqual([]);
  });

  it('reports icon positions for all leaf nodes', () => {
    expect(result.positions.length).toBeGreaterThanOrEqual(15);
  });
});
