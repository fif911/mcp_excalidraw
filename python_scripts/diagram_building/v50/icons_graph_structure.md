# Icons Graph Structure — v50

## Service Icons and Connections

| # | Icon | Service Name | Connected To | Arrow Direction | Circle |
|---|------|-------------|-------------|-----------------|--------|
| 1 | file-users | Users | CloudFront | → (right) | C1 |
| 2 | file-cloudfront | Amazon CloudFront | S3 WebUIBucket | → (right) | C2 |
| 3 | file-s3-bucket | Amazon S3 bucket WebUIBucket | Cognito, API Gateway | ↑ (up-left to Cognito), → (right-down to API GW) | - |
| 4 | file-cognito | Amazon Cognito | Client API trunk | ← (from right) | C5 on trunk |
| 5 | file-dynamodb | Amazon DynamoDB Settings table | Lambda Settings | ← (from right) | C6 |
| 6 | file-lambda | AWS Lambda Settings function | DynamoDB, Client API | → (left to DynamoDB), ↓ (down to Client API) | C6 |
| 7 | file-apigw | Amazon API Gateway | (inside Client API) | - | C4 (green, between APIGW and AppSync) |
| 8 | file-appsync | AWS AppSync | (inside Client API) | - | - |
| 9 | file-lambda | AWS Lambda Cost function | Athena, S3 AthenaResults | → (right), ⌒ (skip below) | C9, C12 |
| 10 | file-athena | Amazon Athena | S3 CURBucket | → (right) | C10 |
| 11 | file-s3-bucket | Amazon S3 bucket CURBucket | CUR (receives) | ← (from right) | C11 |
| 12 | file-cur | AWS Cost & Usage Report | S3 CURBucket | → (left, arrow to S3 CUR) | C11 |
| 13 | file-s3-bucket | Amazon S3 bucket AthenaResultsBucket | Lambda Cost (receives skip) | ← (from left, skip arrow) | C12 |
| 14 | file-lambda | AWS Lambda Gremlin function | Neptune | ↔ (bidirectional) | C7 |
| 15 | file-neptune | Amazon Neptune | Lambda Gremlin | ↔ (bidirectional) | C7 |
| 16 | file-lambda | AWS Lambda Search function | OpenSearch | ↔ (bidirectional) | C8 |
| 17 | file-opensearch | Amazon OpenSearch Service | Lambda Search | ↔ (bidirectional) | C8 |
| 18 | file-ecs | Amazon Elastic Container Service | Fargate, ECR | ← (from ECR), → (to Fargate) | C15 |
| 19 | file-fargate | AWS Fargate | ECS, API GW Gremlin, SDK, Config | ← (from ECS), → (to API GW Gremlin, SDK, Config) | C16, C17 |
| 20 | file-ecr | Amazon Elastic Container Registry | ECS, Container image | ← (from Container image), → (to ECS) | C14 |
| 21 | file-s3-bucket | Amazon S3 bucket DiscoveryBucket | CodePipeline | ↓ (down) | - |
| 22 | file-codepipeline | AWS CodePipeline | S3 Discovery, CodeBuild | ↑ (from S3), ↓ (to CodeBuild) | C13 |
| 23 | file-codebuild | AWS CodeBuild | CodePipeline, Container image | ↑ (from CodePipeline), ↓ (to Container) | - |
| 24 | file-container-img | Container image | CodeBuild, ECR | ↑ (from CodeBuild), → (left to ECR) | - |
| 25 | file-amplify | AWS Amplify | S3 AmplifyStorage | ↔ (bidirectional) | C3 |
| 26 | file-s3-bucket | Amazon S3 bucket AmplifyStorageBucket | Amplify | ↔ (bidirectional) | C3 |
| 27 | file-apigw | Amazon API Gateway ServiceGremlin API | Fargate (receives) | ← (from right, VPC) | C17 |
| 28 | file-sdk | AWS SDK | Fargate (receives) | ← (from right, VPC) | C16 |
| 29 | file-config | AWS Config | Fargate (receives) | ← (from right, VPC) | - |

## Container-to-Container Arrows
- Client API ↔ VPC: bidirectional horizontal arrow
- Client API → API GW Gremlin API: L-shape arrow down-right

## Cross-Container Arrows
- S3 WebUIBucket → API Gateway (crosses Web UI to Client API)
- Container image → ECR (crosses Image deployment to VPC/Discovery)
- Fargate → API GW Gremlin, SDK, Config (exits VPC left to standalone services)
