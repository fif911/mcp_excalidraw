/**
 * ELK Hierarchy Test — Data Transfer Hub structure
 * Research script to understand how ELK handles fully nested compound nodes.
 */
import ELK, { ElkNode, ElkExtendedEdge } from "elkjs";

const elk = new ELK();

// Helper to create a leaf node
function leaf(id: string, width: number, height: number): ElkNode {
  return { id, width, height };
}

// Helper for compound node ELK options
function compoundOpts(topPadding: number) {
  return {
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.padding": `[top=${topPadding},left=40,bottom=40,right=40]`,
  };
}

const graph: ElkNode = {
  id: "root",
  layoutOptions: {
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
    "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    "elk.edgeRouting": "ORTHOGONAL",
  },
  children: [
    {
      id: "aws_cloud",
      layoutOptions: compoundOpts(148),
      children: [
        leaf("user", 98, 136),
        {
          id: "customer_account",
          layoutOptions: compoundOpts(148),
          children: [
            {
              id: "auth",
              layoutOptions: compoundOpts(88),
              children: [
                leaf("cognito", 150, 136),
                leaf("openid", 150, 136),
              ],
            },
            leaf("appsync", 150, 136),
            leaf("lambda", 150, 136),
            leaf("dynamodb", 180, 136),
            leaf("cloudfront", 180, 136),
            leaf("s3", 98, 136),
            {
              id: "sfn",
              layoutOptions: compoundOpts(88),
              children: [leaf("sfn_lambda", 150, 136)],
            },
            leaf("cloudformation", 200, 136),
            leaf("fargate", 150, 136),
            leaf("dth_ui", 200, 136),
          ],
        },
        {
          id: "managed_account",
          layoutOptions: compoundOpts(148),
          children: [
            leaf("s3_repl", 220, 136),
            leaf("dynamodb_repl", 280, 136),
            leaf("s3_managed", 180, 136),
            leaf("ecr_repl", 150, 136),
            leaf("ecr", 98, 136),
            leaf("ecr_docker", 200, 136),
          ],
        },
      ],
    },
  ],
  edges: [
    { id: "e_user_dthui", sources: ["user"], targets: ["dth_ui"] },
    { id: "e_user_appsync", sources: ["user"], targets: ["appsync"] },
    { id: "e_appsync_dynamodb", sources: ["appsync"], targets: ["dynamodb"] },
    { id: "e_appsync_lambda", sources: ["appsync"], targets: ["lambda"] },
    { id: "e_lambda_sfnlambda", sources: ["lambda"], targets: ["sfn_lambda"] },
    { id: "e_sfnlambda_fargate", sources: ["sfn_lambda"], targets: ["fargate"] },
    { id: "e_cloudfront_s3", sources: ["cloudfront"], targets: ["s3"] },
    { id: "e_dthui_cloudfront", sources: ["dth_ui"], targets: ["cloudfront"] },
    { id: "e_s3_s3repl", sources: ["s3"], targets: ["s3_repl"] },
    { id: "e_dynamodb_dynamodbrepl", sources: ["dynamodb"], targets: ["dynamodb_repl"] },
    { id: "e_ecr_ecrrepl", sources: ["ecr"], targets: ["ecr_repl"] },
    { id: "e_ecrrepl_ecrdocker", sources: ["ecr_repl"], targets: ["ecr_docker"] },
  ] as ElkExtendedEdge[],
};

// --- Run layout and analyze ---

interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

function collectNodes(
  node: ElkNode,
  parentX: number,
  parentY: number,
  results: Map<string, Bounds & { isCompound: boolean }>
) {
  const absX = parentX + (node.x ?? 0);
  const absY = parentY + (node.y ?? 0);
  const w = node.width ?? 0;
  const h = node.height ?? 0;
  const isCompound = !!(node.children && node.children.length > 0);

  results.set(node.id, { x: absX, y: absY, w, h, isCompound });

  if (node.children) {
    for (const child of node.children) {
      collectNodes(child, absX, absY, results);
    }
  }
}

function overlaps(a: Bounds, b: Bounds): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

