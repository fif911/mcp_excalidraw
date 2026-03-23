import { describe, it, expect } from 'vitest';
import { parseD4 } from '../src/utils/d4/parser.js';

describe('D4 parser: nodes', () => {
  it('parses bare nodes', () => {
    const g = parseD4('a: Service A\nb: Service B');
    expect(g.nodes['a']).toBeDefined();
    expect(g.nodes['a'].label).toBe('Service A');
    expect(g.nodes['b'].label).toBe('Service B');
  });

  it('parses nested containers', () => {
    const g = parseD4('cloud: AWS Cloud {\n  svc: Service\n}');
    expect(g.nodes['cloud'].isGroup).toBe(true);
    expect(g.nodes['cloud'].children).toContain('cloud.svc');
    expect(g.nodes['cloud.svc'].parent).toBe('cloud');
  });

  it('parses icon attributes', () => {
    const g = parseD4('svc: Lambda {\n  icon_type: architecture\n  icon_hint: "lambda"\n}');
    expect(g.nodes['svc'].iconType).toBe('architecture');
    expect(g.nodes['svc'].iconHint).toBe('lambda');
  });

  it('parses style attributes', () => {
    const g = parseD4('box: Auth {\n  style.stroke-dash: 5\n  style.stroke: "#E7157B"\n}');
    expect(g.nodes['box'].style['stroke-dash']).toBe('5');
    expect(g.nodes['box'].style['stroke']).toBe('#E7157B');
  });

  it('ignores coordinate attributes', () => {
    const g = parseD4('box: Box {\n  pos: "100,200"\n  layout: layers\n  placement: right-of foo\n  svc: S\n}');
    expect(g.nodes['box'].isGroup).toBe(true);
    expect(g.nodes['box'].children).toContain('box.svc');
  });

  it('parses deep nesting', () => {
    const g = parseD4('a: A {\n  b: B {\n    c: C\n  }\n}');
    expect(g.nodes['a'].children).toContain('a.b');
    expect(g.nodes['a.b'].children).toContain('a.b.c');
    expect(g.nodes['a.b.c'].parent).toBe('a.b');
  });
});

describe('D4 parser: connections', () => {
  it('parses basic connection', () => {
    const g = parseD4('a: A\nb: B\na -> b: 1');
    expect(g.edges.length).toBe(1);
    expect(g.edges[0].from).toBe('a');
    expect(g.edges[0].to).toBe('b');
    expect(g.edges[0].label).toBe('1');
  });

  it('resolves short names by label', () => {
    const g = parseD4('cloud: Cloud {\n  svc: AppSync\n  db: DynamoDB\n}\nAppSync -> DynamoDB: 1');
    expect(g.edges[0].from).toBe('cloud.svc');
    expect(g.edges[0].to).toBe('cloud.db');
  });

  it('resolves short names by local ID', () => {
    const g = parseD4('cloud: Cloud {\n  appsync: AWS AppSync\n  dynamodb: Amazon DynamoDB\n}\nappsync -> dynamodb: 1');
    expect(g.edges[0].from).toBe('cloud.appsync');
    expect(g.edges[0].to).toBe('cloud.dynamodb');
  });

  it('parses arrow_style block', () => {
    const g = parseD4('arrow_style {\n  stroke_color: "#545B64"\n  badge_bg: "#232F3E"\n}');
    expect(g.arrowStyle.strokeColor).toBe('#545B64');
    expect(g.arrowStyle.badgeBg).toBe('#232F3E');
  });

  it('parses connection with block properties', () => {
    const g = parseD4('a: A\nb: B\na -> b: 1 {\n  badge_bg: "#FF0000"\n}');
    expect(g.edges[0].badgeBg).toBe('#FF0000');
  });

  it('ignores waypoints and badge_pos in connection blocks', () => {
    const g = parseD4('a: A\nb: B\na -> b: 1 {\n  waypoints: "100,200"\n  badge_pos: "150,180"\n}');
    expect(g.edges.length).toBe(1);
  });

  it('parses bidirectional arrows', () => {
    const g = parseD4('a: A\nb: B\na <-> b: link');
    expect(g.edges[0].bidirectional).toBe(true);
  });
});

describe('D4 parser: direction', () => {
  it('defaults to RIGHT', () => {
    const g = parseD4('a: A');
    expect(g.direction).toBe('RIGHT');
  });

  it('parses direction down', () => {
    const g = parseD4('direction down\na: A');
    expect(g.direction).toBe('DOWN');
  });

  it('parses direction right', () => {
    const g = parseD4('direction right\na: A');
    expect(g.direction).toBe('RIGHT');
  });
});

describe('D4 parser: short name resolution edge cases', () => {
  it('prefers exact ID match over label match', () => {
    const g = parseD4('a: A {\n  lambda: AWS Lambda\n}\nlambda -> a: 1');
    expect(g.edges[0].from).toBe('a.lambda');
  });

  it('handles connection within nested scope', () => {
    const g = parseD4('cloud: Cloud {\n  a: A\n  b: B\n  a -> b: 1\n}');
    expect(g.edges[0].from).toBe('cloud.a');
    expect(g.edges[0].to).toBe('cloud.b');
  });
});
