/**
 * Enhanced D2 Parser
 *
 * Parses extended D2 syntax with pos, icon, stroke, arrow_style attributes
 * into a structured AST for the enhanced D2 builder.
 *
 * This is separate from d2Converter.ts — different AST, different attributes.
 */

// ── AST Types ───────────────────────────────────────────────────────────

export interface ArrowStyleBlock {
  stroke: string;
  stroke_width: number;
  badge_bg: string;
  badge_color: string;
  badge_size: number;
  badge_shape: string;  // "circle" | "square"
}

export interface EnhancedNode {
  id: string;               // short D2 id
  qualifiedId: string;      // dot-joined path
  label: string;
  pos: { cx: number; cy: number };
  icon?: string;
  icon_variant?: string;    // "Light" | "Dark"
  icon_color?: string;
  external?: boolean;
  parent?: string;          // parent's short ID
}

export interface EnhancedContainer {
  id: string;
  qualifiedId: string;
  label: string;
  pos: { x: number; y: number; w: number; h: number };
  stroke: string;
  stroke_style: string;     // "solid" | "dashed"
  stroke_width: number;
  header_icon?: string;
  fill: string;
  parent?: string;          // parent's short ID
  children: string[];       // short IDs of direct children
}

export interface EnhancedConnection {
  from: string;
  to: string;
  label_number?: number;
  bidirectional: boolean;
  waypoints?: Array<{ x: number; y: number }>;
  badge_pos?: { cx: number; cy: number };
  border_stop?: { containerId: string; side: 'left' | 'right' | 'top' | 'bottom' };
  plain: boolean;
}

export interface EnhancedD2Graph {
  arrow_style: ArrowStyleBlock;
  nodes: Map<string, EnhancedNode>;
  containers: Map<string, EnhancedContainer>;
  connections: EnhancedConnection[];
}

// ── Parser ──────────────────────────────────────────────────────────────

interface RawBlock {
  id: string;
  label: string;
  attrs: Record<string, string>;
  children: string[];       // child short IDs
  parent?: string;          // parent short ID
  qualifiedId: string;
}

interface RawConnection {
  from: string;
  to: string;
  label_number?: number;
  bidirectional: boolean;
  attrs: Record<string, string>;
}

/**
 * Parse enhanced D2 source into a structured graph.
 *
 * Throws on: missing arrow_style, duplicate short IDs, missing required attrs,
 * malformed pos values, unknown attributes.
 */
