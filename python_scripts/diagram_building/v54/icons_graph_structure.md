# Icons Graph Structure — v54

## Icons

| ID | Icon | Label | Position |
|----|------|-------|----------|
| ml-engineers | User (48px Light) | ML\nengineers | External, far left |
| iam-identity | IAM Identity Center (64px) | AWS IAM\nIdentity Center | Left of AWS Region |
| sagemaker-unified | SageMaker (Analytics 48px) | Amazon SageMaker\nUnified Studio | Header of Unified Studio container |
| database-assets | Database (48px Light) | Database assets | Sales Forecasting, top-left |
| git-repo | Git Repository (48px Light) | Git repository | Sales Forecasting, top-right |
| studio-ide | SageMaker AI Notebook (48px) | Studio IDE | Sales Forecasting, bottom-left |
| tools | SageMaker AI Model (48px) | Tools | Sales Forecasting, bottom-right |
| ml-cap-icon | AI Category (48px) | ML capabilities | Header of ML capabilities |
| sagemaker-ml | SageMaker AI (64px) | Amazon SageMaker | Inside ML capabilities |
| coding-cap-icon | Developer Tools Category (48px) | Coding capabilities | Header of Coding capabilities |
| amazon-q | Amazon Q (64px) | Amazon Q\nDeveloper | Inside Coding capabilities |
| redshift | Amazon Redshift (64px) | Amazon Redshift\nServerless | Inside Lakehouse |
| s3 | Amazon S3 (64px) | Amazon S3 | Inside Lakehouse > Storage |
| glue-catalog | Glue Data Catalog (48px) | AWS Glue\nData Catalog | Inside Lakehouse > Catalog |

## Connections (Arrows)

| Arrow | From | To | Direction | Style | Step # |
|-------|------|----|-----------|-------|--------|
| A1 | ml-engineers | iam-identity | right | solid | — |
| A2 | iam-identity | sagemaker-unified | right | solid | 1 |
| A3 | unified-studio (right edge) | ml-cap (left edge) | right | solid | — |
| A4 | coding-cap (top) | unified-studio (bottom) | up | solid | — |
| A5 | lakehouse (top) | unified-studio (bottom) | up | solid | — |
| A6 | sagemaker-ml | lakehouse | down | dashed | 6 |
| A7 | git-repo | database-assets | left | solid | — |

## Standalone Numbered Circles

| Circle | Number | Position |
|--------|--------|----------|
| C1 | 1 | On arrow A2 midpoint |
| C2 | 2 | Below SageMaker Unified Studio icon |
| C3 | 3 | On arrow A4 (Coding cap → Unified Studio) |
| C4 | 4 | Standalone, upper-right of ML capabilities |
| C5 | 5 | On arrow A5 (Lakehouse → Unified Studio) |
| C6 | 6 | On dashed arrow A6 |
