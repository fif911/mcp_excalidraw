# Data Transfer Hub — v12 Plan

## Container Hierarchy

1. **AWS Cloud** — outermost container, solid dark border (`#232F3E`), header icon: AWS logo
2. **Customer's AWS Account** — inside AWS Cloud, left side, solid dark border (`#232F3E`), header icon: cloud icon. Takes up roughly 60% of the width.
3. **Authentication** — inside Customer's AWS Account, top-left area, **dashed** border (no color fill), contains Cognito and OpenID Connect side by side
4. **AWS Step Functions workflow** — inside Customer's AWS Account, right side, **pink/red solid border** (`#E7157B`), header icon: Step Functions icon. Contains AWS Lambda (large, top) and AWS CloudFormation (bottom). Vertically stacked.
5. **AWS Managed Account** — inside AWS Cloud, right side, solid dark border (`#232F3E`), header icon: cloud icon. Takes up roughly 30% of the width. Contains 6 service nodes in a 2x3 grid layout.

## Service Nodes

### Inside Authentication (dashed container, inside Customer's AWS Account)
| Node | Label | Icon Type | Icon Notes |
|------|-------|-----------|------------|
| cognito | Amazon Cognito | architecture | Pink/red Cognito icon with checkmark |
| openid | OpenID Connect | custom | OpenID Connect logo (custom icon: `icons8-openid.svg`) |

### Inside Customer's AWS Account (directly, not in sub-container)
| Node | Label | Icon Type | Icon Notes |
|------|-------|-----------|------------|
| appsync | AWS AppSync | architecture | Pink AppSync icon |
| lambda_mid | AWS Lambda | architecture | Orange Lambda icon (this is the middle Lambda, distinct from the one inside Step Functions) |
| dynamodb | Amazon DynamoDB | architecture | Purple DynamoDB icon |
| cloudfront | Amazon CloudFront | architecture | Purple CloudFront icon |
| s3_customer | Amazon S3 | architecture | Green S3 bucket icon (olive/dark yellow-green) |
| fargate | AWS Fargate | architecture | Orange Fargate icon |

### Inside AWS Step Functions workflow
| Node | Label | Icon Type | Icon Notes |
|------|-------|-----------|------------|
| lambda_sf | AWS Lambda | architecture | Orange Lambda icon (large, top position inside Step Functions) |
| cloudformation_sf | AWS CloudFormation | architecture | Orange/pink CloudFormation icon (bottom position inside Step Functions) |

### Inside AWS Managed Account (2x3 grid)
| Node | Label | Icon Type | Icon Notes |
|------|-------|-----------|------------|
| s3_repl_template | S3 replication\ncomponent template | resource | Orange CloudFormation template icon — resource type, **orange variant** |
| dynamodb_repl_template | DynamoDB\nreplication\ncomponent template | resource | Orange CloudFormation template icon — resource type, **orange variant** |
| s3_managed | Amazon S3 | architecture | Green S3 bucket icon (olive/dark yellow-green) |
| ecr_repl_template | ECR replication\ncomponent\ntemplate | resource | Orange CloudFormation template icon — resource type, **orange variant** |
| ecr | Amazon ECR | architecture | Orange ECR icon |
| ecr_docker | ECR replication\nDocker image | architecture | Orange/pink icon — icon_hint: "elastic container registry image" |

Grid layout for Managed Account:
- Row 1: s3_repl_template (left), dynamodb_repl_template (right)
- Row 2: s3_managed (left), ecr_repl_template (right)
- Row 3: ecr (left), ecr_docker (right)

### Inside AWS Cloud (directly, outside both account containers)
| Node | Label | Icon Type | Icon Notes |
|------|-------|-----------|------------|
| dth_ui | Data Transfer\nHub UI | resource | Computer/monitor icon — resource type, icon_hint: "client" or "computer" |

### Outside AWS Cloud (standalone external actors)
| Node | Label | Icon Type | Icon Notes |
|------|-------|-----------|------------|
| user | User | architecture | Person/user icon — icon_hint: "user" or "users", icon_variant: Light |

## Numbered Arrow Table