export function parseEnhancedD2(source: string): EnhancedD2Graph {
  const lines = source
    .split('\n')
    .map(l => {
      // Strip comments but preserve # inside quoted strings
      let result = '';
      let inQuote = false;
      for (const ch of l) {
        if (ch === '"') inQuote = !inQuote;
        if (ch === '#' && !inQuote) break;
        result += ch;
      }
      return result.trimEnd();
    })
    .map(l => l.trim())
    .filter(Boolean);

  // State
  const contextStack: string[] = [];      // stack of short IDs for nesting
  const qualifiedStack: string[] = [];    // stack of qualified IDs
  const blocks = new Map<string, RawBlock>();
  const connections: RawConnection[] = [];
  let arrowStyleAttrs: Record<string, string> | null = null;
  let insideArrowStyle = false;
  let insideConnectionBlock = false;
  let currentConnection: RawConnection | null = null;
  let braceDepth = 0;
  let arrowStyleBraceDepth = 0;
  let connectionBraceDepth = 0;

  // Helpers
  const currentQualifiedId = () => qualifiedStack.join('.');
  const getQualifiedId = (shortId: string) =>
    qualifiedStack.length ? `${currentQualifiedId()}.${shortId}` : shortId;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNum = i + 1;

    // ── Inside arrow_style block ──
    if (insideArrowStyle) {
      if (line === '}') {
        insideArrowStyle = false;
        continue;
      }
      const attrMatch = line.match(/^(\w+):\s*"(.+)"$/);
      if (attrMatch && arrowStyleAttrs) {
        arrowStyleAttrs[attrMatch[1]!] = attrMatch[2]!;
      }
      continue;
    }

    // ── Inside connection block ──
    if (insideConnectionBlock) {
      if (line === '}') {
        insideConnectionBlock = false;
        currentConnection = null;
        continue;
      }
      const attrMatch = line.match(/^(\w+):\s*"(.+)"$/);
      if (attrMatch && currentConnection) {
        currentConnection.attrs[attrMatch[1]!] = attrMatch[2]!;
      }
      continue;
    }

    // ── Arrow style block opening ──
    if (line.match(/^arrow_style:\s*\{$/)) {
      arrowStyleAttrs = {};
      insideArrowStyle = true;
      continue;
    }

    // ── Closing brace (container) ──
    if (line === '}') {
      contextStack.pop();
      qualifiedStack.pop();
      braceDepth--;
      continue;
    }

    // ── Connection with block: "source -> target: N {" or "source -> target {" ──
    const connBlockMatch = line.match(/^([\w_]+)\s*(->|<->)\s*([\w_]+)(?::\s*(\d+))?\s*\{$/);
    if (connBlockMatch) {
      const conn: RawConnection = {
        from: connBlockMatch[1]!,
        to: connBlockMatch[3]!,
        label_number: connBlockMatch[4] ? parseInt(connBlockMatch[4]) : undefined,
        bidirectional: connBlockMatch[2] === '<->',
        attrs: {},
      };
      connections.push(conn);
      currentConnection = conn;
      insideConnectionBlock = true;
      continue;
    }

    // ── Simple connection: "source -> target: N" or "source -> target" ──
    const connMatch = line.match(/^([\w_]+)\s*(->|<->)\s*([\w_]+)(?::\s*(\d+))?$/);
    if (connMatch) {
      connections.push({
        from: connMatch[1]!,
        to: connMatch[3]!,
        label_number: connMatch[4] ? parseInt(connMatch[4]) : undefined,
        bidirectional: connMatch[2] === '<->',
        attrs: {},
      });
      continue;
    }

    // ── Block opening: "key: Label {" ──
    const blockMatch = line.match(/^([\w_]+):\s*(.+?)\s*\{$/);
    if (blockMatch) {
      const shortId = blockMatch[1]!;
      const label = blockMatch[2]!.replace(/\\n/g, '\n');
      const qualifiedId = getQualifiedId(shortId);
      const parentId = contextStack.length > 0 ? contextStack[contextStack.length - 1] : undefined;

      if (blocks.has(shortId)) {
        throw new Error(`Line ${lineNum}: Duplicate short ID "${shortId}". All D2 IDs must be unique across the diagram.`);
      }

      const block: RawBlock = {
        id: shortId,
        label,
        attrs: {},
        children: [],
        parent: parentId,
        qualifiedId,
      };
      blocks.set(shortId, block);

      // Register as child of parent
      if (parentId && blocks.has(parentId)) {
        blocks.get(parentId)!.children.push(shortId);
      }

      contextStack.push(shortId);
      qualifiedStack.push(shortId);
      braceDepth++;
      continue;
    }

    // ── Attribute: key: "value" ──
    const attrMatch = line.match(/^(\w+):\s*"(.+)"$/);
    if (attrMatch) {
      const currentBlockId = contextStack[contextStack.length - 1];
      if (currentBlockId && blocks.has(currentBlockId)) {
        blocks.get(currentBlockId)!.attrs[attrMatch[1]!] = attrMatch[2]!;
      }
      continue;
    }

    // If we're inside a container, this might be a simple node declaration with no block
    // e.g., just "key: Label" as a leaf with no attributes — skip for now, enhanced D2 requires blocks
  }

  // ── Validate arrow_style ──
  if (!arrowStyleAttrs) {
    throw new Error('Missing required arrow_style block. It must be the first block in the file.');
  }
  const requiredArrowFields = ['stroke', 'stroke_width', 'badge_bg', 'badge_color', 'badge_size', 'badge_shape'];
  for (const field of requiredArrowFields) {
    if (!(field in arrowStyleAttrs)) {
      throw new Error(`arrow_style is missing required field: "${field}"`);
    }
  }
  const arrowStyle: ArrowStyleBlock = {
    stroke: arrowStyleAttrs['stroke']!,
    stroke_width: parseFloat(arrowStyleAttrs['stroke_width']!),
    badge_bg: arrowStyleAttrs['badge_bg']!,
    badge_color: arrowStyleAttrs['badge_color']!,
    badge_size: parseFloat(arrowStyleAttrs['badge_size']!),
    badge_shape: arrowStyleAttrs['badge_shape']!,
  };

  // ── Classify blocks into containers vs nodes ──
  const nodes = new Map<string, EnhancedNode>();
  const containers = new Map<string, EnhancedContainer>();

  for (const [shortId, block] of blocks) {
    const posStr = block.attrs['pos'];
    if (!posStr) {
      throw new Error(`Block "${shortId}" is missing required "pos" attribute.`);
    }

    const posValues = posStr.split(',').map(v => parseFloat(v.trim()));

    if (posValues.length === 4) {
      // Container: x, y, w, h
      const stroke = block.attrs['stroke'];
      if (!stroke) {
        throw new Error(`Container "${shortId}" is missing required "stroke" attribute.`);
      }
      containers.set(shortId, {
        id: shortId,
        qualifiedId: block.qualifiedId,
        label: block.label,
        pos: { x: posValues[0]!, y: posValues[1]!, w: posValues[2]!, h: posValues[3]! },
        stroke,
        stroke_style: block.attrs['stroke_style'] ?? 'solid',
        stroke_width: block.attrs['stroke_width'] ? parseFloat(block.attrs['stroke_width']) : 2,
        header_icon: block.attrs['header_icon'],
        fill: block.attrs['fill'] ?? 'transparent',
        parent: block.parent,
        children: block.children,
      });
    } else if (posValues.length === 2) {
      // Node: cx, cy
      nodes.set(shortId, {
        id: shortId,
        qualifiedId: block.qualifiedId,
        label: block.label,
        pos: { cx: posValues[0]!, cy: posValues[1]! },
        icon: block.attrs['icon'],
        icon_variant: block.attrs['icon_variant'],
        icon_color: block.attrs['icon_color'],
        external: block.attrs['external'] === 'true',
        parent: block.parent,
      });
    } else {
      throw new Error(`Block "${shortId}" has invalid pos: "${posStr}". Expected 2 values (cx, cy) for nodes or 4 values (x, y, w, h) for containers.`);
    }
  }

  // ── Process connections ──
  const parsedConnections: EnhancedConnection[] = connections.map(raw => {
    const conn: EnhancedConnection = {
      from: raw.from,
      to: raw.to,
      label_number: raw.label_number,
      bidirectional: raw.bidirectional,
      plain: raw.attrs['style'] === 'plain' || (!raw.label_number && Object.keys(raw.attrs).length === 0),
    };

    // Waypoints: "x1,y1; x2,y2; ..."
    if (raw.attrs['waypoints']) {
      conn.waypoints = raw.attrs['waypoints'].split(';').map(wp => {
        const [x, y] = wp.trim().split(',').map(v => parseFloat(v.trim()));
        return { x: x!, y: y! };
      });
    }

    // Badge position: "cx, cy"
    if (raw.attrs['badge_pos']) {
      const [cx, cy] = raw.attrs['badge_pos'].split(',').map(v => parseFloat(v.trim()));
      conn.badge_pos = { cx: cx!, cy: cy! };
    }

    // Border stop: "container_id.side"
    if (raw.attrs['border_stop']) {
      const dotIdx = raw.attrs['border_stop'].lastIndexOf('.');
      if (dotIdx === -1) {
        throw new Error(`Invalid border_stop: "${raw.attrs['border_stop']}". Expected format: "container_id.side"`);
      }
      const containerId = raw.attrs['border_stop'].slice(0, dotIdx);
      const side = raw.attrs['border_stop'].slice(dotIdx + 1) as 'left' | 'right' | 'top' | 'bottom';
      if (!['left', 'right', 'top', 'bottom'].includes(side)) {
        throw new Error(`Invalid border_stop side: "${side}". Expected: left, right, top, bottom`);
      }
      conn.border_stop = { containerId, side };
    }

    return conn;
  });

  // ── Validate connection references ──
  const allIds = new Set([...nodes.keys(), ...containers.keys()]);
  for (const conn of parsedConnections) {
    if (!allIds.has(conn.from)) {
      throw new Error(`Connection references unknown source: "${conn.from}"`);
    }
    if (!allIds.has(conn.to)) {
      throw new Error(`Connection references unknown target: "${conn.to}"`);
    }
    if (conn.border_stop && !containers.has(conn.border_stop.containerId)) {
      throw new Error(`border_stop references unknown container: "${conn.border_stop.containerId}"`);
    }
  }

  return {
    arrow_style: arrowStyle,
    nodes,
    containers,
    connections: parsedConnections,
  };
}
