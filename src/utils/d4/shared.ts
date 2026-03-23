// ─── Shared constants for diagram rendering ─────────────────────────────
export const ICON_SIZE = 98;
export const FONT_SIZE = 24;
export const HEADER_HEIGHT = 108;
export const NODE_W = 160;
export const NODE_H = 136;
export const H_GAP = 60;
export const V_GAP = 60;
export const CONTAINER_PAD = 40;
export const ICON_HALF = ICON_SIZE / 2;
export const EDGE_GAP = 5;

// ─── Helvetica text measurement ─────────────────────────────────────────
const CHAR_WIDTHS: Record<string, number> = {
  ' ': 0.278, '!': 0.278, '"': 0.355, '#': 0.556, '$': 0.556, '%': 0.889,
  '&': 0.667, "'": 0.191, '(': 0.333, ')': 0.333, '*': 0.389, '+': 0.584,
  ',': 0.278, '-': 0.333, '.': 0.278, '/': 0.278, '0': 0.556, '1': 0.556,
  '2': 0.556, '3': 0.556, '4': 0.556, '5': 0.556, '6': 0.556, '7': 0.556,
  '8': 0.556, '9': 0.556, ':': 0.278, 'A': 0.667, 'B': 0.667, 'C': 0.722,
  'D': 0.722, 'E': 0.667, 'F': 0.611, 'G': 0.778, 'H': 0.722, 'I': 0.278,
  'J': 0.500, 'K': 0.667, 'L': 0.556, 'M': 0.833, 'N': 0.722, 'O': 0.778,
  'P': 0.667, 'Q': 0.778, 'R': 0.722, 'S': 0.667, 'T': 0.611, 'U': 0.722,
  'V': 0.667, 'W': 0.944, 'X': 0.667, 'Y': 0.667, 'Z': 0.611,
  'a': 0.556, 'b': 0.556, 'c': 0.500, 'd': 0.556, 'e': 0.556, 'f': 0.278,
  'g': 0.556, 'h': 0.556, 'i': 0.222, 'j': 0.222, 'k': 0.500, 'l': 0.222,
  'm': 0.833, 'n': 0.556, 'o': 0.556, 'p': 0.556, 'q': 0.556, 'r': 0.333,
  's': 0.500, 't': 0.278, 'u': 0.556, 'v': 0.500, 'w': 0.722, 'x': 0.500,
  'y': 0.500, 'z': 0.500,
};

export function measureText(text: string, fontSize: number): { width: number; height: number } {
  const lines = text.split('\n');
  let maxW = 0;
  for (const line of lines) {
    let w = 0;
    for (const ch of line) w += (CHAR_WIDTHS[ch] ?? 0.556) * fontSize;
    if (w > maxW) maxW = w;
  }
  return { width: Math.round(maxW * 100) / 100, height: Math.round(lines.length * fontSize * 1.25 * 100) / 100 };
}

/** Max label width before auto-wrapping (px) */
export const LABEL_MAX_WIDTH = 200;

/**
 * Word-wrap a label to fit within maxWidth at the given fontSize.
 * Respects existing \n breaks. Returns the wrapped lines.
 */
export function wrapLabel(text: string, fontSize: number, maxWidth: number = LABEL_MAX_WIDTH): string[] {
  const result: string[] = [];
  for (const sourceLine of text.split('\n')) {
    const words = sourceLine.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const w = measureText(test, fontSize).width;
      if (w > maxWidth && current) {
        result.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) result.push(current);
  }
  return result.length > 0 ? result : [''];
}
