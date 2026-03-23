import { describe, it, expect } from 'vitest';
import { convertD4ToExcalidraw } from '../src/utils/d4/index.js';

// Get absolute arrow points (arrow x/y + relative points)
function getArrowAbsolutePoints(result: any): Array<{id: string, points: number[][]}> {
  return result.elements
    .filter((el: any) => el.type === 'arrow')
    .map((el: any) => ({
      id: el.id,
      points: (el.points || []).map((p: number[]) => [el.x + p[0], el.y + p[1]])
    }));
}

// Get icon bounding box for a node (from the image element)
function getIconBbox(result: any, nodeId: string): {x: number, y: number, w: number, h: number} | null {
  const safeId = nodeId.replace(/\./g, '_');
  const img = result.elements.find((el: any) => el.type === 'image' && el.id === `img-${safeId}`);
  if (!img) return null;
  return { x: img.x, y: img.y, w: img.width || 98, h: img.height || 98 };
}

// Check if a point is INSIDE an icon bounding box (penetration)
function pointInsideIcon(px: number, py: number, icon: {x: number, y: number, w: number, h: number}, margin: number = 5): boolean {
  return px > icon.x + margin && px < icon.x + icon.w - margin &&
         py > icon.y + margin && py < icon.y + icon.h - margin;
}

// Check all segments are orthogonal (dx=0 or dy=0 within tolerance)
function allOrthogonal(points: number[][], tolerance: number = 3): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const dx = Math.abs(points[i+1][0] - points[i][0]);
    const dy = Math.abs(points[i+1][1] - points[i][1]);
    if (dx > tolerance && dy > tolerance) return false;
  }
  return true;
}

// Check no U-turns (no direction reversal)
function noUTurns(points: number[][], threshold: number = 10): boolean {
  for (let i = 1; i < points.length - 1; i++) {
    const dxIn = points[i][0] - points[i-1][0];
    const dxOut = points[i+1][0] - points[i][0];
    const dyIn = points[i][1] - points[i-1][1];
    const dyOut = points[i+1][1] - points[i][1];
    if ((dxIn > threshold && dxOut < -threshold) || (dxIn < -threshold && dxOut > threshold)) return false;
    if ((dyIn > threshold && dyOut < -threshold) || (dyIn < -threshold && dyOut > threshold)) return false;
  }
  return true;
}

// Get container bounding box (rectangle element)
function getContainerBbox(result: any, nodeId: string): {x: number, y: number, w: number, h: number} | null {
  const safeId = nodeId.replace(/\./g, '_');
  const rect = result.elements.find((el: any) => el.type === 'rectangle' && el.id === safeId);
  if (!rect) return null;
  return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
}

// ─── Suite 1: Arrow does not penetrate icons ────────────────────────────────

describe('routing: arrow does not penetrate icons', () => {
  it('horizontal arrow stops at icon edges', async () => {
    const result = await convertD4ToExcalidraw(`
      a: Amazon S3
      b: AWS Lambda
      a -> b: 1
    `);
    const arrows = getArrowAbsolutePoints(result);
    const iconA = getIconBbox(result, 'a');
    const iconB = getIconBbox(result, 'b');
    expect(arrows.length).toBe(1);
    expect(iconA).not.toBeNull();
    expect(iconB).not.toBeNull();

    // No arrow point should be inside either icon
    for (const pt of arrows[0].points) {
      expect(pointInsideIcon(pt[0], pt[1], iconA!)).toBe(false);
      expect(pointInsideIcon(pt[0], pt[1], iconB!)).toBe(false);
    }
  });

  it('3-node chain: no arrow penetrates middle icon', async () => {
    const result = await convertD4ToExcalidraw(`
      a: Amazon S3
      b: AWS Lambda
      c: Amazon DynamoDB
      a -> b: 1
      b -> c: 2
    `);
    const arrows = getArrowAbsolutePoints(result);
    const iconB = getIconBbox(result, 'b');
    expect(arrows.length).toBe(2);
    expect(iconB).not.toBeNull();

    for (const arrow of arrows) {
      for (const pt of arrow.points) {
        expect(pointInsideIcon(pt[0], pt[1], iconB!)).toBe(false);
      }
    }
  });

  it('cross-container arrow does not penetrate icons', async () => {
    const result = await convertD4ToExcalidraw(`
      left: Left {
        sender: Amazon S3
      }
      right: Right {
        receiver: AWS Lambda
      }
      sender -> receiver: 1
    `);
    const arrows = getArrowAbsolutePoints(result);
    const iconSender = getIconBbox(result, 'left.sender');
    const iconReceiver = getIconBbox(result, 'right.receiver');
    expect(arrows.length).toBe(1);

    for (const pt of arrows[0].points) {
      if (iconSender) expect(pointInsideIcon(pt[0], pt[1], iconSender)).toBe(false);
      if (iconReceiver) expect(pointInsideIcon(pt[0], pt[1], iconReceiver)).toBe(false);
    }
  });
});

