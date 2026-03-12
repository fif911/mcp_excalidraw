#!/usr/bin/env python3
"""
Build diagram v50 — AWS Perspective (Data Discovery) Solution Architecture
Recreates the reference architecture with Web UI, Cost, VPC (Data + Discovery),
Image deployment, Storage management components. Numbered circles 1-17.
"""
import sys, time
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[2] / 'clients' / 'python'))
from components import *

# ===================================================
# 0. ICON PACK
# ===================================================
AWS = "aws-icons-official/"
register_icon_pack("v50", {
    # Group / header icons
    "file-cloud-logo":  AWS + "Architecture-Group-Icons_01302026/AWS-Cloud-logo_32.svg",
    "file-vpc":         AWS + "Architecture-Group-Icons_01302026/Virtual-private-cloud-VPC_32.svg",
    "file-priv-subnet": AWS + "Architecture-Group-Icons_01302026/Private-subnet_32.svg",
    # Service icons (48px, light background)
    "file-cloudfront":  AWS + "Architecture-Service-Icons_01302026/Arch_Networking-Content-Delivery/48/Arch_Amazon-CloudFront_48.svg",
    "file-cognito":     AWS + "Architecture-Service-Icons_01302026/Arch_Security-Identity/48/Arch_Amazon-Cognito_48.svg",
    "file-dynamodb":    AWS + "Architecture-Service-Icons_01302026/Arch_Databases/48/Arch_Amazon-DynamoDB_48.svg",
    "file-lambda":      AWS + "Architecture-Service-Icons_01302026/Arch_Compute/48/Arch_AWS-Lambda_48.svg",
    "file-apigw":       AWS + "Architecture-Service-Icons_01302026/Arch_Networking-Content-Delivery/48/Arch_Amazon-API-Gateway_48.svg",
    "file-appsync":     AWS + "Architecture-Service-Icons_01302026/Arch_Application-Integration/48/Arch_AWS-AppSync_48.svg",
    "file-athena":      AWS + "Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_Amazon-Athena_48.svg",
    "file-neptune":     AWS + "Architecture-Service-Icons_01302026/Arch_Databases/48/Arch_Amazon-Neptune_48.svg",
    "file-opensearch":  AWS + "Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_Amazon-OpenSearch-Service_48.svg",
    "file-fargate":     AWS + "Architecture-Service-Icons_01302026/Arch_Containers/48/Arch_AWS-Fargate_48.svg",
    "file-ecs":         AWS + "Architecture-Service-Icons_01302026/Arch_Containers/48/Arch_Amazon-Elastic-Container-Service_48.svg",
    "file-ecr":         AWS + "Architecture-Service-Icons_01302026/Arch_Containers/48/Arch_Amazon-Elastic-Container-Registry_48.svg",
    "file-codepipeline":AWS + "Architecture-Service-Icons_01302026/Arch_Developer-Tools/48/Arch_AWS-CodePipeline_48.svg",
    "file-codebuild":   AWS + "Architecture-Service-Icons_01302026/Arch_Developer-Tools/48/Arch_AWS-CodeBuild_48.svg",
    "file-amplify":     AWS + "Architecture-Service-Icons_01302026/Arch_Front-End-Web-Mobile/48/Arch_AWS-Amplify_48.svg",
    "file-config":      AWS + "Architecture-Service-Icons_01302026/Arch_Management-Tools/48/Arch_AWS-Config_48.svg",
    "file-cur":         AWS + "Architecture-Service-Icons_01302026/Arch_Cloud-Financial-Management/48/Arch_AWS-Cost-and-Usage-Report_48.svg",
    "file-sdk":         AWS + "Architecture-Service-Icons_01302026/Arch_Developer-Tools/48/Arch_AWS-Tools-and-SDKs_48.svg",
    "file-s3-bucket":   AWS + "Architecture-Service-Icons_01302026/Arch_Storage/48/Arch_Amazon-Simple-Storage-Service_48.svg",
    "file-users":       AWS + "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Users_48_Light.svg",
    "file-container-img": AWS + "Resource-Icons_01302026/Res_Containers/Res_Amazon-Elastic-Container-Registry_Image_48.svg",
})

# ===================================================
# 1. SETUP
# ===================================================
clear()
time.sleep(0.5)
upload_icons("v50")
time.sleep(0.5)

