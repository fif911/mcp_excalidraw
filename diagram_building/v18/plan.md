# Data Transfer Hub — v18 Plan

## Arrow Style

- Badge: dark filled circle (`badge_bg: #232F3E`, `badge_shape: circle`)
- Stroke color: `#545B64`
- Badge text: white (`#ffffff`)

---

## 1. Containers

### AWS Cloud (outermost)
- Approximate: x~30, y~20, w~1400, h~780
- Border: solid, dark (#232F3E)
- Header icon: AWS Cloud logo (auto-detected)

### Customer's AWS Account
- Approximate: x~55, y~95, w~830, h~680
- Border: solid, dark (#232F3E)
- Header icon: AWS Cloud icon (auto-detected from "Account" keyword)
- Inside AWS Cloud

### Authentication (inside Customer's Account)
- Approximate: x~80, y~170, w~310, h~180
- Border: dashed, text-only header (no icon)
- Layout: row (Cognito left, OpenID right)
- Inside Customer's AWS Account

### AWS Step Functions workflow
- Approximate: x~650, y~170, w~230, h~380
- Border: solid, colored (#E7157B pink/red)
- Header icon: Step Functions icon (auto-detected)
- Inside Customer's AWS Account

### AWS Managed Account
- Approximate: x~950, y~95, w~470, h~680
- Border: solid, dark (#232F3E)
- Header icon: AWS Cloud icon (auto-detected from "Account" keyword)
- Layout: 2x3
- Inside AWS Cloud

---

## 2. Service Nodes

### Inside Authentication
- Amazon Cognito: cx~170, cy~280 (architecture, pink/red)
- OpenID Connect: cx~310, cy~280 (custom icon: `custom/icons8-openid.svg`)

### Inside Customer's AWS Account — top area (outside sub-containers)
- Amazon DynamoDB: cx~570, cy~230 (architecture, orange)

### Inside Customer's AWS Account — middle row (outside sub-containers)
- AWS AppSync: cx~390, cy~420 (architecture, pink)
- AWS Lambda: cx~560, cy~420 (architecture, orange)

### Inside AWS Step Functions workflow
- AWS Lambda: cx~760, cy~310 (architecture, orange)
- AWS CloudFormation: cx~760, cy~460 (architecture, pink)

### Inside Customer's AWS Account — bottom row (outside sub-containers)
- Amazon CloudFront: cx~390, cy~640 (architecture, purple)
- Amazon S3: cx~570, cy~640 (resource icon — green bucket, `icon_type: resource`, `icon_hint: "S3 bucket"`)
- AWS Fargate: cx~760, cy~640 (architecture, orange)

### Inside Customer's AWS Account — left side (outside sub-containers)
- Data Transfer\nHub UI: cx~110, cy~570 (resource icon, `icon_type: resource`, `icon_variant: Light`, `icon_hint: "Client"`)

### Inside AWS Managed Account (2x3 grid)
- Row 1: S3 replication\ncomponent template (cx~1070, cy~240), DynamoDB replication\ncomponent template (cx~1280, cy~240)
- Row 2: Amazon S3 (cx~1070, cy~440), ECR replication\ncomponent template (cx~1280, cy~440)
- Row 3: Amazon ECR (cx~1070, cy~640), ECR replication\nDocker image (cx~1280, cy~640)

---

## 3. External Actors

### User
- Label: "User"
- Position: cx~110, cy~740
- **Outside AWS Cloud entirely** (below the AWS Cloud bottom-left corner)
- Icon: resource type, Light variant (`icon_type: resource`, `icon_variant: Light`)
- Nesting: top-level (outside all containers)

---

## 4. Arrow Connection Table

### Numbered arrows

| # | Source | Target | Direction | Notes |
|---|--------|--------|-----------|-------|
| 1 | Data Transfer Hub UI (right) | Amazon CloudFront (left) | → | Horizontal rightward from DTH UI to CloudFront on bottom row. L-shape: right from DTH UI then down to CloudFront Y-level, then right to CloudFront |
| 2 | Data Transfer Hub UI (right/top) | AWS AppSync (left) | → | L-shape: right from DTH UI then up to AppSync Y-level, then right to AppSync |
| 3 | User (top) | Data Transfer Hub UI (bottom) | ↑ | Vertical upward from User to DTH UI |
| 4 | AWS AppSync (right) | AWS Lambda [middle] (left) | → | Short horizontal rightward |
| 5 | AWS Lambda [middle] (right) | SFN border (left) | → | Horizontal rightward, ends at Step Functions container left border (not at an icon inside) |
| 6 | Amazon S3 [managed] (left) | AWS CloudFormation (right) / SFN border (right) | ← | Horizontal leftward from managed-side S3 across gap to CloudFormation. Badge in gap between containers |
| 7 | Amazon ECR (left) | AWS Fargate (right) | ← | Horizontal leftward from managed-side ECR across gap to Fargate. Badge in gap between containers |
| 8 | Amazon Cognito (right) | Amazon DynamoDB (left) | → | Rightward from Cognito to DynamoDB, exits Authentication dashed border. Badge between Cognito and DynamoDB |

### Unlabeled arrows

| Source | Target | Direction | Notes |
|--------|--------|-----------|-------|
| Amazon CloudFront (right) | Amazon S3 [customer] (left) | → | Short horizontal rightward, unlabeled |
| SFN border (bottom) | AWS Fargate (top) | ↓ | Vertical downward from Step Functions container bottom border to Fargate top |

**Total: 8 numbered + 2 unlabeled = 10 arrows**

---

## 5. Standalone Elements (no connections)

These elements appear in the diagram but have no arrows touching them:

- OpenID Connect (inside Authentication, beside Cognito)
- S3 replication component template (managed account, top-left)
- DynamoDB replication component template (managed account, top-right)
- ECR replication component template (managed account, middle-right)
- ECR replication Docker image (managed account, bottom-right)
- AWS Lambda [inside SFN] (inside the SFN container — arrows #5 and #6 connect to the SFN container border, not directly to this icon)

---

## 6. Icon Variants & Special Icons

| Element | Icon Type | Variant/Hint | Color |
|---------|-----------|-------------|-------|
| Amazon Cognito | architecture | — | pink/red |
| OpenID Connect | custom | `icon: "custom/icons8-openid.svg"` | gray/dark |
| AWS AppSync | architecture | — | pink |
| AWS Lambda (middle) | architecture | — | orange |
| AWS Lambda (SFN) | architecture | — | orange |
| Amazon DynamoDB | architecture | — | orange (purple icon on orange bg) |
| AWS CloudFormation | architecture | — | pink |
| Amazon CloudFront | architecture | — | purple |
| Amazon S3 (customer) | resource | `icon_hint: "S3 bucket"` | green |
| AWS Fargate | architecture | — | orange |
| Data Transfer Hub UI | resource | `icon_variant: Light`, `icon_hint: "Client"` | dark outline |
| User | resource | `icon_variant: Light` | dark outline |
| Amazon S3 (managed) | resource | `icon_hint: "S3 bucket"` | green |
| Amazon ECR | architecture | — | orange |
| S3 replication component template | custom/resource | `icon_hint: "CloudFormation Template Orange"` | orange |
| DynamoDB replication component template | custom/resource | `icon_hint: "CloudFormation Template Orange"` | orange |
| ECR replication component template | custom/resource | `icon_hint: "CloudFormation Template Orange"` | orange |
| ECR replication Docker image | resource | `icon_hint: "elastic container registry image"` | orange |

---

## 7. Verification Checklist

### Every leaf node accounted for:
- Amazon Cognito — arrow #8 source ✓
- OpenID Connect — standalone ✓
- Amazon DynamoDB — arrow #8 target ✓
- AWS AppSync — arrow #2 target, #4 source ✓
- AWS Lambda (middle) — arrow #4 target, #5 source ✓
- AWS Lambda (SFN) — standalone (inside SFN container) ✓
- AWS CloudFormation — arrow #6 target ✓
- Amazon CloudFront — arrow #1 target, unlabeled source ✓
- Amazon S3 (customer) — unlabeled target ✓
- AWS Fargate — arrow #7 target, unlabeled target ✓
- Data Transfer Hub UI — arrow #1 source, #2 source, #3 target ✓
- User — arrow #3 source ✓
- S3 replication component template — standalone ✓
- DynamoDB replication component template — standalone ✓
- Amazon S3 (managed) — arrow #6 source ✓
- ECR replication component template — standalone ✓
- Amazon ECR — arrow #7 source ✓
- ECR replication Docker image — standalone ✓

**All 18 leaf nodes accounted for: 12 in arrows + 6 standalone = 18 total ✓**