// ─── Suite 2: All arrows are orthogonal ─────────────────────────────────────

describe('routing: all arrows orthogonal', () => {
  it('simple horizontal', async () => {
    const result = await convertD4ToExcalidraw('a: A\nb: B\na -> b: 1');
    const arrows = getArrowAbsolutePoints(result);
    expect(allOrthogonal(arrows[0].points)).toBe(true);
  });

  it('simple vertical', async () => {
    const result = await convertD4ToExcalidraw('direction down\na: A\nb: B\na -> b: 1');
    const arrows = getArrowAbsolutePoints(result);
    expect(allOrthogonal(arrows[0].points)).toBe(true);
  });

  it('3-node chain all orthogonal', async () => {
    const result = await convertD4ToExcalidraw('a: A\nb: B\nc: C\na -> b: 1\nb -> c: 2');
    const arrows = getArrowAbsolutePoints(result);
    for (const arrow of arrows) {
      expect(allOrthogonal(arrow.points)).toBe(true);
    }
  });

  it('cross-container orthogonal', async () => {
    const result = await convertD4ToExcalidraw(`
      left: Left { a: Amazon S3 }
      right: Right { b: AWS Lambda }
      a -> b: 1
    `);
    const arrows = getArrowAbsolutePoints(result);
    expect(allOrthogonal(arrows[0].points)).toBe(true);
  });
});

// ─── Suite 3: No U-turns ────────────────────────────────────────────────────

describe('routing: no U-turns', () => {
  it('simple arrows have no reversals', async () => {
    const result = await convertD4ToExcalidraw('a: A\nb: B\nc: C\na -> b: 1\nb -> c: 2');
    const arrows = getArrowAbsolutePoints(result);
    for (const arrow of arrows) {
      expect(noUTurns(arrow.points)).toBe(true);
    }
  });

  it('cross-container has no reversals', async () => {
    const result = await convertD4ToExcalidraw(`
      left: Left { a: Service A }
      right: Right { b: Service B }
      a -> b: 1
    `);
    const arrows = getArrowAbsolutePoints(result);
    expect(noUTurns(arrows[0].points)).toBe(true);
  });
});

// ─── Suite 4: Arrow direction matches flow ──────────────────────────────────

describe('routing: arrow direction matches flow', () => {
  it('horizontal flow: arrow end X > arrow start X', async () => {
    const result = await convertD4ToExcalidraw('a: A\nb: B\na -> b: 1');
    const arrows = getArrowAbsolutePoints(result);
    const pts = arrows[0].points;
    const startX = pts[0][0];
    const endX = pts[pts.length - 1][0];
    expect(endX).toBeGreaterThan(startX);
  });

  it('vertical flow: arrow end Y > arrow start Y', async () => {
    const result = await convertD4ToExcalidraw('direction down\na: A\nb: B\na -> b: 1');
    const arrows = getArrowAbsolutePoints(result);
    const pts = arrows[0].points;
    const startY = pts[0][1];
    const endY = pts[pts.length - 1][1];
    expect(endY).toBeGreaterThan(startY);
  });
});

// ─── Suite 5: Container nesting — children inside parents ───────────────────

describe('layout: container nesting', () => {
  it('children are inside parent container', async () => {
    const result = await convertD4ToExcalidraw(`
      cloud: AWS Cloud {
        svc: Amazon S3
      }
    `);
    const container = getContainerBbox(result, 'cloud');
    const icon = getIconBbox(result, 'cloud.svc');
    expect(container).not.toBeNull();
    expect(icon).not.toBeNull();

    // Icon fully inside container
    expect(icon!.x).toBeGreaterThanOrEqual(container!.x);
    expect(icon!.y).toBeGreaterThanOrEqual(container!.y);
    expect(icon!.x + icon!.w).toBeLessThanOrEqual(container!.x + container!.w);
    expect(icon!.y + icon!.h).toBeLessThanOrEqual(container!.y + container!.h);
  });

  it('nested containers: inner fully inside outer', async () => {
    const result = await convertD4ToExcalidraw(`
      outer: AWS Cloud {
        inner: VPC {
          svc: Amazon S3
        }
      }
    `);
    const outer = getContainerBbox(result, 'outer');
    const inner = getContainerBbox(result, 'outer.inner');
    expect(outer).not.toBeNull();
    expect(inner).not.toBeNull();

    expect(inner!.x).toBeGreaterThanOrEqual(outer!.x);
    expect(inner!.y).toBeGreaterThanOrEqual(outer!.y);
    expect(inner!.x + inner!.w).toBeLessThanOrEqual(outer!.x + outer!.w);
    expect(inner!.y + inner!.h).toBeLessThanOrEqual(outer!.y + outer!.h);
  });

  it('container header does not overlap first child', async () => {
    const result = await convertD4ToExcalidraw(`
      account: Customer Account {
        svc: Amazon S3
      }
    `);
    const container = getContainerBbox(result, 'account');
    const icon = getIconBbox(result, 'account.svc');
    expect(container).not.toBeNull();
    expect(icon).not.toBeNull();

    // Icon top should be well below container top (header space)
    // At minimum 40px (text header) below container top
    expect(icon!.y - container!.y).toBeGreaterThanOrEqual(40);
  });
});

