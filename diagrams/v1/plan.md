# Data Transfer Hub — v1 Plan

## 1. Containers

### AWS Cloud (outermost)
- Approximate: x~30, y~20, w~1420, h~820
- Border: solid dark (#232F3E)
- Header icon: AWS Cloud logo (auto-detected from label)

### Customer's AWS Account
- Approximate: x~60, y~100, w~870, h~720
- Border: solid dark (#232F3E)
- Header icon: AWS Cloud icon (auto-detected from "Account" in label)
- Note: left edge must be ~200px from AWS Cloud left edge to leave room for DTH UI and User actors between the AWS Cloud left border and this container's left border

### Authentication (sub-container inside Customer's AWS Account)
- Approximate: x~90, y~220, w~340, h~200
- Border: dashed, text-only header (no icon)
- Layout: row (2 icons side by side: Cognito + OpenID Connect)

### AWS Step Functions workflow (sub-container inside Customer's AWS Account)
- Approximate: x~640, y~200, w~270, h~380
- Border: solid colored (#E7157B pink)
- Header icon: Step Functions icon (auto-detected from label)
- Layout: col (2 icons stacked: Lambda on top, CloudFormation on bottom)

### AWS Managed Account
- Approximate: x~970, y~100, w~460, h~720
- Border: solid dark (#232F3E)
- Header icon: AWS Cloud icon (auto-detected from "Account" in label)
- Layout: 2x3 grid (6 items arranged in 2 columns, 3 rows)

## 2. Service Nodes

### Inside Authentication container (row layout, auto-placed)
- Amazon Cognito (architecture, red/pink #DD344C)
- OpenID Connect (custom icon: "custom/icons8-openid.svg")

### Inside Customer's AWS Account, top row (free-placed)
- Amazon DynamoDB: cx~560, cy~260 (architecture, purple #C925D1)

### Inside Customer's AWS Account, middle row (free-placed, same Y ~430)
- AWS AppSync: cx~340, cy~430 (architecture, pink #E7157B)
- AWS Lambda: cx~500, cy~430 (architecture, orange #ED7100) — this is the middle-row Lambda, NOT the one inside SFN

### Inside AWS Step Functions workflow container (col layout, auto-placed)
- AWS Lambda (architecture, orange) — inside SFN, top position
- AWS CloudFormation (architecture, pink #E7157B) — inside SFN, bottom position

### Inside Customer's AWS Account, bottom row (free-placed, same Y ~680)
- Amazon CloudFront: cx~340, cy~680 (architecture, purple #8C4FFF)
- Amazon S3: cx~520, cy~680 (architecture, green #7AA116)
- AWS Fargate: cx~720, cy~680 (architecture, orange #ED7100)

### Inside AWS Managed Account (2x3 grid layout, auto-placed)
Row 1:
- S3 replication\ncomponent template (custom icon, orange CloudFormation Template — use icon_hint: "CloudFormation Template Orange")
- DynamoDB replication\ncomponent template (custom icon, orange CloudFormation Template — use icon_hint: "CloudFormation Template Orange")

Row 2:
- Amazon S3 (architecture, green #7AA116)
- ECR replication\ncomponent template (custom icon, orange CloudFormation Template — use icon_hint: "CloudFormation Template Orange")

Row 3:
- Amazon ECR (architecture, orange #ED7100)
- ECR replication\nDocker image (resource icon — use icon_hint: "Elastic Container Registry Image")

### Inside AWS Cloud but OUTSIDE both account containers (external actors at AWS Cloud level)
- Data Transfer\nHub UI: cx~120, cy~560 (resource icon, Client, Light variant — computer/desktop icon. Use icon_type: resource, icon_hint: "Client")

### OUTSIDE AWS Cloud entirely (external actors at root level)
- User: cx~120, cy~760 (resource icon, User, Light variant — person silhouette. Use icon_type: resource, icon_variant: Light)

## 3. Arrow Connection Table

| # | Source | Target | Badge # | Badge style |
|---|--------|--------|---------|-------------|
| 1 | Data Transfer Hub UI | Amazon CloudFront | 1 | dark circle |
| 2 | Data Transfer Hub UI | AWS AppSync | 2 | dark circle |
| 3 | User | Data Transfer Hub UI | 3 | dark circle |
| 4 | AWS AppSync | AWS Lambda (middle row) | 4 | dark circle |
| 5 | AWS Lambda (middle row) | SFN border (left) | 5 | dark circle |
| 6 | Amazon S3 (managed account) | SFN border (right) | 6 | dark circle |
| 7 | Amazon ECR (managed account) | AWS Fargate | 7 | dark circle |
| 8 | Authentication border (right) | Amazon DynamoDB | 8 | dark circle |

**Arrow style:** dark circle badges (badge_bg: #232F3E, badge_shape: circle, stroke_color: #545B64, badge_color: #ffffff)

**Total: 8 numbered + 3 unlabeled = 11 arrows**

### Arrow routing notes
- Arrow 1: DTH UI goes right, then turns down to CloudFront — L-shape
- Arrow 2: DTH UI goes right then up to AppSync — L-shape
- Arrow 3: User goes up to DTH UI — vertical
- Arrow 4: AppSync goes right to Lambda (middle row) — horizontal
- Arrow 5: Lambda (middle row) goes right to SFN left border — horizontal
- Arrow 6: S3 (managed) goes left to SFN right border (enters CloudFormation area) — horizontal, crossing container gap
- Arrow 7: ECR (managed) goes left to Fargate — horizontal, crossing container gap
- Arrow 8: Auth right border goes right to DynamoDB — horizontal

## 4. Unlabeled Arrows

| Source | Target |
|--------|--------|
| Customer's AWS Account border (left) | Authentication border (left) |
| AWS CloudFormation (inside SFN) | AWS Fargate |
| Amazon CloudFront | Amazon S3 (customer) |

Notes:
- The external identity flow arrow enters from the left into the Authentication container. Since D2 requires real endpoints, model this as an arrow from Customer's AWS Account border (left) to Authentication border (left). Main should use a leftward-extending waypoint to suggest the external origin.


- CloudFormation -> Fargate: vertical arrow going down from CloudFormation (inside SFN) to Fargate (bottom row). The arrow exits SFN bottom border and goes down to Fargate.

## 5. Standalone Elements (no connections)

Inside AWS Managed Account (grid elements with no arrows):
- S3 replication component template
- DynamoDB replication component template
- ECR replication component template
- ECR replication Docker image

These 4 template/image icons in the managed account have no arrows connecting to them. Only Amazon S3 (managed) and Amazon ECR (managed) have arrows.

Also standalone:
- OpenID Connect (inside Authentication — no arrows connect directly to it)

## 6. External Actors — Nesting Levels

| Actor | Nesting Level | Position |
|-------|--------------|----------|
| User | OUTSIDE AWS Cloud (root level) | Bottom-left, below DTH UI, cx~120, cy~760 |
| Data Transfer Hub UI | INSIDE AWS Cloud, OUTSIDE both account containers | Left side, between AWS Cloud border and Customer Account border, cx~120, cy~560 |

**Verification of nesting:**
- User: The person icon is clearly BELOW and OUTSIDE the AWS Cloud container border. Root level.
- Data Transfer Hub UI: The computer icon is INSIDE the AWS Cloud border but to the LEFT of the Customer's AWS Account container. It sits in the gap between the AWS Cloud left border and the Customer's Account left border.

**Space requirement:** The gap between AWS Cloud left border and Customer's Account left border must be at least 200px to fit DTH UI (160px icon width + padding).

## 7. Icon Variants

| Element | Icon Type | Variant/Color | Notes |
|---------|-----------|---------------|-------|
| Amazon Cognito | architecture | default (red) | Standard arch icon |
| OpenID Connect | custom | — | Use icon: "custom/icons8-openid.svg" |
| Amazon DynamoDB | architecture | default (purple) | Standard arch icon |
| AWS AppSync | architecture | default (pink) | Standard arch icon |
| AWS Lambda (middle row) | architecture | default (orange) | Standard arch icon |
| AWS Lambda (inside SFN) | architecture | default (orange) | Same label "AWS Lambda" |
| AWS CloudFormation (inside SFN) | architecture | default (pink) | Standard arch icon |
| Amazon CloudFront | architecture | default (purple) | Standard arch icon |
| Amazon S3 (customer) | architecture | default (green) | Standard arch icon |
| AWS Fargate | architecture | default (orange) | Standard arch icon |
| S3 replication component template | custom | Orange | icon_hint: "CloudFormation Template Orange" |
| DynamoDB replication component template | custom | Orange | icon_hint: "CloudFormation Template Orange" |
| ECR replication component template | custom | Orange | icon_hint: "CloudFormation Template Orange" |
| Amazon S3 (managed) | architecture | default (green) | Same label "Amazon S3" |
| Amazon ECR | architecture | default (orange) | Standard arch icon |
| ECR replication Docker image | resource | default (orange) | icon_hint: "Elastic Container Registry Image" |
| Data Transfer Hub UI | resource | Light | icon_hint: "Client", icon_type: resource, icon_variant: Light |
| User | resource | Light | icon_type: resource, icon_variant: Light |

## 8. Verification Checklist

### All leaf nodes accounted for:
1. Amazon Cognito — in arrow 8 (via Auth border)
2. OpenID Connect — standalone (no arrows)
3. Amazon DynamoDB — in arrow 8
4. AWS AppSync — in arrows 2, 4
5. AWS Lambda (middle) — in arrows 4, 5
6. AWS Lambda (SFN) — standalone inside SFN (arrows 5 and 6 target SFN border, not this icon directly)
7. AWS CloudFormation (SFN) — in unlabeled arrow to Fargate
8. Amazon CloudFront — in arrow 1
9. Amazon S3 (customer) — in unlabeled arrow (from CloudFront)
10. AWS Fargate — in arrows 7, unlabeled (from CloudFormation)
11. S3 replication component template — standalone
12. DynamoDB replication component template — standalone
13. ECR replication component template — standalone
14. Amazon S3 (managed) — in arrow 6
15. Amazon ECR — in arrow 7
16. ECR replication Docker image — standalone
17. Data Transfer Hub UI — in arrows 1, 2, 3
18. User — in arrow 3

**All 18 leaf nodes are accounted for. No gaps.**

## 9. Label Splitting (wide labels needing \n)

- "Data Transfer\nHub UI" (3 words too wide)
- "S3 replication\ncomponent template" (too wide for single line)
- "DynamoDB replication\ncomponent template" (too wide for single line)
- "ECR replication\ncomponent template" (too wide for single line)
- "ECR replication\nDocker image" (too wide for single line)
- "AWS Step Functions\nworkflow" (header text, may need split)
- "OpenID\nConnect" (moderate width, split for consistency)
