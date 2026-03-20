# Data Transfer Hub — v17 Plan

## 1. Containers

### AWS Cloud (outermost)
- Approximate: x~30, y~20, w~1410, h~760
- Border: solid, dark (#232F3E)
- Header icon: AWS Cloud logo (auto-detected)

### Customer's AWS Account (inside AWS Cloud)
- Approximate: x~55, y~100, w~660, h~660
- Border: solid, dark (#232F3E)
- Header icon: AWS Cloud icon (auto-detected from "Account")

### Authentication (inside Customer's AWS Account)
- Approximate: x~80, y~175, w~310, h~175
- Border: dashed
- Layout: row (Cognito left, OpenID right)

### AWS Step Functions workflow (inside AWS Cloud, right of Customer's Account)
- Approximate: x~695, y~165, w~200, h~370
- Border: solid, pink/red (#E7157B)
- Header icon: Step Functions icon (auto-detected)
- Layout: col (Lambda top, CloudFormation bottom)

### AWS Managed Account (inside AWS Cloud, far right)
- Approximate: x~990, y~100, w~430, h~660
- Border: solid, dark (#232F3E)
- Header icon: AWS Cloud icon (auto-detected from "Account")
- Layout: 2x3

## 2. Service Nodes

### Outside AWS Cloud
- User: cx~110, cy~750 (person/user icon, architecture)
  - Outside all containers, bottom-left corner

### Inside AWS Cloud, outside all sub-containers
- Data Transfer Hub UI: cx~110, cy~610 (computer/client icon)
  - Inside AWS Cloud, outside Customer's Account, bottom-left
  - icon_hint: "client" or similar — shows a desktop monitor icon
- Amazon CloudFront: cx~395, cy~650 (architecture, purple)
  - Inside Customer's Account, bottom area
- Amazon S3: cx~590, cy~650 (resource icon — shows as green bucket)
  - Inside Customer's Account, bottom area, right of CloudFront
- Amazon DynamoDB: cx~580, cy~220 (architecture, purple/blue)
  - Inside Customer's Account, top-center area
- AWS AppSync: cx~395, cy~405 (architecture, pink)
  - Inside Customer's Account, middle row
- AWS Lambda: cx~560, cy~405 (architecture, orange)
  - Inside Customer's Account, middle row, right of AppSync
- AWS Fargate: cx~790, cy~650 (architecture, orange)
  - Inside AWS Cloud but outside Customer's Account, bottom-center-right

### Inside Authentication
- Amazon Cognito: cx~155, cy~270 (architecture, red/pink)
- OpenID Connect: cx~310, cy~270 (custom icon — OpenID logo)
  - icon: "custom/icons8-openid.svg"

### Inside AWS Step Functions workflow
- AWS Lambda: cx~790, cy~290 (architecture, orange)
  - Top position in the SFN container
- AWS CloudFormation: cx~790, cy~450 (architecture, orange)
  - Bottom position in the SFN container

### Inside AWS Managed Account
- S3 replication component template: cx~1080, cy~240 (resource icon, orange — CloudFormation template icon)
  - icon_hint: "CloudFormation Template Orange"
  - Top-left of grid
- DynamoDB replication component template: cx~1270, cy~240 (resource icon, orange — CloudFormation template icon)
  - icon_hint: "CloudFormation Template Orange"
  - Top-right of grid
- Amazon S3: cx~1080, cy~440 (resource icon — green bucket)
  - Middle-left of grid
- ECR replication component template: cx~1270, cy~440 (resource icon, orange — CloudFormation template icon)
  - icon_hint: "CloudFormation Template Orange"
  - Middle-right of grid
- Amazon ECR: cx~1080, cy~650 (architecture, orange)
  - Bottom-left of grid
- ECR replication Docker image: cx~1270, cy~650 (architecture, orange)
  - icon_hint: "elastic container registry"
  - Bottom-right of grid

## 3. Arrow Connection Table

| # | Source | Target | Direction | Badge # | Notes |
|---|--------|--------|-----------|---------|-------|
| 1 | Data Transfer Hub UI | Amazon CloudFront (Customer's Account) | → right | 1 | Horizontal arrow from DTH UI to CloudFront |
| 2 | (left edge, external) | AWS AppSync (Customer's Account) | → right | 2 | Arrow enters from left toward AppSync |
| 3 | User | Data Transfer Hub UI | ↑ up | 3 | Vertical arrow from User up to DTH UI |
| 4 | AWS AppSync | AWS Lambda (middle, Customer's Account) | → right | 4 | Horizontal arrow |
| 5 | AWS Lambda (middle) | SFN border (left) | → right | 5 | Arrow from Lambda to Step Functions container border |
| 6 | Amazon S3 (Managed Account) | AWS CloudFormation (SFN) | ← left | 6 | Arrow goes left from S3 in Managed Account to CloudFormation in SFN; crosses container borders |
| 7 | Amazon ECR (Managed Account) | AWS Fargate | ← left | 7 | Arrow goes left from ECR to Fargate; crosses container borders |
| 8 | Amazon Cognito | Amazon DynamoDB | → right | 8 | Arrow from Cognito rightward to DynamoDB |
| — | (left edge, external) | Amazon Cognito | → right | — | Unlabeled arrow entering from left into Cognito |
| — | Amazon CloudFront | Amazon S3 (Customer's Account) | → right | — | Unlabeled arrow from CloudFront to S3 bucket (bottom row) |
| — | AWS CloudFormation (SFN) | AWS Fargate | ↓ down | — | Unlabeled vertical arrow from CloudFormation down to Fargate |

**Total: 8 numbered + 3 unlabeled = 11 arrows**

## 4. Standalone Elements

- OpenID Connect — no arrows connected to it
- S3 replication component template — no arrows
- DynamoDB replication component template — no arrows
- ECR replication component template — no arrows
- ECR replication Docker image — no arrows

## 5. External Actors

| Actor | Nesting Level | Notes |
|-------|---------------|-------|
| User | Outside AWS Cloud entirely | Person icon at bottom-left, below the AWS Cloud border |
| Data Transfer Hub UI | Inside AWS Cloud, outside Customer's Account | Desktop icon, left side, below Customer's Account |

**Double-check:** In the reference, "User" is clearly below the AWS Cloud outer border. "Data Transfer Hub UI" sits inside the AWS Cloud boundary but outside the Customer's AWS Account sub-container.

## 6. Icon Variants

| Element | Icon Type | Variant | Color | Notes |
|---------|-----------|---------|-------|-------|
| User | architecture | — | gray | Person silhouette icon |
| Data Transfer Hub UI | resource | Light | — | Desktop/client monitor icon; icon_hint: "client" |
| Amazon Cognito | architecture | — | red/pink | Standard Cognito icon |
| OpenID Connect | custom | — | — | icon: "custom/icons8-openid.svg" |
| Amazon CloudFront | architecture | — | purple | Standard CloudFront icon |
| Amazon S3 (Customer's Account, bottom) | resource | — | green | Bucket icon (resource, not architecture) |
| Amazon S3 (Managed Account) | resource | — | green | Bucket icon (resource, not architecture) |
| Amazon DynamoDB | architecture | — | purple/blue | Standard DynamoDB icon |
| AWS AppSync | architecture | — | pink | Standard AppSync icon |
| AWS Lambda (middle) | architecture | — | orange | Standard Lambda icon |
| AWS Lambda (SFN) | architecture | — | orange | Standard Lambda icon |
| AWS CloudFormation (SFN) | architecture | — | orange | Standard CloudFormation icon |
| AWS Fargate | architecture | — | orange | Standard Fargate icon |
| Amazon ECR | architecture | — | orange | Standard ECR icon |
| S3 replication component template | resource | — | orange | icon_hint: "CloudFormation Template Orange" |
| DynamoDB replication component template | resource | — | orange | icon_hint: "CloudFormation Template Orange" |
| ECR replication component template | resource | — | orange | icon_hint: "CloudFormation Template Orange" |
| ECR replication Docker image | architecture | — | orange | icon_hint: "elastic container registry" |

## 7. Arrow Style

Global arrow style:
- stroke_color: "#545B64" (dark gray)
- badge_bg: "#232F3E" (dark navy)
- badge_color: "#ffffff" (white)
- badge_shape: circle
