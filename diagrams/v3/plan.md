# Data Transfer Hub — v3 Plan

## 1. Containers

### AWS Cloud (outermost)
- Border: solid, dark gray (`#232F3E`)
- Header: "AWS Cloud" with AWS logo
- Contains: User (external actor), Customer's AWS Account, AWS Managed Account

### Customer's AWS Account
- Border: solid, dark gray
- Header: "Customer's AWS Account" with AWS Cloud icon
- Layout: layers (4 columns, described in Section 2)
- Position: left side, roughly 65% of total width

### Authentication (sub-container inside Customer's AWS Account, column 1)
- Border: dashed, dark gray (text-only header, no icon)
- Layout: row
- Contains: Amazon Cognito, OpenID Connect

### AWS Step Functions workflow (sub-container inside Customer's AWS Account, column 4)
- Border: solid, pink/magenta (`#E7157B`)
- Header: "AWS Step Functions workflow" with Step Functions icon
- Contains: AWS Lambda (the one inside SFN) — single element, no layout needed

### AWS Managed Account
- Border: solid, dark gray
- Header: "AWS Managed Account" with AWS Cloud icon
- Layout: 2x3
- Position: right side, roughly 35% of total width

## 2. Service Nodes (by column within Customer's AWS Account)

The Customer's AWS Account uses `layout: layers` with 4 columns arranged left to right:

### Column 1 (leftmost): Authentication + Data Transfer Hub UI
- **Authentication** sub-container (row layout):
  - Amazon Cognito (architecture icon)
  - OpenID Connect (custom icon)
- Data Transfer\nHub UI (icon_hint: "client" — small monitor/window icon)

### Column 2: AppSync + CloudFront
- AWS AppSync (architecture icon) — middle row
- Amazon CloudFront (architecture icon) — bottom row

### Column 3: DynamoDB + Lambda + S3
- Amazon DynamoDB (architecture icon) — top row
- AWS Lambda (architecture icon — the middle one, NOT inside SFN) — middle row
- Amazon S3 (architecture icon) — bottom row

### Column 4: Step Functions + CloudFormation + Fargate
- **AWS Step Functions workflow** sub-container:
  - AWS Lambda (architecture icon — the one INSIDE SFN)
- AWS CloudFormation (architecture icon) — below SFN, outside it
- AWS Fargate (architecture icon) — bottom row

### Service nodes inside AWS Managed Account (2x3 grid)

Row 1:
- S3 replication\ncomponent template (icon_hint: "CloudFormation Template Orange")
- DynamoDB replication\ncomponent template (icon_hint: "CloudFormation Template Orange")

Row 2:
- Amazon S3 (architecture icon)
- ECR replication\ncomponent template (icon_hint: "CloudFormation Template Orange")

Row 3:
- Amazon ECR (architecture icon)
- ECR replication\nDocker image (icon_hint: "elastic container registry")

## 3. Arrow Connection Table

| # | Source | Target | Badge # | Badge style |
|---|--------|--------|---------|-------------|
| 1 | Amazon CloudFront | Amazon S3 | 1 | dark circle |
| 2 | User | AWS AppSync | 2 | dark circle |
| 3 | User | Data Transfer Hub UI | 3 | dark circle |
| 4 | AWS AppSync | AWS Lambda (middle) | 4 | dark circle |
| 5 | AWS Lambda (middle) | SFN border (left) | 5 | dark circle |
| 6 | AWS CloudFormation | Amazon S3 (Managed Account) | 6 | dark circle |
| 7 | AWS Fargate | Amazon ECR (Managed Account) | 7 | dark circle |
| 8 | AWS AppSync | Amazon DynamoDB | 8 | dark circle |
| 9 | Data Transfer Hub UI | Amazon CloudFront | — | — |

**Total: 8 numbered + 1 unlabeled = 9 arrows**

### Arrow routing notes

