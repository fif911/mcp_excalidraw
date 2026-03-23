import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import {
  elements,
  files,
  snapshots,
  generateId,
  EXCALIDRAW_ELEMENT_TYPES,
  ServerElement,
  ExcalidrawElementType,
  ExcalidrawFile,
  WebSocketMessage,
  ElementCreatedMessage,
  ElementUpdatedMessage,
  ElementDeletedMessage,
  BatchCreatedMessage,
  SyncStatusMessage,
  InitialElementsMessage,
  Snapshot,
  normalizeFontFamily,
} from './types.js';
import { z } from 'zod';
import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import { convertD2ToExcalidraw } from './utils/d2Converter.js';
import { convertD3ToExcalidraw } from './utils/d3Converter.js';
import { runAllOverlapChecks } from './utils/overlapChecks.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the build directory
const staticDir = path.join(__dirname, '../dist');
app.use(express.static(staticDir));
// Also serve frontend assets
app.use(express.static(path.join(__dirname, '../dist/frontend')));
// Serve Excalidraw fonts so the font subsetting worker can fetch them for export
app.use('/assets/fonts', express.static(
  path.join(__dirname, '../node_modules/@excalidraw/excalidraw/dist/prod/fonts')
));

// WebSocket connections
const clients = new Set<WebSocket>();

// Broadcast to all connected clients
function broadcast(message: WebSocketMessage): void {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    } catch (err) {
      logger.warn('Failed to send to client, removing');
      clients.delete(client);
    }
  });
}