# ===================================================
# LAYOUT CONSTANTS
# ===================================================
DARK = "#1a1a1a"
GRAY = "#879196"
GREEN_VPC = "#248814"
BLUE_SUB = "#147eba"
CLIENT_BG = "#e9ecef"
ORANGE = "#e8590c"
GREEN_C4 = "#2f9e44"

SVC_ICON = 65
HDR_ICON = 40
FONT_HDR = 22
FONT_BODY = 16

COMP_GAP = 8
ICON_R = SVC_ICON / 2

def icy_to_cy(target_icon_cy, label_text, icon_size=SVC_ICON, gap=COMP_GAP, font_size=FONT_BODY):
    """Compute component center cy so the icon image center lands at target_icon_cy."""
    if label_text and label_text.strip():
        text_h = estimate_text_height(label_text, font_size)
        return target_icon_cy + gap / 2 + text_h / 2
    return target_icon_cy

CIRCLE_BG = DARK
CIRCLE_SIZE = 36
CIRCLE_R = CIRCLE_SIZE / 2
COFFSET = CIRCLE_R + 5

# ===================================================
# CONTAINER COORDINATES
# ===================================================
CLOUD_X = 65;   CLOUD_Y = 20;   CLOUD_W = 1900; CLOUD_H = 1250

WEBUI_X = 90;   WEBUI_Y = 70;   WEBUI_W = 480;  WEBUI_H = 410

COST_X = 850;   COST_Y = 70;    COST_W = 820;   COST_H = 250

CAPI_X = 560;   CAPI_Y = 400;   CAPI_W = 240;   CAPI_H = 200

VPC_X = 840;    VPC_Y = 370;    VPC_W = 680;    VPC_H = 860
PSUB_X = 880;   PSUB_Y = 415;   PSUB_W = 620;   PSUB_H = 800
DATA_X = 920;   DATA_Y = 460;   DATA_W = 560;   DATA_H = 380
DISC_X = 920;   DISC_Y = 880;   DISC_W = 560;   DISC_H = 300

IMGD_X = 1540;  IMGD_Y = 480;   IMGD_W = 300;   IMGD_H = 650
STOR_X = 90;    STOR_Y = 510;   STOR_W = 450;   STOR_H = 150

# ===================================================
# SERVICE POSITIONS (cx, cy) — icon image center Y
# ===================================================
# Web UI
DYNAMO_CX = 280;       DYNAMO_CY = 155
COGNITO_CX = 290;      COGNITO_CY = 295
CLOUDFRONT_CX = 170;   CLOUDFRONT_CY = 410
S3_WEBUI_CX = 390;     S3_WEBUI_CY = 410

# Lambda Settings (standalone)
LAMBDA_SET_CX = 640;   LAMBDA_SET_CY = 155

# Cost row
COST_ROW_Y = 150
COST_CTR = COST_X + COST_W // 2
LAMBDA_COST_CX = COST_CTR - 300;  LAMBDA_COST_CY = COST_ROW_Y
ATHENA_CX = COST_CTR - 150;       ATHENA_CY = COST_ROW_Y
S3_CUR_CX = COST_CTR;             S3_CUR_CY = COST_ROW_Y
CUR_CX = COST_CTR + 150;          CUR_CY = COST_ROW_Y
S3_ATHENA_CX = COST_CTR + 300;    S3_ATHENA_CY = COST_ROW_Y

# Client API
APIGW_CX = 620;        APIGW_CY = 505
APPSYNC_CX = 740;      APPSYNC_CY = 505

# Data component
DATA_CTR = DATA_X + DATA_W // 2
LAMBDA_GREM_CX = DATA_CTR - 130; LAMBDA_GREM_CY = 580
NEPTUNE_CX = DATA_CTR + 130;     NEPTUNE_CY = 580
LAMBDA_SRCH_CX = DATA_CTR - 130; LAMBDA_SRCH_CY = 740
OPENSEARCH_CX = DATA_CTR + 130;  OPENSEARCH_CY = 740

# Discovery component
DISC_CTR = DISC_X + DISC_W // 2
ECS_CX = DISC_CTR;               ECS_CY = 950
FARGATE_CX = DISC_CTR - 150;     FARGATE_CY = 1050
ECR_CX = DISC_CTR + 150;         ECR_CY = 1050

