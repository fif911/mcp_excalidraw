import { parseD4 } from './parser.js';
import { layoutD4Graph } from './layouter.js';
import { buildD4Elements } from './builder.js';
import type { D4Result } from './types.js';

export type { D4Result } from './types.js';
export { parseD4 } from './parser.js';
export { layoutD4Graph } from './layouter.js';

export async function convertD4ToExcalidraw(source: string): Promise<D4Result> {
  const graph = parseD4(source);
  const layout = await layoutD4Graph(graph);
  return buildD4Elements(graph, layout);
}
