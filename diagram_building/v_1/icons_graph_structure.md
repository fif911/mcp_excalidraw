# Arrow Connection Reference - Data Transfer Hub

## Numbered Arrows

| # | Icon_1 | Icon_2 | Arrow_direction | Arrow_number | Number badge style |
|---|--------|--------|-----------------|--------------|--------------------|
| 1 | Data Transfer Hub UI | Amazon CloudFront | left → right | 1 | dark circle |
| 2 | Amazon Cognito | AWS AppSync | left → right | 2 | dark circle |
| 3 | User | Data Transfer Hub UI | bottom → top | 3 | dark circle |
| 4 | AWS AppSync | AWS Lambda (middle) | left → right | 4 | dark circle |
| 5 | AWS Lambda (middle) | AWS Step Functions workflow | left → right | 5 | dark circle |
| 6 | Amazon S3 (Managed) | AWS CloudFormation | right → left | 6 | dark circle |
| 7 | Amazon ECR | AWS Fargate | right → left | 7 | dark circle |
| 8 | AWS AppSync | Amazon DynamoDB | bottom → top | 8 | dark circle |

## Unlabeled Arrows

| Icon_1 | Icon_2 | Arrow_direction | Notes |
|--------|--------|-----------------|-------|
| External (left edge) | Amazon Cognito | left → right | Enters from outside diagram through all boundaries |
| Amazon CloudFront | Amazon S3 (Customer) | left → right | Static content serving |
| AWS CloudFormation | AWS Fargate | top → bottom | Deployment arrow, vertical |

## Total Arrows: 11 (8 numbered + 3 unlabeled)

## Arrow Routing Notes
- #1: Horizontal straight arrow, bottom row
- #2: L-shaped from Auth boundary right side → AppSync (drop down then right, or straight right)
- #3: Vertical arrow from User up through AWS Cloud boundary into Customer Account
- #4: Horizontal straight arrow, middle row
- #5: Horizontal arrow entering Step Functions pink boundary from left
- #6: Horizontal arrow crossing from Managed Account container to Customer Account (right to left)
- #7: Horizontal arrow crossing from Managed Account container to Customer Account (right to left), bottom row
- #8: Vertical arrow from AppSync row up to DynamoDB
- External→Cognito: Horizontal arrow entering from left edge through all boundaries
- CloudFront→S3: Horizontal short arrow, bottom row
- CloudFormation→Fargate: Vertical arrow going down from Step Functions area to bottom row