- **Arrow 1** (CloudFront -> S3): Horizontal arrow going right within Customer Account bottom area.
- **Arrow 2** (User -> AppSync): The arrow goes from User upward and rightward, entering Customer Account left border, passing through/near Authentication area, reaching AWS AppSync. L-shape or diagonal approach.
- **Arrow 3** (User -> DTH UI): Horizontal arrow going right from User to Data Transfer Hub UI. Both at bottom-left area.
- **Arrow 4** (AppSync -> Lambda middle): Horizontal arrow going right.
- **Arrow 5** (Lambda middle -> SFN border): Horizontal arrow going right, ending at the Step Functions container left border.
- **Arrow 6** (CloudFormation -> S3 Managed): Cross-container arrow. Exits Customer Account right border, crosses gap, enters Managed Account left border, reaches Amazon S3 inside Managed Account.
- **Arrow 7** (Fargate -> ECR Managed): Cross-container arrow. Same pattern as arrow 6 — exits right, enters Managed Account, reaches Amazon ECR.
- **Arrow 8** (AppSync -> DynamoDB): Vertical arrow going upward from AppSync to DynamoDB.
- **Arrow 9** (unlabeled, DTH UI -> CloudFront): Goes from Data Transfer Hub UI rightward/downward to Amazon CloudFront.

## 4. Standalone Elements

- S3 replication component template (Managed Account)
- DynamoDB replication component template (Managed Account)
- ECR replication component template (Managed Account)
- ECR replication Docker image (Managed Account)
- Amazon Cognito (inside Authentication — no arrows connect directly to it)
- OpenID Connect (inside Authentication — no arrows connect directly to it)

Note: The Authentication container is not an arrow endpoint. Arrow 2 goes from User directly to AWS AppSync; it visually passes near the Authentication area but the endpoints are User and AppSync.

## 5. External Actors

### User (stick figure)
- **Nesting level: inside AWS Cloud, OUTSIDE Customer's AWS Account**
- Sits at the bottom-left of the diagram, inside the AWS Cloud border but outside the Customer's AWS Account border
- There must be a gap between the AWS Cloud left border and the Customer's AWS Account left border (at least 200px) to fit the User icon
- Connected to: AWS AppSync (arrow 2), Data Transfer Hub UI (arrow 3)
- Icon: `icon_type: resource`, `icon_variant: Light` (stick figure)

## 6. Icon Variants

| Element | Icon specification |
|---------|-------------------|
| User | `icon_type: resource`, `icon_variant: Light` (stick figure) |
| OpenID Connect | `icon: "custom/icons8-openid.svg"` (custom, not in AWS library) |
| Data Transfer Hub UI | `icon_hint: "client"` (small monitor/window icon) |
| S3 replication component template | `icon_hint: "CloudFormation Template Orange"` |
| DynamoDB replication component template | `icon_hint: "CloudFormation Template Orange"` |
| ECR replication component template | `icon_hint: "CloudFormation Template Orange"` |
| ECR replication Docker image | `icon_hint: "elastic container registry"` |
| All other AWS services | Default architecture icons (auto-resolved from label) |

## 7. Arrow Style (global)

```
arrow_style {
  stroke_color: "#545B64"
  badge_bg: "#232F3E"
  badge_color: "#ffffff"
  badge_shape: circle
}
```

Dark filled circles on all 8 numbered badges.

## 8. Verification Checklist

Every leaf node appears in at least one of: arrows (as source or target), or standalone list.

**In arrows (source or target):**
- User (2, 3)
- AWS AppSync (2, 4, 8)
- Data Transfer Hub UI (3, 9)
- AWS Lambda middle (4, 5)
- SFN / AWS Lambda inside SFN (5 — target)
- Amazon DynamoDB (8)
- Amazon CloudFront (1, 9)
- Amazon S3 Customer Account (1)
- AWS CloudFormation (6)
- Amazon S3 Managed Account (6)
- AWS Fargate (7)
- Amazon ECR (7)

**Standalone (no connections):**
- Amazon Cognito
- OpenID Connect
- S3 replication component template
- DynamoDB replication component template
- ECR replication component template
- ECR replication Docker image

**All 18 leaf elements accounted for.**
