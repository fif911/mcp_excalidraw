# Build Log — Data Transfer Hub Architecture (v1)

## Overview
Recreated the AWS Data Transfer Hub architecture diagram from reference image `refs/tg_image_203917181.png`.

## Structure
- **5 containers**: AWS Cloud, Customer's AWS Account, Authentication (dashed), AWS Step Functions workflow (pink border), AWS Managed Account
- **18 nodes**: Cognito, OpenID Connect, DynamoDB, 2x Lambda, CloudFormation, AppSync, CloudFront, 2x S3, Fargate, ECR, 3x CF templates (orange), ECR Docker image (orange), DTH UI, User
- **12 arrows**: 8 numbered (badges 1-8) + 4 unlabeled
- **Layout**: DTH UI sits inside AWS Cloud but outside both accounts; User is external below AWS Cloud

## Key Decisions
- Badge 3 = DTH UI → Cognito (authentication flow), not User → DTH UI
- Badge 8 = Cognito → DynamoDB (user pool data), arrow exits Authentication box right side
- DTH UI placed inside AWS Cloud but outside Customer's Account — arrows fan out as L-shapes sharing vertical segment at x=90
- OpenID Connect icon: used "iam identity center" (closest visual match for circular arrow icon)
- ECR Docker image: used "ecr" with icon_color: "Orange"

## Problems Encountered
1. First build: DTH UI and User icons matched architecture icons (colored) instead of resource icons (outline). Fixed by adding `icon_variant: "Light"`.
2. Cognito → DynamoDB arrow was diagonal. Fixed by adding waypoints for L-shape routing.

## Files Modified
- `diagram_building/v_1/diagram.d2` — D2 spec
- `diagram_building/v_1/reference.png` — copied from refs/
- `diagram_building/v_1/output.png` — exported diagram
