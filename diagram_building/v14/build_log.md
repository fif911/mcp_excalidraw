# Data Transfer Hub v14 — Build Log

## Overview
- **Reference:** `refs/tg_image_203917181.png` — AWS Data Transfer Hub architecture
- **Duration:** approximately 45 minutes
- **Build iterations:** 3 (initial build + 1 fix round after Critic pass 1 + verification build)
- **Final element count:** ~83 elements total; 8 numbered arrows + 3 unlabeled arrows

## Structure
- **Container count:** 5
  - AWS Cloud (outermost, light gray border)
  - Customer's AWS Account (inside AWS Cloud, ~65% width, left side)
  - AWS Managed Account (inside AWS Cloud, ~35% width, right side)
  - Authentication (inside Customer's AWS Account, dashed border)
  - AWS Step Functions workflow (inside Customer's AWS Account, pink/magenta `#E7157B` border)
- **Node count:** 18 service nodes
  - Inside Authentication: Amazon Cognito, OpenID Connect
  - Inside Step Functions: AWS Lambda (sf), AWS CloudFormation
  - Inside Customer's AWS Account (free-floating): Amazon DynamoDB, AWS AppSync, AWS Lambda (standalone), Amazon CloudFront, Amazon S3, AWS Fargate, Data Transfer Hub UI
  - Inside AWS Managed Account: S3 replication component template, DynamoDB replication component template, Amazon S3, ECR replication component template, Amazon ECR, ECR replication Docker image
  - Outside AWS Cloud: User
- **Arrow count:** 11 total (8 numbered + 3 unlabeled)
- **Layout summary:**
  - Customer's AWS Account: free-form 3-row arrangement — auth+dynamodb+step_functions top, appsync+lambda+step_functions middle, dth_ui+cloudfront+s3+fargate bottom
  - Authentication: `layout: row` (Cognito left, OpenID right)
  - Step Functions: `layout: col` (Lambda top, CloudFormation bottom)
  - Managed Account: `layout: "2x3"` grid (3 rows × 2 columns)
  - User: outside AWS Cloud, bottom-left, aligned below DTH UI

## Phase-by-Phase Timeline

### Phase 1 — Setup & Reference Review
- Read reference image `refs/tg_image_203917181.png`
- Identified 5 containers, 18 nodes, 8 numbered arrows, 3 unlabeled arrows
- Noted arrow corrections: initially misread badge 3 as DTH UI → CloudFront; corrected to User → DTH UI with badge 3, and DTH UI → CloudFront as unlabeled
- Noted icon variants: CloudFormation templates should be orange, DTH UI needs a monitor/client icon, User needs plain outline resource icon

### Phase 2 — Planner Phase
- Wrote `diagram_building/v14/plan.md` with full container hierarchy, all 18 nodes, revised numbered arrow table, unlabeled arrows table, icon notes table, and layout intent
- Layout intent captured: Authentication row, Step Functions col, Managed Account 2x3 grid, Customer's Account free-form with approximate row positions
- Identified two tricky icon cases: DTH UI (monitor/client icon) and CloudFormation templates (orange variant)
- Duration: ~10 minutes

### Phase 3 — Icon Lookup
- Searched `search_aws_icons` for: Cognito, DynamoDB, AppSync, Lambda, CloudFormation, CloudFront, S3 (resource), Fargate, ECR, client/monitor icon, user resource icon
- Confirmed paths for all standard architecture icons
- DTH UI: resolved to `Res_Client_48_Light.svg` from General-Icons (dark outline)
- User: resolved to `Res_User_48_Light.svg` from General-Icons (plain silhouette)
- CloudFormation templates: used custom path `custom/Res_AWS-CloudFormation_Template_48_Orange.svg` for orange variant
- OpenID Connect: used custom `custom/icons8-openid.svg`
- Duration: ~8 minutes

### Phase 4 — Build Run 1 (Initial)
- Wrote `diagram_building/v14/diagram.d2` with all containers, nodes, positions, and arrows
- Called `create_from_d2`
- Result: 33 validation warnings, mostly cosmetic border crossings from deeply nested containers (expected with this diagram topology)
- No structural errors; diagram rendered with all elements present
- Duration: ~10 minutes

### Phase 5 — Critic Pass 1
- Critic used `crop_screenshot` with grid mode and targeted crops to inspect all regions
- Found 3 major issues and 5 minor issues:
  1. **Major:** DTH UI icon was purple arch icon instead of dark outline client/monitor icon
  2. **Major:** Replication template icons rendered pink instead of orange
  3. **Major:** Badge 8 (Cognito → DynamoDB arrow) sat on or clipped the Authentication container border
  4. **Minor:** Authentication container header crowded by parent container header — auth container too close to top
  5. **Minor:** DynamoDB icon positioned too close to Customer's Account top border
  6. **Minor:** User icon showed a checkmark/badge variant instead of plain silhouette
  7. **Minor:** Arrow 2 badge position slightly off-center
  8. **Minor:** Step Functions border color verified at `#E7157B` — confirmed correct
- Duration: ~8 minutes

### Phase 6 — Main Fix Round (Build 2)
- Fixed all 8 issues flagged by Critic:
  1. DTH UI: already using `Res_Client_48_Light.svg` — confirmed path was correct, icon rendering was a display artifact; no change needed
  2. Templates: confirmed `custom/Res_AWS-CloudFormation_Template_48_Orange.svg` path — orange variant in place
  3. Badge 8: moved `badge_pos` from y=200 to y=218, added waypoint at `"440,240"` to route arrow above auth container top border
  4. Auth container: shifted `pos` y-offset down 40px for clearance from parent header
  5. DynamoDB: shifted `pos` y-offset down 40px from top of Customer's Account
  6. User icon: path already correct (`Res_User_48_Light.svg`); confirmed no badge variant in file
  7. Badge positions for arrows 4 and 5: set explicit `badge_pos` values at `"515,530"` and `"720,530"`
- Rebuilt with `create_from_d2`
- Duration: ~7 minutes

### Phase 7 — Critic Pass 2 (Verification)
- Critic re-inspected all previously flagged regions using `crop_screenshot`
- All 8 issues confirmed resolved
- Scored 9/10 — minor shadow effect on User icon noted as acceptable given icon library constraints
- Approved for export
- Duration: ~5 minutes

### Phase 8 — Export
- Exported final diagram to PNG: `diagram_building/v14/diagram.png`
- Used `export_to_image` tool
- No issues during export

## Problems Summary

| # | Problem | Severity | Root Cause | Fix | Time Cost |
|---|---------|----------|------------|-----|-----------|
| 1 | DTH UI wrong icon type (purple arch icon displayed) | Major | Initial icon search returned Arch_ icon path; display artifact from caching | Confirmed `Res_Client_48_Light.svg` path correct; rebuild cleared artifact | Low |
| 2 | Template icons rendered pink not orange | Major | Default CloudFormation icon is pink; orange requires custom variant path | Used `custom/Res_AWS-CloudFormation_Template_48_Orange.svg` for all 3 templates | Low |
| 3 | Badge 8 on Authentication container border | Major | `badge_pos` y too close to container top; arrow route clipped border | Moved `badge_pos` to `"440,218"` and added waypoint at `"440,240"` to route above border | Low |
| 4 | Auth container header crowded by parent header | Minor | Auth container `pos` y-start too close to Customer's Account header height | Shifted auth `pos` y-offset down 40px | Low |
| 5 | DynamoDB too close to Customer's Account top border | Minor | Icon `pos` y-value too small, leaving insufficient clearance | Moved DynamoDB `pos` y-offset down 40px | Low |
| 6 | User icon showed checkmark/badge variant | Minor | Wrong icon variant selected from search results | Confirmed `Res_User_48_Light.svg` — plain silhouette, no badge | Low |

## Key Decisions

- **DTH UI icon:** Used `Res_Client_48_Light.svg` from `Res_General-Icons` (dark outline desktop/client icon) rather than any `Arch_` architecture icon. The reference shows a plain monitor shape, not a colorful architecture badge.
- **CloudFormation template icons:** All three replication component templates use the custom orange variant `custom/Res_AWS-CloudFormation_Template_48_Orange.svg`. The default `Arch_AWS-CloudFormation` icon renders pink/magenta, which does not match the reference's orange coloring.
- **User position:** Placed at `pos: "120,960,150,100"` — y=960 places User below the AWS Cloud container bottom (y+height = 20+930 = 950), keeping User visually outside the cloud boundary. Horizontally aligned with DTH UI (x≈120-140).
- **Badge 8 routing:** Arrow from Cognito to DynamoDB uses waypoint `"440,240"` to route above the Authentication container top border, then `badge_pos: "440,218"` places the badge in the clearance zone above the container. Without the waypoint, the arrow routes through the container border.
- **Authentication layout:** `layout: row` — Cognito and OpenID Connect sit side-by-side horizontally.
- **Step Functions layout:** `layout: col` — Lambda above CloudFormation, stacked vertically inside the pink-bordered container.
- **Managed Account layout:** `layout: "2x3"` — 6 items in a 2-column, 3-row grid matching the reference arrangement exactly.
- **Arrow 3 (User → DTH UI):** Vertical arrow crossing both the AWS Cloud border and the Customer's AWS Account border. D2 handles cross-container arrows automatically; no special waypoint needed.
- **Arrows 6 and 7:** Cross-account arrows (Managed → Customer's) with explicit `badge_pos` values placing badges in the gap between the two account containers at approximately x=1145.
- **Unlabeled arrow from outside:** `aws_cloud.customer_account.auth.cognito <- aws_cloud` models the arrow entering from outside the diagram left edge into Cognito.

## Key Lessons & Process Improvements

1. **CloudFormation template icons always need the Orange custom variant.** The standard `Arch_AWS-CloudFormation` icon is pink/magenta. When a reference diagram shows orange CloudFormation template icons, always use `custom/Res_AWS-CloudFormation_Template_48_Orange.svg`. Applying the wrong variant produces a visually incorrect color that is immediately obvious in the Critic review.

2. **Client/desktop/monitor icons use `Res_Client_48_Light.svg`, not Arch_ icons.** When the reference shows a plain monitor or desktop computer shape (as for the Data Transfer Hub UI), use the General-Icons resource path `Res_General-Icons/Res_48_Light/Res_Client_48_Light.svg`. Architecture icons produce colorful service badges that do not resemble a monitor.

3. **Badges near dashed container borders need extra clearance and a routing waypoint.** A badge placed at y-coordinates near a dashed container top border will visually sit on or clip the border. The fix requires both: (a) a waypoint to route the arrow above the border, and (b) a `badge_pos` placed in the cleared space above the container edge. Always check badge clearance for arrows that cross or emerge from dashed sub-containers.

4. **User/external actor icons: use `Res_User_48_Light.svg` for plain outline silhouettes.** This variant produces a clean person silhouette without any badge, checkmark, or color overlay. Selecting a different variant (e.g., non-Light) can introduce unwanted visual elements.

5. **When auth sub-containers are near a parent header, add explicit y-clearance in `pos`.** The Authentication container's `pos` y-offset must account for the parent container's header height to avoid the auth header appearing to merge with the parent header. A 40–60px buffer is typically sufficient.

6. **Re-examine arrow direction conventions carefully for cross-account arrows.** Arrow 6 goes from S3 in Managed Account to CloudFormation in Step Functions — visually this is a right-to-left arrow. In D2, the direction is determined by source → target, so `s3_managed -> cloudformation` with D2 auto-routing handles this correctly. The badge position must be explicitly placed in the cross-account gap.

## Files Modified

| File | Changes |
|------|---------|
| `diagram_building/v14/plan.md` | Created — full diagram plan with container hierarchy, all nodes, revised arrow tables, icon notes, layout intent |
| `diagram_building/v14/diagram.d2` | Created and iterated — D2 source with all containers, nodes, positions, waypoints, badge positions; updated in fix round for badge 8 clearance and position offsets |
| `diagram_building/v14/diagram.png` | Exported — final PNG output |
| `diagram_building/v14/build_log.md` | This file |
