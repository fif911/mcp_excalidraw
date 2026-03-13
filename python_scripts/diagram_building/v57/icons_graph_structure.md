# Icons Graph Structure - v57

| Icon_1 | Icon_2 | Arrow_direction | Arrow_number | Number box style |
|--------|--------|----------------|-------------|-----------------|
| ML engineers (person) | AWS IAM Identity Center | from 1 to 2 | 1 | dark circle, white text |
| AWS IAM Identity Center | Amazon SageMaker Unified Studio | from 1 to 2 | 2 | dark circle, white text |
| Amazon Q Developer | Studio IDE | from 1 to 2 | 3 | dark circle, white text |
| Sales Forecasting Project (right edge) | Amazon SageMaker (ML capabilities) | from 1 to 2 | 4 | dark circle, white text |
| Tools | Amazon SageMaker Lakehouse | from 1 to 2 | 5 | dark circle, white text |
| Amazon SageMaker (ML capabilities) | Amazon SageMaker Lakehouse | from 1 to 2 | 6 | dark circle, white text |
| Git repository | Database assets | from 1 to 2 | (none) | N/A |

## Notes
- Arrow 6 is DASHED (all others solid)
- Arrow 3 goes upward (bottom to top), crossing container borders
- Arrow 4 goes rightward, exiting SageMaker container into ML capabilities
- Arrow 5 goes downward, exiting SageMaker/Sales Forecasting into Lakehouse
- Arrow 6 goes downward, from ML capabilities into Lakehouse
- Internal arrow (Git repo → Database assets) is inside Sales Forecasting Project, no number