| # | Source | Target | Direction | Notes |
|---|--------|--------|-----------|-------|
| 1 | Data Transfer Hub UI | Amazon CloudFront | → (right) | Arrow goes from DTH UI rightward into Customer's Account to CloudFront |
| 2 | Amazon Cognito | AWS AppSync | → (right, down) | Arrow exits Authentication container, goes down-right to AppSync. L-shape likely needed. |
| 3 | Data Transfer Hub UI | Amazon Cognito | → (right, up) | Arrow goes from DTH UI upward-right into Authentication container to Cognito. Enters from the left side. |
| 4 | AWS AppSync | AWS Lambda (middle) | → (right) | Horizontal arrow from AppSync to the middle Lambda |
| 5 | AWS Lambda (middle) | AWS Step Functions workflow border | → (right) | Arrow from middle Lambda rightward to the Step Functions container border (not to a specific icon inside) |
| 6 | AWS CloudFormation (inside Step Functions) | AWS Managed Account border | → (right) | Arrow exits Step Functions, crosses to Managed Account border. Goes from CloudFormation rightward. |
| 7 | AWS Fargate | Amazon ECR (in Managed Account) | ← (left, from ECR to Fargate) | Arrow goes from Managed Account (ECR) leftward to Fargate. The badge "7" is between them. |
| 8 | AWS Lambda (middle) | Amazon DynamoDB | → (right, up) | Arrow goes from middle Lambda upward to DynamoDB. L-shape: up then right, or right then up. |

### Badge style
All numbered badges are **dark filled circles** with white numbers inside.

## Unlabeled Arrows

| Source | Target | Direction | Notes |
|--------|--------|-----------|-------|
| Amazon CloudFront | Amazon S3 (customer) | → (right) | Horizontal arrow from CloudFront to S3 bucket |
| Amazon S3 (customer) | AWS Fargate | → (right) | Horizontal arrow, or slight route, from S3 to Fargate |
| AWS CloudFormation (inside Step Functions) | AWS Fargate | ↓ (down) | Vertical arrow from CloudFormation downward to Fargate |
| Left edge (external) | Amazon Cognito | → (right) | Small arrow entering from outside AWS Cloud into Cognito (represents external auth flow) |

## Standalone Elements

- **OpenID Connect** — inside Authentication container, no arrows connected to it. It sits next to Cognito as a related service but has no arrow connections.

## External Actors

- **User** — outside AWS Cloud entirely, bottom-left corner, below Data Transfer Hub UI. No arrow connects from User to anything (the user icon is a standalone visual indicator).
- **Data Transfer Hub UI** — inside AWS Cloud but outside both account containers, left side, vertically centered between Authentication and CloudFront rows.

## Icon Notes

| Element | Icon Detail |
|---------|-------------|
| Amazon Cognito | Architecture icon, pink/red |
| OpenID Connect | Custom icon: `custom/icons8-openid.svg` |
| AWS AppSync | Architecture icon, pink |
| AWS Lambda (both instances) | Architecture icon, orange |
| Amazon DynamoDB | Architecture icon, purple |
| AWS CloudFormation | Architecture icon, orange/pink |
| Amazon CloudFront | Architecture icon, purple |
| Amazon S3 (both instances) | Architecture icon, green/olive bucket |
| AWS Fargate | Architecture icon, orange |
| S3 replication component template | Resource icon, orange — icon_hint: "CloudFormation template orange" or "CloudFormation stack orange" |
| DynamoDB replication component template | Resource icon, orange — icon_hint: "CloudFormation template orange" |
| ECR replication component template | Resource icon, orange — icon_hint: "CloudFormation template orange" |
| Amazon ECR | Architecture icon, orange |
| ECR replication Docker image | Architecture icon — icon_hint: "elastic container registry image" |
| Data Transfer Hub UI | Resource icon — icon_hint: "client" (computer/monitor icon) |
| User | Architecture icon, icon_variant: Light — generic person silhouette |

## Layout Intent

- **AWS Cloud**: full-width outer boundary
- **Customer's AWS Account**: left ~65% of AWS Cloud interior, tall enough to hold all rows
- **AWS Managed Account**: right ~30% of AWS Cloud interior, 2-column x 3-row grid
- **Authentication**: top-left inside Customer's Account, small dashed box, horizontal row with Cognito (left) and OpenID Connect (right)
- **AWS Step Functions workflow**: right side inside Customer's Account, vertically stacked — Lambda on top, CloudFormation on bottom. Pink border.
- **Middle row** of Customer's Account (vertically): AppSync → Lambda (middle) → Step Functions — all roughly horizontally aligned
- **Bottom row** of Customer's Account: CloudFront → S3 → Fargate — horizontally aligned
- **DynamoDB**: between the Authentication row and the middle row, slightly right of center (above the middle Lambda roughly)
- **Data Transfer Hub UI**: outside Customer's Account, to the left, vertically between the middle row and bottom row
- **User**: below Data Transfer Hub UI, outside AWS Cloud entirely
- The numbered flow reads: User interacts with DTH UI (3→Cognito for auth, 2→Cognito to AppSync, 1→DTH UI to CloudFront), then 4→AppSync to Lambda, 5→Lambda to Step Functions, 8→Lambda to DynamoDB, 6→CloudFormation to Managed Account, 7→ECR to Fargate
