import { describe, it, expect } from 'vitest';
import { convertD3ToExcalidraw } from '../src/utils/d3Converter.js';

/** Extract arrows from result, with their absolute points */
function getArrows(result: any) {
  return result.elements
    .filter((el: any) => el.type === 'arrow')
    .map((el: any) => {
      const absPoints = (el.points || []).map((p: number[]) => [
        el.x + p[0],
        el.y + p[1],
      ]);
      return { id: el.id, label: el.label, points: absPoints, rawPoints: el.points };
    });
}

/** Check arrow flows left-to-right overall (last X > first X) */
function arrowFlowsLeftToRight(arrow: any): boolean {
  if (arrow.points.length < 2) return false;
  const first = arrow.points[0];
  const last = arrow.points[arrow.points.length - 1];
  return last[0] > first[0];
}

/** Check arrow has no U-turns (no segment reverses direction) */
function hasNoUTurns(arrow: any): boolean {
  const pts = arrow.points;
  if (pts.length < 3) return true;
  for (let i = 1; i < pts.length - 1; i++) {
    const dxIn = pts[i][0] - pts[i-1][0];
    const dxOut = pts[i+1][0] - pts[i][0];
    const dyIn = pts[i][1] - pts[i-1][1];
    const dyOut = pts[i+1][1] - pts[i][1];
    // X reversal: going right then left (>10px threshold)
    if ((dxIn > 10 && dxOut < -10) || (dxIn < -10 && dxOut > 10)) return false;
    // Y reversal: going down then up
    if ((dyIn > 10 && dyOut < -10) || (dyIn < -10 && dyOut > 10)) return false;
  }
  return true;
}

/** Check all segments are orthogonal */
function allSegmentsOrthogonal(arrow: any, tolerance: number = 3): boolean {
  const pts = arrow.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = Math.abs(pts[i+1][0] - pts[i][0]);
    const dy = Math.abs(pts[i+1][1] - pts[i][1]);
    if (dx > tolerance && dy > tolerance) return false;
  }
  return true;
}

/** Check arrow terminates near (within margin) a target point */
function arrowEndNear(arrow: any, targetX: number, targetY: number, margin: number = 80): boolean {
  const last = arrow.points[arrow.points.length - 1];
  return Math.abs(last[0] - targetX) < margin && Math.abs(last[1] - targetY) < margin;
}

describe('arrow routing: horizontal same-row', () => {
  const result = convertD3ToExcalidraw(`
    box: Container {
      layout: row
      a: Service A
      b: Service B
    }
    box.a -> box.b: 1
  `);
  const arrows = getArrows(result);

  it('produces exactly 1 arrow', () => {
    expect(arrows.length).toBe(1);
  });

  it('arrow flows left to right', () => {
    expect(arrowFlowsLeftToRight(arrows[0])).toBe(true);
  });

  it('arrow has no U-turns', () => {
    expect(hasNoUTurns(arrows[0])).toBe(true);
  });

  it('all segments are orthogonal', () => {
    expect(allSegmentsOrthogonal(arrows[0])).toBe(true);
  });

  it('arrow has at most 3 points (straight or simple L)', () => {
    expect(arrows[0].points.length).toBeLessThanOrEqual(3);
  });
});

describe('arrow routing: route up-then-right', () => {
  const result = convertD3ToExcalidraw(`
    box: Container {
      layout: layers
      col1: {
        bottom: Bottom Service
      }
      col2: {
        top: Top Service
      }
    }
    box.col1.bottom -> box.col2.top: 1 {
      route: up-then-right
    }
  `);
  const arrows = getArrows(result);

  it('produces exactly 1 arrow', () => {
    expect(arrows.length).toBe(1);
  });

  it('arrow has no U-turns', () => {
    expect(hasNoUTurns(arrows[0])).toBe(true);
  });

  it('all segments are orthogonal', () => {
    expect(allSegmentsOrthogonal(arrows[0])).toBe(true);
  });

  it('first segment goes upward (Y decreases)', () => {
    const pts = arrows[0].points;
    // First meaningful segment should have decreasing Y (going up)
    // Could be pts[0]->pts[1] or after an exit stub pts[1]->pts[2]
    let foundUpward = false;
    for (let i = 0; i < Math.min(pts.length - 1, 3); i++) {
      const dy = pts[i+1][1] - pts[i][1];
      const dx = Math.abs(pts[i+1][0] - pts[i][0]);
      if (Math.abs(dy) > 20 && dx < 5) {
        // This is a vertical segment
        expect(dy).toBeLessThan(0); // should go UP
        foundUpward = true;
        break;
      }
    }
    expect(foundUpward).toBe(true);
  });

  it('arrow overall flows left-to-right', () => {
    expect(arrowFlowsLeftToRight(arrows[0])).toBe(true);
  });
});

