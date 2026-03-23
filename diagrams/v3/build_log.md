# Data Transfer Hub v3 — Build Log

## Overview
- **Reference:** `refs/tg_image_203917181.png`
- **Duration:** ~45 minutes orchestration time
- **Build iterations:** 7 builds total (2 initial + 2 fix round 1 + 1 fix round 2 + 2 fix round 3)
- **Final element count:** 82 elements — 18 service nodes, 9 arrows (8 numbered + 1 unlabeled), 5 containers, 8 badges
- **Critic score:** 8.5/10 — approved for delivery

## Structure
- **Containers:** AWS Cloud (outer), Customer's AWS Account (left), AWS Managed Account (right), Authentication (dashed, inside Customer), AWS Step Functions workflow (pink border, inside Customer)
- **Layout:** Customer Account uses `layout: layers` with 4 columns + invisible spacer in col2
- **Key nodes:** User (external actor), Cognito, OpenID Connect, AppSync, Lambda (x2), DynamoDB, CloudFront, S3 (x2), CloudFormation, Fargate, ECR, plus 4 template/docker text labels in Managed Account
- **Arrows:** 8 numbered (dark circle badges #232F3E) + 1 unlabeled (DTH UI → CloudFront)

## Phase-by-Phase Timeline

### Phase 1: Planning (~15 min)
- Planner agent analyzed reference image, wrote `plan.md` with complete element inventory, container hierarchy, arrow connection table, and layout description
- Critic Phase 0 verified all 9 arrows against reference — no issues found

### Phase 2: Initial Build (Builds 1-2, ~10 min)
- Main agent translated plan to `diagram.d3` using 4-column layout
- Build 1: structure + layout, no waypoints
- Build 2: added waypoints and badge positions
- Result: All elements present, but Critic found major layout and routing issues

### Phase 3: Critic Round 1 + Fixes (Builds 3-4, ~10 min)
- **Issues found:** User too low (y=1083), Arrow 4 U-shaped loop, Arrow 2 through Authentication, Arrow 5 missed SFN border
- **Fixes applied:** User moved up to y=549, arrow waypoints updated
- **Root cause identified:** AppSync in wrong row (top instead of middle)

### Phase 4: Layout Restructure (Build 5, ~8 min)
- Added invisible spacer in col2 to push AppSync to middle row (y=651)
- All column ordering corrected to match reference layout
- Removed all waypoints for clean rebuild, then re-added based on new positions

### Phase 5: Critic Round 3 + Final Fixes (Builds 6-7, ~8 min)
- **Issues found:** Spacer visible, Arrow 8 U-shaped, Arrow 5 piercing SFN, DTH UI label overlap
- **Fixes applied:** Spacer opacity=0, Arrow 5 waypoint fixed, unlabeled arrow waypoint shifted
- **Arrow 8:** Tool persistently reroutes waypoints; accepted as-is (correct connection, complex routing)

### Phase 6: Final Critic Review
- Critic Round 5: APPROVED at 8.5/10
- All 18 elements verified present and correctly placed
- All 9 arrows connect correct source/target
- All 8 badges visible with correct styling
- All container borders correct (dashed for Auth, pink for SFN, solid for rest)

### Phase 7: Export
- `.excalidraw` export: 111KB, 82 elements — successful
- `.png` export: Failed (canvas frontend browser not rendering, 121 bytes)

## Problems Summary

| # | Problem | Severity | Root Cause | Fix | Time Cost |
|---|---------|----------|------------|-----|-----------|
| 1 | AppSync in wrong row | Major | Col2 layout order placed AppSync at top | Added invisible spacer to push AppSync to middle row | ~15 min |
| 2 | Arrow 4 U-shaped loop | Major | AppSync and Lambda at different Y levels | Fixed by moving AppSync to same row as Lambda | ~10 min |
| 3 | User too low (y=1083) | Major | Default layout placed User below Customer Account | Moved User up to y=549 | ~5 min |
| 4 | Arrow 2 through Authentication | Major | Horizontal segment at y=286 crossed Auth interior | Rerouted below Auth at y=549 | ~5 min |
| 5 | Arrow 5 pierced SFN | Major | Arrow entered SFN and continued upward inside | Changed target to SFN container border, adjusted waypoints | ~5 min |
| 6 | Spacer visible | Major | D3 opacity:0 not applied by builder | Used update_element to set opacity=0 post-build | ~2 min |
| 7 | Arrow 8 complex routing | Minor | Tool reroutes waypoints to avoid collisions | Accepted — connection correct, routing suboptimal | Persistent |
| 8 | Hub UI label overlap | Minor | Unlabeled arrow vertical segment at x=508 grazed label | Shifted waypoint to x=600 | ~2 min |

## Key Decisions
- **Spacer approach:** Used an invisible rectangle with opacity:0 to create vertical spacing in col2, pushing AppSync from top to middle row
- **Arrow 8 acceptance:** After multiple attempts with different waypoints (953,267 / 1248,651 / 1080,572), the tool consistently reroutes. Accepted the complex but correct routing.
- **Arrow 5 target:** Changed from targeting Lambda-inside-SFN to targeting the SFN container itself, so the arrow stops at the border
- **Badge positions:** All 8 badges auto-placed by the tool, with manual overrides only for badge 5 (near SFN border)

## Key Lessons & Process Improvements

1. **Column layout order matters critically.** The `layout: layers` engine places elements top-to-bottom within each column. If AppSync needs to be in the middle row, it cannot be the first element in its column — a spacer or another element must precede it. Future builds should plan column ordering carefully against the reference's row structure.

2. **Arrow waypoints get rerouted by the tool.** The create_from_d3 tool's arrow routing engine may discard or modify specified waypoints if it detects collisions or diagonal segments. When this happens, trying different waypoint strategies (right-then-up vs up-then-right) can yield different results. Some arrows may need acceptance of suboptimal routing.

3. **Spacer opacity requires post-build update.** Setting `style.opacity: 0` in D3 may not be applied by the builder. Use `update_element` after the build to set opacity on spacer elements.

4. **Arrow targets must be containers, not contents, for border-stopping arrows.** When an arrow should end at a container border (like Arrow 5 → SFN), the target must be the container ID, not an element inside it.

## Files Modified

| File | Changes |
|------|---------|
| `diagrams/v3/plan.md` | Created — full diagram plan with element inventory and arrow table |
| `diagrams/v3/diagram.d3` | Created and iterated — D3 source with 4-column layout, 9 arrows, spacer |
| `diagrams/v3/data_transfer_hub.excalidraw` | Exported — final 82-element scene |
| `diagrams/v3/data_transfer_hub.png` | Export attempted — failed (canvas not rendering) |
| `diagrams/v3/build_log.md` | This file |
