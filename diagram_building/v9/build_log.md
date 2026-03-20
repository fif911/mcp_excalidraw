# Data Transfer Hub v9 — Build Log

## Overview
- **Reference:** `refs/tg_image_203917181.png`
- **Duration:** ~20 minutes
- **Build iterations:** 3 (initial build + 1 fix pass)
- **Final element count:** 82 total (22 images, 38 text, 5 rectangles, 9 arrows, 8 ellipses)

## Structure
- **Containers (5):** AWS Cloud, Customer's AWS Account, Authentication (dashed), AWS Step Functions workflow (pink #E7157B border), AWS Managed Account
- **Nodes (18):** User, Cognito, OpenID Connect, DynamoDB, AppSync, Lambda, Lambda (SF), CloudFormation, DTH UI, CloudFront, S3 (customer), Fargate, S3 repl template, DynamoDB repl template, S3 (managed), ECR repl template, ECR, ECR Docker image
- **Arrows (9):** 8 numbered (badges 1-8) + 1 unlabeled (CloudFront → S3)
- **Standalone nodes (9):** Cognito, OpenID, Lambda_SF, S3_repl, DynamoDB_repl, S3_managed, ECR_repl, ECR, ECR_docker

## Phase-by-Phase Timeline

### Phase 1: Setup
- Created `diagram_building/v9/` directory
- Copied reference image to `diagram_building/v9/reference.png`

### Phase 2: Planner
- Spawned Planner agent to analyze reference and write `diagram.d2`
- Planner correctly identified all 5 containers, 18 nodes, 9 arrows
- Used `icon_type`, `icon_variant`, `icon_hint` attributes for icon resolution guidance
- Noted that a floating entry arrow into Cognito (from reference) cannot be represented in D2

### Phase 3: Main — Initial Build
- Spawned Main agent to add positions, waypoints, badge_pos
- Replaced `icon_type`/`icon_variant`/`icon_hint` with explicit `icon:` file paths (hint attributes were rendering as visible child nodes)
- Canvas dimensions: 1780x1020 for AWS Cloud
- Built with `create_from_d2` — multiple iterations to resolve icon path issues
- 13 validation warnings (all acceptable: multi-line label overlaps, arrow-label proximity, icon penetrations)

### Phase 4: Critic — First Review
- Score: 7/10
- Found 3 issues:
  1. **MAJOR:** Arrow 8 vertical segment at x=540 crossing through "Amazon DynamoDB" label text
  2. **Minor:** Arrow 5 had 14px vertical stub at Step Functions entry
  3. **Minor:** Arrow 6 had 14px vertical stub at Managed Account entry

### Phase 5: Main — Fix Pass
- Shifted Arrow 8 vertical segment from x=540 to x=480 (41px clearance from DynamoDB label)
- Removed vertical stubs from Arrow 5 (now purely horizontal at y=511)
- Removed vertical stubs from Arrow 6 (now purely horizontal at y=541)
- Rebuilt with `create_from_d2` — all fixes confirmed

### Phase 6: Critic — Final Review
- Score: 9/10
- All 3 issues confirmed FIXED
- 1 minor remaining: Arrow 7 final segment is 16px (cosmetic, visually acceptable)
- Verdict: PASS

### Phase 7: Export
- Exported to `diagram_building/v9/output.png` as PNG

## Problems Summary

| # | Problem | Severity | Root Cause | Fix | Time Cost |
|---|---------|----------|------------|-----|-----------|
| 1 | Arrow 8 crossed DynamoDB label | Major | Vertical segment at x=540 too close to label at x=521 | Shifted to x=480 | 1 iteration |
| 2 | Arrow 5 vertical stub at SF border | Minor | Waypoint y=530 instead of y=511 | Changed to y=511 | 1 iteration |
| 3 | Arrow 6 vertical stub at MA border | Minor | Waypoint y=560 instead of y=541 | Changed to y=541 | 1 iteration |
| 4 | icon_hint rendered as visible child | Major | `icon_hint` attribute not recognized — treated as text node | Replaced with explicit `icon:` paths | Initial build |

## Key Decisions
- **Icon mappings:** Replaced all `icon_type`/`icon_variant`/`icon_hint` with resolved `icon:` paths from `search_aws_icons`
- **Cognito entry arrow omitted:** Reference shows a floating arrow entering Cognito from outside — cannot be represented in D2 (requires both source and target)
- **Arrow 8 routing:** Chose x=480 for vertical segment to clear both DynamoDB label (x=521) and OpenID Connect label area
- **Badge 6 placement:** Positioned in the gap between Customer Account (right=1080) and Managed Account (left=1120) at x=1100

## Key Lessons & Process Improvements
- **icon_hint/icon_type/icon_variant are not D2 attributes** — they render as visible child text nodes. Always resolve to explicit `icon:` paths using `search_aws_icons` before building.
- **Waypoints must exactly match target coordinates** — even a 14px offset creates visible stubs. When an arrow should enter a container horizontally, ensure the final waypoint y matches the arrow start y exactly.
- **Arrow vertical segments near labels need 40px+ clearance** — the DynamoDB label overlap happened because the segment was only 19px from the label start. 40px minimum clearance prevents this.

## Files Modified

| File | Changes |
|------|---------|
| `diagram_building/v9/diagram.d2` | Created by Planner, positions added by Main, arrow fixes in iteration 2 |
| `diagram_building/v9/reference.png` | Copied from `refs/tg_image_203917181.png` |
| `diagram_building/v9/output.png` | Final exported diagram |
| `diagram_building/v9/build_log.md` | This file |
