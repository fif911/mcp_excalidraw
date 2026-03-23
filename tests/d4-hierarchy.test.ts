import { describe, it, expect } from 'vitest';
import { convertD4ToExcalidraw } from '../src/utils/d4/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPositions(result: any) {
  return result.positions as Array<{
    id: string; type: string; label: string;
    x: number; y: number; w: number; h: number;
  }>;
}

function bbox(p: { x: number; y: number; w: number; h: number }) {
  return { left: p.x, top: p.y, right: p.x + p.w, bottom: p.y + p.h };
}

function overlaps(a: ReturnType<typeof bbox>, b: ReturnType<typeof bbox>): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function isInside(child: ReturnType<typeof bbox>, parent: ReturnType<typeof bbox>, tolerance = 2): boolean {
  return child.left >= parent.left - tolerance &&
         child.top >= parent.top - tolerance &&
         child.right <= parent.right + tolerance &&
         child.bottom <= parent.bottom + tolerance;
}

function getArrowAbsolutePoints(result: any): Array<{ id: string; points: number[][] }> {
  return result.elements
    .filter((el: any) => el.type === 'arrow')
    .map((el: any) => ({
      id: el.id,
      points: (el.points || []).map((p: number[]) => [el.x + p[0], el.y + p[1]]),
    }));
}

