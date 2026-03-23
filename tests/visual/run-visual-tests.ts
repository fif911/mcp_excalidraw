#!/usr/bin/env npx tsx

/**
 * Visual test runner for D4 diagrams.
 *
 * For each test case:
 * 1. Parses D4 source and converts to Excalidraw elements
 * 2. Runs arrow penetration checks (start/end inside icon bounding box?)
 * 3. Saves .excalidraw JSON to tests/visual/output/
 *
 * Usage: npx tsx tests/visual/run-visual-tests.ts
 */

import fs from 'fs';
import path from 'path';
import { convertD4ToExcalidraw } from '../../src/utils/d4/index.js';

const CASES_DIR = path.resolve(import.meta.dirname, 'cases');
const OUTPUT_DIR = path.resolve(import.meta.dirname, 'output');

// ─── Arrow penetration check ───────────────────────────────────────────

interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function pointInsideBox(px: number, py: number, box: BBox, margin = 2): boolean {
  return (
    px >= box.x + margin &&
    px <= box.x + box.w - margin &&
    py >= box.y + margin &&
    py <= box.y + box.h - margin
  );
}

function checkArrowPenetration(
  result: Awaited<ReturnType<typeof convertD4ToExcalidraw>>,
): string[] {
  const issues: string[] = [];

  // Build a map of icon bounding boxes from positions
  const iconBoxes = new Map<string, BBox>();
  for (const pos of result.positions) {
    if (pos.type === 'icon' || pos.type === 'external') {
      iconBoxes.set(pos.id, { x: pos.x, y: pos.y, w: pos.w, h: pos.h });
    }
  }

  const arrows = result.elements.filter((e: any) => e.type === 'arrow');

  for (const arrow of arrows) {
    const pts = (arrow as any).points || [];
    if (pts.length < 2) continue;

    const startAbs = { x: arrow.x, y: arrow.y };
    const endAbs = {
      x: arrow.x + pts[pts.length - 1][0],
      y: arrow.y + pts[pts.length - 1][1],
    };

    // Find source and target from startBinding / endBinding
    const startBinding = (arrow as any).startBinding;
    const endBinding = (arrow as any).endBinding;

    // Check if start point is inside the SOURCE icon
    if (startBinding?.elementId) {
      const sourceId = findNodeIdForElement(startBinding.elementId, result);
      if (sourceId) {
        const box = iconBoxes.get(sourceId);
        if (box && pointInsideBox(startAbs.x, startAbs.y, box)) {
          issues.push(
            `Arrow start penetrates source "${sourceId}" icon (${startAbs.x.toFixed(0)}, ${startAbs.y.toFixed(0)}) inside box (${box.x}, ${box.y}, ${box.w}x${box.h})`,
          );
        }
      }
    }

    // Check if end point is inside the TARGET icon
    if (endBinding?.elementId) {
      const targetId = findNodeIdForElement(endBinding.elementId, result);
      if (targetId) {
        const box = iconBoxes.get(targetId);
        if (box && pointInsideBox(endAbs.x, endAbs.y, box)) {
          issues.push(
            `Arrow end penetrates target "${targetId}" icon (${endAbs.x.toFixed(0)}, ${endAbs.y.toFixed(0)}) inside box (${box.x}, ${box.y}, ${box.w}x${box.h})`,
          );
        }
      }
    }

    // Check if any intermediate points pass through either icon
    for (let i = 1; i < pts.length - 1; i++) {
      const midAbs = { x: arrow.x + pts[i][0], y: arrow.y + pts[i][1] };
      for (const [nodeId, box] of iconBoxes) {
        if (pointInsideBox(midAbs.x, midAbs.y, box)) {
          issues.push(
            `Arrow waypoint ${i} passes through "${nodeId}" icon at (${midAbs.x.toFixed(0)}, ${midAbs.y.toFixed(0)})`,
          );
        }
      }
    }
  }

  return issues;
}

/**
 * Map an Excalidraw element ID back to a D4 node ID using positions.
 * The element might be the icon image or the label text — we check
 * if its center is inside any known position bounding box.
 */
