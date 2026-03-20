# Data Transfer Hub — v14 Plan

## Container Hierarchy

1. **AWS Cloud** — outermost container, light gray border, AWS logo top-left. Contains everything except User.
2. **Customer's AWS Account** — inside AWS Cloud, left side (~65% width), dark border, cloud icon top-left.
3. **AWS Managed Account** — inside AWS Cloud, right side (~35% width), dark border, cloud icon top-left.
4. **Authentication** — inside Customer's AWS Account, top-left area, **dashed border**, no special color. Contains Amazon Cognito and OpenID Connect.
5. **AWS Step Functions workflow** — inside Customer's AWS Account, center-right area, **pink/magenta border** (`#E7157B`). Contains AWS Lambda and AWS CloudFormation (stacked vertically).

## Service Nodes

### Inside Authentication (dashed, inside Customer's AWS Account)
| Label | Icon notes |
|-------|-----------|
| Amazon Cognito | Red/pink architecture icon |
| OpenID Connect | Custom icon (gray/dark circular arrows icon) — use `icon: "custom/icons8-openid.svg"` |

### Inside AWS Step Functions workflow (pink border, inside Customer's AWS Account)
| Label | Icon notes |
|-------|-----------|
| AWS Lambda | Orange architecture icon — this is a DIFFERENT Lambda than the standalone one |
| AWS CloudFormation | Orange architecture icon, stacked below Lambda |

### Inside Customer's AWS Account (not in any sub-container)
| Label | Icon notes |
|-------|-----------|
| Amazon DynamoDB | Orange architecture icon, top area, right of Authentication |
| AWS AppSync | Pink/magenta architecture icon, middle-left area |
| AWS Lambda | Orange architecture icon, middle area between AppSync and Step Functions — DIFFERENT from the Lambda inside Step Functions |
| Amazon CloudFront | Purple architecture icon, bottom-left area |
| Amazon S3 | Green bucket icon (resource icon, olive/dark-green), bottom-center area |
| AWS Fargate | Orange architecture icon, bottom-right area |
| Data Transfer Hub UI | Monitor/computer icon, left side, vertically between AppSync row and bottom row. Use `icon_hint: "client"` or similar for the monitor/desktop icon |

### Inside AWS Managed Account
| Label | Icon notes |
|-------|-----------|
| S3 replication component template | Orange icon — use `icon_hint: "CloudFormation"`, top-left of the grid |
| DynamoDB replication component template | Orange icon — use `icon_hint: "CloudFormation"`, top-right of the grid |
| Amazon S3 | Green bucket icon (resource icon, olive/dark-green), center-left |
| ECR replication component template | Orange icon — use `icon_hint: "CloudFormation"`, center-right |
| Amazon ECR | Orange architecture icon, bottom-left |
| ECR replication Docker image | Orange/pink icon — use `icon_hint: "elastic container registry"`, bottom-right |

### Outside AWS Cloud
| Label | Icon notes |
|-------|-----------|
| User | Person/user icon, bottom-left corner, outside AWS Cloud entirely. Use `icon_type: resource`, `icon_variant: Light` |

## Numbered Arrow Table