# Image deployment
IMGD_CX = 1690

# Storage management
AMPLIFY_CX = 180;      AMPLIFY_CY = 590
S3_AMPLIFY_CX = 400;   S3_AMPLIFY_CY = 590

# Standalone services
APIGW_GREM_CX = 700;   APIGW_GREM_CY = 670
SDK_CX = 700;           SDK_CY = 800
CONFIG_CX = 700;        CONFIG_CY = 920

# External
USERS_CX = 15;          USERS_CY = 410

# Arrow label offset
LABEL_2LINE_H = int(SVC_ICON / 2 + COMP_GAP + FONT_BODY * 1.25 * 2 + 15)

# ===================================================
# 2. CONTAINERS (outside-in)
# ===================================================
container_box("aws-cloud", CLOUD_X, CLOUD_Y, CLOUD_W, CLOUD_H, GRAY, "transparent",
              icon_file_id="file-cloud-logo", label_text="AWS Cloud", label_color=DARK,
              icon_header_size=HDR_ICON, header_height=HDR_ICON, label_font_size=FONT_HDR,
              stroke_style="dashed", stroke_width=1)

container_box("web-ui", WEBUI_X, WEBUI_Y, WEBUI_W, WEBUI_H, GRAY, "transparent",
              label_text="Web UI component", label_color=DARK,
              stroke_style="dashed", stroke_width=1, label_font_size=FONT_HDR)

container_box("cost-comp", COST_X, COST_Y, COST_W, COST_H, GRAY, "transparent",
              label_text="Cost component", label_color=DARK,
              stroke_style="dashed", stroke_width=1, label_font_size=FONT_HDR)

container_box("client-api", CAPI_X, CAPI_Y, CAPI_W, CAPI_H, GRAY, CLIENT_BG,
              label_text="Client API", label_color=DARK,
              stroke_width=1, label_font_size=FONT_BODY)

container_box("vpc", VPC_X, VPC_Y, VPC_W, VPC_H, GREEN_VPC, "#f0faf0",
              icon_file_id="file-vpc", label_text="VPC", label_color=GREEN_VPC,
              icon_header_size=32, header_height=36, label_font_size=FONT_HDR,
              stroke_width=2)

container_box("priv-subnet", PSUB_X, PSUB_Y, PSUB_W, PSUB_H, BLUE_SUB, "#f0f7fc",
              icon_file_id="file-priv-subnet", label_text="Private subnet", label_color=BLUE_SUB,
              icon_header_size=32, header_height=36, label_font_size=FONT_HDR,
              stroke_style="dashed", stroke_width=1)

container_box("data-comp", DATA_X, DATA_Y, DATA_W, DATA_H, GRAY, "transparent",
              label_text="Data component", label_color=DARK,
              stroke_style="dashed", stroke_width=1, label_font_size=FONT_HDR)

container_box("disc-comp", DISC_X, DISC_Y, DISC_W, DISC_H, GRAY, "transparent",
              label_text="Discovery component", label_color=DARK,
              stroke_style="dashed", stroke_width=1, label_font_size=FONT_HDR)

container_box("img-deploy", IMGD_X, IMGD_Y, IMGD_W, IMGD_H, GRAY, "transparent",
              label_text="Image deployment\ncomponent", label_color=DARK,
              stroke_style="dashed", stroke_width=1, label_font_size=FONT_HDR)

container_box("stor-mgmt", STOR_X, STOR_Y, STOR_W, STOR_H, GRAY, "transparent",
              label_text="Storage management component", label_color=DARK,
              stroke_style="dashed", stroke_width=1, label_font_size=FONT_HDR)

time.sleep(0.3)