async function main() {
  const result = await elk.layout(graph);

  // Collect all node positions (absolute)
  const nodes = new Map<string, Bounds & { isCompound: boolean }>();
  collectNodes(result, 0, 0, nodes);

  // Print all node positions
  console.log("\n=== NODE POSITIONS (absolute) ===");
  console.log(
    "ID".padEnd(22) +
      "X".padStart(8) +
      "Y".padStart(8) +
      "W".padStart(8) +
      "H".padStart(8) +
      "  Type"
  );
  console.log("-".repeat(70));
  for (const [id, b] of nodes) {
    if (id === "root") continue;
    const type = b.isCompound ? "COMPOUND" : "leaf";
    console.log(
      id.padEnd(22) +
        b.x.toFixed(0).padStart(8) +
        b.y.toFixed(0).padStart(8) +
        b.w.toFixed(0).padStart(8) +
        b.h.toFixed(0).padStart(8) +
        `  ${type}`
    );
  }

  // Check children inside parents
  console.log("\n=== CONTAINMENT CHECK ===");
  const parentMap: Record<string, string[]> = {
    aws_cloud: ["user", "customer_account", "managed_account"],
    customer_account: [
      "auth",
      "appsync",
      "lambda",
      "dynamodb",
      "cloudfront",
      "s3",
      "sfn",
      "cloudformation",
      "fargate",
      "dth_ui",
    ],
    auth: ["cognito", "openid"],
    sfn: ["sfn_lambda"],
    managed_account: ["s3_repl", "dynamodb_repl", "s3_managed", "ecr_repl", "ecr", "ecr_docker"],
  };

  let containmentOk = true;
  for (const [parent, children] of Object.entries(parentMap)) {
    const p = nodes.get(parent)!;
    for (const childId of children) {
      const c = nodes.get(childId)!;
      const inside =
        c.x >= p.x && c.y >= p.y && c.x + c.w <= p.x + p.w && c.y + c.h <= p.y + p.h;
      if (!inside) {
        console.log(`  VIOLATION: ${childId} NOT inside ${parent}`);
        console.log(
          `    child: [${c.x.toFixed(0)},${c.y.toFixed(0)} -> ${(c.x + c.w).toFixed(0)},${(c.y + c.h).toFixed(0)}]`
        );
        console.log(
          `    parent: [${p.x.toFixed(0)},${p.y.toFixed(0)} -> ${(p.x + p.w).toFixed(0)},${(p.y + p.h).toFixed(0)}]`
        );
        containmentOk = false;
      }
    }
  }
  if (containmentOk) {
    console.log("  All children are inside their parent bounds.");
  }

  // Check sibling compound overlap
  console.log("\n=== SIBLING OVERLAP CHECK ===");
  const siblingGroups = [
    ["user", "customer_account", "managed_account"], // siblings in aws_cloud
    [
      "auth",
      "appsync",
      "lambda",
      "dynamodb",
      "cloudfront",
      "s3",
      "sfn",
      "cloudformation",
      "fargate",
      "dth_ui",
    ], // siblings in customer_account
    ["cognito", "openid"], // siblings in auth
    ["s3_repl", "dynamodb_repl", "s3_managed", "ecr_repl", "ecr", "ecr_docker"], // siblings in managed_account
  ];

  let overlapFound = false;
  for (const group of siblingGroups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = nodes.get(group[i])!;
        const b = nodes.get(group[j])!;
        if (overlaps(a, b)) {
          console.log(`  OVERLAP: ${group[i]} and ${group[j]}`);
          overlapFound = true;
        }
      }
    }
  }
  if (!overlapFound) {
    console.log("  No sibling overlaps detected.");
  }

  // Check edge orthogonality
  console.log("\n=== EDGE ROUTING CHECK ===");
  function checkEdgesOnNode(node: ElkNode, parentX: number, parentY: number) {
    const absX = parentX + (node.x ?? 0);
    const absY = parentY + (node.y ?? 0);

    if (node.edges) {
      for (const edge of node.edges) {
        const sections = (edge as any).sections ?? [];
        for (const section of sections) {
          const points = [
            section.startPoint,
            ...(section.bendPoints ?? []),
            section.endPoint,
          ];
          let orthogonal = true;
          for (let i = 0; i < points.length - 1; i++) {
            const dx = Math.abs(points[i + 1].x - points[i].x);
            const dy = Math.abs(points[i + 1].y - points[i].y);
            if (dx > 0.5 && dy > 0.5) {
              orthogonal = false;
              break;
            }
          }
          const status = orthogonal ? "OK" : "DIAGONAL";
          console.log(`  ${edge.id}: ${points.length} points — ${status}`);
        }
      }
    }

    if (node.children) {
      for (const child of node.children) {
        checkEdgesOnNode(child, absX, absY);
      }
    }
  }
  checkEdgesOnNode(result, 0, 0);

  // Overall dimensions
  const root = nodes.get("root")!;
  const awsCloud = nodes.get("aws_cloud")!;
  console.log("\n=== OVERALL DIMENSIONS ===");
  console.log(`  Root:      ${root.w.toFixed(0)} x ${root.h.toFixed(0)}`);
  console.log(`  AWS Cloud: ${awsCloud.w.toFixed(0)} x ${awsCloud.h.toFixed(0)}`);
  console.log(`  Aspect ratio (W/H): ${(awsCloud.w / awsCloud.h).toFixed(2)}`);

  // Print compound node sizes for reference
  console.log("\n=== COMPOUND NODE SIZES ===");
  for (const [id, b] of nodes) {
    if (b.isCompound && id !== "root") {
      console.log(`  ${id.padEnd(22)} ${b.w.toFixed(0)} x ${b.h.toFixed(0)}`);
    }
  }
}

main().catch(console.error);
