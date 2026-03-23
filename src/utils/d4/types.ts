export interface D4Node {
  id: string;
  label: string;
  icon?: string;
  iconType?: string;
  iconVariant?: string;
  iconHint?: string;
  style: Record<string, string>;
  parent?: string;
  children: string[];
  isGroup: boolean;
}

export interface D4Edge {
  id: string;
  from: string;
  to: string;
  label: string;
  bidirectional: boolean;
  style: Record<string, string>;
  badgeBg?: string;
  badgeColor?: string;
  badgeSize?: number;
  badgeShape?: string;
}

export interface D4ArrowStyle {
  strokeColor: string;
  strokeWidth: number;
  badgeBg: string;
  badgeColor: string;
  badgeSize: number;
  badgeShape: string;
}

export interface D4Graph {
  nodes: Record<string, D4Node>;
  edges: D4Edge[];
  arrowStyle: D4ArrowStyle;
  direction: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
}

export interface D4LayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface D4LayoutEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  points: number[][];
  sections?: any[];
  badgeBg?: string;
  badgeColor?: string;
  badgeSize?: number;
  badgeShape?: string;
}

export interface D4Layout {
  nodes: Record<string, D4LayoutNode>;
  edges: D4LayoutEdge[];
}

export interface D4Result {
  elements: any[];
  files: Array<{ id: string; dataURL: string; mimeType: string }>;
  iconsMissing: string[];
  validationIssues: string[];
  stats: { containers: number; nodes: number; arrows: number; badges: number };
  positions: Array<{
    id: string;
    type: 'container' | 'icon' | 'external';
    label: string;
    x: number; y: number; w: number; h: number;
    icon_cx: number; icon_cy: number;
  }>;
}
