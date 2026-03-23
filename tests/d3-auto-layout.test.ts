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

describe('parser: placement attribute', () => {
  it('parses placement on a shape', () => {
    const graph = parseD3(`
      parent: Parent {
        child_a: Child A
        child_b: Child B {
          placement: right-of child_a
        }
      }
    `);
    expect(graph.shapes['parent.child_b']?.placement).toBe('right-of child_a');
  });

  it('parses placement with various directions', () => {
    const graph = parseD3(`
      a: A {
        placement: left-of b
      }
      b: B {
        placement: below a
      }
    `);
    expect(graph.shapes['a']?.placement).toBe('left-of b');
    expect(graph.shapes['b']?.placement).toBe('below a');
  });
});

describe('parser: route attribute on arrows', () => {
  it('parses route hint on arrow', () => {
    const graph = parseD3(`
      a: A
      b: B
      a -> b: 1 {
        route: up-then-right
      }
    `);
    expect(graph.connections[0]?.route).toBe('up-then-right');
  });

  it('parses all route directions', () => {
    const routes = ['up-then-right', 'up-then-left', 'down-then-right', 'down-then-left',
                    'right-then-up', 'right-then-down', 'left-then-up', 'left-then-down'];
    for (const route of routes) {
      const graph = parseD3(`a: A\nb: B\na -> b {\n  route: ${route}\n}`);
      expect(graph.connections[0]?.route).toBe(route);
    }
  });

  it('handles bidirectional arrows without waypoints', () => {
    const graph = parseD3(`a: A\nb: B\na <-> b: link`);
    expect(graph.connections[0]?.bidirectional).toBe(true);
    expect(graph.connections[0]?.route).toBeUndefined();
  });

  it('handles empty containers without crashing', () => {
    const graph = parseD3(`box: Empty Box {\n}`);
    expect(graph.shapes['box']).toBeDefined();
    expect(graph.shapes['box']?.children).toEqual([]);
  });
});

describe('layout: auto-position containers', () => {
  it('places two unpositioned root containers side by side', () => {
    const graph = parseD3(`
      a: Container A {
        x: Item X
        y: Item Y
      }
      b: Container B {
        z: Item Z
      }
    `);
    const { layout } = layoutD3Graph(graph);
    const aNode = layout['a'];
    const bNode = layout['b'];
    expect(aNode).toBeDefined();
    expect(bNode).toBeDefined();
    expect(bNode!.x).toBeGreaterThan(aNode!.x + aNode!.w);
    expect(bNode!.y).toBeCloseTo(aNode!.y, -1);
  });

  it('respects placement: right-of on root shapes', () => {
    const graph = parseD3(`
      left_box: Left {
        a: Item A
      }
      right_box: Right {
        placement: right-of left_box
        b: Item B
      }
    `);
    const { layout } = layoutD3Graph(graph);
    expect(layout['right_box']!.x).toBeGreaterThan(layout['left_box']!.x + layout['left_box']!.w);
  });

  it('respects placement: right-of on NON-root sibling containers', () => {
    const graph = parseD3(`
      cloud: Cloud {
        account: Account {
          svc: Service A
        }
        managed: Managed {
          placement: right-of account
          svc2: Service B
        }
      }
    `);
    const { layout } = layoutD3Graph(graph);
    const acc = layout['cloud.account']!;
    const man = layout['cloud.managed']!;
    expect(acc).toBeDefined();
    expect(man).toBeDefined();
    expect(man.x).toBeGreaterThanOrEqual(acc.x + acc.w);
    // Children should have moved with the container
    const svc2 = layout['cloud.managed.svc2']!;
    expect(svc2).toBeDefined();
    expect(svc2.x).toBeGreaterThanOrEqual(man.x);
    expect(svc2.x + svc2.w).toBeLessThanOrEqual(man.x + man.w + 5);
  });

  it('auto-positions even when no pos is provided anywhere', () => {
    const graph = parseD3(`
      aws: AWS Cloud {
        account: Account {
          svc1: Service One
          svc2: Service Two
        }
        managed: Managed {
          svc3: Service Three
        }
      }
    `);
    const { layout } = layoutD3Graph(graph);
    expect(layout['aws']).toBeDefined();
    expect(layout['aws.account']).toBeDefined();
    expect(layout['aws.managed']).toBeDefined();
    const acc = layout['aws.account']!;
    const man = layout['aws.managed']!;
    expect(man.x).toBeGreaterThanOrEqual(acc.x + acc.w);
  });

  it('shifts all descendants when placement repositions a container', () => {
    const graph = parseD3(`
      parent: Parent {
        a: Left Box {
          child1: Deep Child
        }
        b: Right Box {
          placement: right-of a
          child2: Deep Child 2
        }
      }
    `);
    const { layout } = layoutD3Graph(graph);
    const b = layout['parent.b']!;
    const child2 = layout['parent.b.child2']!;
    expect(child2.x).toBeGreaterThanOrEqual(b.x);
    expect(child2.x + child2.w).toBeLessThanOrEqual(b.x + b.w + 5);
  });
});
