# Data Transfer Hub — v11 Plan

## Container Hierarchy

1. **AWS Cloud** — outermost container, dark border (`#232F3E`), AWS logo in header
   1. **Customer's AWS Account** — left side, large, dark border, cloud icon in header
      1. **Authentication** — dashed border, top-left area inside Customer's Account. Contains Amazon Cognito and OpenID Connect side by side.
      2. **AWS Step Functions workflow** — pink/red border (`#E7157B`), right side of Customer's Account, vertically oriented. Contains AWS Lambda (inside SF) and AWS CloudFormation.
   2. **AWS Managed Account** — right side, dark border, cloud icon in header. Contains 6 nodes in a 2x3 grid layout.

## Service Nodes

### Inside Customer's AWS Account > Authentication (dashed)
| Label | Icon Type | Notes |
|-------|-----------|-------|
| Amazon Cognito | architecture | Pink/red icon with checkmark |
| OpenID Connect | custom | Custom icon (`custom/icons8-openid.svg`), to the right of Cognito |

### Inside Customer's AWS Account > AWS Step Functions workflow
| Label | Icon Type | Notes |
|-------|-----------|-------|
| AWS Lambda | architecture | Orange Lambda icon — this is the Lambda INSIDE Step Functions |
| AWS CloudFormation | architecture | Orange CloudFormation icon, below Lambda |

### Inside Customer's AWS Account (direct children, not in sub-containers)
| Label | Icon Type | Notes |
|-------|-----------|-------|
| Amazon DynamoDB | architecture | Purple DynamoDB icon, top area, to the left of Step Functions |
| AWS AppSync | architecture | Pink AppSync icon, middle-left area |
| AWS Lambda | architecture | Orange Lambda icon — this is the Lambda OUTSIDE Step Functions, middle area, between AppSync and Step Functions |
| Amazon CloudFront | architecture | Purple CloudFront icon, bottom-left area |
| Amazon S3 | resource | Green/olive bucket icon, bottom area, to the right of CloudFront |
| AWS Fargate | architecture | Orange Fargate icon, bottom-right area |

### Inside Customer's AWS Account (but visually at the left edge, partially outside)
| Label | Icon Type | Notes |
|-------|-----------|-------|
| Data Transfer Hub UI | custom/resource | Computer/monitor icon, left edge, below Authentication area. Label is "Data Transfer\nHub UI" (two lines) |

### Inside AWS Managed Account (2x3 grid layout)
| Label | Icon Type | Notes |
|-------|-----------|-------|
| S3 replication component template | resource | Orange template icon, top-left of grid |
| DynamoDB replication component template | resource | Orange template icon, top-right of grid |
| Amazon S3 | resource | Green/olive bucket icon, middle-left of grid |
| ECR replication component template | resource | Orange template icon, middle-right of grid |
| Amazon ECR | architecture | Orange ECR icon, bottom-left of grid |
| ECR replication Docker image | architecture | Orange/pink Docker image icon, bottom-right of grid |

### Outside AWS Cloud (external actors)
| Label | Icon Type | Notes |
|-------|-----------|-------|
| User | resource, Light variant | Person/user outline icon, bottom-left, below and outside AWS Cloud |

## Numbered Arrow Table

