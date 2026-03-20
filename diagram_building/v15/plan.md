# Data Transfer Hub — v15 Plan

## Container Hierarchy

1. **AWS Cloud** — outermost container, solid dark border (#232F3E), AWS logo header icon
   1. **Customer's AWS Account** — left ~60% of AWS Cloud, solid dark border (#232F3E), cloud header icon
      1. **Authentication** — dashed border (no color, default dark), top-left of Customer's Account. Contains Cognito and OpenID Connect side by side.
      2. **AWS Step Functions workflow** — solid pink/red border (#E7157B), right side of Customer's Account, spanning from upper area to middle area. Contains Lambda (upper) and CloudFormation (lower). Step Functions header icon.
   2. **AWS Managed Account** — right ~30% of AWS Cloud, solid dark border (#232F3E), cloud header icon. Contains 6 service nodes in a 2x3 grid.

## Service Nodes

### Inside Authentication (dashed, inside Customer's AWS Account)

| Node ID | Label | Icon Notes |
|---------|-------|------------|
| cognito | Amazon Cognito | Architecture icon, red/pink |
| openid | OpenID Connect | Custom icon: `custom/icons8-openid.svg` |

### Inside AWS Step Functions workflow (pink border, inside Customer's AWS Account)

| Node ID | Label | Icon Notes |
|---------|-------|------------|
| lambda_sf | AWS Lambda | Architecture icon, orange |
| cloudformation | AWS CloudFormation | Architecture icon, pink/red |

### Inside Customer's AWS Account (direct children, NOT in sub-containers)

| Node ID | Label | Icon Notes |
|---------|-------|------------|
| dynamodb | Amazon DynamoDB | Architecture icon, purple |
| appsync | AWS AppSync | Architecture icon, pink/magenta |
| lambda | AWS Lambda | Architecture icon, orange (this is the middle Lambda, distinct from lambda_sf) |
| cloudfront | Amazon CloudFront | Architecture icon, purple |
| s3_customer | Amazon S3 | Architecture icon, green/olive bucket |
| fargate | AWS Fargate | Architecture icon, orange |

### Inside AWS Managed Account (2x3 grid)

| Node ID | Label | Icon Notes |
|---------|-------|------------|
| s3_repl_template | S3 replication\ncomponent template | Resource icon, orange. icon_hint: "AWS CloudFormation Template" |
| dynamodb_repl_template | DynamoDB replication\ncomponent template | Resource icon, orange. icon_hint: "AWS CloudFormation Template" |
| s3_managed | Amazon S3 | Architecture icon, green/olive bucket |
| ecr_repl_template | ECR replication\ncomponent template | Resource icon, orange. icon_hint: "AWS CloudFormation Template" |
| ecr | Amazon ECR | Architecture icon, orange |
| ecr_docker | ECR replication\nDocker image | Architecture icon, orange/pink. icon_hint: "elastic container registry image" |

### Outside All Containers

| Node ID | Label | Icon Notes |
|---------|-------|------------|
| user | User | Architecture icon, gray person silhouette. OUTSIDE AWS Cloud entirely. |

### Inside AWS Cloud but Outside Account Containers

| Node ID | Label | Icon Notes |
|---------|-------|------------|
| dth_ui | Data Transfer\nHub UI | Resource icon. icon_hint: "client". Computer/monitor icon. Positioned left of Customer's Account, inside AWS Cloud. |

## Numbered Arrow Table

| Badge # | Source | Target | Direction | Badge Position |
|---------|--------|--------|-----------|----------------|
| 1 | Data Transfer Hub UI | Amazon CloudFront | → horizontal | Between DTH UI and CloudFront on the horizontal segment |
| 2 | (left border of Customer's Account) | AWS AppSync | → horizontal | Left of AppSync, between Account border and AppSync |
| 3 | Data Transfer Hub UI | (left border of Customer's Account) | ↑ vertical | Near DTH UI on the upward segment |
| 4 | AWS AppSync | AWS Lambda (middle) | → horizontal | Between AppSync and Lambda |
| 5 | AWS Lambda (middle) | AWS Step Functions workflow (border) | → horizontal | Between Lambda and Step Functions border |
| 6 | Amazon S3 (managed, in Managed Account) | AWS CloudFormation (in Step Functions) | ← horizontal | In the gap between the two Account containers |
| 7 | Amazon ECR (Managed Account) | AWS Fargate (Customer's Account) | ← horizontal | In the gap between the two Account containers, bottom row |
| 8 | Authentication area (near Cognito) | Amazon DynamoDB | → horizontal | Between Authentication box and DynamoDB |

### Arrow endpoint analysis:
- **Arrow 1**: DTH UI is outside Customer's Account, CloudFront is inside. Arrow goes from icon to icon, crossing the Customer Account border at the bottom. The reference clearly shows the arrow entering the container.
- **Arrow 2**: Starts at the left border of Customer's Account (not from a specific icon outside). This is the continuation of the auth flow — enters from the border heading right to AppSync.
- **Arrow 3**: DTH UI goes UP vertically to the left border of Customer's Account. This connects to arrow 2's start point conceptually (L-shape: up then right = two separate arrows sharing a junction at the Account border).
- **Arrow 4**: Icon-to-icon, same container level (both direct children of Customer's Account). Straight horizontal.
- **Arrow 5**: Lambda (middle) to Step Functions container border. Arrow ends at the container border, not at a specific icon inside.
- **Arrow 6**: Cross-container arrow. From Amazon S3 in Managed Account leftward to CloudFormation inside Step Functions. The reference shows the arrow crossing both Account borders and the Step Functions border.
- **Arrow 7**: Cross-container arrow. From Amazon ECR in Managed Account leftward to AWS Fargate in Customer's Account. Crosses both Account borders.
- **Arrow 8**: From the right edge of Authentication dashed box (or from near Cognito) rightward to DynamoDB. Arrow crosses the dashed Authentication border.

## Unlabeled Arrows

| Source | Target | Direction | Notes |
|--------|--------|-----------|-------|
| External (left edge of AWS Cloud) | Amazon Cognito | → horizontal | Small arrow entering from outside AWS Cloud, crossing AWS Cloud border, Customer Account border, and Authentication dashed border to reach Cognito |
| Amazon CloudFront | Amazon S3 (customer) | → horizontal | Bottom row inside Customer's Account, icon-to-icon |
| AWS CloudFormation (in Step Functions) | AWS Fargate | ↓ vertical | Vertical arrow from CloudFormation downward to Fargate. Exits Step Functions border at the bottom, goes down to Fargate. |

## Standalone Elements (no connections)

| Node | Container | Notes |
|------|-----------|-------|
| OpenID Connect | Authentication | No arrows connect to it |
| AWS Lambda (inside Step Functions) | Step Functions workflow | No direct arrows — the container itself receives arrow 5, but this Lambda node has no individual connection |
| S3 replication component template | AWS Managed Account | Standalone in grid |
| DynamoDB replication component template | AWS Managed Account | Standalone in grid |
| ECR replication component template | AWS Managed Account | Standalone in grid |
| ECR replication Docker image | AWS Managed Account | Standalone in grid |
| User | Outside all containers | No arrows connect to/from User icon |

## External Actor Positions

| Actor | Nesting Level | Visual Position |
|-------|---------------|-----------------|
| User | OUTSIDE AWS Cloud entirely | Bottom-left corner of the diagram, below and left of the AWS Cloud border |
| Data Transfer Hub UI | Inside AWS Cloud, OUTSIDE both Account containers | Left side, between the AWS Cloud left border and Customer's Account left border, vertically in the lower-middle area (roughly same Y as the bottom service row) |

**Double-check**: The User icon with the person silhouette is clearly outside the AWS Cloud border at the very bottom-left. The DTH UI (computer monitor) is inside AWS Cloud's border but left of the Customer's Account container border.

## Icon Notes

| Node | Icon Type | Color | Special Notes |
|------|-----------|-------|---------------|
| Amazon Cognito | architecture | red/pink | — |
| OpenID Connect | custom | — | Use `icon: "custom/icons8-openid.svg"` |
| AWS AppSync | architecture | pink/magenta | — |
| AWS Lambda (middle) | architecture | orange | — |
| AWS Lambda (Step Functions) | architecture | orange | Same icon as middle Lambda |
| AWS CloudFormation | architecture | pink/red | — |
| Amazon DynamoDB | architecture | purple | — |
| Amazon CloudFront | architecture | purple | — |
| Amazon S3 (customer) | architecture | green | Bucket icon |
| Amazon S3 (managed) | architecture | green | Same bucket icon |
| AWS Fargate | architecture | orange | — |
| S3 replication component template | resource | orange | icon_hint: "AWS CloudFormation Template" |
| DynamoDB replication component template | resource | orange | icon_hint: "AWS CloudFormation Template" |
| ECR replication component template | resource | orange | icon_hint: "AWS CloudFormation Template" |
| Amazon ECR | architecture | orange | — |
| ECR replication Docker image | architecture | orange | icon_hint: "elastic container registry image" |
| Data Transfer Hub UI | resource | dark | icon_hint: "client" |
| User | architecture | gray | Person silhouette |

## Layout Intent

- **AWS Cloud**: Full diagram width and height outer container
- **Customer's AWS Account**: Left portion (~60-65%), tall, contains 3 horizontal rows of services:
  - **Top row**: Authentication (left) + DynamoDB (center-right), with Step Functions starting at the right
  - **Middle row**: AppSync (left) + Lambda (center), Step Functions continues on the right
  - **Bottom row**: CloudFront (left) + S3 (center) + Fargate (right)
- **Authentication**: Dashed box, top-left of Customer's Account. Layout: **row** (Cognito left, OpenID right)
- **AWS Step Functions workflow**: Right side of Customer's Account, vertically tall spanning top and middle rows. Layout: **col** (Lambda on top, CloudFormation on bottom)
- **AWS Managed Account**: Right portion (~30-35%), 2-column 3-row grid. Layout: **2x3**
  - Col 1: S3 repl template, Amazon S3, Amazon ECR
  - Col 2: DynamoDB repl template, ECR repl template, ECR repl Docker image
- **Data Transfer Hub UI**: Left of Customer's Account, inside AWS Cloud. Vertically aligned roughly with the bottom row / between middle and bottom rows.
- **User**: Bottom-left, outside AWS Cloud entirely
