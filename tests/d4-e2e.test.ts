import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { convertD4ToExcalidraw } from '../src/utils/d4/index.js';
import { findDiagonalArrows, findOverlappingContainers } from './test-helpers.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('D4 E2E: Data Transfer Hub', () => {
  let result: any;

  it('converts without errors', async () => {
    const source = readFileSync(resolve(FIXTURES, 'data-transfer-hub.d4'), 'utf-8');
    result = await convertD4ToExcalidraw(source);
    expect(result).toBeDefined();
    expect(result.elements.length).toBeGreaterThan(0);
  });

  it('has correct element counts', () => {
    expect(result.stats.containers).toBeGreaterThanOrEqual(5);
    expect(result.stats.nodes).toBeGreaterThanOrEqual(15);
    expect(result.stats.arrows).toBeGreaterThanOrEqual(9);
    expect(result.stats.badges).toBeGreaterThanOrEqual(8);
  });

  it('all arrows are orthogonal', () => {
    expect(findDiagonalArrows(result as any)).toEqual([]);
  });

  it('no sibling container overlaps', () => {
    expect(findOverlappingContainers(result as any)).toEqual([]);
  });

  it('all 8 numbered badges present', () => {
    const badgeTexts = result.elements
      .filter((el: any) => el.type === 'text' && /^[1-8]$/.test(el.text?.trim()))
      .map((el: any) => el.text.trim());
    expect(new Set(badgeTexts).size).toBe(8);
  });

  it('connections use short names (no full paths in source)', () => {
    const source = readFileSync(resolve(FIXTURES, 'data-transfer-hub.d4'), 'utf-8');
    const connLines = source.split('\n').filter(l => l.includes('->'));
    for (const line of connLines) {
      expect(line).not.toContain('aws_cloud.');
      expect(line).not.toContain('customer_account.');
    }
  });
});

describe('D4 E2E: simple diagrams', () => {
  it('renders a minimal 3-node diagram', async () => {
    const result = await convertD4ToExcalidraw(`
      a: Service A
      b: Service B
      c: Service C
      a -> b: 1
      b -> c: 2
    `);
    expect(result.stats.nodes).toBe(3);
    expect(result.stats.arrows).toBe(2);
    expect(result.stats.badges).toBe(2);
  });

  it('renders nested containers', async () => {
    const result = await convertD4ToExcalidraw(`
      cloud: Cloud {
        vpc: VPC {
          server: EC2 Instance
          db: RDS Database
        }
      }
      server -> db: query
    `);
    expect(result.stats.containers).toBeGreaterThanOrEqual(2);
    expect(result.stats.nodes).toBeGreaterThanOrEqual(2);
    expect(result.stats.arrows).toBe(1);
  });

  it('renders direction down', async () => {
    const result = await convertD4ToExcalidraw(`
      direction down
      a: Top Service
      b: Bottom Service
      a -> b: flow
    `);
    expect(result.stats.arrows).toBe(1);
    // First node Y should be less than second (top-to-bottom)
    const posA = result.positions.find((p: any) => p.label === 'Top Service');
    const posB = result.positions.find((p: any) => p.label === 'Bottom Service');
    if (posA && posB) {
      expect(posB.y).toBeGreaterThan(posA.y);
    }
  });
});