function normalizeLineBreakMarkup(text: string): string {
  return text
    .replace(/<\s*b\s*r\s*\/?\s*>/gi, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  clients.add(ws);
  logger.info('New WebSocket connection established');

  // Send current elements to new client
  const filesObj: Record<string, ExcalidrawFile> = {};
  files.forEach((f, id) => { filesObj[id] = f; });
  const initialMessage: InitialElementsMessage & { files?: Record<string, ExcalidrawFile> } = {
    type: 'initial_elements',
    elements: Array.from(elements.values()),
    ...(files.size > 0 ? { files: filesObj } : {})
  };
  ws.send(JSON.stringify(initialMessage));

  // Send sync status to new client
  const syncMessage: SyncStatusMessage = {
    type: 'sync_status',
    elementCount: elements.size,
    timestamp: new Date().toISOString()
  };
  ws.send(JSON.stringify(syncMessage));

  ws.on('close', () => {
    clients.delete(ws);
    logger.info('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Schema validation
const CreateElementSchema = z.object({
  id: z.string().optional(), // Allow passing ID for MCP sync
  type: z.enum(Object.values(EXCALIDRAW_ELEMENT_TYPES) as [ExcalidrawElementType, ...ExcalidrawElementType[]]),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  backgroundColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  strokeStyle: z.string().optional(),
  roughness: z.number().optional(),
  opacity: z.number().optional(),
  text: z.string().optional(),
  label: z.object({
    text: z.string(),
    fontSize: z.number().optional(),
    fontFamily: z.union([z.string(), z.number()]).optional(),
    strokeColor: z.string().optional(),
  }).optional(),
  fontSize: z.number().optional(),
  fontFamily: z.union([z.string(), z.number()]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
  groupIds: z.array(z.string()).optional(),
  locked: z.boolean().optional(),
  roundness: z.object({ type: z.number(), value: z.number().optional() }).nullable().optional(),
  fillStyle: z.string().optional(),
  containerId: z.string().nullable().optional(),
  // Arrow-specific properties
  points: z.any().optional(),
  start: z.object({ id: z.string() }).optional(),
  end: z.object({ id: z.string() }).optional(),
  startArrowhead: z.string().nullable().optional(),
  endArrowhead: z.string().nullable().optional(),
  elbowed: z.boolean().optional(),
  // Arrow binding properties (preserved for Excalidraw frontend)
  startBinding: z.object({
    elementId: z.string(),
    focus: z.number().optional(),
    gap: z.number().optional(),
    fixedPoint: z.any().nullable().optional(),
    mode: z.string().optional(),
  }).nullable().optional(),
  endBinding: z.object({
    elementId: z.string(),
    focus: z.number().optional(),
    gap: z.number().optional(),
    fixedPoint: z.any().nullable().optional(),
    mode: z.string().optional(),
  }).nullable().optional(),
  boundElements: z.array(z.object({
    id: z.string(),
    type: z.enum(["arrow", "text"]),
  })).nullable().optional(),
  // Image-specific properties
  fileId: z.string().optional(),
  status: z.string().optional(),
  scale: z.tuple([z.number(), z.number()]).optional(),
});

const UpdateElementSchema = z.object({
  id: z.string(),
  type: z.enum(Object.values(EXCALIDRAW_ELEMENT_TYPES) as [ExcalidrawElementType, ...ExcalidrawElementType[]]).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  backgroundColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  strokeStyle: z.string().optional(),
  roughness: z.number().optional(),
  opacity: z.number().optional(),
  text: z.string().optional(),
  originalText: z.string().optional(),
  label: z.object({
    text: z.string(),
    fontSize: z.number().optional(),
    fontFamily: z.union([z.string(), z.number()]).optional(),
    strokeColor: z.string().optional(),
  }).optional(),
  fontSize: z.number().optional(),
  fontFamily: z.union([z.string(), z.number()]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
  groupIds: z.array(z.string()).optional(),
  locked: z.boolean().optional(),
  roundness: z.object({ type: z.number(), value: z.number().optional() }).nullable().optional(),
  fillStyle: z.string().optional(),
  containerId: z.string().nullable().optional(),
  points: z.array(z.union([
    z.tuple([z.number(), z.number()]),
    z.object({ x: z.number(), y: z.number() })
  ])).optional(),
  start: z.object({ id: z.string() }).optional(),
  end: z.object({ id: z.string() }).optional(),
  startArrowhead: z.string().nullable().optional(),
  endArrowhead: z.string().nullable().optional(),
  elbowed: z.boolean().optional(),
  // Arrow binding properties (preserved for Excalidraw frontend)
  startBinding: z.object({
    elementId: z.string(),
    focus: z.number().optional(),
    gap: z.number().optional(),
    fixedPoint: z.any().nullable().optional(),
    mode: z.string().optional(),
  }).nullable().optional(),
  endBinding: z.object({
    elementId: z.string(),
    focus: z.number().optional(),
    gap: z.number().optional(),
    fixedPoint: z.any().nullable().optional(),
    mode: z.string().optional(),
  }).nullable().optional(),
  boundElements: z.array(z.object({
    id: z.string(),
    type: z.enum(["arrow", "text"]),
  })).nullable().optional(),
  // Image-specific properties
  fileId: z.string().optional(),
  status: z.string().optional(),
  scale: z.tuple([z.number(), z.number()]).optional(),
});

// API Routes

// Get all elements
app.get('/api/elements', (req: Request, res: Response) => {
  try {
    const elementsArray = Array.from(elements.values());
    res.json({
      success: true,
      elements: elementsArray,
      count: elementsArray.length
    });
  } catch (error) {
    logger.error('Error fetching elements:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Create new element
app.post('/api/elements', (req: Request, res: Response) => {
  try {
    const params = CreateElementSchema.parse(req.body);
    logger.info('Creating element via API', { type: params.type });

    // Prioritize passed ID (for MCP sync), otherwise generate new ID
    const id = params.id || generateId();
    const element: ServerElement = {
      id,
      ...params,
      fontFamily: normalizeFontFamily(params.fontFamily),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    // Normalize fontFamily inside label so convertToExcalidrawElements uses the right font
    const singleLabel = (element as any).label;
    if (singleLabel?.fontFamily) {
      singleLabel.fontFamily = normalizeFontFamily(singleLabel.fontFamily);
    }

    // Resolve arrow bindings against existing elements
    if (element.type === 'arrow' || element.type === 'line') {
      resolveArrowBindings([element]);
    }

    elements.set(id, element);

    // Broadcast to all connected clients
    const message: ElementCreatedMessage = {
      type: 'element_created',
      element: element
    };
    broadcast(message);

    res.json({
      success: true,
      element: element
    });
  } catch (error) {
    logger.error('Error creating element:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Update element
app.put('/api/elements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = UpdateElementSchema.parse({ id, ...req.body });

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Element ID is required'
      });
    }

    const existingElement = elements.get(id);
    if (!existingElement) {
      return res.status(404).json({
        success: false,
        error: `Element with ID ${id} not found`
      });
    }

    const updatedElement: ServerElement = {
      ...existingElement,
      ...updates,
      fontFamily: updates.fontFamily !== undefined ? normalizeFontFamily(updates.fontFamily) : existingElement.fontFamily,
      updatedAt: new Date().toISOString(),
      version: (existingElement.version || 0) + 1
    };

    // Keep Excalidraw text source in sync when clients update text via REST.
    // If originalText lags behind text, rendered wrapping/position can drift.
    const hasTextUpdate = Object.prototype.hasOwnProperty.call(req.body, 'text');
    const hasOriginalTextUpdate = Object.prototype.hasOwnProperty.call(req.body, 'originalText');
    if (updatedElement.type === EXCALIDRAW_ELEMENT_TYPES.TEXT && hasTextUpdate && !hasOriginalTextUpdate) {
      const incomingText = updates.text ?? '';
      const existingText = typeof existingElement.text === 'string' ? existingElement.text : '';
      const existingOriginalText = typeof existingElement.originalText === 'string'
        ? existingElement.originalText
        : '';
      const existingOriginalHasBr = /<\s*b\s*r\s*\/?\s*>/i.test(existingOriginalText);
      const normalizedExistingText = normalizeLineBreakMarkup(existingText);
      const normalizedExistingOriginalText = normalizeLineBreakMarkup(existingOriginalText);

      // Handle common cleanup flow: caller normalizes the rendered text value.
      // In this case, prefer normalized originalText so words aren't split by stale wraps.
      if (existingOriginalHasBr && incomingText === normalizedExistingText && normalizedExistingOriginalText) {
        updatedElement.text = normalizedExistingOriginalText;
        updatedElement.originalText = normalizedExistingOriginalText;
      } else {
        updatedElement.originalText = incomingText;
      }
    }

    elements.set(id, updatedElement);

    // Broadcast to all connected clients
    const message: ElementUpdatedMessage = {
      type: 'element_updated',
      element: updatedElement
    };
    broadcast(message);

    res.json({
      success: true,
      element: updatedElement
    });
  } catch (error) {
    logger.error('Error updating element:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Clear all elements (must be before /:id route)
app.delete('/api/elements/clear', (req: Request, res: Response) => {
  try {
    const count = elements.size;
    elements.clear();

    broadcast({
      type: 'canvas_cleared',
      timestamp: new Date().toISOString()
    });

    logger.info(`Canvas cleared: ${count} elements removed`);

    res.json({
      success: true,
      message: `Cleared ${count} elements`,
      count
    });
  } catch (error) {
    logger.error('Error clearing canvas:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Delete element
app.delete('/api/elements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Element ID is required'
      });
    }

    if (!elements.has(id)) {
      return res.status(404).json({
        success: false,
        error: `Element with ID ${id} not found`
      });
    }

    elements.delete(id);

    // Broadcast to all connected clients
    const message: ElementDeletedMessage = {
      type: 'element_deleted',
      elementId: id!
    };
    broadcast(message);

    res.json({
      success: true,
      message: `Element ${id} deleted successfully`
    });
  } catch (error) {
    logger.error('Error deleting element:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Query elements with filters
app.get('/api/elements/search', (req: Request, res: Response) => {
  try {
    const { type, ...filters } = req.query;
    let results = Array.from(elements.values());

    // Filter by type if specified
    if (type && typeof type === 'string') {
      results = results.filter(element => element.type === type);
    }

    // Apply additional filters
    if (Object.keys(filters).length > 0) {
      results = results.filter(element => {
        return Object.entries(filters).every(([key, value]) => {
          return (element as any)[key] === value;
        });
      });
    }

    res.json({
      success: true,
      elements: results,
      count: results.length
    });
  } catch (error) {
    logger.error('Error querying elements:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Get element by ID
app.get('/api/elements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Element ID is required'
      });
    }

    const element = elements.get(id);

    if (!element) {
      return res.status(404).json({
        success: false,
        error: `Element with ID ${id} not found`
      });
    }

    res.json({
      success: true,
      element: element
    });
  } catch (error) {
    logger.error('Error fetching element:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Helper: compute edge point for an element given a direction toward a target
function computeEdgePoint(
  el: ServerElement,
  targetCenterX: number,
  targetCenterY: number
): { x: number; y: number } {
  const cx = el.x + (el.width || 0) / 2;
  const cy = el.y + (el.height || 0) / 2;
  const dx = targetCenterX - cx;
  const dy = targetCenterY - cy;

  if (el.type === 'diamond') {
    // Diamond edge: use diamond geometry (rotated square)
    const hw = (el.width || 0) / 2;
    const hh = (el.height || 0) / 2;
    if (dx === 0 && dy === 0) return { x: cx, y: cy + hh };
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    // Scale factor to reach diamond edge
    const scale = (absDx / hw + absDy / hh) > 0
      ? 1 / (absDx / hw + absDy / hh)
      : 1;
    return { x: cx + dx * scale, y: cy + dy * scale };
  }

  if (el.type === 'ellipse') {
    // Ellipse edge: parametric intersection
    const a = (el.width || 0) / 2;
    const b = (el.height || 0) / 2;
    if (dx === 0 && dy === 0) return { x: cx, y: cy + b };
    const angle = Math.atan2(dy, dx);
    return { x: cx + a * Math.cos(angle), y: cy + b * Math.sin(angle) };
  }

  // Rectangle: find intersection with edges
  const hw = (el.width || 0) / 2;
  const hh = (el.height || 0) / 2;
  if (dx === 0 && dy === 0) return { x: cx, y: cy + hh };
  const angle = Math.atan2(dy, dx);
  const tanA = Math.tan(angle);
  // Check if ray intersects top/bottom edge or left/right edge
  if (Math.abs(tanA * hw) <= hh) {
    // Intersects left or right edge
    const signX = dx >= 0 ? 1 : -1;
    return { x: cx + signX * hw, y: cy + signX * hw * tanA };
  } else {
    // Intersects top or bottom edge
    const signY = dy >= 0 ? 1 : -1;
    return { x: cx + signY * hh / tanA, y: cy + signY * hh };
  }
}

// Helper: resolve arrow bindings in a batch
function resolveArrowBindings(batchElements: ServerElement[]): void {
  const elementMap = new Map<string, ServerElement>();
  batchElements.forEach(el => elementMap.set(el.id, el));

  // Also check existing elements for cross-batch references
  elements.forEach((el, id) => {
    if (!elementMap.has(id)) elementMap.set(id, el);
  });

  for (const el of batchElements) {
    if (el.type !== 'arrow' && el.type !== 'line') continue;
    const startRef = (el as any).start as { id: string } | undefined;
    const endRef = (el as any).end as { id: string } | undefined;

    if (!startRef && !endRef) continue;

    const startEl = startRef ? elementMap.get(startRef.id) : undefined;
    const endEl = endRef ? elementMap.get(endRef.id) : undefined;

    // Calculate arrow path from edge to edge
    const startCenter = startEl
      ? { x: startEl.x + (startEl.width || 0) / 2, y: startEl.y + (startEl.height || 0) / 2 }
      : { x: el.x, y: el.y };
    const endCenter = endEl
      ? { x: endEl.x + (endEl.width || 0) / 2, y: endEl.y + (endEl.height || 0) / 2 }
      : { x: el.x + 100, y: el.y };

    const GAP = 8;
    const startPt = startEl
      ? computeEdgePoint(startEl, endCenter.x, endCenter.y)
      : startCenter;
    const endPt = endEl
      ? computeEdgePoint(endEl, startCenter.x, startCenter.y)
      : endCenter;

    // Apply gap: move start point slightly away from source, end point slightly away from target
    const startDx = endPt.x - startPt.x;
    const startDy = endPt.y - startPt.y;
    const startDist = Math.sqrt(startDx * startDx + startDy * startDy) || 1;
    const endDx = startPt.x - endPt.x;
    const endDy = startPt.y - endPt.y;
    const endDist = Math.sqrt(endDx * endDx + endDy * endDy) || 1;

    const finalStart = {
      x: startPt.x + (startDx / startDist) * GAP,
      y: startPt.y + (startDy / startDist) * GAP
    };
    const finalEnd = {
      x: endPt.x + (endDx / endDist) * GAP,
      y: endPt.y + (endDy / endDist) * GAP
    };

    // Set arrow position and points
    el.x = finalStart.x;
    el.y = finalStart.y;
    el.points = [[0, 0], [finalEnd.x - finalStart.x, finalEnd.y - finalStart.y]];

    // Do NOT delete `start` and `end` here.
    // Excalidraw's frontend `convertToExcalidrawElements` method looks for these exact properties
    // to calculate mathematically sound `startBinding`, `endBinding`, `focus`, `gap`, and `boundElements`.
    // However, also set binding metadata for consumers that don't use convertToExcalidrawElements
    if (startEl) {
      (el as any).startBinding = {
        elementId: startEl.id,
        focus: 0,
        gap: GAP
      };
      // Add boundElements to the source shape
      const startBound = (startEl.boundElements as any[] || []);
      if (!startBound.some((b: any) => b.id === el.id)) {
        startBound.push({ id: el.id, type: 'arrow' });
      }
      (startEl as any).boundElements = startBound;
    }
    if (endEl) {
      (el as any).endBinding = {
        elementId: endEl.id,
        focus: 0,
        gap: GAP
      };
      // Add boundElements to the target shape
      const endBound = (endEl.boundElements as any[] || []);
      if (!endBound.some((b: any) => b.id === el.id)) {
        endBound.push({ id: el.id, type: 'arrow' });
      }
      (endEl as any).boundElements = endBound;
    }
  }
}

// Batch create elements
app.post('/api/elements/batch', (req: Request, res: Response) => {
  try {
    const { elements: elementsToCreate } = req.body;

    if (!Array.isArray(elementsToCreate)) {
      return res.status(400).json({
        success: false,
        error: 'Expected an array of elements'
      });
    }

    const createdElements: ServerElement[] = [];

    elementsToCreate.forEach(elementData => {
      const params = CreateElementSchema.parse(elementData);
      // Prioritize passed ID (for MCP sync), otherwise generate new ID
      const id = params.id || generateId();
      const element: ServerElement = {
        id,
        ...params,
        fontFamily: normalizeFontFamily(params.fontFamily),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };

      // Normalize fontFamily inside label so convertToExcalidrawElements uses the right font
      const label = (element as any).label;
      if (label?.fontFamily) {
        label.fontFamily = normalizeFontFamily(label.fontFamily);
      }

      createdElements.push(element);
    });

    // Resolve arrow bindings (computes positions, startBinding, endBinding, boundElements)
    resolveArrowBindings(createdElements);

    // Store all elements after binding resolution
    createdElements.forEach(el => elements.set(el.id, el));

    // Broadcast to all connected clients
    const message: BatchCreatedMessage = {
      type: 'elements_batch_created',
      elements: createdElements
    };
    broadcast(message);

    res.json({
      success: true,
      elements: createdElements,
      count: createdElements.length
    });
  } catch (error) {
    logger.error('Error batch creating elements:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Convert Mermaid diagram to Excalidraw elements
app.post('/api/elements/from-mermaid', (req: Request, res: Response) => {
  try {
    const { mermaidDiagram, config } = req.body;

    if (!mermaidDiagram || typeof mermaidDiagram !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Mermaid diagram definition is required'
      });
    }

    logger.info('Received Mermaid conversion request', {
      diagramLength: mermaidDiagram.length,
      hasConfig: !!config
    });

    // Broadcast to all WebSocket clients to process the Mermaid diagram
    broadcast({
      type: 'mermaid_convert',
      mermaidDiagram,
      config: config || {},
      timestamp: new Date().toISOString()
    });

    // Return the diagram for frontend processing
    res.json({
      success: true,
      mermaidDiagram,
      config: config || {},
      message: 'Mermaid diagram sent to frontend for conversion.'
    });
  } catch (error) {
    logger.error('Error processing Mermaid diagram:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Convert D2 diagram to Excalidraw elements
// D2 route — basic D2 converter (original, pre-enhancement)
app.post('/api/elements/from-d2', async (req: Request, res: Response) => {
  try {
    const { d2Diagram, layout = 'dagre', validate = true } = req.body;
    if (!d2Diagram || typeof d2Diagram !== 'string') {
      return res.status(400).json({ success: false, error: 'D2 diagram definition is required' });
    }
    if (validate) {
      try {
        const tmpIn = path.join(os.tmpdir(), `d2-validate-${Date.now()}.d2`);
        fs.writeFileSync(tmpIn, d2Diagram);
        execSync(`d2 --check ${tmpIn}`, { stdio: 'pipe' });
        fs.unlinkSync(tmpIn);
      } catch (err: any) {
        const stderr = err.stderr?.toString() ?? '';
        if (stderr.includes('syntax') || stderr.includes('error')) {
          return res.status(400).json({ success: false, error: 'D2 syntax error', details: stderr || err.message });
        }
      }
    }
    const result = convertD2ToExcalidraw(d2Diagram);
    elements.clear();
    broadcast({ type: 'canvas_cleared', timestamp: new Date().toISOString() });
    for (const el of result.elements) {
      elements.set(el.id, { ...el, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1 });
    }
    if (result.files.length > 0) {
      for (const f of result.files) { files.set(f.id, { id: f.id, dataURL: f.dataURL, mimeType: f.mimeType, created: Date.now() }); }
      broadcast({ type: 'files_added', files: result.files } as any);
    }
    broadcast({ type: 'd2_convert', elements: result.elements, timestamp: new Date().toISOString() } as any);
    res.json({ success: true, elementCount: result.elements.length, ...result.stats });
  } catch (error) {
    logger.error('Error processing D2 diagram:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// D3 route — enhanced converter with layout engine, arrow routing, crossing avoidance
app.post('/api/elements/from-d3', async (req: Request, res: Response) => {
  try {
    const { d3Diagram, layout = 'dagre', validate = true } = req.body;
    if (!d3Diagram || typeof d3Diagram !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'D3 diagram definition is required'
      });
    }

    logger.info('Received D3 conversion request', {
      diagramLength: d3Diagram.length,
      layout,
      validate
    });

    // D3 skips d2 CLI validation — our syntax has diverged from standard D2

    // Convert D3 syntax → Excalidraw elements + icons
    const result = convertD3ToExcalidraw(d3Diagram);

    // Upload icon files to server storage
    for (const f of result.files) {
      files.set(f.id, { id: f.id, dataURL: f.dataURL, mimeType: f.mimeType, created: Date.now() });
    }

    // Clear canvas (broadcast to frontend) and add new elements
    elements.clear();
    broadcast({
      type: 'canvas_cleared',
      timestamp: new Date().toISOString()
    });
    for (const el of result.elements) {
      elements.set(el.id, {
        ...el,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      });
    }

    // Broadcast to all WebSocket clients
    if (result.files.length > 0) {
      broadcast({ type: 'files_added', files: result.files } as any);
    }
    broadcast({
      type: 'd3_convert',
      elements: result.elements,
      timestamp: new Date().toISOString()
    } as any);

    // Run overlap checks on built elements
    const overlapReport = runAllOverlapChecks(result.elements);

    // Auto-save .excalidraw file after each build
    try {
      const excalidrawData = {
        type: 'excalidraw',
        version: 2,
        source: 'mcp-excalidraw-server',
        elements: result.elements,
        files: Object.fromEntries(result.files.map(f => [f.id, { id: f.id, dataURL: f.dataURL, mimeType: f.mimeType }])),
        appState: { viewBackgroundColor: '#ffffff' },
      };

      // Detect version folder from D3 content
      const versionMatch = d3Diagram.match(/[—-]\s*v(\d+)/i);
      const diagramsDir = path.resolve(process.cwd(), 'diagrams');

      let savedDir: string;
      if (versionMatch) {
        // Save to version folder: diagrams/vN/diagram.excalidraw
        savedDir = path.resolve(diagramsDir, `v${versionMatch[1]}`);
        fs.mkdirSync(savedDir, { recursive: true });
        const savePath = path.resolve(savedDir, 'diagram.excalidraw');
        fs.writeFileSync(savePath, JSON.stringify(excalidrawData, null, 2));
        logger.info(`Auto-saved .excalidraw to ${savePath}`);
      } else {
        // Test build — save as diagram_test_N.excalidraw
        savedDir = diagramsDir;
        fs.mkdirSync(diagramsDir, { recursive: true });
        const existing = fs.readdirSync(diagramsDir).filter(f => f.startsWith('diagram_test_') && f.endsWith('.excalidraw'));
        const nextN = existing.length + 1;
        const savePath = path.resolve(diagramsDir, `diagram_test_${nextN}.excalidraw`);
        fs.writeFileSync(savePath, JSON.stringify(excalidrawData, null, 2));
        logger.info(`Auto-saved test .excalidraw to ${savePath}`);
      }

      // Auto-export PNG — retry with increasing delays for frontend to render
      (async () => {
        const pngName = versionMatch ? 'diagram.png' : `diagram_test.png`;
        const pngPath = path.resolve(savedDir, pngName);
        const delays = [2000, 3000, 5000]; // retry up to 3 times
        for (const delay of delays) {
          await new Promise(r => setTimeout(r, delay));
          try {
            if (clients.size === 0) {
              logger.info('No frontend connected for PNG export — skipping');
              break;
            }
            const exportResp = await fetch(`http://localhost:${PORT}/api/export/image`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ format: 'png', filePath: pngPath, background: true }),
            });
            if (exportResp.ok) {
              const exportResult = await exportResp.json() as any;
              if (exportResult.data) {
                // Save PNG from base64 data
                const pngBuf = Buffer.from(exportResult.data.replace(/^data:image\/png;base64,/, ''), 'base64');
                fs.writeFileSync(pngPath, pngBuf);
                logger.info(`Auto-exported PNG to ${pngPath} (${Math.round(pngBuf.length / 1024)}KB)`);
                break; // success
              }
            }
          } catch (pngErr) {
            logger.warn(`PNG export attempt failed (delay=${delay}ms):`, pngErr);
          }
        }
      })();
    } catch (saveErr) {
      logger.warn('Failed to auto-save .excalidraw:', saveErr);
    }

    res.json({
      success: true,
      elementCount: result.elements.length,
      ...result.stats,
      iconsMissing: result.iconsMissing,
      validationIssues: result.validationIssues,
      overlapReport: {
        errors: overlapReport.totalErrors,
        warnings: overlapReport.totalWarnings,
        summary: overlapReport.summary,
      },
      positions: result.positions,
      message: `D3 diagram built: ${result.stats.containers} containers, ${result.stats.nodes} nodes, ${result.stats.arrows} arrows, ${result.stats.badges} badges.`
    });
  } catch (error) {
    logger.error('Error processing D3 diagram:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Sync elements from frontend (overwrite sync)
app.post('/api/elements/sync', (req: Request, res: Response) => {
  try {
    const { elements: frontendElements, timestamp } = req.body;

    logger.info(`Sync request received: ${frontendElements.length} elements`, {
      timestamp,
      elementCount: frontendElements.length
    });

    // Validate input data
    if (!Array.isArray(frontendElements)) {
      return res.status(400).json({
        success: false,
        error: 'Expected elements to be an array'
      });
    }

    // Record element count before sync
    const beforeCount = elements.size;

    // 1. Clear existing memory storage
    elements.clear();
    logger.info(`Cleared existing elements: ${beforeCount} elements removed`);

    // 2. Batch write new data
    let successCount = 0;
    const processedElements: ServerElement[] = [];

    frontendElements.forEach((element: any, index: number) => {
      try {
        // Ensure element has ID, generate one if missing
        const elementId = element.id || generateId();

        // Add server metadata
        const processedElement: ServerElement = {
          ...element,
          id: elementId,
          syncedAt: new Date().toISOString(),
          source: 'frontend_sync',
          syncTimestamp: timestamp,
          version: 1
        };

        // Store to memory
        elements.set(elementId, processedElement);
        processedElements.push(processedElement);
        successCount++;

      } catch (elementError) {
        logger.warn(`Failed to process element ${index}:`, elementError);
      }
    });

    logger.info(`Sync completed: ${successCount}/${frontendElements.length} elements synced`);

    // 3. Broadcast sync event to all WebSocket clients
    broadcast({
      type: 'elements_synced',
      count: successCount,
      timestamp: new Date().toISOString(),
      source: 'manual_sync'
    });

    // 4. Return sync results
    res.json({
      success: true,
      message: `Successfully synced ${successCount} elements`,
      count: successCount,
      syncedAt: new Date().toISOString(),
      beforeCount,
      afterCount: elements.size
    });

  } catch (error) {
    logger.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      details: 'Internal server error during sync operation'
    });
  }
});

// ─── Files API (for image elements) ───────────────────────────
// GET all files
app.get('/api/files', (_req: Request, res: Response) => {
  const filesObj: Record<string, ExcalidrawFile> = {};
  files.forEach((f, id) => { filesObj[id] = f; });
  res.json({ files: filesObj });
});

// POST add/update files (batch)
app.post('/api/files', (req: Request, res: Response) => {
  const body = req.body;
  const fileList: ExcalidrawFile[] = Array.isArray(body) ? body : (body?.files || []);
  for (const f of fileList) {
    if (f.id && f.dataURL) {
      files.set(f.id, { id: f.id, dataURL: f.dataURL, mimeType: f.mimeType || 'image/png', created: f.created || Date.now() });
    }
  }
  // Broadcast files to connected clients
  broadcast({ type: 'files_added', files: fileList } as any);
  res.json({ success: true, count: fileList.length });
});

// DELETE a file
app.delete('/api/files/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (files.delete(id)) {
    broadcast({ type: 'file_deleted', fileId: id } as any);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: `File with ID ${id} not found` });
  }
});

// Image export: request (MCP -> Express -> WebSocket -> Frontend)
interface PendingExport {
  resolve: (data: { format: string; data: string }) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  collectionTimeout: ReturnType<typeof setTimeout> | null;
  bestResult: { format: string; data: string } | null;
}
const pendingExports = new Map<string, PendingExport>();

app.post('/api/export/image', (req: Request, res: Response) => {
  try {
    const { format, background } = req.body;

    if (!format || !['png', 'svg'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'format must be "png" or "svg"'
      });
    }

    if (clients.size === 0) {
      return res.status(503).json({
        success: false,
        error: 'No frontend client connected. Open the canvas in a browser first.'
      });
    }

    const requestId = generateId();

    const exportPromise = new Promise<{ format: string; data: string }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const pending = pendingExports.get(requestId);
        pendingExports.delete(requestId);
        // If we collected any result during the window, use it
        if (pending?.bestResult) {
          resolve(pending.bestResult);
        } else {
          reject(new Error('Export timed out after 30 seconds'));
        }
      }, 30000);

      pendingExports.set(requestId, { resolve, reject, timeout, collectionTimeout: null, bestResult: null });
    });

    // Re-broadcast current elements so all connected clients (including stale ones)
    // sync to the canonical server state before exporting
    const filesObj: Record<string, ExcalidrawFile> = {};
    files.forEach((f, id) => { filesObj[id] = f; });
    broadcast({
      type: 'initial_elements',
      elements: Array.from(elements.values()),
      ...(files.size > 0 ? { files: filesObj } : {})
    } as InitialElementsMessage & { files?: Record<string, ExcalidrawFile> });

    // Give browsers time to process the reload before requesting export
    setTimeout(() => {
      broadcast({
        type: 'export_image_request',
        requestId,
        format,
        background: background ?? true
      });
    }, 800);

    exportPromise
      .then(result => {
        res.json({
          success: true,
          format: result.format,
          data: result.data
        });
      })
      .catch(error => {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      });
  } catch (error) {
    logger.error('Error initiating image export:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Image export: result (Frontend -> Express -> MCP)
app.post('/api/export/image/result', (req: Request, res: Response) => {
  try {
    const { requestId, format, data, error } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'requestId is required'
      });
    }

    const pending = pendingExports.get(requestId);
    if (!pending) {
      // Already resolved by another client, or expired — ignore silently
      return res.json({ success: true });
    }

    if (error) {
      // Don't reject on error — another WebSocket client may still succeed.
      logger.warn(`Export error from one client (requestId=${requestId}): ${error}`);
      return res.json({ success: true });
    }

    // Keep the largest response (most complete canvas state wins)
    if (!pending.bestResult || data.length > pending.bestResult.data.length) {
      pending.bestResult = { format, data };
    }

    // Start a short collection window on the first response, then resolve with best
    if (!pending.collectionTimeout) {
      pending.collectionTimeout = setTimeout(() => {
        const p = pendingExports.get(requestId);
        if (p?.bestResult) {
          clearTimeout(p.timeout);
          pendingExports.delete(requestId);
          p.resolve(p.bestResult);
        }
      }, 3000);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing export result:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Viewport control: request (MCP -> Express -> WebSocket -> Frontend)
interface PendingViewport {
  resolve: (data: { success: boolean; message: string }) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}
const pendingViewports = new Map<string, PendingViewport>();

app.post('/api/viewport', (req: Request, res: Response) => {
  try {
    const { scrollToContent, scrollToElementId, zoom, offsetX, offsetY } = req.body;

    if (clients.size === 0) {
      return res.status(503).json({
        success: false,
        error: 'No frontend client connected. Open the canvas in a browser first.'
      });
    }

    const requestId = generateId();

    const viewportPromise = new Promise<{ success: boolean; message: string }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingViewports.delete(requestId);
        reject(new Error('Viewport request timed out after 10 seconds'));
      }, 10000);

      pendingViewports.set(requestId, { resolve, reject, timeout });
    });

    broadcast({
      type: 'set_viewport',
      requestId,
      scrollToContent,
      scrollToElementId,
      zoom,
      offsetX,
      offsetY
    });

    viewportPromise
      .then(result => {
        res.json(result);
      })
      .catch(error => {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      });
  } catch (error) {
    logger.error('Error initiating viewport change:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Viewport control: result (Frontend -> Express -> MCP)
app.post('/api/viewport/result', (req: Request, res: Response) => {
  try {
    const { requestId, success, message, error } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'requestId is required'
      });
    }

    const pending = pendingViewports.get(requestId);
    if (!pending) {
      return res.json({ success: true });
    }

    if (error) {
      clearTimeout(pending.timeout);
      pendingViewports.delete(requestId);
      pending.resolve({ success: false, message: error });
      return res.json({ success: true });
    }

    clearTimeout(pending.timeout);
    pendingViewports.delete(requestId);
    pending.resolve({ success: true, message: message || 'Viewport updated' });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing viewport result:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Align in parent: browser-delegated element alignment
interface PendingAlign {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: NodeJS.Timeout;
}
const pendingAligns = new Map<string, PendingAlign>();

app.post('/api/align', async (req: Request, res: Response) => {
  try {
    const { parentId, childIds, alignment, padding } = req.body;

    if (!parentId || !Array.isArray(childIds) || childIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'parentId (string) and childIds (non-empty array) are required'
      });
    }

    const requestId = generateId();

    const alignPromise = new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingAligns.delete(requestId);
        reject(new Error('Alignment timed out — no browser responded within 10s'));
      }, 10000);

      pendingAligns.set(requestId, { resolve, reject, timeout });
    });

    broadcast({
      type: 'align_elements_request',
      requestId,
      parentId,
      childIds,
      alignment: alignment || 'center',
      padding: padding ?? 0
    } as any);

    const result = await alignPromise;

    // Sync updated positions back to server storage
    if (result.updates) {
      for (const update of result.updates) {
        const existing = elements.get(update.id);
        if (existing) {
          existing.x = update.x;
          existing.y = update.y;
          existing.updatedAt = new Date().toISOString();
        }
      }
    }

    res.json({ success: true, message: result.message, updates: result.updates });
  } catch (error) {
    logger.error('Error in align:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

app.post('/api/align/result', (req: Request, res: Response) => {
  try {
    const { requestId, success, message, error, updates } = req.body;

    if (!requestId) {
      return res.status(400).json({ success: false, error: 'requestId is required' });
    }

    const pending = pendingAligns.get(requestId);
    if (!pending) {
      return res.status(404).json({ success: false, error: 'No pending alignment for this requestId' });
    }

    clearTimeout(pending.timeout);

    if (success) {
      pending.resolve({ success: true, message, updates });
    } else {
      pending.reject(new Error(error || 'Alignment failed'));
    }

    pendingAligns.delete(requestId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing align result:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Snapshots: save
app.post('/api/snapshots', (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Snapshot name is required'
      });
    }

    const snapshot: Snapshot = {
      name,
      elements: Array.from(elements.values()),
      createdAt: new Date().toISOString()
    };

    snapshots.set(name, snapshot);
    logger.info(`Snapshot saved: "${name}" with ${snapshot.elements.length} elements`);

    res.json({
      success: true,
      name,
      elementCount: snapshot.elements.length,
      createdAt: snapshot.createdAt
    });
  } catch (error) {
    logger.error('Error saving snapshot:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Snapshots: list
app.get('/api/snapshots', (req: Request, res: Response) => {
  try {
    const list = Array.from(snapshots.values()).map(s => ({
      name: s.name,
      elementCount: s.elements.length,
      createdAt: s.createdAt
    }));

    res.json({
      success: true,
      snapshots: list,
      count: list.length
    });
  } catch (error) {
    logger.error('Error listing snapshots:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Snapshots: get by name
app.get('/api/snapshots/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const snapshot = snapshots.get(name!);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: `Snapshot "${name}" not found`
      });
    }

    res.json({
      success: true,
      snapshot
    });
  } catch (error) {
    logger.error('Error fetching snapshot:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Serve the frontend
app.get('/', (req: Request, res: Response) => {
  const htmlFile = path.join(__dirname, '../dist/frontend/index.html');
  res.sendFile(htmlFile, (err) => {
    if (err) {
      logger.error('Error serving frontend:', err);
      res.status(404).send('Frontend not found. Please run "npm run build" first.');
    }
  });
});

// Center child elements within a parent element
app.post('/api/elements/center', (req: Request, res: Response) => {
  const { childIds, parentId, axis = 'both' } = req.body as { childIds: string[]; parentId: string; axis?: string };
  const parent = elements.get(parentId);
  if (!parent) {
    res.status(404).json({ success: false, error: `Parent element ${parentId} not found` });
    return;
  }
  const updated: ServerElement[] = [];
  for (const childId of childIds) {
    const child = elements.get(childId);
    if (!child) continue;
    let childW = child.width ?? 0;
    let childH = child.height ?? 0;
    // Text elements often have no explicit width/height — measure from text content
    if (child.type === 'text' && (!childW || !childH) && child.text) {
      const measured = measureText(child.text as string, (child.fontSize as number) ?? 16);
      if (!childW) childW = measured.width;
      if (!childH) childH = measured.height;
    }
    const parentCx = parent.x + (parent.width ?? 0) / 2;
    const parentCy = parent.y + (parent.height ?? 0) / 2;
    const newX = (axis === 'both' || axis === 'x') ? parentCx - childW / 2 : child.x;
    const newY = (axis === 'both' || axis === 'y') ? parentCy - childH / 2 : child.y;
    const updatedChild = { ...child, x: newX, y: newY };
    elements.set(childId, updatedChild);
    updated.push(updatedChild);
  }
  for (const el of updated) {
    broadcast({ type: 'element_updated', element: el } as ElementUpdatedMessage);
  }
  res.json({ success: true, updated });
});

// Per-character width ratios for Helvetica (relative to font size)
const helveticaWidthRatios: Record<string, number> = {
  ' ': 0.278, '!': 0.278, '"': 0.355, '#': 0.556, '$': 0.556, '%': 0.889,
  '&': 0.667, "'": 0.191, '(': 0.333, ')': 0.333, '*': 0.389, '+': 0.584,
  ',': 0.278, '-': 0.333, '.': 0.278, '/': 0.278, '0': 0.556, '1': 0.556,
  '2': 0.556, '3': 0.556, '4': 0.556, '5': 0.556, '6': 0.556, '7': 0.556,
  '8': 0.556, '9': 0.556, ':': 0.278, ';': 0.278, '<': 0.584, '=': 0.584,
  '>': 0.584, '?': 0.556, '@': 1.015, 'A': 0.667, 'B': 0.667, 'C': 0.722,
  'D': 0.722, 'E': 0.667, 'F': 0.611, 'G': 0.778, 'H': 0.722, 'I': 0.278,
  'J': 0.500, 'K': 0.667, 'L': 0.556, 'M': 0.833, 'N': 0.722, 'O': 0.778,
  'P': 0.667, 'Q': 0.778, 'R': 0.722, 'S': 0.667, 'T': 0.611, 'U': 0.722,
  'V': 0.667, 'W': 0.944, 'X': 0.667, 'Y': 0.667, 'Z': 0.611, '[': 0.278,
  '\\': 0.278, ']': 0.278, '^': 0.469, '_': 0.556, '`': 0.333, 'a': 0.556,
  'b': 0.556, 'c': 0.500, 'd': 0.556, 'e': 0.556, 'f': 0.278, 'g': 0.556,
  'h': 0.556, 'i': 0.222, 'j': 0.222, 'k': 0.500, 'l': 0.222, 'm': 0.833,
  'n': 0.556, 'o': 0.556, 'p': 0.556, 'q': 0.556, 'r': 0.333, 's': 0.500,
  't': 0.278, 'u': 0.556, 'v': 0.500, 'w': 0.722, 'x': 0.500, 'y': 0.500,
  'z': 0.500, '{': 0.334, '|': 0.260, '}': 0.334, '~': 0.584,
};

function measureText(text: string, fontSize: number): { width: number; height: number } {
  const lines = text.split('\n');
  const lineHeight = fontSize * 1.25;
  let maxWidth = 0;
  for (const line of lines) {
    let lineWidth = 0;
    for (const ch of line) {
      lineWidth += (helveticaWidthRatios[ch] ?? 0.556) * fontSize;
    }
    if (lineWidth > maxWidth) maxWidth = lineWidth;
  }
  return { width: Math.round(maxWidth * 100) / 100, height: Math.round(lines.length * lineHeight * 100) / 100 };
}

// Text measurement endpoint (Helvetica character-width approximation)
app.post('/api/text/measure', (req: Request, res: Response) => {
  const { text = '', fontSize = 16 } = req.body as { text: string; fontSize: number };
  res.json(measureText(text, fontSize));
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    elements_count: elements.size,
    websocket_clients: clients.size
  });
});

// Sync status endpoint
app.get('/api/sync/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    elementCount: elements.size,
    timestamp: new Date().toISOString(),
    memoryUsage: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
    },
    websocketClients: clients.size
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
  logger.info(`POC server running on http://${HOST}:${PORT}`);
  logger.info(`WebSocket server running on ws://${HOST}:${PORT}`);
});

export default app;