describe('arrow routing: route down-then-right', () => {
  const result = convertD3ToExcalidraw(`
    box: Container {
      layout: layers
      col1: {
        top: Top Service
      }
      col2: {
        bottom: Bottom Service
      }
    }
    box.col1.top -> box.col2.bottom: 1 {
      route: down-then-right
    }
  `);
  const arrows = getArrows(result);

  it('arrow has no U-turns', () => {
    expect(hasNoUTurns(arrows[0])).toBe(true);
  });

  it('all segments are orthogonal', () => {
    expect(allSegmentsOrthogonal(arrows[0])).toBe(true);
  });

  it('arrow flows left-to-right overall', () => {
    expect(arrowFlowsLeftToRight(arrows[0])).toBe(true);
  });
});

describe('arrow routing: auto-route cross-column', () => {
  const result = convertD3ToExcalidraw(`
    cloud: Cloud {
      layout: layers
      col1: {
        svc_a: Service A
        svc_b: Service B
      }
      col2: {
        svc_c: Service C
        svc_d: Service D
      }
    }
    cloud.col1.svc_a -> cloud.col2.svc_c: 1
    cloud.col1.svc_b -> cloud.col2.svc_d: 2
  `);
  const arrows = getArrows(result);

  it('both arrows flow left-to-right', () => {
    for (const arrow of arrows) {
      expect(arrowFlowsLeftToRight(arrow)).toBe(true);
    }
  });

  it('no U-turns in any arrow', () => {
    for (const arrow of arrows) {
      expect(hasNoUTurns(arrow)).toBe(true);
    }
  });

  it('all segments orthogonal', () => {
    for (const arrow of arrows) {
      expect(allSegmentsOrthogonal(arrow)).toBe(true);
    }
  });
});

describe('arrow routing: cross-container (leaf to leaf)', () => {
  const result = convertD3ToExcalidraw(`
    left: Left Account {
      svc: My Service
    }
    right: Right Account {
      placement: right-of left
      target: Target Service
    }
    left.svc -> right.target: 1
  `);
  const arrows = getArrows(result);

  it('arrow flows left-to-right', () => {
    expect(arrowFlowsLeftToRight(arrows[0])).toBe(true);
  });

  it('no U-turns', () => {
    expect(hasNoUTurns(arrows[0])).toBe(true);
  });

  it('max 5 points (simple path)', () => {
    expect(arrows[0].points.length).toBeLessThanOrEqual(5);
  });
});

describe('arrow routing: leaf to container', () => {
  const result = convertD3ToExcalidraw(`
    cloud: Cloud {
      layout: layers
      col1: {
        lambda: AWS Lambda
      }
      col2: {
        sfn: Step Functions {
          inner: Lambda Inside
        }
      }
    }
    cloud.col1.lambda -> cloud.col2.sfn: 5 {
      route: up-then-right
    }
  `);
  const arrows = getArrows(result);

  it('arrow has no U-turns', () => {
    expect(hasNoUTurns(arrows[0])).toBe(true);
  });

  it('all segments orthogonal', () => {
    expect(allSegmentsOrthogonal(arrows[0])).toBe(true);
  });

  it('arrow flows left-to-right', () => {
    expect(arrowFlowsLeftToRight(arrows[0])).toBe(true);
  });
});
