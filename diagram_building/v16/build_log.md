# AWS Data Transfer Hub v16 — Build Log

## Overview
- **Reference:** `refs/tg_image_203917181.png`
- **Duration:** ~30 minutes
- **Build iterations:** 4 (initial build + 3 fix rounds)
- **Final element count:** ~18 service nodes, 8 numbered arrows, 3 unlabeled arrows

## Structure
- **Containers (5):** AWS Cloud, Customer's AWS Account, AWS Managed Account, Authentication (dashed), AWS Step Functions workflow (pink border)
- **Nodes (18):** Amazon Cognito, OpenID Connect, Amazon DynamoDB, AWS AppSync, AWS Lambda (x2), AWS CloudFormation, Data Transfer Hub UI, Amazon CloudFront, Amazon S3 (x2), AWS Fargate, S3 replication component template, DynamoDB replication component template, ECR replication component template, Amazon ECR, ECR replication Docker image, User
- **Arrows:** 8 numbered (badges 1-8) + 3 unlabeled
- **Layout:** 3-row structure in Customer Account; 2x3 grid in Managed Account

## Phase-by-Phase Timeline

### 1. Setup & Exploration
- Read reference image, identified all elements and structure
- Checked existing versions — determined this is v16
- Created directory and copied reference image

### 2. Planner Phase
- Spawned Planner agent to analyze reference and write plan.md
- Plan covered all containers, nodes, arrows, badges, and layout intent
- Output: `diagram_building/v16/plan.md`

### 3. Main Phase — Build 1
- Spawned Main agent with plan.md
- Used search_aws_icons for all icon paths
- Wrote diagram.d2 and built with create_from_d2
- Initial build had multiple issues

### 4. Critic Phase — Round 1
- Spawned Critic agent with grid inspection
- Found 3 critical, 4 major, 2 minor issues
- Critical: Arrow 5 went DOWN instead of RIGHT, DTH UI icon wrong type, template icons pink instead of orange
- Major: Excessive empty space, OpenID icon wrong, ECR Docker image icon wrong

### 5. Main Phase — Fix Round 1
- Fixed arrow 5 routing to horizontal
- Fixed DTH UI to Client resource icon
- Fixed all 3 template icons to orange CloudFormation Template
- Reduced container heights by ~300px
- Fixed ECR Docker image icon
- Verified OpenID Connect icon was actually correct

### 6. Critic Phase — Round 2
- All critical and major issues verified fixed
- 3 minor issues remaining: still some bottom whitespace, CloudFormation→Fargate arrow clipping label, Cloud→Cognito arrow at angle

### 7. Main Phase — Fix Round 2
- Reduced container heights by additional 150px
- Rerouted CloudFormation→Fargate arrow with offset waypoints
- Added waypoint for horizontal Cloud→Cognito entry

### 8. Export
- Verified with screenshot — all elements match reference
- Exported to PNG: `diagram_building/v16/final_export.png`

## Problems Summary

| # | Problem | Severity | Root Cause | Fix | Time Cost |
|---|---------|----------|------------|-----|-----------|
| 1 | Arrow 5 goes down instead of right | Critical | Target was step_functions container, arrow auto-routed vertically | Changed target to step_functions.cloudformation with horizontal waypoint | Medium |
| 2 | DTH UI icon wrong (purple cloud-lock) | Critical | Wrong icon type resolved by search | Changed to resource-type Client icon | Low |
| 3 | Template icons pink instead of orange | Critical | Default CloudFormation Template icon is pink | Used explicit custom SVG path for orange variant | Low |
| 4 | 400px empty space at bottom | Major | Container heights set too large initially | Reduced heights in two rounds (-300px, then -150px) | Medium |
| 5 | ECR Docker image icon wrong | Major | Wrong icon resolved by search | Changed to ECR Registry resource icon | Low |
| 6 | CloudFormation→Fargate arrow clips label | Minor | Single waypoint caused vertical segment through label | Added offset waypoints to route around label | Low |
| 7 | Cloud→Cognito arrow at angle | Minor | No waypoint forcing horizontal entry | Added waypoint at Cognito center Y | Low |

## Key Decisions
- **OpenID Connect icon:** Critic flagged it as wrong (gray circular arrow), but verified the custom SVG was rendering correctly — the icon design just looks like a rotating arrow
- **Template icons:** Required explicit custom SVG path rather than icon_hint because the default resolved to pink variant
- **Arrow 5 target:** Changed from step_functions container to step_functions.cloudformation to achieve horizontal routing into the container

## Key Lessons & Process Improvements
- **CloudFormation Template icons default to pink** — always use explicit `icon: "custom/Res_AWS-CloudFormation_Template_48_Orange.svg"` for the orange variant
- **Arrow routing to containers** — targeting a container directly can produce unexpected auto-routing; target a specific element inside the container for predictable horizontal/vertical paths
- **Container sizing** — start with tighter heights and expand if needed, rather than starting large and shrinking

## Files Modified

| File | Changes |
|------|---------|
| `diagram_building/v16/plan.md` | Created — full diagram plan |
| `diagram_building/v16/diagram.d2` | Created and iterated — D2 source with 3 fix rounds |
| `diagram_building/v16/final_export.png` | Exported PNG |
| `diagram_building/v16/reference.png` | Copied from refs/ |
