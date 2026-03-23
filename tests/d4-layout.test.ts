import { describe, it, expect } from 'vitest';
import { parseD4 } from '../src/utils/d4/parser.js';
import { layoutD4Graph } from '../src/utils/d4/layouter.js';

describe('D4 layout: basic positioning', () => {
  it('assigns positions to all nodes', async () => {
    const graph = parseD4('a: Service A\nb: Service B\na -> b: 1');
    const layout = await layoutD4Graph(graph);
    expect(layout.nodes['a']).toBeDefined();
    expect(layout.nodes['b']).toBeDefined();
    expect(layout.nodes['a'].x).toBeGreaterThanOrEqual(0);
    expect(layout.nodes['b'].x).toBeGreaterThan(layout.nodes['a'].x);
  });

  it('positions containers around their children', async () => {
    const graph = parseD4('box: Container {\n  a: Service A\n  b: Service B\n}\nbox.a -> box.b: 1');
    const layout = await layoutD4Graph(graph);
    const box = layout.nodes['box'];
    const a = layout.nodes['box.a'];
    expect(box).toBeDefined();
    expect(a).toBeDefined();
    expect(a.x).toBeGreaterThanOrEqual(box.x);
    expect(a.y).toBeGreaterThanOrEqual(box.y);
    expect(a.x + a.w).toBeLessThanOrEqual(box.x + box.w + 5);
  });

  it('routes edges with points', async () => {
    const graph = parseD4('a: A\nb: B\nc: C\na -> b: 1\na -> c: 2');
    const layout = await layoutD4Graph(graph);
    expect(layout.edges.length).toBe(2);
    for (const edge of layout.edges) {
      expect(edge.points.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('respects direction down', async () => {
    const graph = parseD4('direction down\na: A\nb: B\na -> b: 1');
    const layout = await layoutD4Graph(graph);
    expect(layout.nodes['b'].y).toBeGreaterThan(layout.nodes['a'].y);
  });
});

describe('D4 layout: nested containers', () => {
  it('handles 3-level nesting', async () => {
    const graph = parseD4('cloud: Cloud {\n  account: Account {\n    svc: Service\n  }\n}');
    const layout = await layoutD4Graph(graph);
    const cloud = layout.nodes['cloud'];
    const account = layout.nodes['cloud.account'];
    const svc = layout.nodes['cloud.account.svc'];
    expect(cloud).toBeDefined();
    expect(account).toBeDefined();
    expect(svc).toBeDefined();
    expect(svc.x).toBeGreaterThanOrEqual(account.x);
    expect(account.x).toBeGreaterThanOrEqual(cloud.x);
  });
});

describe('D4 layout: edge points', () => {
  it('all edge points are finite numbers', async () => {
    const graph = parseD4('a: A\nb: B\nc: C\na -> b: 1\nb -> c: 2');
    const layout = await layoutD4Graph(graph);
    for (const edge of layout.edges) {
      for (const pt of edge.points) {
        expect(Number.isFinite(pt[0])).toBe(true);
        expect(Number.isFinite(pt[1])).toBe(true);
      }
    }
  });

  it('cross-container edges have valid points', async () => {
    const graph = parseD4('left: Left {\n  a: Service A\n}\nright: Right {\n  b: Service B\n}\na -> b: 1');
    const layout = await layoutD4Graph(graph);
    expect(layout.edges.length).toBe(1);
    expect(layout.edges[0].points.length).toBeGreaterThanOrEqual(2);
  });
});
