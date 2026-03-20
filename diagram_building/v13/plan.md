# AWS Data Transfer Hub — v13 Plan

## Container Hierarchy

1. **AWS Cloud** (outermost)
   - Light gray border (`#232F3E`), solid
   - Header: "AWS Cloud" with AWS logo icon (top-left)
   - Contains everything except the User icon

2. **Customer's AWS Account** (inside AWS Cloud, left ~65% of width)
   - Solid dark border (`#232F3E`)
   - Header: "Customer's AWS Account" with cloud icon (top-left)
   - Contains: Authentication sub-container, all middle-row services, bottom-row services, Data Transfer Hub UI, Step Functions workflow container

3. **Authentication** (inside Customer's AWS Account, top-left area)
   - **Dashed** border (gray/dark)
   - Header: "Authentication" (no icon in header)
   - Contains: Amazon Cognito, OpenID Connect
   - Layout: horizontal row (2 items side by side)

4. **AWS Step Functions workflow** (inside Customer's AWS Account, center-right area)
   - Solid **pink/red** border (`#E7157B`)
   - Header: "AWS Step Functions workflow" with Step Functions icon (top-left of container)
   - Contains: AWS Lambda (top), AWS CloudFormation (bottom)
   - Layout: single column (1x2)

5. **AWS Managed Account** (inside AWS Cloud, right side, separate from Customer's Account)
   - Solid dark border (`#232F3E`)
   - Header: "AWS Managed Account" with cloud icon (top-left)
   - Contains: 6 service nodes
   - Layout: 2x3 grid

## Service Nodes

### Inside Authentication container
| Label | Icon | Icon Notes |
|-------|------|------------|
| Amazon Cognito | Red/pink square icon | Architecture icon, default |
| OpenID Connect | Gray circular arrow icon | Custom icon — `custom/icons8-openid.svg` |

### Inside Customer's AWS Account (outside Authentication, outside Step Functions)
| Label | Icon | Icon Notes |
|-------|------|------------|
| Amazon DynamoDB | Orange/yellow icon | Architecture icon, top center area |
| AWS AppSync | Pink/magenta icon | Architecture icon, middle row |
| AWS Lambda | Orange icon (lambda symbol) | Architecture icon, middle row, between AppSync and Step Functions |
| Amazon CloudFront | Purple icon | Architecture icon, bottom-left area |
| Amazon S3 | Green bucket icon (olive/dark green) | Architecture icon, bottom center |
| AWS Fargate | Orange icon | Architecture icon, bottom-right area |
| Data Transfer Hub UI | Computer/monitor icon | Resource icon — use `icon_hint: "client"` or similar. This is a computer/desktop icon. Positioned left side, between middle row and bottom row |

### Inside AWS Step Functions workflow container
| Label | Icon | Icon Notes |
|-------|------|------------|
| AWS Lambda | Orange icon (lambda symbol) | Architecture icon, top position |
| AWS CloudFormation | Orange icon (template/document) | Architecture icon, bottom position |

### Inside AWS Managed Account (2x3 grid)
| Label | Position in Grid | Icon | Icon Notes |
|-------|-----------------|------|------------|
| S3 replication component template | Top-left (row 1, col 1) | Orange icon | Resource icon — `icon_hint: "CloudFormation Template Orange"` or similar template icon |
| DynamoDB replication component template | Top-right (row 1, col 2) | Orange icon | Resource icon — `icon_hint: "CloudFormation Template Orange"` or similar template icon |
| Amazon S3 | Middle-left (row 2, col 1) | Green bucket icon (olive/dark green) | Architecture icon |
| ECR replication component template | Middle-right (row 2, col 2) | Orange icon | Resource icon — `icon_hint: "CloudFormation Template Orange"` or similar template icon |
| Amazon ECR | Bottom-left (row 3, col 1) | Orange icon | Architecture icon |
| ECR replication Docker image | Bottom-right (row 3, col 2) | Orange icon | Resource icon — `icon_hint: "elastic container registry"` or Docker/image related |

## External Actors

| Label | Icon | Position |
|-------|------|----------|
| User | Person/silhouette icon (gray) | Bottom-left, **outside** AWS Cloud container entirely. Below and left of Data Transfer Hub UI |

## Numbered Arrow Table

| Badge # | Source | Target | Direction | Notes |
|---------|--------|--------|-----------|-------|
| 1 | Data Transfer Hub UI | Amazon CloudFront | → right | Arrow goes right from DTH UI to CloudFront. CloudFront then connects to Amazon S3 (unlabeled). Badge 1 is on the segment between DTH UI and CloudFront |
| 2 | (left edge of Customer's Account) | AWS AppSync | → right | Arrow enters from left into AppSync. Badge 2 is on the left side of this arrow segment |
| 3 | Data Transfer Hub UI | (downward) | ↓ down | Badge 3 is near DTH UI, arrow goes down from DTH UI. This connects DTH UI to the bottom row flow. The arrow goes down and then right toward CloudFront (this is the same flow as badge 1 — DTH UI goes down with badge 3, then right with badge 1) |
| 4 | AWS AppSync | AWS Lambda (middle row) | → right | Horizontal arrow from AppSync to Lambda in the middle row |
| 5 | AWS Lambda (middle row) | AWS Step Functions workflow (container border) | → right | Arrow enters the Step Functions container from the left. Badge 5 is between Lambda and the Step Functions border |
| 6 | AWS CloudFormation (inside Step Functions) | Amazon S3 (inside Managed Account) | → right (exits Step Functions, crosses to Managed Account) | Arrow goes from CloudFormation area rightward, exits Customer's Account, enters Managed Account, reaches Amazon S3. Badge 6 is between the two account containers |
| 7 | AWS CloudFormation (inside Step Functions) | Amazon ECR (inside Managed Account) | ↓ down then → right | Arrow goes down from CloudFormation, exits Step Functions, goes down to Fargate area, then right into Managed Account bottom area near Amazon ECR. Badge 7 is between the two accounts at the bottom |
| 8 | Authentication container (right border) | Amazon DynamoDB | → right | Arrow exits Authentication to the right and goes to DynamoDB. Badge 8 is on this segment |

## Unlabeled Arrows

| Source | Target | Direction | Notes |
|--------|--------|-----------|-------|
| (left edge of AWS Cloud) | Authentication container (left border) | → right | Small arrow entering from outside AWS Cloud into the Authentication container. Enters from the very left edge |
| Amazon CloudFront | Amazon S3 (Customer's Account) | → right | Horizontal arrow, bottom row, continuation of the flow from badge 1 |
| AWS CloudFormation (inside Step Functions) | AWS Fargate | ↓ down | Vertical arrow going down from CloudFormation, exiting Step Functions container, down to Fargate in the bottom row |
| AWS CloudFormation (inside Step Functions) | Amazon S3 (Managed Account) | → right | This is the same as badge 6 arrow — the arrow from CloudFormation exits rightward to Managed Account's S3. Actually, looking more carefully: the arrow from CloudFormation goes LEFT to the border area, then there's a separate arrow from the Managed Account side. Let me re-examine... |
| Amazon S3 (Managed Account) | AWS CloudFormation (Step Functions) | ← left | Arrow pointing LEFT from Managed Account's S3 toward CloudFormation/Step Functions area. This has badge 6 on it |
| Amazon ECR (Managed Account) | AWS Fargate | ← left | Arrow pointing LEFT from the ECR/bottom area of Managed Account toward Fargate. This has badge 7 on it |

**Correction on arrows 6 and 7 after closer inspection:**

Looking at the reference more carefully:
- Badge 6: Arrow goes from **right to left** — from Managed Account area (near Amazon S3) leftward toward CloudFormation/Step Functions. The arrowhead points LEFT.
- Badge 7: Arrow goes from **right to left** — from Managed Account area (near Amazon ECR) leftward/upward toward Fargate area. The arrowhead points LEFT.

**Revised Numbered Arrow Table (corrections for 6 and 7):**

| Badge # | Source | Target | Direction | Notes |
|---------|--------|--------|-----------|-------|
| 6 | Amazon S3 (Managed Account) | AWS CloudFormation (Step Functions container) | ← left | Arrow from Managed Account's S3 going left, entering Customer's Account, reaching CloudFormation. Badge between the two accounts |
| 7 | Amazon ECR (Managed Account) | AWS Fargate (Customer's Account) | ← left | Arrow from Managed Account's ECR area going left to Fargate. Badge between the two accounts at bottom level |

**Revised Unlabeled Arrows:**

| Source | Target | Direction | Notes |
|--------|--------|-----------|-------|
| (outside AWS Cloud, left edge) | Authentication container | → right | Enters from left |
| Amazon CloudFront | Amazon S3 (Customer's Account) | → right | Bottom row, horizontal |
| AWS CloudFormation (Step Functions) | AWS Fargate | ↓ down | Vertical, exits Step Functions downward to Fargate |

## Re-examination of arrow 3 and Data Transfer Hub UI connections

Looking at the reference more carefully:
- **Badge 3** is positioned to the left of the Data Transfer Hub UI, with the DTH UI below it. The arrow with badge 3 goes **downward** from the area near badge 2's horizontal line, down to DTH UI. So badge 3 marks the vertical segment connecting the middle-row horizontal flow down to the DTH UI.
- Then from DTH UI, an arrow goes right with **badge 1** to CloudFront.
- From DTH UI, the arrow goes right horizontally with badge 2 extending to AppSync.

**Revised interpretation of flow:**
- There is a vertical line on the left side. At the top, it connects to the horizontal arrow going right to AppSync (badge 2). At the bottom, it connects to DTH UI.
- Badge 3 is on the vertical segment of this line, between the horizontal badge-2 line and the DTH UI.
- From DTH UI, a separate horizontal arrow goes right to CloudFront (badge 1).

So the connections from DTH UI area:
- Vertical line segment with badge 3: connects DTH UI upward to the horizontal line
- Horizontal line with badge 2: goes right from the vertical line to AppSync
- Horizontal line with badge 1: goes right from DTH UI to CloudFront

## Layout Intent

- **AWS Cloud**: Full-width outer container
- **Customer's AWS Account**: Takes up roughly left 65% of AWS Cloud interior, full height
- **AWS Managed Account**: Takes up right 30% of AWS Cloud interior, full height, positioned to the right of Customer's Account
- **Authentication**: Top-left inside Customer's Account, small dashed box, horizontal layout (Cognito left, OpenID right)
- **AWS Step Functions workflow**: Center-right inside Customer's Account, pink border, vertical layout (Lambda top, CloudFormation bottom). Vertically spans from the middle row to above the bottom row
- **Middle row** (inside Customer's Account): AppSync → Lambda → Step Functions border, horizontally aligned
- **Bottom row** (inside Customer's Account): CloudFront → S3 → Fargate, horizontally aligned
- **DynamoDB**: Top center of Customer's Account, to the right of Authentication, above middle row
- **DTH UI**: Left side of Customer's Account, between middle and bottom rows, vertically
- **Managed Account grid**: 2 columns x 3 rows — templates top, S3/ECR template middle, ECR/Docker bottom

## Icon Notes

| Service | Icon Type | Special Notes |
|---------|-----------|---------------|
| Amazon Cognito | architecture | Red/pink square |
| OpenID Connect | custom | Use `custom/icons8-openid.svg` — gray circular arrows icon |
| Amazon DynamoDB | architecture | Default |
| AWS AppSync | architecture | Pink/magenta |
| AWS Lambda (middle row) | architecture | Orange |
| AWS Lambda (Step Functions) | architecture | Orange — same icon, different instance |
| Amazon CloudFront | architecture | Purple |
| Amazon S3 (Customer's) | architecture | Green bucket |
| Amazon S3 (Managed) | architecture | Green bucket — same icon |
| AWS Fargate | architecture | Orange |
| AWS CloudFormation | architecture | Orange |
| Data Transfer Hub UI | resource | Computer/monitor icon — `icon_hint: "client"` |
| User | resource | Person silhouette — `icon_type: resource`, `icon_hint: "user"` or `icon_variant: Light` |
| S3 replication component template | resource | Orange template icon — `icon_hint: "CloudFormation template"` |
| DynamoDB replication component template | resource | Orange template icon — `icon_hint: "CloudFormation template"` |
| ECR replication component template | resource | Orange template icon — `icon_hint: "CloudFormation template"` |
| Amazon ECR | architecture | Orange |
| ECR replication Docker image | resource | Orange icon with image/landscape — `icon_hint: "elastic container registry image"` |
