# Data Transfer Hub — v16 Plan

## Container Hierarchy

### Level 0: AWS Cloud
- **Label:** "AWS Cloud"
- **Border:** dark gray (#232F3E), solid
- **Header icon:** AWS Cloud logo (auto-detected)
- **Contains:** Customer's AWS Account, AWS Managed Account, User (external actor)

### Level 1a: Customer's AWS Account
- **Label:** "Customer's AWS Account"
- **Border:** dark gray (#232F3E), solid
- **Header icon:** AWS Cloud icon (auto-detected for Account containers)
- **Position:** left side, takes roughly 60% of width
- **Contains:** Authentication sub-container, AWS Step Functions workflow sub-container, AWS AppSync, AWS Lambda (middle row), Amazon DynamoDB, Amazon CloudFront, Amazon S3 (customer), AWS Fargate, Data Transfer Hub UI

### Level 1b: AWS Managed Account
- **Label:** "AWS Managed Account"
- **Border:** dark gray (#232F3E), solid
- **Header icon:** AWS Cloud icon (auto-detected for Account containers)
- **Position:** right side, takes roughly 35% of width
- **Layout:** 2x3 grid
- **Contains:** S3 replication component template, DynamoDB replication component template, Amazon S3 (managed), ECR replication component template, Amazon ECR, ECR replication Docker image

### Level 2a: Authentication (inside Customer's AWS Account)
- **Label:** "Authentication"
- **Border:** dashed, dark gray
- **Position:** top-left area of Customer's AWS Account
- **Contains:** Amazon Cognito, OpenID Connect
- **Layout:** row (horizontal, side by side)

### Level 2b: AWS Step Functions workflow (inside Customer's AWS Account)
- **Label:** "AWS Step Functions workflow"
- **Border:** solid, pink/red (#E7157B)
- **Header icon:** Step Functions icon (auto-detected)
- **Position:** right-center area of Customer's AWS Account, vertically spanning the middle rows
- **Contains:** AWS Lambda (step functions), AWS CloudFormation
- **Layout:** col (vertical stack)

---

## Service Nodes

### Inside Authentication container:
| Node | Label | Icon Type | Icon Notes |
|------|-------|-----------|------------|
| cognito | Amazon Cognito | architecture | Red/pink icon — default architecture icon |
| openid | OpenID Connect | custom | Custom icon: `custom/icons8-openid.svg` |

### Inside AWS Step Functions workflow container:
| Node | Label | Icon Type | Icon Notes |
|------|-------|-----------|------------|
| lambda_sf | AWS Lambda | architecture | Orange icon — default architecture icon |
| cloudformation | AWS CloudFormation | architecture | Pink icon — default architecture icon |

### Inside Customer's AWS Account (not in sub-containers):
| Node | Label | Icon Type | Icon Notes |
|------|-------|-----------|------------|
| dynamodb | Amazon DynamoDB | architecture | Default (purple) architecture icon |
| appsync | AWS AppSync | architecture | Pink/magenta architecture icon |
| lambda_mid | AWS Lambda | architecture | Orange architecture icon |
| cloudfront | Amazon CloudFront | architecture | Purple architecture icon |
| s3_customer | Amazon S3 | resource | Green bucket icon — use `icon_hint: "S3 Bucket"`, `icon_type: resource` |
| fargate | AWS Fargate | architecture | Orange architecture icon |
| dth_ui | Data Transfer\nHub UI | resource | Computer/client icon — use `icon_type: resource`, `icon_hint: "Client"` |

### Inside AWS Managed Account:
| Node | Label | Icon Type | Icon Notes |
|------|-------|-----------|------------|
| s3_repl_template | S3 replication\ncomponent template | resource | Orange CloudFormation Template — use `icon_hint: "CloudFormation Template"`, `icon_type: resource`, color Orange |
| dynamodb_repl_template | DynamoDB\nreplication\ncomponent template | resource | Orange CloudFormation Template — use `icon_hint: "CloudFormation Template"`, `icon_type: resource`, color Orange |
| s3_managed | Amazon S3 | resource | Green bucket icon — use `icon_hint: "S3 Bucket"`, `icon_type: resource` |
| ecr_repl_template | ECR replication\ncomponent template | resource | Orange CloudFormation Template — use `icon_hint: "CloudFormation Template"`, `icon_type: resource`, color Orange |
| ecr | Amazon ECR | architecture | Orange architecture icon |
| ecr_docker | ECR replication\nDocker image | resource | ECR Image icon — use `icon_hint: "Elastic Container Registry Image"`, `icon_type: resource` |

---

## External Actors

| Actor | Label | Position | Icon Notes |
|-------|-------|----------|------------|
| user | User | Outside AWS Cloud, bottom-left corner | Resource icon, Light variant — use `icon_type: resource`, `icon_variant: Light` |

**Nesting check:** The User icon is clearly OUTSIDE the AWS Cloud boundary. It sits below and to the left of the AWS Cloud container border.

---

## Numbered Arrow Table

| # | Source | Target | Direction | Badge # | Notes |
|---|--------|--------|-----------|---------|-------|
| 1 | Amazon CloudFront | Amazon S3 (customer) | right (→) | 1 | Badge between CloudFront and S3 on the bottom row. Both inside Customer's Account, same row. |
| 2 | (left edge of Customer Account) | AWS AppSync | right (→) | 2 | Arrow enters from the left border of Customer's Account heading right to AppSync. Badge is to the left of AppSync. |
| 3 | Data Transfer Hub UI | Amazon CloudFront | right (→) then down? | 3 | Badge is adjacent to DTH UI. Arrow goes right from DTH UI to CloudFront area. Actually: DTH UI connects down/right to CloudFront row. Looking more carefully: DTH UI has arrow going right to CloudFront with badge 3. Wait — re-examining: badge 3 is next to DTH UI with arrow going down to the CloudFront row. Let me re-examine. |
| 4 | AWS AppSync | AWS Lambda (middle) | right (→) | 4 | Badge between AppSync and Lambda mid, same row. |
| 5 | AWS Lambda (middle) | AWS Step Functions workflow border | right (→) | 5 | Badge between Lambda mid and Step Functions container border. Arrow ends at Step Functions container border. |
| 6 | AWS Managed Account (S3 area / left border) | AWS CloudFormation (inside Step Functions) | left (←) | 6 | Arrow goes from Managed Account area leftward to CloudFormation. Badge is between the two account containers. |
| 7 | Amazon ECR | AWS Fargate | left (←) | 7 | Arrow goes from ECR area leftward to Fargate. Badge is between the two account containers, bottom row. |
| 8 | Authentication container area | Amazon DynamoDB | right (→) | 8 | Arrow from Cognito area rightward to DynamoDB. Badge between Authentication container and DynamoDB. |

### Re-examination of arrows from reference image:

Looking more carefully at the reference:

**Arrow 1:** Data Transfer Hub UI → Amazon CloudFront → Amazon S3 (customer). Badge "1" is between CloudFront and S3. The DTH UI connects down to CloudFront on the bottom row.

**Arrow 2:** Comes from outside (left border of Customer Account) → AWS AppSync. Badge "2" is to the left of AppSync on the middle row.

**Arrow 3:** Badge "3" is next to Data Transfer Hub UI. The DTH UI has connections going right — one to CloudFront (bottom) and one up to AppSync area (middle).

**Arrow 4:** AWS AppSync → AWS Lambda (middle). Badge "4" between them.

**Arrow 5:** AWS Lambda (middle) → Step Functions workflow container border. Badge "5" between Lambda mid and the Step Functions border.

**Arrow 6:** Amazon S3 (managed) → AWS CloudFormation (inside Step Functions). Arrow goes left with badge "6" between the two accounts.

**Arrow 7:** Amazon ECR → AWS Fargate. Arrow goes left with badge "7" at bottom between accounts.

**Arrow 8:** Amazon Cognito → Amazon DynamoDB. Arrow goes right from Cognito/Auth area to DynamoDB. Badge "8" between them.

### Corrected Numbered Arrow Table

| # | Source | Target | Direction | Badge # | Style |
|---|--------|--------|-----------|---------|-------|
| 1 | Amazon CloudFront | Amazon S3 (customer) | → | 1 | dark circle |
| 2 | (left border of Customer Account) | AWS AppSync | → | 2 | dark circle |
| 3 | Data Transfer Hub UI | Amazon CloudFront | ↓ then → (L-shape) | 3 | dark circle |
| 4 | AWS AppSync | AWS Lambda (middle) | → | 4 | dark circle |
| 5 | AWS Lambda (middle) | AWS Step Functions workflow border | → | 5 | dark circle |
| 6 | Amazon S3 (managed) | AWS CloudFormation (inside Step Functions) | ← | 6 | dark circle |
| 7 | Amazon ECR | AWS Fargate | ← | 7 | dark circle |
| 8 | Amazon Cognito | Amazon DynamoDB | → | 8 | dark circle |

---

## Unlabeled Arrows

| Source | Target | Direction | Notes |
|--------|--------|-----------|-------|
| User | Data Transfer Hub UI | → (up and right) | User outside AWS Cloud connects up to DTH UI inside Customer Account. Arrow crosses AWS Cloud and Customer Account borders. |
| (left border of AWS Cloud) | Amazon Cognito | → | Small arrow entering from left edge of AWS Cloud into Cognito inside Authentication container |
| Data Transfer Hub UI | AWS AppSync | ↑ | Vertical arrow from DTH UI up to AppSync row (the "2" badge arrow — actually this might be the same flow). Re-checking: the arrow labeled "2" enters from left border. DTH UI connects to CloudFront (badge 3) and separately connects upward. |
| Amazon CloudFront | Amazon S3 (customer) | → | This is arrow 1, already covered |
| AWS CloudFormation (Step Functions) | AWS Fargate | ↓ | Arrow from CloudFormation going down to Fargate at bottom |

### Re-examination of unlabeled arrows:

Looking at the reference more carefully:

1. **User → Data Transfer Hub UI:** User (outside AWS Cloud) has arrow going right/up to DTH UI inside Customer Account. This arrow crosses the AWS Cloud border and the Customer Account border.

2. **Left edge of AWS Cloud → Amazon Cognito:** A small arrow enters from the left side of the AWS Cloud container into the Authentication area toward Cognito.

3. **Data Transfer Hub UI → Amazon CloudFront:** This IS arrow 3 (numbered). DTH UI connects right and down to CloudFront.

4. **AWS CloudFormation → AWS Fargate:** Arrow going down from CloudFormation (inside Step Functions) to Fargate at the bottom row. Vertical arrow.

5. **Amazon S3 (managed) → AWS CloudFormation:** This IS arrow 6 (numbered).

So the unlabeled arrows are:

| Source | Target | Direction | Notes |
|--------|--------|-----------|-------|
| User | Data Transfer Hub UI | → then ↑ | Crosses AWS Cloud and Customer Account borders |
| Left edge of AWS Cloud | Amazon Cognito | → | Small arrow entering from outside |
| AWS CloudFormation (in Step Functions) | AWS Fargate | ↓ | Vertical arrow going down from Step Functions area to Fargate bottom row |

---

## Standalone Elements

None — all elements appear to have at least one connection.

---

## Icon Notes

| Element | Icon Resolution | Color | Notes |
|---------|----------------|-------|-------|
| Amazon Cognito | architecture | Red/pink | Standard Cognito architecture icon |
| OpenID Connect | custom | Gray/multicolor | Use `icon: "custom/icons8-openid.svg"` — no AWS icon exists |
| Amazon DynamoDB | architecture | Purple | Standard DynamoDB icon |
| AWS AppSync | architecture | Pink/magenta | Standard AppSync icon |
| AWS Lambda (middle) | architecture | Orange | Standard Lambda icon |
| AWS Lambda (step functions) | architecture | Orange | Same Lambda icon, different instance |
| AWS CloudFormation | architecture | Pink | Standard CloudFormation icon |
| Amazon CloudFront | architecture | Purple | Standard CloudFront icon |
| Amazon S3 (customer) | resource | Green (olive) | S3 Bucket resource icon, NOT architecture. Green bucket shape. |
| Amazon S3 (managed) | resource | Green (olive) | Same S3 Bucket resource icon |
| AWS Fargate | architecture | Orange | Standard Fargate icon |
| Data Transfer Hub UI | resource | Dark | Client resource icon, Dark variant |
| User | resource | Light | User resource icon, Light variant (outline) |
| Amazon ECR | architecture | Orange | Standard ECR icon |
| ECR replication Docker image | resource | Orange | ECR Image resource icon |
| S3 replication component template | resource | Orange | CloudFormation Template resource icon, Orange color variant |
| DynamoDB replication component template | resource | Orange | CloudFormation Template resource icon, Orange color variant |
| ECR replication component template | resource | Orange | CloudFormation Template resource icon, Orange color variant |

---

## Layout Intent

### Overall layout:
- **AWS Cloud** spans the full diagram width
- **Customer's AWS Account** is on the left, taking ~60-65% width
- **AWS Managed Account** is on the right, taking ~35% width
- **User** is outside AWS Cloud, bottom-left

### Customer's AWS Account internal layout:
- **Row 1 (top):** Authentication container (left), Amazon DynamoDB (center-right), Step Functions container starts here (right)
- **Row 2 (middle):** AWS AppSync (left), AWS Lambda middle (center), Step Functions container continues (right)
- **Row 3 (bottom):** Data Transfer Hub UI (far left), Amazon CloudFront (center-left), Amazon S3 customer (center), AWS Fargate (right)
- **Step Functions workflow** spans rows 1-2 vertically on the right side, containing Lambda (top) and CloudFormation (bottom)

### Authentication container:
- Horizontal row: Cognito on the left, OpenID Connect on the right
- Dashed border

### AWS Step Functions workflow:
- Vertical column: Lambda (top), CloudFormation (bottom)
- Pink/red (#E7157B) solid border

### AWS Managed Account:
- 2x3 grid layout:
  - Row 1: S3 replication template (left), DynamoDB replication template (right)
  - Row 2: Amazon S3 (left), ECR replication template (right)
  - Row 3: Amazon ECR (left), ECR replication Docker image (right)

### Vertical alignment across the diagram:
- **Top row (~Y1):** Authentication contents, DynamoDB, Step Functions top (Lambda SF)
- **Middle row (~Y2):** AppSync, Lambda mid, Step Functions bottom (CloudFormation) — AppSync and Lambda mid are aligned horizontally
- **Bottom row (~Y3):** DTH UI, CloudFront, S3 customer, Fargate — all aligned on bottom row
- **User** is below the bottom row, outside AWS Cloud