| # | Source | Target | Direction | Notes |
|---|--------|--------|-----------|-------|
| 1 | Amazon CloudFront | Amazon S3 | → (left to right) | Both inside Customer's Account, same row at bottom |
| 2 | (from left edge / Auth area) → | AWS AppSync | → (left to right) | Arrow enters from the left toward AppSync. Starts from the left border of Customer's Account |
| 3 | Data Transfer Hub UI | Amazon CloudFront | → (right then down, or L-shape) | DTH UI is above-left of CloudFront. Arrow goes right from DTH UI into the Customer's Account toward CloudFront area |
| 4 | AWS AppSync | AWS Lambda (outside SF) | → (left to right) | Both in Customer's Account, same horizontal row |
| 5 | AWS Lambda (outside SF) | AWS Step Functions workflow (container border) | → (left to right) | Arrow goes from Lambda to the Step Functions container border |
| 6 | Amazon S3 (Managed Account) | AWS CloudFormation (inside SF, Customer's Account) | ← (right to left) | Cross-container arrow. Goes from Managed Account's S3 leftward to CloudFormation inside Step Functions. Arrow points left (toward CloudFormation). |
| 7 | Amazon ECR (Managed Account) | AWS Fargate (Customer's Account) | ← (right to left) | Cross-container arrow. Goes from ECR area leftward to Fargate. Arrow points left (toward Fargate). |
| 8 | AWS Lambda (outside SF) | Amazon DynamoDB | → going up | Arrow goes from Lambda upward to DynamoDB. Vertical arrow. |

### Arrow detail corrections from reference:

Looking more carefully at the reference:

- **Arrow 1**: Data Transfer Hub UI → Amazon CloudFront (badge 1 is near CloudFront). The arrow from DTH UI goes right to CloudFront. Then a separate unlabeled arrow goes from CloudFront → Amazon S3.
- **Arrow 2**: Comes from the left edge into AWS AppSync. The arrow originates from the left border area (near Authentication) going right to AppSync.
- **Arrow 3**: Data Transfer Hub UI has badge 3. The arrow goes from DTH UI upward to the left border of Customer's Account (connecting to the incoming arrow at Auth level).
- **Arrow 8**: Goes from somewhere near Lambda (outside SF) upward to Amazon DynamoDB.

Let me re-examine the arrows more carefully:

**Revised Numbered Arrow Table:**

| # | Source | Target | Direction | Badge Position |
|---|--------|--------|-----------|----------------|
| 1 | Data Transfer Hub UI | Amazon CloudFront | → right | Badge on the horizontal segment near CloudFront |
| 2 | (left edge of Customer's Account) | AWS AppSync | → right | Badge to the left of AppSync |
| 3 | Data Transfer Hub UI | (upward to left border, connecting to arrow 2's path) | ↑ up | Badge near DTH UI, on the vertical segment |
| 4 | AWS AppSync | AWS Lambda (outside SF) | → right | Badge between AppSync and Lambda |
| 5 | AWS Lambda (outside SF) | AWS Step Functions workflow border | → right | Badge to the right of Lambda (outside SF) |
| 6 | Amazon S3 (Managed Account) | AWS CloudFormation (Step Functions) | ← left | Badge between the two accounts, cross-container |
| 7 | Amazon ECR (Managed Account) | AWS Fargate (Customer's Account) | ← left | Badge between the two accounts, cross-container |
| 8 | AWS Lambda (outside SF) | Amazon DynamoDB | ↑ up | Badge near DynamoDB on the vertical segment |

## Unlabeled Arrows

| Source | Target | Direction | Notes |
|--------|--------|-----------|-------|
| Amazon CloudFront | Amazon S3 (Customer's Account) | → right | Bottom row, CloudFront to S3 bucket |
| Amazon Cognito | (left arrow entering from outside) | ← left | Small arrow entering Cognito from the left (from outside AWS Cloud) |
| AWS CloudFormation (inside SF) | AWS Fargate | ↓ down | Arrow goes from CloudFormation down to Fargate |

## Standalone Elements

| Label | Container | Notes |
|-------|-----------|-------|
| OpenID Connect | Authentication | No arrows connect to/from it |
| S3 replication component template | AWS Managed Account | No arrows — template icon |
| DynamoDB replication component template | AWS Managed Account | No arrows — template icon |
| ECR replication component template | AWS Managed Account | No arrows — template icon |
| ECR replication Docker image | AWS Managed Account | No arrows — template icon |

## External Actor Positions

| Actor | Position | Notes |
|-------|----------|-------|
| User | Outside AWS Cloud, bottom-left | Below Data Transfer Hub UI, no arrow connects User to anything — User is standalone |

## Icon Notes

| Element | Icon Details |
|---------|-------------|
| Amazon Cognito | Architecture icon, pink/red with checkmark shield |
| OpenID Connect | Custom icon — `custom/icons8-openid.svg` |
| Amazon DynamoDB | Architecture icon, purple |
| AWS AppSync | Architecture icon, pink/magenta |
| AWS Lambda (outside SF) | Architecture icon, orange |
| AWS Lambda (inside SF) | Architecture icon, orange — same icon, different instance |
| AWS CloudFormation | Architecture icon, orange/pink |
| Amazon CloudFront | Architecture icon, purple |
| Amazon S3 (Customer) | Resource icon, green/olive bucket |
| AWS Fargate | Architecture icon, orange |
| Data Transfer Hub UI | Resource icon with `icon_hint: "client"` or custom computer icon. Light variant. |
| S3 replication component template | Resource icon with `icon_hint: "CloudFormation template"`, orange variant |
| DynamoDB replication component template | Resource icon with `icon_hint: "CloudFormation template"`, orange variant |
| ECR replication component template | Resource icon with `icon_hint: "CloudFormation template"`, orange variant |
| Amazon S3 (Managed) | Resource icon, green/olive bucket |
| Amazon ECR | Architecture icon, orange |
| ECR replication Docker image | Architecture icon with `icon_hint: "ECR image"` |
| User | Resource icon, Light variant (outline person) |

## Layout Intent

- **AWS Cloud**: Contains two side-by-side account containers
- **Customer's AWS Account**: Large left container. Rough layout:
  - Top-left: Authentication (dashed) with Cognito and OpenID side by side (row layout)
  - Top-center/right: DynamoDB next to Step Functions workflow
  - Middle row: AppSync → Lambda (outside SF) → Step Functions (right side)
  - Bottom row: Data Transfer Hub UI (far left) → CloudFront → S3 ... Fargate (right)
  - Step Functions workflow is a tall container on the right side, spanning from top to middle area
- **AWS Managed Account**: Right container, 2x3 grid:
  - Row 1: S3 replication template | DynamoDB replication template
  - Row 2: Amazon S3 | ECR replication template
  - Row 3: Amazon ECR | ECR replication Docker image
- **User**: Below AWS Cloud, aligned with Data Transfer Hub UI
- **Data Transfer Hub UI**: At the left edge of Customer's Account, vertically between Authentication and CloudFront

## Flow Summary

The data flow follows this path:
1. User interacts with Data Transfer Hub UI (badge 3)
2. DTH UI connects to CloudFront (badge 1), which serves static content from S3
3. DTH UI also connects upward to the auth/API path (badge 2) reaching AppSync
4. AppSync calls Lambda (badge 4)
5. Lambda triggers Step Functions workflow (badge 5)
6. S3 from Managed Account feeds CloudFormation templates (badge 6)
7. ECR from Managed Account provides container images to Fargate (badge 7)
8. Lambda writes to DynamoDB (badge 8)
9. CloudFormation deploys to Fargate (unlabeled downward arrow)