function findNodeIdForElement(
  elementId: string,
  result: Awaited<ReturnType<typeof convertD4ToExcalidraw>>,
): string | null {
  // First try: direct match on element id patterns
  // Elements often have IDs like "node_a_icon" or similar
  const el = result.elements.find((e: any) => e.id === elementId);
  if (!el) return null;

  const elCx = el.x + (el.width || 0) / 2;
  const elCy = el.y + (el.height || 0) / 2;

  // Find which position box contains this element's center
  for (const pos of result.positions) {
    if (pos.type !== 'icon' && pos.type !== 'external') continue;
    if (
      elCx >= pos.x &&
      elCx <= pos.x + pos.w &&
      elCy >= pos.y &&
      elCy <= pos.y + pos.h
    ) {
      return pos.id;
    }
  }

  return null;
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const caseFiles = fs.readdirSync(CASES_DIR).filter((f) => f.endsWith('.d4'));

  console.log(`\n=== D4 Visual Tests ===`);
  console.log(`Found ${caseFiles.length} test cases\n`);

  let totalPenetrations = 0;
  let totalShortArrows = 0;
  let totalValidationIssues = 0;

  for (const caseFile of caseFiles) {
    const caseName = caseFile.replace('.d4', '');
    const d4Source = fs.readFileSync(path.join(CASES_DIR, caseFile), 'utf-8');
    const criteriaFile = path.join(CASES_DIR, `${caseName}.criteria.txt`);
    const criteria = fs.existsSync(criteriaFile)
      ? fs.readFileSync(criteriaFile, 'utf-8')
      : '(no criteria file)';

    console.log(`--- ${caseName} ---`);

    try {
      const result = await convertD4ToExcalidraw(d4Source);

      // Save the raw Excalidraw JSON for inspection
      const excalidrawData = {
        type: 'excalidraw',
        version: 2,
        elements: result.elements,
        files: Object.fromEntries(
          result.files.map((f) => [
            f.id,
            { id: f.id, dataURL: f.dataURL, mimeType: f.mimeType },
          ]),
        ),
      };

      const jsonPath = path.join(OUTPUT_DIR, `${caseName}.excalidraw`);
      fs.writeFileSync(jsonPath, JSON.stringify(excalidrawData, null, 2));

      // Print stats
      console.log(`  Elements: ${result.elements.length}`);
      console.log(
        `  Containers: ${result.stats.containers}, Nodes: ${result.stats.nodes}`,
      );
      console.log(
        `  Arrows: ${result.stats.arrows}, Badges: ${result.stats.badges}`,
      );
      console.log(
        `  Icons missing: ${result.iconsMissing.length > 0 ? result.iconsMissing.join(', ') : 'none'}`,
      );

      // Validation issues from the builder
      if (result.validationIssues.length > 0) {
        console.log(
          `  Validation issues: ${result.validationIssues.length}`,
        );
        for (const issue of result.validationIssues) {
          console.log(`    WARNING ${issue}`);
        }
        totalValidationIssues += result.validationIssues.length;
      }

      // Arrow length check
      const arrows = result.elements.filter((e: any) => e.type === 'arrow');
      for (const arrow of arrows) {
        const pts = arrow.points || [];
        if (pts.length >= 2) {
          const endPt = pts[pts.length - 1];
          const spanX = Math.abs(endPt[0]);
          const spanY = Math.abs(endPt[1]);

          if (spanX < 30 && spanY < 30) {
            console.log(
              `  WARNING ARROW TOO SHORT: span=(${spanX.toFixed(0)}, ${spanY.toFixed(0)})`,
            );
            totalShortArrows++;
          }
        }
      }

      // Arrow penetration check
      const penetrations = checkArrowPenetration(result);
      if (penetrations.length > 0) {
        for (const p of penetrations) {
          console.log(`  WARNING PENETRATION: ${p}`);
        }
        totalPenetrations += penetrations.length;
      }

      console.log(`  OK Saved: ${jsonPath}`);
      console.log(
        `  Criteria: ${criteria.substring(0, 100)}${criteria.length > 100 ? '...' : ''}`,
      );
    } catch (err: any) {
      console.log(`  FAIL ERROR: ${err.message}`);
    }

    console.log();
  }

  // Summary
  console.log(`=== Summary ===`);
  console.log(`Test cases: ${caseFiles.length}`);
  console.log(`Arrow penetrations: ${totalPenetrations}`);
  console.log(`Arrows too short: ${totalShortArrows}`);
  console.log(`Validation issues: ${totalValidationIssues}`);
  console.log(`Output: ${OUTPUT_DIR}/`);
  console.log(
    'Open .excalidraw files in Excalidraw to visually inspect.\n',
  );

  if (totalPenetrations > 0 || totalShortArrows > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