function pointInsideIcon(
  px: number, py: number,
  icon: { x: number; y: number; w: number; h: number },
  margin = 5,
): boolean {
  return px > icon.x + margin && px < icon.x + icon.w - margin &&
         py > icon.y + margin && py < icon.y + icon.h - margin;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('hierarchy: managed account disconnected nodes', () => {
  it('disconnected nodes spread across layers, not stacked vertically', async () => {
    const result = await convertD4ToExcalidraw(`
managed: AWS Managed Account {
  s3_managed: Amazon S3
  s3_repl: S3 replication component template
  dynamodb_repl: DynamoDB replication component template
  ecr_repl: ECR replication component template
  ecr: Amazon ECR
  ecr_docker: ECR replication Docker image
}
ecr -> ecr_repl: 7
ecr_repl -> ecr_docker
`);
    const icons = getPositions(result).filter(p => p.type === 'icon');
    // Should have at least 2 distinct Y layers
    const yBuckets = new Set(icons.map(p => Math.round(p.y / 50)));
    expect(yBuckets.size).toBeGreaterThanOrEqual(2);
    // X span should be significant (not all stacked in one column)
    const xValues = icons.map(p => p.x);
    const xSpan = Math.max(...xValues) - Math.min(...xValues);
    expect(xSpan).toBeGreaterThan(200);
  });

  it('all icons inside container', async () => {
    const result = await convertD4ToExcalidraw(`
managed: AWS Managed Account {
  s3_managed: Amazon S3
  s3_repl: S3 replication component template
  dynamodb_repl: DynamoDB replication component template
  ecr: Amazon ECR
}
`);
    const positions = getPositions(result);
    const container = positions.find(p => p.id === 'managed')!;
    const icons = positions.filter(p => p.type === 'icon');
    for (const icon of icons) {
      expect(isInside(bbox(icon), bbox(container))).toBe(true);
    }
  });
});

describe('hierarchy: SFN sub-container', () => {
  it('SFN does not overlap CloudFormation or other siblings', async () => {
    const result = await convertD4ToExcalidraw(`
account: Customer Account {
  lambda: AWS Lambda
  sfn: AWS Step Functions workflow {
    sfn_lambda: AWS Lambda
  }
  cloudformation: AWS CloudFormation
  fargate: AWS Fargate
}
lambda -> sfn_lambda: 5
sfn_lambda -> fargate
`);
    const positions = getPositions(result);
    const sfn = positions.find(p => p.id === 'account.sfn')!;
    const cf = positions.find(p => p.id === 'account.cloudformation')!;
    const fargate = positions.find(p => p.id === 'account.fargate')!;
    const lambda = positions.find(p => p.id === 'account.lambda')!;

    expect(overlaps(bbox(sfn), bbox(cf))).toBe(false);
    expect(overlaps(bbox(sfn), bbox(fargate))).toBe(false);
    expect(overlaps(bbox(sfn), bbox(lambda))).toBe(false);
  });

  it('SFN lambda is inside SFN container', async () => {
    const result = await convertD4ToExcalidraw(`
account: Customer Account {
  sfn: AWS Step Functions workflow {
    sfn_lambda: AWS Lambda
  }
  lambda: AWS Lambda
}
lambda -> sfn_lambda: 5
`);
    const positions = getPositions(result);
    const sfn = positions.find(p => p.id === 'account.sfn')!;
    const sfnLambda = positions.find(p => p.id === 'account.sfn.sfn_lambda')!;
    expect(isInside(bbox(sfnLambda), bbox(sfn))).toBe(true);
  });
});

describe('hierarchy: auth sub-container', () => {
  it('auth does not overlap sibling nodes', async () => {
    const result = await convertD4ToExcalidraw(`
account: Customer Account {
  auth: Authentication {
    cognito: Amazon Cognito
    openid: OpenID Connect
  }
  appsync: AWS AppSync
  lambda: AWS Lambda
  dynamodb: Amazon DynamoDB
}
appsync -> lambda: 4
appsync -> dynamodb: 8
`);
    const positions = getPositions(result);
    const auth = positions.find(p => p.id === 'account.auth')!;
    const siblings = positions.filter(p =>
      p.type === 'icon' && p.id.startsWith('account.') && !p.id.startsWith('account.auth'),
    );
    for (const s of siblings) {
      expect(overlaps(bbox(auth), bbox(s))).toBe(false);
    }
  });

  it('cognito and openid are inside auth container', async () => {
    const result = await convertD4ToExcalidraw(`
account: Customer Account {
  auth: Authentication {
    cognito: Amazon Cognito
    openid: OpenID Connect
  }
  appsync: AWS AppSync
}
`);
    const positions = getPositions(result);
    const auth = positions.find(p => p.id === 'account.auth')!;
    const cognito = positions.find(p => p.id === 'account.auth.cognito')!;
    const openid = positions.find(p => p.id === 'account.auth.openid')!;
    expect(isInside(bbox(cognito), bbox(auth))).toBe(true);
    expect(isInside(bbox(openid), bbox(auth))).toBe(true);
  });
});

describe('hierarchy: cross-container arrows', () => {
  it('arrows between sibling containers flow left to right', async () => {
    const result = await convertD4ToExcalidraw(`
cloud: AWS Cloud {
  customer: Customer Account {
    s3: Amazon S3
    dynamodb: Amazon DynamoDB
  }
  managed: Managed Account {
    s3_repl: S3 replication component template
    dynamodb_repl: DynamoDB replication component template
  }
}
s3 -> s3_repl: 6
dynamodb -> dynamodb_repl
`);
    const arrows = getArrowAbsolutePoints(result);
    expect(arrows.length).toBe(2);
    for (const arrow of arrows) {
      const pts = arrow.points;
      expect(pts[pts.length - 1]![0]).toBeGreaterThan(pts[0]![0]);
    }
    // Containers should not overlap
    const positions = getPositions(result);
    const customer = positions.find(p => p.id === 'cloud.customer')!;
    const managed = positions.find(p => p.id === 'cloud.managed')!;
    expect(overlaps(bbox(customer), bbox(managed))).toBe(false);
    expect(managed.x).toBeGreaterThan(customer.x + customer.w - 5);
  });

  it('cross-container arrows are orthogonal', async () => {
    const result = await convertD4ToExcalidraw(`
cloud: AWS Cloud {
  left: Left { a: Amazon S3 }
  right: Right { b: AWS Lambda }
}
a -> b: 1
`);
    const arrows = getArrowAbsolutePoints(result);
    for (const arrow of arrows) {
      for (let i = 0; i < arrow.points.length - 1; i++) {
        const dx = Math.abs(arrow.points[i + 1]![0] - arrow.points[i]![0]);
        const dy = Math.abs(arrow.points[i + 1]![1] - arrow.points[i]![1]);
        expect(dx < 3 || dy < 3).toBe(true);
      }
    }
  });
});

describe('hierarchy: deep nesting (4 levels)', () => {
  it('all containers contain their children at every level', async () => {
    const result = await convertD4ToExcalidraw(`
cloud: AWS Cloud {
  account: Customer Account {
    auth: Authentication {
      cognito: Amazon Cognito
      openid: OpenID Connect
    }
    sfn: AWS Step Functions workflow {
      sfn_lambda: AWS Lambda
    }
    appsync: AWS AppSync
    lambda: AWS Lambda
  }
}
appsync -> lambda: 4
lambda -> sfn_lambda: 5
`);
    const positions = getPositions(result);

    // Check each parent-child relationship
    const parentChildPairs = [
      ['cloud', 'cloud.account'],
      ['cloud.account', 'cloud.account.auth'],
      ['cloud.account', 'cloud.account.sfn'],
      ['cloud.account', 'cloud.account.appsync'],
      ['cloud.account', 'cloud.account.lambda'],
      ['cloud.account.auth', 'cloud.account.auth.cognito'],
      ['cloud.account.auth', 'cloud.account.auth.openid'],
      ['cloud.account.sfn', 'cloud.account.sfn.sfn_lambda'],
    ];

    for (const [parentId, childId] of parentChildPairs) {
      const parent = positions.find(p => p.id === parentId);
      const child = positions.find(p => p.id === childId);
      expect(parent).toBeTruthy();
      expect(child).toBeTruthy();
      expect(isInside(bbox(child!), bbox(parent!))).toBe(true);
    }
  });

  it('auth and sfn sub-containers do not overlap', async () => {
    const result = await convertD4ToExcalidraw(`
cloud: AWS Cloud {
  account: Customer Account {
    auth: Authentication {
      cognito: Amazon Cognito
      openid: OpenID Connect
    }
    sfn: AWS Step Functions workflow {
      sfn_lambda: AWS Lambda
    }
    appsync: AWS AppSync
  }
}
appsync -> sfn_lambda: 5
`);
    const positions = getPositions(result);
    const auth = positions.find(p => p.id === 'cloud.account.auth')!;
    const sfn = positions.find(p => p.id === 'cloud.account.sfn')!;
    expect(overlaps(bbox(auth), bbox(sfn))).toBe(false);
  });
});

describe('hierarchy: user external node flow', () => {
  it('user is to the left of account container', async () => {
    const result = await convertD4ToExcalidraw(`
cloud: AWS Cloud {
  user: User
  account: Customer Account {
    dth_ui: Data Transfer Hub UI
    appsync: AWS AppSync
  }
}
user -> dth_ui: 2
user -> appsync: 3
`);
    const positions = getPositions(result);
    const user = positions.find(p => p.id === 'cloud.user')!;
    const account = positions.find(p => p.id === 'cloud.account')!;
    expect(user.x + user.w).toBeLessThan(account.x);
  });

  it('no arrow penetrates any icon', async () => {
    const result = await convertD4ToExcalidraw(`
cloud: AWS Cloud {
  user: User
  account: Customer Account {
    dth_ui: Data Transfer Hub UI
    appsync: AWS AppSync
  }
}
user -> dth_ui: 2
user -> appsync: 3
`);
    const arrows = getArrowAbsolutePoints(result);
    const icons = result.elements
      .filter((el: any) => el.type === 'image')
      .map((el: any) => ({
        id: el.id,
        x: el.x, y: el.y,
        w: el.width || 98, h: el.height || 98,
      }));

    for (const arrow of arrows) {
      const endpoints = [arrow.points[0]!, arrow.points[arrow.points.length - 1]!];
      for (const pt of endpoints) {
        for (const icon of icons) {
          expect(pointInsideIcon(pt[0]!, pt[1]!, icon, 10)).toBe(false);
        }
      }
    }
  });
});