# ===================================================
# 3. SERVICE ICONS — Web UI component
# ===================================================
LBL_DYNAMO = "Amazon DynamoDB\nSettings table"
icon_label_component("dynamodb", "file-dynamodb", LBL_DYNAMO,
                      cx=DYNAMO_CX, cy=icy_to_cy(DYNAMO_CY, LBL_DYNAMO),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_COGNITO = "Amazon Cognito"
icon_label_component("cognito", "file-cognito", LBL_COGNITO,
                      cx=COGNITO_CX, cy=icy_to_cy(COGNITO_CY, LBL_COGNITO),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_CF = "Amazon CloudFront"
icon_label_component("cloudfront", "file-cloudfront", LBL_CF,
                      cx=CLOUDFRONT_CX, cy=icy_to_cy(CLOUDFRONT_CY, LBL_CF),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_S3W = "Amazon S3 bucket\nWebUIBucket"
icon_label_component("s3-webui", "file-s3-bucket", LBL_S3W,
                      cx=S3_WEBUI_CX, cy=icy_to_cy(S3_WEBUI_CY, LBL_S3W),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

# Lambda Settings (standalone right of Web UI)
LBL_LSET = "AWS Lambda\nSettings function"
icon_label_component("lambda-set", "file-lambda", LBL_LSET,
                      cx=LAMBDA_SET_CX, cy=icy_to_cy(LAMBDA_SET_CY, LBL_LSET),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

# ===================================================
# 4. SERVICE ICONS — Cost component
# ===================================================
LBL_LCOST = "AWS Lambda\nCost function"
icon_label_component("lambda-cost", "file-lambda", LBL_LCOST,
                      cx=LAMBDA_COST_CX, cy=icy_to_cy(LAMBDA_COST_CY, LBL_LCOST),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_ATH = "Amazon Athena"
icon_label_component("athena", "file-athena", LBL_ATH,
                      cx=ATHENA_CX, cy=icy_to_cy(ATHENA_CY, LBL_ATH),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_S3CUR = "Amazon S3 bucket\nCURBucket"
icon_label_component("s3-cur", "file-s3-bucket", LBL_S3CUR,
                      cx=S3_CUR_CX, cy=icy_to_cy(S3_CUR_CY, LBL_S3CUR),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_CUR = "AWS Cost & Usage\nReport (CUR)"
icon_label_component("cur", "file-cur", LBL_CUR,
                      cx=CUR_CX, cy=icy_to_cy(CUR_CY, LBL_CUR),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_S3ATH = "Amazon S3 bucket\nAthenaResultsBucket"
icon_label_component("s3-athena", "file-s3-bucket", LBL_S3ATH,
                      cx=S3_ATHENA_CX, cy=icy_to_cy(S3_ATHENA_CY, LBL_S3ATH),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

# ===================================================
# 5. SERVICE ICONS — Client API
# ===================================================
LBL_APIGW = "Amazon API\nGateway"
icon_label_component("apigw", "file-apigw", LBL_APIGW,
                      cx=APIGW_CX, cy=icy_to_cy(APIGW_CY, LBL_APIGW),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_APPSYNC = "AWS AppSync"
icon_label_component("appsync", "file-appsync", LBL_APPSYNC,
                      cx=APPSYNC_CX, cy=icy_to_cy(APPSYNC_CY, LBL_APPSYNC),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

# ===================================================
# 6. SERVICE ICONS — VPC > Data component
# ===================================================
LBL_LGREM = "AWS Lambda\nGremlin function"
icon_label_component("lambda-grem", "file-lambda", LBL_LGREM,
                      cx=LAMBDA_GREM_CX, cy=icy_to_cy(LAMBDA_GREM_CY, LBL_LGREM),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_NEPT = "Amazon Neptune"
icon_label_component("neptune", "file-neptune", LBL_NEPT,
                      cx=NEPTUNE_CX, cy=icy_to_cy(NEPTUNE_CY, LBL_NEPT),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_LSRCH = "AWS Lambda\nSearch function"
icon_label_component("lambda-srch", "file-lambda", LBL_LSRCH,
                      cx=LAMBDA_SRCH_CX, cy=icy_to_cy(LAMBDA_SRCH_CY, LBL_LSRCH),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_OS = "Amazon OpenSearch Service\n(successor to Amazon\nElasticsearch Service)"
icon_label_component("opensearch", "file-opensearch", LBL_OS,
                      cx=OPENSEARCH_CX, cy=icy_to_cy(OPENSEARCH_CY, LBL_OS),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

# ===================================================
# 7. SERVICE ICONS — VPC > Discovery component
# ===================================================
LBL_FARG = "AWS Fargate"
icon_label_component("fargate", "file-fargate", LBL_FARG,
                      cx=FARGATE_CX, cy=icy_to_cy(FARGATE_CY, LBL_FARG),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_ECS = "Amazon Elastic\nContainer Service"
icon_label_component("ecs", "file-ecs", LBL_ECS,
                      cx=ECS_CX, cy=icy_to_cy(ECS_CY, LBL_ECS),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_ECR = "Amazon Elastic\nContainer Registry"
icon_label_component("ecr", "file-ecr", LBL_ECR,
                      cx=ECR_CX, cy=icy_to_cy(ECR_CY, LBL_ECR),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

# ===================================================
# 8. SERVICE ICONS — Image deployment (vertical_stack)
# ===================================================
IMGD_START_Y = IMGD_Y + 130
imgd_stack = vertical_stack(
    items=[
        {"prefix": "s3-disc",       "file_id": "file-s3-bucket",      "label": "Amazon S3 bucket\nDiscoveryBucket"},
        {"prefix": "codepipeline",  "file_id": "file-codepipeline",   "label": "AWS CodePipeline"},
        {"prefix": "codebuild",     "file_id": "file-codebuild",      "label": "AWS CodeBuild"},
        {"prefix": "container-img", "file_id": "file-container-img",  "label": "Container\nimage"},
    ],
    cx=IMGD_CX, start_y=IMGD_START_Y,
    spacing=55,
    icon_size=SVC_ICON, font_size=FONT_BODY,
    text_color=DARK,
    arrows=True, arrow_color=DARK, arrow_width=2,
    arrow_direction="down",
)

# ===================================================
# 9. SERVICE ICONS — Storage management
# ===================================================
LBL_AMP = "AWS Amplify"
icon_label_component("amplify", "file-amplify", LBL_AMP,
                      cx=AMPLIFY_CX, cy=icy_to_cy(AMPLIFY_CY, LBL_AMP),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_S3AMP = "Amazon S3 bucket\nAmplifyStorageBucket"
icon_label_component("s3-amplify", "file-s3-bucket", LBL_S3AMP,
                      cx=S3_AMPLIFY_CX, cy=icy_to_cy(S3_AMPLIFY_CY, LBL_S3AMP),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

# ===================================================
# 10. STANDALONE SERVICES
# ===================================================
LBL_AGREM = "Amazon API Gateway\nServiceGremlin API"
icon_label_component("apigw-grem", "file-apigw", LBL_AGREM,
                      cx=APIGW_GREM_CX, cy=icy_to_cy(APIGW_GREM_CY, LBL_AGREM),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_SDK = "AWS SDK"
icon_label_component("sdk", "file-sdk", LBL_SDK,
                      cx=SDK_CX, cy=icy_to_cy(SDK_CY, LBL_SDK),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

LBL_CFG = "AWS Config"
icon_label_component("config", "file-config", LBL_CFG,
                      cx=CONFIG_CX, cy=icy_to_cy(CONFIG_CY, LBL_CFG),
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

# ===================================================
# 11. EXTERNAL — Users
# ===================================================
LBL_USERS = "Users"
icon_label_component("users", "file-users", LBL_USERS,
                      cx=USERS_CX, cy=icy_to_cy(USERS_CY, LBL_USERS, icon_size=50),
                      icon_size=50, font_size=FONT_BODY, text_color=DARK)

time.sleep(0.3)

# ===================================================
# 11b. AUTO-SIZE CONTAINERS (inside-out)
# ===================================================
for cid in ["client-api", "data-comp", "disc-comp",
            "web-ui", "cost-comp", "img-deploy", "stor-mgmt",
            "priv-subnet", "vpc", "aws-cloud"]:
    result = fit_container(cid, padding=20)
    if result["grew"]:
        ob = result["old_bbox"]
        nb = result["new_bbox"]
        print(f"  AUTO-SIZED {cid}: {ob['w']:.0f}x{ob['h']:.0f} -> {nb['w']:.0f}x{nb['h']:.0f}")

time.sleep(0.2)

# ===================================================
# 12. ARROWS — icon-to-icon connections
# ===================================================

# A1: Users → CloudFront
arrow("a-users-cf", USERS_CX + 25, CLOUDFRONT_CY,
      CLOUDFRONT_CX - ICON_R, CLOUDFRONT_CY,
      stroke_color=DARK, stroke_width=2)

# A2: CloudFront → S3 WebUIBucket
arrow("a-cf-s3webui", CLOUDFRONT_CX + ICON_R, CLOUDFRONT_CY,
      S3_WEBUI_CX - ICON_R, S3_WEBUI_CY,
      stroke_color=DARK, stroke_width=2)

# A3: Cognito vertical trunk (S3 WebUI up to Cognito area)
TRUNK_X = COGNITO_CX - ICON_R - 50
arrow("a-cognito-trunk", TRUNK_X, COGNITO_CY,
      TRUNK_X, CLOUDFRONT_CY,
      stroke_color=DARK, stroke_width=2,
      start_arrowhead=None, end_arrowhead=None)

# A4: Lambda Settings → Client API vertical line (trunk for arrow 5)
arrow("a-lambda-set-capi", LAMBDA_SET_CX, LAMBDA_SET_CY + LABEL_2LINE_H,
      LAMBDA_SET_CX, CAPI_Y,
      stroke_color=DARK, stroke_width=2)

# A4 branch: Lambda Settings vertical → Cognito horizontal
arrow("a-capi-cognito", LAMBDA_SET_CX, COGNITO_CY,
      COGNITO_CX + ICON_R, COGNITO_CY,
      stroke_color=DARK, stroke_width=2)

# A5: Lambda Settings → DynamoDB
arrow("a-lambda-dynamo", LAMBDA_SET_CX - ICON_R, DYNAMO_CY,
      DYNAMO_CX + ICON_R, DYNAMO_CY,
      stroke_color=DARK, stroke_width=2)

# A6: Client API ↔ VPC (bidirectional)
CAPI_MID_Y = CAPI_Y + CAPI_H / 2
arrow("a-capi-vpc", CAPI_X + CAPI_W, CAPI_MID_Y,
      VPC_X, CAPI_MID_Y,
      stroke_color=DARK, stroke_width=2,
      start_arrowhead="arrow", end_arrowhead="arrow")

# A7: S3 WebUIBucket → API Gateway (L-shape)
arrow("a-s3webui-apigw", S3_WEBUI_CX + ICON_R, S3_WEBUI_CY,
      APIGW_CX - ICON_R, APIGW_CY,
      stroke_color=DARK, stroke_width=2,
      waypoints=[(CAPI_X - 20, S3_WEBUI_CY), (CAPI_X - 20, APIGW_CY)])

# A8: Fargate → API GW Gremlin (L-shape, exits VPC left)
EXIT_X = VPC_X - 15
arrow("a-fargate-grem", FARGATE_CX - ICON_R, FARGATE_CY,
      APIGW_GREM_CX + ICON_R, APIGW_GREM_CY,
      stroke_color=DARK, stroke_width=2,
      waypoints=[(EXIT_X, FARGATE_CY), (EXIT_X, APIGW_GREM_CY)])

# A9: Lambda Gremlin ↔ Neptune (bidirectional)
arrow("a-grem-nept", LAMBDA_GREM_CX + ICON_R, LAMBDA_GREM_CY,
      NEPTUNE_CX - ICON_R, NEPTUNE_CY,
      stroke_color=DARK, stroke_width=2,
      start_arrowhead="arrow", end_arrowhead="arrow")

# A10: Lambda Search ↔ OpenSearch (bidirectional)
arrow("a-srch-os", LAMBDA_SRCH_CX + ICON_R, LAMBDA_SRCH_CY,
      OPENSEARCH_CX - ICON_R, OPENSEARCH_CY,
      stroke_color=DARK, stroke_width=2,
      start_arrowhead="arrow", end_arrowhead="arrow")

# A11: Lambda Cost → Athena
arrow("a-cost-athena", LAMBDA_COST_CX + ICON_R, COST_ROW_Y,
      ATHENA_CX - ICON_R, COST_ROW_Y,
      stroke_color=DARK, stroke_width=2)

# A12: Athena → S3 CURBucket
arrow("a-athena-s3cur", ATHENA_CX + ICON_R, COST_ROW_Y,
      S3_CUR_CX - ICON_R, COST_ROW_Y,
      stroke_color=DARK, stroke_width=2)

# A13: CUR → S3 CURBucket (arrow pointing at S3)
arrow("a-cur-s3cur", CUR_CX - ICON_R, COST_ROW_Y,
      S3_CUR_CX + ICON_R, COST_ROW_Y,
      stroke_color=DARK, stroke_width=2,
      start_arrowhead=None, end_arrowhead="arrow")

# A13b: Lambda Cost → S3 AthenaResultsBucket (skip arrow, U-shape below row)
SKIP_Y = 295
SKIP_START_Y = LAMBDA_COST_CY + LABEL_2LINE_H
arrow("a-cost-skip", LAMBDA_COST_CX, SKIP_START_Y,
      S3_ATHENA_CX, SKIP_START_Y,
      stroke_color=DARK, stroke_width=2,
      waypoints=[(LAMBDA_COST_CX, SKIP_Y), (S3_ATHENA_CX, SKIP_Y)])

# A14: Amplify ↔ S3 AmplifyStorageBucket (bidirectional)
arrow("a-amplify-s3", AMPLIFY_CX + ICON_R, AMPLIFY_CY,
      S3_AMPLIFY_CX - ICON_R, S3_AMPLIFY_CY,
      stroke_color=DARK, stroke_width=2,
      start_arrowhead="arrow", end_arrowhead="arrow")

# A15: Container image → ECR (horizontal left)
CI_BBOX = imgd_stack["components"][3]["bbox"]
CI_CX = CI_BBOX["x"] + CI_BBOX["w"] / 2
CI_ICY = CI_BBOX["icon_cy"]
arrow("a-imgd-ecr", CI_CX - ICON_R, CI_ICY,
      ECR_CX + ICON_R, ECR_CY,
      stroke_color=DARK, stroke_width=2)

# A15b: ECR → ECS (L-shape: up from ECR top, then left to ECS right)
arrow("a-ecr-ecs", ECR_CX, ECR_CY - ICON_R,
      ECS_CX + ICON_R, ECS_CY,
      stroke_color=DARK, stroke_width=2,
      waypoints=[(ECR_CX, ECS_CY)])

# A16: ECS → Fargate (L-shape: left from ECS, then down to Fargate)
arrow("a-ecs-fargate", ECS_CX - ICON_R, ECS_CY,
      FARGATE_CX, FARGATE_CY - ICON_R,
      stroke_color=DARK, stroke_width=2,
      waypoints=[(FARGATE_CX, ECS_CY)])

# A17: Fargate → SDK (L-shape, exits VPC left)
arrow("a-fargate-sdk", FARGATE_CX - ICON_R, FARGATE_CY,
      SDK_CX + ICON_R, SDK_CY,
      stroke_color=DARK, stroke_width=2,
      waypoints=[(EXIT_X - 40, FARGATE_CY), (EXIT_X - 40, SDK_CY)])

# A18: Fargate → Config (L-shape, exits VPC left)
arrow("a-fargate-config", FARGATE_CX - ICON_R, FARGATE_CY,
      CONFIG_CX + ICON_R, CONFIG_CY,
      stroke_color=DARK, stroke_width=2,
      waypoints=[(EXIT_X - 65, FARGATE_CY), (EXIT_X - 65, CONFIG_CY)])

time.sleep(0.3)

# ===================================================
# 13. NUMBERED CIRCLES
# ===================================================

# Circle 1 — above Users→CloudFront arrow midpoint
C1_CX = (USERS_CX + 30 + CLOUDFRONT_CX - ICON_R) / 2
numbered_circle("c1", 1, cx=C1_CX, cy=CLOUDFRONT_CY - COFFSET, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 2 — above CloudFront→S3 arrow midpoint
C2_CX = (CLOUDFRONT_CX + S3_WEBUI_CX) / 2
numbered_circle("c2", 2, cx=C2_CX, cy=CLOUDFRONT_CY - COFFSET, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 3 — above Amplify↔S3 arrow midpoint
C3_CX = (AMPLIFY_CX + S3_AMPLIFY_CX) / 2
numbered_circle("c3", 3, cx=C3_CX, cy=AMPLIFY_CY - COFFSET, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 4 — between API Gateway and AppSync (GREEN)
numbered_circle("c4", 4, cx=(APIGW_CX + APPSYNC_CX) / 2, cy=APIGW_CY, size=CIRCLE_SIZE, bg_color=GREEN_C4, font_size=FONT_BODY)

# Circle 5 — right of trunk vertical arrow (ORANGE)
C5_CY = (LAMBDA_SET_CY + LABEL_2LINE_H + CAPI_Y) / 2
numbered_circle("c5", 5, cx=LAMBDA_SET_CX + COFFSET, cy=C5_CY, size=CIRCLE_SIZE, bg_color=ORANGE, font_size=FONT_BODY)

# Circle 6 — above Lambda Settings→DynamoDB arrow (ORANGE)
C6_CX = (DYNAMO_CX + LAMBDA_SET_CX) / 2
numbered_circle("c6", 6, cx=C6_CX, cy=DYNAMO_CY - COFFSET, size=CIRCLE_SIZE, bg_color=ORANGE, font_size=FONT_BODY)

# Circle 7 — above Lambda Gremlin↔Neptune arrow
C7_CX = (LAMBDA_GREM_CX + NEPTUNE_CX) / 2
numbered_circle("c7", 7, cx=C7_CX, cy=LAMBDA_GREM_CY - COFFSET, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 8 — above Lambda Search↔OpenSearch arrow
C8_CX = (LAMBDA_SRCH_CX + OPENSEARCH_CX) / 2
numbered_circle("c8", 8, cx=C8_CX, cy=LAMBDA_SRCH_CY - COFFSET, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 9 — above Lambda Cost→Athena arrow
C9_CX = (LAMBDA_COST_CX + ATHENA_CX) / 2
numbered_circle("c9", 9, cx=C9_CX, cy=COST_ROW_Y - COFFSET, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 10 — above Athena→S3 CUR arrow
C10_CX = (ATHENA_CX + S3_CUR_CX) / 2
numbered_circle("c10", 10, cx=C10_CX, cy=COST_ROW_Y - COFFSET, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 11 — above CUR→S3CUR arrow (between CUR and S3 CUR, but this is CUR reverse direction)
C11_CX = (S3_CUR_CX + CUR_CX) / 2
numbered_circle("c11", 11, cx=C11_CX, cy=COST_ROW_Y - COFFSET, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 12 — above skip arrow horizontal segment
C12_CX = (LAMBDA_COST_CX + S3_ATHENA_CX) / 2
numbered_circle("c12", 12, cx=C12_CX, cy=SKIP_Y - COFFSET, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 13 — right of CodePipeline→CodeBuild arrow
CP_BBOX = imgd_stack["components"][1]["bbox"]
CB_BBOX = imgd_stack["components"][2]["bbox"]
C13_CY = (CP_BBOX["y"] + CP_BBOX["h"] + CB_BBOX["y"]) / 2
numbered_circle("c13", 13, cx=IMGD_CX + COFFSET + 5, cy=C13_CY, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 14 — on Container image→ECR arrow
C14_CX = VPC_X + VPC_W + 40
numbered_circle("c14", 14, cx=C14_CX, cy=ECR_CY - COFFSET, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 15 — between ECS and Fargate
C15_CX = (ECS_CX + FARGATE_CX) / 2
C15_CY = (ECS_CY + FARGATE_CY) / 2 - COFFSET
numbered_circle("c15", 15, cx=C15_CX, cy=C15_CY, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 16 — on Fargate→SDK arrow
C16_CX = (SDK_CX + ICON_R + EXIT_X - 40) / 2
numbered_circle("c16", 16, cx=C16_CX, cy=SDK_CY - COFFSET, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

# Circle 17 — on Fargate→API GW Gremlin arrow
C17_CX = (APIGW_GREM_CX + ICON_R + EXIT_X) / 2
numbered_circle("c17", 17, cx=C17_CX, cy=APIGW_GREM_CY - COFFSET, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

time.sleep(0.5)

# ===================================================
# 14. VALIDATION & RESULTS
# ===================================================
n = len(get_elements()['elements'])
print(f"\nDiagram built with {n} elements")

issues = validate_diagram()
issues += validate_arrow_paths()
if issues:
    print(f"\n{len(issues)} issues found:")
    for iss in issues:
        print(f"  - {iss.encode('ascii', 'replace').decode()}")
else:
    print("\nAll validation passed - zero issues")
