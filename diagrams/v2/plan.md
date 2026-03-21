# Data Transfer Hub — v2 Plan

## 1. Containers

### AWS Cloud (outermost)
- Border: solid, dark (#232F3E)
- Header icon: AWS Cloud logo (auto-detected)
- Contains everything except "User"

### Customer's AWS Account (inside AWS Cloud, left side)
- Border: solid, dark (#232F3E)
- Header icon: AWS Cloud icon (auto-detected for Account containers)
- Layout: layers (4 columns — see Section 2)
- Takes up roughly the left 60% of AWS Cloud

### Authentication (inside Customer's AWS Account, top-left area)
- Border: dashed, no header icon (text-only dashed sub-boundary)
- Layout: row
- Contains: Amazon Cognito, OpenID Connect
- Sits in Column 2 of Customer's AWS Account (top portion)

### AWS Step Functions workflow (inside Customer's AWS Account, right-center area)
- Border: solid, colored pink/red (#E7157B)
- Header icon: Step Functions icon (auto-detected)
- Layout: col
- Contains: AWS Lambda (inside SFN), AWS CloudFormation
- Sits in Column 4 of Customer's AWS Account (spans top and middle rows)

### AWS Managed Account (inside AWS Cloud, right side)
- Border: solid, dark (#232F3E)
- Header icon: AWS Cloud icon (auto-detected for Account containers)
- Layout: "2x3" grid (2 columns, 3 rows)
- Takes up roughly the right 35% of AWS Cloud, positioned to the right of Customer's AWS Account

## 2. Service Nodes (grouped by column within Customer's AWS Account)

The Customer's AWS Account uses `layout: layers` with 4 columns:

### Column 1 (leftmost): Data Transfer Hub UI
- Data Transfer\nHub UI (resource icon, Light variant — it's the monitor/computer icon in the reference)
  - This is a generic "client" icon. Use `icon_hint: "client"` or resource variant.
  - Positioned in the bottom-left area of Customer Account

### Column 2: Authentication + AppSync + CloudFront
- **Authentication sub-container (row layout) — top:**
  - Amazon Cognito (architecture icon, default — red/pink icon)
  - OpenID Connect (custom icon — `icon: "custom/icons8-openid.svg"`)
- AWS AppSync (architecture icon, default — pink/magenta icon) — middle
- Amazon CloudFront (architecture icon, default — purple icon) — bottom

### Column 3: DynamoDB + Lambda (middle) + S3
- Amazon DynamoDB (architecture icon, default — blue/purple icon) — top
- AWS Lambda (architecture icon, default — orange icon) — middle. This is the middle Lambda, NOT the one inside Step Functions
- Amazon S3 (architecture icon, default — green bucket icon) — bottom

### Column 4: SFN container + Fargate
- **AWS Step Functions workflow sub-container (col layout) — top/middle:**
  - AWS Lambda (architecture icon, default — orange) — this is the Lambda INSIDE Step Functions
  - AWS CloudFormation (architecture icon, default — pink icon with cloud)
- AWS Fargate (architecture icon, default — orange icon) — bottom, below SFN container

### AWS Managed Account (2x3 grid):

**Row 1:**
- S3 replication\ncomponent template (resource icon — orange outline icon, looks like a CloudFormation template/stack icon, use `icon_hint: "CloudFormation Stack Orange"`)
- DynamoDB replication\ncomponent template (resource icon — orange outline icon, same template style, use `icon_hint: "CloudFormation Stack Orange"`)

**Row 2:**
- Amazon S3 (architecture icon — green bucket, this is a separate S3 from the one in Customer Account)
- ECR replication\ncomponent template (resource icon — orange outline icon, same template style, use `icon_hint: "CloudFormation Stack Orange"`)

**Row 3:**
- Amazon ECR (architecture icon, default — orange container registry icon)
- ECR replication\nDocker image (resource icon — orange/pink icon, use `icon_hint: "ECR Image"`)

### Elements inside AWS Cloud but outside both Account containers:
(None — all elements are either inside Customer Account, Managed Account, or outside AWS Cloud entirely)

## 3. Arrow Connection Table

| # | Source | Target | Badge # | Badge style |
|---|--------|--------|---------|-------------|
| 1 | Data Transfer\nHub UI | Amazon CloudFront | 1 | dark circle |
| 2 | Amazon Cognito | AWS AppSync | 2 | dark circle |
| 3 | Data Transfer\nHub UI | Amazon Cognito | 3 | dark circle |
| 4 | AWS AppSync | AWS Lambda (middle) | 4 | dark circle |
| 5 | AWS Lambda (middle) | SFN border (left) | 5 | dark circle |
| 6 | Amazon S3 (managed) | AWS CloudFormation (inside SFN) | 6 | dark circle |
| 7 | Amazon ECR | AWS Fargate | 7 | dark circle |
| 8 | Amazon Cognito | Amazon DynamoDB | 8 | dark circle |

**Total: 8 numbered + unlabeled arrows below = all arrows**

### Unlabeled arrows table

| Source | Target |
|--------|--------|
| Amazon CloudFront | Amazon S3 (customer) |
| SFN border (bottom) | AWS Fargate |

**Total: 8 numbered + 2 unlabeled = 10 arrows**

## 4. Standalone Elements (no connections)

- OpenID Connect (inside Authentication container, no arrows)
- S3 replication\ncomponent template (Managed Account — no arrows)
- DynamoDB replication\ncomponent template (Managed Account — no arrows)
- ECR replication\ncomponent template (Managed Account — no arrows)
- ECR replication\nDocker image (Managed Account — no arrows)
- AWS Lambda (inside SFN) — no direct arrows to this icon (arrows go to SFN border, not to this icon directly)

## 5. External Actors

### User
- **Nesting level: OUTSIDE AWS Cloud** — the User icon sits below and to the left of the AWS Cloud container, completely outside it
- Icon: generic person/user icon (resource, Light variant)
- No arrows connect to/from User — it is standalone in this diagram

### Data Transfer Hub UI
- **Nesting level: INSIDE Customer's AWS Account** — it sits inside the Customer Account container, in the leftmost column, at the bottom area
- Not an external actor per se, but a client-facing element
- Icon: monitor/desktop icon (resource, Light variant — use `icon_hint: "client"`)

## 6. Icon Variants and Special Notes

| Element | Icon type | Variant/hint | Notes |
|---------|-----------|-------------|-------|
| User | resource | Light | Generic person icon |
| Data Transfer\nHub UI | resource | Light | Monitor/client icon, `icon_hint: "client"` |
| Amazon Cognito | architecture | default | Red/pink icon |
| OpenID Connect | custom | `icon: "custom/icons8-openid.svg"` | Not an AWS service |
| AWS AppSync | architecture | default | Pink/magenta icon |
| Amazon CloudFront | architecture | default | Purple icon |
| Amazon DynamoDB | architecture | default | Blue icon |
| AWS Lambda (middle) | architecture | default | Orange icon |
| AWS Lambda (inside SFN) | architecture | default | Orange icon — same label as middle Lambda |
| Amazon S3 (customer) | architecture | default | Green bucket |
| AWS CloudFormation | architecture | default | Pink/red icon |
| AWS Fargate | architecture | default | Orange icon |
| Amazon S3 (managed) | architecture | default | Green bucket — same as customer S3 |
| Amazon ECR | architecture | default | Orange icon |
| S3 replication\ncomponent template | resource | `icon_hint: "CloudFormation Stack Orange"` | Orange outline template icon |
| DynamoDB replication\ncomponent template | resource | `icon_hint: "CloudFormation Stack Orange"` | Orange outline template icon |
| ECR replication\ncomponent template | resource | `icon_hint: "CloudFormation Stack Orange"` | Orange outline template icon |
| ECR replication\nDocker image | resource | `icon_hint: "ECR Image"` | Orange/pink image icon |

## 7. Arrow Routing Notes (for Main reference)

- **Arrow 1** (DTH UI -> CloudFront): horizontal, right-pointing, both in same container
- **Arrow 2** (Cognito -> AppSync): L-shape, goes down from Cognito area then right to AppSync. Badge is at the left side near the bend.
- **Arrow 3** (DTH UI -> Cognito): vertical/L-shape, goes up from DTH UI to Cognito. Badge near the bottom.
- **Arrow 4** (AppSync -> Lambda middle): horizontal, right-pointing
- **Arrow 5** (Lambda middle -> SFN border left): horizontal, right-pointing, ends at SFN container left border
- **Arrow 6** (S3 managed -> CloudFormation inside SFN): horizontal, left-pointing (from managed account into SFN). Badge at the gap between accounts. Arrow crosses the account border.
- **Arrow 7** (ECR -> Fargate): horizontal, left-pointing (from managed account to Customer account). Badge at the gap between accounts.
- **Arrow 8** (Cognito -> DynamoDB): horizontal, right-pointing from Authentication area to DynamoDB. Badge near the left side.
- **Unlabeled: CloudFront -> S3 (customer)**: horizontal, right-pointing
- **Unlabeled: SFN border (bottom) -> Fargate**: vertical, downward from SFN bottom border to Fargate

## 8. Additional Observations

- **Unlabeled arrow entering Cognito from the left:** There is a short unlabeled arrow entering Amazon Cognito from the left side, appearing to originate from outside the Customer Account boundary. No source element within the diagram can be identified for this arrow. Per the "no external arrows" rule, this arrow is omitted from the connection tables. If the Critic flags it, the Planner should revisit to determine the correct source.

- **Arrow badge style:** All numbered badges in this diagram use the dark filled circle style (dark background #232F3E, white text, circle shape). This is consistent across all 8 numbered arrows.

- **Duplicate service labels:** There are two "AWS Lambda" icons (one in Column 3, one inside the SFN container) and two "Amazon S3" icons (one in Customer Account Column 3, one in Managed Account). The D2 identifiers must be unique but the display labels should match.

- **User element placement:** User sits completely outside the AWS Cloud container at the bottom-left. It is standalone with no connections.

## 9. Verification Checklist

Every leaf node must appear in exactly one of: numbered arrows, unlabeled arrows, or standalone elements.

**In numbered arrows (as source or target):**
- Data Transfer Hub UI (source in #1, #3)
- Amazon CloudFront (target in #1)
- Amazon Cognito (source in #2, #8; target in #3)
- AWS AppSync (target in #2, source in #4)
- AWS Lambda middle (target in #4, source in #5)
- SFN border (target in #5) — represents the container, not a leaf
- Amazon S3 managed (source in #6)
- AWS CloudFormation (target in #6)
- Amazon ECR (source in #7)
- AWS Fargate (target in #7)
- Amazon DynamoDB (target in #8)

**In unlabeled arrows:**
- Amazon CloudFront (source) — already in numbered
- Amazon S3 customer (target)
- SFN border bottom (source) — container
- AWS Fargate (target) — already in numbered

**In standalone:**
- OpenID Connect
- S3 replication component template
- DynamoDB replication component template
- ECR replication component template
- ECR replication Docker image
- AWS Lambda (inside SFN)
- User

**All 18 leaf nodes accounted for. No gaps.**
