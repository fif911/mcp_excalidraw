# Arrow Connection Reference - Data Transfer Hub v2

## Numbered Arrows

| # | Icon_1 | Icon_2 | Arrow_direction | Arrow_number | Number badge style |
|---|--------|--------|-----------------|--------------|-------------------|
| 1 | Data Transfer Hub UI | Amazon CloudFront | left -> right (L-shape: right then down) | 1 | dark circle |
| 2 | Amazon Cognito | AWS AppSync | left -> right (L-shape: down then right) | 2 | dark circle |
| 3 | User | Data Transfer Hub UI | bottom -> top (L-shape: left then up then right) | 3 | dark circle |
| 4 | AWS AppSync | AWS Lambda (middle) | left -> right | 4 | dark circle |
| 5 | AWS Lambda (middle) | AWS Lambda (SFN) | left -> right (L-shape: right then up) | 5 | dark circle |
| 6 | Amazon S3 (Managed) | AWS CloudFormation | right -> left | 6 | dark circle |
| 7 | Amazon ECR | AWS Fargate | right -> left | 7 | dark circle |
| 8 | AWS AppSync | Amazon DynamoDB | bottom -> top (L-shape: up then right) | 8 | dark circle |

## Unlabeled Arrows

| Icon_1 | Icon_2 | Arrow_direction | Notes |
|--------|--------|-----------------|-------|
| Data Transfer Hub UI | Amazon Cognito | L-shape: left to x=60, up, right into Cognito | Authentication flow |
| Data Transfer Hub UI | AWS AppSync | Z-shape: right to x=250, up, right into AppSync | API calls |
| Amazon CloudFront | Amazon S3 (Customer) | left -> right | Static content serving, bottom row |
| AWS CloudFormation | AWS Fargate | top -> bottom | Deployment, vertical down from SFN to bottom row |

## Total Arrows: 12 (8 numbered + 4 unlabeled)

## Arrow Routing Notes
- #1: L-shape from DTH right side, right to x=280 then down to CloudFront
- #2: L-shape from Cognito label bottom, down to AppSync Y, then right to AppSync left
- #3: L-shape from User left, left to x=55, up to DTH Y, then right to DTH left
- #4: Horizontal straight arrow, middle row
- #5: L-shape from Lambda right, right to x=720, up to SFN Lambda Y, then right
- #6: Horizontal arrow from Managed Account S3 left across gap to CloudFormation in SFN
- #7: Horizontal arrow from Managed Account ECR left across gap to Fargate
- #8: L-shape from AppSync top, up to DynamoDB Y, then right to DynamoDB left
- DTH->Cognito: L-shape via x=60 (outside auth-box margin), up then right
- DTH->AppSync: Z-shape via x=250, up then right
- CloudFront->S3: Short horizontal right, bottom row
- CloudFormation->Fargate: Vertical down from SFN area to bottom row
