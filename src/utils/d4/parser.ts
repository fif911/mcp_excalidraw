import { generateId } from '../../types.js';
import type { D4Graph, D4Node, D4Edge, D4ArrowStyle } from './types.js';

// ─── D4 Syntax Parser ───────────────────────────────────────────────────
// Same as D3 parser except:
// - pos, layout, placement, route attributes are IGNORED (silently skipped)
// - direction statement is supported
// - Connection endpoints support SHORT NAMES (resolved after parsing)

export function parseD4(source: string): D4Graph {
  const nodes: Record<string, D4Node> = {};
  const edges: D4Edge[] = [];
  let direction: D4Graph['direction'] = 'RIGHT';
  const arrowStyle: D4ArrowStyle = {
    strokeColor: '#545B64',
    strokeWidth: 2,
    badgeBg: '#232F3E',
    badgeColor: '#ffffff',
    badgeSize: 38,
    badgeShape: 'circle',
  };

  const lines = source
    .split('\n')
    .map(l => {
      // Strip comments: # at start of line or # preceded by whitespace
      // but NOT # inside quoted strings (hex colors like "#E7157B")
      let inQuote: string | null = null;
      let commentStart = -1;
      for (let j = 0; j < l.length; j++) {
        const ch = l[j]!;
        if (inQuote) {
          if (ch === inQuote) inQuote = null;
        } else if (ch === '"' || ch === "'") {
          inQuote = ch;
        } else if (ch === '#' && (j === 0 || /\s/.test(l[j - 1]!))) {
          commentStart = j;
          break;
        }
      }
      if (commentStart >= 0) l = l.slice(0, commentStart);
      return l.trim();
    })
    .filter(Boolean);

  const contextStack: string[] = [];

  const getFullId = (localId: string) =>
    contextStack.length ? `${contextStack[contextStack.length - 1]}.${localId}` : localId;

  // Convert literal \n in labels to actual newlines
  const unescapeLabel = (s: string) => s.replace(/\\n/g, '\n');

  const ensureNode = (fullId: string, label?: string): D4Node => {
    if (!nodes[fullId]) {
      const parts = fullId.split('.');
      const lastPart = parts[parts.length - 1] ?? fullId;
      const parent = parts.length > 1 ? parts.slice(0, -1).join('.') : undefined;
      nodes[fullId] = {
        id: fullId,
        label: unescapeLabel(label ?? lastPart),
        style: {},
        parent,
        children: [],
        isGroup: false,
      };
      if (parent) {
        ensureNode(parent);
        const parentNode = nodes[parent];
        if (parentNode && !parentNode.children.includes(fullId)) {
          parentNode.children.push(fullId);
          parentNode.isGroup = true;
        }
      }
    } else if (label) {
      nodes[fullId].label = unescapeLabel(label);
    }
    return nodes[fullId]!;
  };

  // Attributes to silently ignore
  const IGNORED_ATTRS = new Set(['pos', 'layout', 'placement', 'route']);
  const IGNORED_CONN_PROPS = new Set(['waypoints', 'badge_pos', 'route']);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    // Parse direction statement
    const dirMatch = line.match(/^direction\s+(right|down|left|up)$/i);
    if (dirMatch) {
      direction = dirMatch[1]!.toUpperCase() as D4Graph['direction'];
      i++;
      continue;
    }

    // Parse arrow_style { } block
    if (line === 'arrow_style {' || line === 'arrow_style{') {
      i++;
      while (i < lines.length && lines[i] !== '}') {
        const asLine = lines[i]!;
        const asMatch = asLine.match(/^(stroke_color|stroke_width|badge_bg|badge_color|badge_size|badge_shape):\s*(.+)$/);
        if (asMatch) {
          const val = (asMatch[2] ?? '').trim().replace(/^["']|["']$/g, '');
          if (asMatch[1] === 'stroke_color') arrowStyle.strokeColor = val;
          else if (asMatch[1] === 'stroke_width') arrowStyle.strokeWidth = parseFloat(val);
          else if (asMatch[1] === 'badge_bg') arrowStyle.badgeBg = val;
          else if (asMatch[1] === 'badge_color') arrowStyle.badgeColor = val;
          else if (asMatch[1] === 'badge_size') arrowStyle.badgeSize = parseFloat(val);
          else if (asMatch[1] === 'badge_shape') arrowStyle.badgeShape = val;
        }
        i++;
      }
      i++; // skip closing }
      continue;
    }

    // Parse block opening: Name: Label {
    const blockMatch = line.match(/^([\w\s.'-]+?)(?::\s*(.+?))?\s*\{$/);
    if (blockMatch) {
      const localId = (blockMatch[1] ?? '').trim().replace(/\s+/g, '_');
      const label = blockMatch[2]?.trim();
      const fullId = getFullId(localId);
      ensureNode(fullId, label);
      contextStack.push(fullId);
      i++;
      continue;
    }

    // Closing brace
    if (line === '}') {
      contextStack.pop();
      i++;
      continue;
    }

    // Parse connections: from -> to: label { ... }
    const connMatch = line.match(/^(.+?)\s*(->|<->|<-|--)\s*(.+?)(?::\s*(.*))?$/);
    if (connMatch) {
      const rawFrom = connMatch[1] ?? '';
      const arrow = connMatch[2] ?? '->';
      let rawTo = (connMatch[3] ?? '').trim();
      let label = (connMatch[4] ?? '').trim();
      // Detect block opening { in either label or rawTo
      let hasBlock = label.endsWith('{') || rawTo.endsWith('{');
      if (label.endsWith('{')) label = label.replace(/\s*\{$/, '').trim();
      if (rawTo.endsWith('{')) rawTo = rawTo.replace(/\s*\{$/, '').trim();
      const from = getFullId(rawFrom.trim().replace(/\s+/g, '_'));
      const to = getFullId(rawTo.trim().replace(/\s+/g, '_'));
      const bidirectional = arrow === '<->' || arrow === '--';
      const actualFrom = arrow === '<-' ? to : from;
      const actualTo = arrow === '<-' ? from : to;
      const edge: D4Edge = {
        id: generateId(),
        from: actualFrom,
        to: actualTo,
        label,
        bidirectional,
        style: {},
      };

      if (hasBlock) {
        i++;
        while (i < lines.length && lines[i]!.trim() !== '}') {
          const blockLine = lines[i]!.trim();
          // Check for ignored connection properties
          const ignoredMatch = blockLine.match(/^(waypoints|badge_pos|route):\s*/);
          if (ignoredMatch) {
            // silently skip
          } else {
            const kvMatch = blockLine.match(/^(badge_bg|badge_color|badge_size|badge_shape):\s*(.+)$/);
            if (kvMatch) {
              const val = (kvMatch[2] ?? '').trim().replace(/^["']|["']$/g, '');
              if (kvMatch[1] === 'badge_bg') edge.badgeBg = val;
              else if (kvMatch[1] === 'badge_color') edge.badgeColor = val;
              else if (kvMatch[1] === 'badge_size') edge.badgeSize = parseFloat(val);
              else if (kvMatch[1] === 'badge_shape') edge.badgeShape = val;
            }
          }
          i++;
        }
      }

      edges.push(edge);
      i++;
      continue;
    }

    // Bare attribute for current context node (style.*, icon, icon_type, icon_variant, icon_hint)
    // Silently ignore: pos, layout, placement, route
    const bareAttrMatch = line.match(/^(style\.[\w-]+|pos|icon|layout|icon_type|icon_variant|icon_hint|placement|route):\s*(.+)$/);
    if (bareAttrMatch && contextStack.length > 0) {
      const attr = bareAttrMatch[1]!;
      if (IGNORED_ATTRS.has(attr)) {
        i++;
        continue;
      }
      const value = (bareAttrMatch[2] ?? '').trim().replace(/^["']|["']$/g, '');
      const currentId = contextStack[contextStack.length - 1]!;
      const node = ensureNode(currentId);
      if (attr === 'icon') node.icon = value;
      else if (attr === 'icon_type') node.iconType = value;
      else if (attr === 'icon_variant') node.iconVariant = value;
      else if (attr === 'icon_hint') node.iconHint = value;
      else if (attr.startsWith('style.')) node.style[attr.replace('style.', '')] = value;
      i++;
      continue;
    }

    // Qualified attribute: id.attr: value
    const attrMatch = line.match(/^([\w.'-]+)\.(style\.[\w-]+|icon|label|width|height):\s*(.+)$/);
    if (attrMatch) {
      const localId = attrMatch[1] ?? '';
      const attr = attrMatch[2] ?? '';
      const value = attrMatch[3] ?? '';
      const fullId = getFullId(localId.replace(/\s+/g, '_'));
      const node = ensureNode(fullId);
      if (attr === 'icon') node.icon = value.replace(/^["']|["']$/g, '');
      else if (attr === 'label') node.label = value;
      else node.style[attr.replace('style.', '')] = value;
      i++;
      continue;
    }

    // Simple node: Name: Label
    const simpleMatch = line.match(/^([\w\s.'-]+?)(?::\s*(.+))?$/);
    if (simpleMatch) {
      const localId = (simpleMatch[1] ?? '').trim().replace(/\s+/g, '_');
      const label = simpleMatch[2]?.trim();
      ensureNode(getFullId(localId), label);
    }

    i++;
  }

  // ─── Short Name Resolution ──────────────────────────────────────────────
  // After parsing, resolve connection endpoints that don't match any known node ID
  resolveShortNames(nodes, edges);

  // Update isGroup for all nodes based on children
  for (const node of Object.values(nodes)) {
    node.isGroup = node.children.length > 0;
  }

  return { nodes, edges, arrowStyle, direction };
}

/**
 * Resolve short names in edge endpoints.
 * For each edge.from and edge.to:
 * 1. If exact ID exists in nodes -> use as-is
 * 2. Else, search by local ID (last segment after '.')
 * 3. Else, search by label (case-insensitive, spaces -> underscores)
 * 4. If exactly one match -> resolve to full ID
 * 5. If multiple matches -> keep original
 * 6. If no match -> create bare node
 */
function resolveShortNames(nodes: Record<string, D4Node>, edges: D4Edge[]): void {
  const resolveEndpoint = (name: string): string => {
    // 1. Exact ID match
    if (nodes[name]) return name;

    const normalized = name.toLowerCase().replace(/\s+/g, '_');

    // 2. Search by local ID (last segment)
    const byLocalId: string[] = [];
    for (const [fullId, node] of Object.entries(nodes)) {
      const parts = fullId.split('.');
      const localId = parts[parts.length - 1]!.toLowerCase();
      if (localId === normalized) {
        byLocalId.push(fullId);
      }
    }
    if (byLocalId.length === 1) return byLocalId[0]!;

    // 3. Search by label
    const byLabel: string[] = [];
    for (const [fullId, node] of Object.entries(nodes)) {
      const nodeLabel = node.label.toLowerCase().replace(/\s+/g, '_');
      if (nodeLabel === normalized) {
        byLabel.push(fullId);
      }
    }
    if (byLabel.length === 1) return byLabel[0]!;

    // 4. Multiple matches (local ID or label) -> keep original
    if (byLocalId.length > 1 || byLabel.length > 1) return name;

    // 5. No match -> create bare node
    nodes[name] = {
      id: name,
      label: name,
      style: {},
      children: [],
      isGroup: false,
    };
    return name;
  };

  for (const edge of edges) {
    edge.from = resolveEndpoint(edge.from);
    edge.to = resolveEndpoint(edge.to);
  }
}