| # | Source | Target | Direction | Notes |
|---|--------|--------|-----------|-------|
| 1 | Amazon CloudFront | Amazon S3 | → (left to right) | Both inside Customer's Account, bottom row. Badge between them. |
| 2 | (entry from left) | AWS AppSync | → (left to right) | Arrow enters from the left side of Customer's Account border and goes to AppSync. The source is the Data Transfer Hub UI. So: Data Transfer Hub UI → AWS AppSync. |
| 3 | Data Transfer Hub UI | Amazon CloudFront | ↓ then → (L-shape down then right) | Arrow goes down from DTH UI then right to CloudFront. Badge on the vertical segment. |
| 4 | AWS AppSync | AWS Lambda (standalone, middle) | → (left to right) | Both in Customer's Account, same horizontal row. |
| 5 | AWS Lambda (standalone, middle) | AWS Step Functions workflow (border) | → (left to right) | Arrow ends at the Step Functions container border (left side). |
| 6 | Amazon S3 (Managed Account) | AWS CloudFormation (inside Step Functions) | ← (right to left) | Arrow crosses from Managed Account into Customer's Account, reaching CloudFormation inside Step Functions. The arrow goes left. Badge is between the two accounts. |
| 7 | Amazon ECR (Managed Account) | AWS Fargate (Customer's Account) | ← (right to left) | Arrow crosses from Managed Account into Customer's Account bottom row. Badge is between the two accounts. |
| 8 | Amazon Cognito | Amazon DynamoDB | → (left to right) | Arrow goes from Authentication area rightward to DynamoDB. Badge between them. |

## Unlabeled Arrows

| Source | Target | Direction | Notes |
|--------|--------|-----------|-------|
| (external, left edge of AWS Cloud) | Amazon Cognito | → | Arrow enters from outside the AWS Cloud left border into Cognito inside Authentication. Small arrow from outside. |
| CloudFront → S3 already covered | — | — | — |
| AWS Step Functions workflow (CloudFormation) | AWS Fargate | ↓ (down) | Arrow goes down from CloudFormation (inside Step Functions) to Fargate in the bottom row. Vertical arrow. |

## Standalone Elements

None — all elements have at least one connection.

## External Actors

| Actor | Position |
|-------|----------|
| User | Outside AWS Cloud entirely, bottom-left. Below and left of the AWS Cloud container. Aligned vertically with Data Transfer Hub UI. |

Note: User appears to have an **unlabeled arrow** going up to Data Transfer Hub UI (which is inside Customer's AWS Account). Looking more carefully at the reference: the User icon is outside AWS Cloud, and the arrow with badge **3** connects from User area upward. Let me re-examine...

**Correction on arrows 2 and 3:**
- Badge **3**: The arrow with badge 3 goes from **User** (outside) up to **Data Transfer Hub UI** (inside Customer's Account). The arrow enters the AWS Cloud and Customer's Account borders.
- Badge **2**: The arrow with badge 2 enters from the left into **AWS AppSync**. The source appears to be Data Transfer Hub UI — the arrow goes right from DTH UI to AppSync.

So the flow is: User →(3)→ Data Transfer Hub UI →(2)→ AWS AppSync →(4)→ Lambda →(5)→ Step Functions

**Revised Numbered Arrow Table:**

| # | Source | Target | Direction | Notes |
|---|--------|--------|-----------|-------|
| 1 | Amazon CloudFront | Amazon S3 (Customer's) | → | Bottom row, left to right |
| 2 | Data Transfer Hub UI | AWS AppSync | → | Horizontal, left to right, middle row |
| 3 | User | Data Transfer Hub UI | ↑ | Vertical, User is outside AWS Cloud, DTH UI is inside Customer's Account. Arrow crosses AWS Cloud border and Customer's Account border. |
| 4 | AWS AppSync | AWS Lambda (standalone) | → | Horizontal, middle row |
| 5 | AWS Lambda (standalone) | AWS Step Functions workflow (border) | → | Arrow ends at Step Functions container left border |
| 6 | Amazon S3 (Managed) | AWS CloudFormation (Step Functions) | ← | Crosses from Managed Account leftward into Customer's Account / Step Functions |
| 7 | Amazon ECR (Managed) | AWS Fargate (Customer's) | ← | Crosses from Managed Account leftward into Customer's Account bottom row |
| 8 | Amazon Cognito | Amazon DynamoDB | → | From Authentication area to DynamoDB, top row |

## Unlabeled Arrows

| Source | Target | Direction | Notes |
|--------|--------|-----------|-------|
| (outside AWS Cloud, left edge) | Amazon Cognito | → | Small arrow entering from outside the diagram's left boundary into Cognito |
| Data Transfer Hub UI | Amazon CloudFront | ↓ then → (L-shape) | DTH UI down to CloudFront row, then right to CloudFront. No badge number visible. |
| AWS CloudFormation (Step Functions) | AWS Fargate | ↓ | Vertical arrow from CloudFormation down to Fargate |

**Wait — re-examining the reference more carefully:**

Looking again at the bottom-left area: Data Transfer Hub UI has an arrow going down and right to CloudFront. And badge 3 is on the arrow from User up to DTH UI. And there's a separate arrow from DTH UI right to AppSync with badge 2. And another arrow from DTH UI down to CloudFront — this one appears **unlabeled** (no badge).

Actually, looking more carefully at the reference image: the DTH UI arrow to CloudFront appears to have badge **1** or be unlabeled. Let me look again... The badge **1** is between CloudFront and S3. The arrow from DTH UI to CloudFront has no badge.

## Final Unlabeled Arrows

| Source | Target | Direction | Notes |
|--------|--------|-----------|-------|
| (outside left edge) | Amazon Cognito | → | Enters from outside AWS Cloud into Authentication/Cognito |
| Data Transfer Hub UI | Amazon CloudFront | ↓→ (L-shape) | Down from DTH UI then right to CloudFront, no badge |
| AWS CloudFormation (inside Step Functions) | AWS Fargate | ↓ | Vertical arrow down from Step Functions area to Fargate |

## Icon Notes

| Element | Icon type | Notes |
|---------|-----------|-------|
| Amazon Cognito | architecture | Red/pink icon |
| OpenID Connect | custom | Use `icon: "custom/icons8-openid.svg"` — gray circular icon |
| Amazon DynamoDB | architecture | Orange/yellow icon |
| AWS AppSync | architecture | Pink/magenta icon |
| AWS Lambda (standalone) | architecture | Orange icon |
| AWS Lambda (inside Step Functions) | architecture | Orange icon, same as above but different instance |
| AWS CloudFormation | architecture | Orange icon (cloud with checklist) |
| Amazon CloudFront | architecture | Purple icon |
| Amazon S3 (Customer's) | resource | Green/olive bucket icon — use `icon_type: resource` |
| Amazon S3 (Managed) | resource | Green/olive bucket icon — use `icon_type: resource` |
| AWS Fargate | architecture | Orange icon |
| Data Transfer Hub UI | custom | Monitor/desktop icon — use `icon_hint: "client"` |
| User | resource | Person silhouette — use `icon_type: resource`, `icon_variant: Light` |
| S3 replication component template | architecture | Orange icon — use `icon_hint: "CloudFormation"` |
| DynamoDB replication component template | architecture | Orange icon — use `icon_hint: "CloudFormation"` |
| ECR replication component template | architecture | Orange icon — use `icon_hint: "CloudFormation"` |
| Amazon ECR | architecture | Orange icon |
| ECR replication Docker image | architecture | Orange/pink icon — use `icon_hint: "elastic container registry"` |

## Layout Intent

- **AWS Cloud**: Single outer container, contains two side-by-side account containers.
- **Customer's AWS Account** (~65% width, left): Free-form layout with elements arranged in roughly 3 rows:
  - Top row: Authentication sub-container (left), DynamoDB (right), Step Functions container (right)
  - Middle row: AppSync (left), Lambda standalone (center), Step Functions container continues (right)
  - Bottom row: DTH UI (far left), CloudFront (center-left), S3 (center), Fargate (right)
- **Authentication**: Horizontal row layout — Cognito left, OpenID Connect right. `layout: row`
- **AWS Step Functions workflow**: Vertical column layout — Lambda top, CloudFormation bottom. `layout: col`
- **AWS Managed Account** (~35% width, right): 2-column by 3-row grid layout. `layout: "2x3"`
  - Row 1: S3 replication template, DynamoDB replication template
  - Row 2: Amazon S3, ECR replication template
  - Row 3: Amazon ECR, ECR replication Docker image
- **User**: Outside AWS Cloud, bottom-left, vertically aligned below DTH UI.