// ─── Suite 6: Newline labels ────────────────────────────────────────────────

describe('rendering: newline labels', () => {
  it('\\n in labels produces multi-line text', async () => {
    const result = await convertD4ToExcalidraw(`
      dth: Data Transfer\\nHub UI
      cf: Amazon CloudFront
      dth -> cf: 1
    `);
    // Find the text element for the label
    const textEls = result.elements.filter((el: any) =>
      el.type === 'text' && (el.text === 'Data Transfer' || el.text === 'Hub UI')
    );
    // Should have two separate text lines (or one with newline)
    expect(textEls.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Full diagram stress test ──────────────────────────────────────────

describe('routing: Data Transfer Hub (full diagram)', () => {
  let result: any;
  
  beforeAll(async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.resolve(import.meta.dirname, 'fixtures/data-transfer-hub.d4'), 'utf-8'
    );
    result = await convertD4ToExcalidraw(source);
  });

  it('no arrow penetrates any icon', () => {
    const arrows = getArrowAbsolutePoints(result);
    const allIcons = result.elements
      .filter((el: any) => el.type === 'image')
      .map((el: any) => ({
        id: el.id,
        x: el.x, y: el.y,
        w: el.width || 98, h: el.height || 98
      }));

    const penetrations: string[] = [];
    for (const arrow of arrows) {
      for (const pt of arrow.points) {
        for (const icon of allIcons) {
          if (pointInsideIcon(pt[0], pt[1], icon, 10)) {
            penetrations.push(`Arrow ${arrow.id} point (${pt[0].toFixed(0)},${pt[1].toFixed(0)}) inside icon ${icon.id}`);
          }
        }
      }
    }
    
    if (penetrations.length > 0) {
      console.log('PENETRATIONS FOUND:');
      for (const p of penetrations) console.log('  ', p);
    }
    expect(penetrations).toEqual([]);
  });

  it('all arrows are orthogonal', () => {
    const arrows = getArrowAbsolutePoints(result);
    const diagonals: string[] = [];
    for (const arrow of arrows) {
      if (!allOrthogonal(arrow.points)) {
        diagonals.push(`Arrow ${arrow.id} has diagonal segments`);
      }
    }
    expect(diagonals).toEqual([]);
  });

  it('no arrows have U-turns', () => {
    const arrows = getArrowAbsolutePoints(result);
    const uturns: string[] = [];
    for (const arrow of arrows) {
      if (!noUTurns(arrow.points)) {
        uturns.push(`Arrow ${arrow.id} has U-turn`);
      }
    }
    expect(uturns).toEqual([]);
  });

  it('no arrow is too short (< 50px span)', () => {
    const arrows = getArrowAbsolutePoints(result);
    const short: string[] = [];
    for (const arrow of arrows) {
      const pts = arrow.points;
      const dx = Math.abs(pts[pts.length-1][0] - pts[0][0]);
      const dy = Math.abs(pts[pts.length-1][1] - pts[0][1]);
      if (dx < 50 && dy < 50) {
        short.push(`Arrow ${arrow.id} span=(${dx.toFixed(0)},${dy.toFixed(0)})`);
      }
    }
    expect(short).toEqual([]);
  });

  it('all children inside their parent containers', () => {
    const violations: string[] = [];
    for (const pos of result.positions) {
      if (pos.type !== 'icon') continue;
      // Find parent container
      const parts = pos.id.split('.');
      if (parts.length < 2) continue;
      const parentId = parts.slice(0, -1).join('.');
      const parentPos = result.positions.find((p: any) => p.id === parentId && p.type === 'container');
      if (!parentPos) continue;
      
      if (pos.x < parentPos.x - 5 || pos.y < parentPos.y - 5 ||
          pos.x + pos.w > parentPos.x + parentPos.w + 5 ||
          pos.y + pos.h > parentPos.y + parentPos.h + 5) {
        violations.push(`${pos.label} (${pos.id}) outside parent ${parentId}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
