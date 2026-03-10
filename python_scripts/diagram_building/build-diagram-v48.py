#!/usr/bin/env python3
"""
Build diagram v48 — Data Transfer Hub Architecture
Two-account AWS diagram: Customer's AWS Account (left) with Auth, AppSync, Lambda,
Step Functions, DynamoDB, CloudFront, S3, Fargate; AWS Managed Account (right) with
S3, ECR, and replication templates. Numbered circles 1-8 mark the flow.
"""
import sys, time
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[2] / 'clients' / 'python'))
from components import *

# ===================================================
# 0. ICON PACK
# ===================================================
AWS = "aws-icons-official/"  # prefix for official AWS icons
register_icon_pack("v48", {
    # Container headers
    "file-cloud":         AWS + "Architecture-Group-Icons_01302026/AWS-Cloud-logo_32.svg",
    "file-account":       AWS + "Architecture-Group-Icons_01302026/AWS-Cloud_32.svg",
    "file-stepfn":        AWS + "Architecture-Service-Icons_01302026/Arch_Application-Integration/48/Arch_AWS-Step-Functions_48.svg",
    # Services — Customer Account
    "file-cognito":       AWS + "Architecture-Service-Icons_01302026/Arch_Security-Identity/48/Arch_Amazon-Cognito_48.svg",
    "file-dynamodb":      AWS + "Architecture-Service-Icons_01302026/Arch_Databases/48/Arch_Amazon-DynamoDB_48.svg",
    "file-appsync":       AWS + "Architecture-Service-Icons_01302026/Arch_Application-Integration/48/Arch_AWS-AppSync_48.svg",
    "file-lambda":        AWS + "Architecture-Service-Icons_01302026/Arch_Compute/48/Arch_AWS-Lambda_48.svg",
    "file-cloudformation":AWS + "Architecture-Service-Icons_01302026/Arch_Management-Tools/48/Arch_AWS-CloudFormation_48.svg",
    "file-cloudfront":    AWS + "Architecture-Service-Icons_01302026/Arch_Networking-Content-Delivery/48/Arch_Amazon-CloudFront_48.svg",
    "file-s3":            AWS + "Resource-Icons_01302026/Res_Storage/Res_Amazon-Simple-Storage-Service_Bucket_48.svg",
    "file-fargate":       AWS + "Architecture-Service-Icons_01302026/Arch_Containers/48/Arch_AWS-Fargate_48.svg",
    # Services — Managed Account
    "file-ecr":           AWS + "Architecture-Service-Icons_01302026/Arch_Containers/48/Arch_Amazon-Elastic-Container-Registry_48.svg",
    # Resource icons
    "file-user":          AWS + "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_User_48_Light.svg",
    "file-client":        AWS + "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Client_48_Light.svg",
    "file-cfn-tpl-orange": "custom/Res_AWS-CloudFormation_Template_48_Orange.svg",
    "file-ecr-image":     AWS + "Resource-Icons_01302026/Res_Containers/Res_Amazon-Elastic-Container-Registry_Image_48.svg",
    # OpenID Connect — custom icon (circular arrow logo)
    "file-openid-v2":     "custom/icons8-openid.svg",
})

# ===================================================
# 1. SETUP
# ===================================================
clear()
time.sleep(0.5)
upload_icons("v48")
time.sleep(0.5)

# ===================================================
# LAYOUT CONSTANTS
# ===================================================
DARK = "#1a1a1a"
GRAY = "#879196"
PINK = "#d63384"

CIRCLE_BG = DARK
CIRCLE_SIZE = 40
CIRCLE_R = CIRCLE_SIZE / 2

SVC_ICON = 65
HDR_HEIGHT = 55          # source of truth — fits multi-line headers
HDR_ICON = HDR_HEIGHT    # icon_header_size = header_height
FONT_HDR = 22
FONT_BODY = 18

COMP_GAP = 8
LABEL_1LINE_H = FONT_BODY * 1.25   # 20
ICON_VSHIFT = (COMP_GAP + LABEL_1LINE_H) / 2  # ~14
ICON_R = SVC_ICON / 2  # 32.5
COMP_HALF_H = (SVC_ICON + COMP_GAP + LABEL_1LINE_H) / 2  # ~46.5

# --- Main container coordinates ---

# AWS Cloud (outermost)
CLOUD_X = 30;   CLOUD_Y = 10;   CLOUD_W = 1510; CLOUD_H = 800

# Customer's AWS Account
CUST_X = 60;    CUST_Y = 80;    CUST_W = 890;   CUST_H = 700

# Authentication sub-section
AUTH_X = 100;   AUTH_Y = 150;   AUTH_W = 310;    AUTH_H = 190

# AWS Step Functions workflow (W=285 prevents auto-expansion; right edge=930, 20px inside Customer)
SF_X = 645;     SF_Y = 175;     SF_W = 285;      SF_H = 365

# AWS Managed Account
MA_X = 1030;    MA_Y = 80;      MA_W = 480;      MA_H = 700

# --- Service positions (cy = arrow-line Y) ---

# Authentication row
COGNITO_CX = 200;       COGNITO_CY = 240
OPENID_CX = 330;        OPENID_CY = 240

# DynamoDB
DYNAMO_CX = 520;        DYNAMO_CY = 210

# Middle row: AppSync -> Lambda
APPSYNC_CX = 400;       APPSYNC_CY = 390
LAMBDA_MID_CX = 560;    LAMBDA_MID_CY = 390

# Inside Step Functions (centered at SF_X + SF_W/2 = 788)
LAMBDA_SF_CX = 788;     LAMBDA_SF_CY = 290
CLOUDFORM_CX = 788;     CLOUDFORM_CY = 440

# Bottom row (customer account)
CLOUDFRONT_CX = 380;    CLOUDFRONT_CY = 640
S3_CUST_CX = 570;       S3_CUST_CY = 640
FARGATE_CX = 788;       FARGATE_CY = 640

# Data Transfer Hub UI
DTH_CX = 120;           DTH_CY = 530

# External: User (below AWS Cloud)
USER_CX = 120;          USER_CY = 870

# --- Managed Account service positions (left col shifted right for font 18 label clearance) ---
S3_TPL_CX = 1150;       S3_TPL_CY = 250
DDB_TPL_CX = 1330;      DDB_TPL_CY = 250

S3_MA_CX = 1150;        S3_MA_CY = 440
ECR_TPL_CX = 1330;      ECR_TPL_CY = 440

ECR_CX = 1150;          ECR_CY = 640
DOCKER_CX = 1330;       DOCKER_CY = 640

# --- Circle positions ---
COFFSET = CIRCLE_R + 5 + 1   # 26

BEND_CF = 290                 # x for DTH->CloudFront L-shape bend

C1_CX = BEND_CF - COFFSET;       C1_CY = 590
C2_CX = 290;                     C2_CY = APPSYNC_CY - COFFSET
C3_CX = DTH_CX - COFFSET;        C3_CY = 450
C4_CX = 480;                     C4_CY = APPSYNC_CY - COFFSET
C5_CX = 619;                     C5_CY = APPSYNC_CY - COFFSET
GAP_CX = (CUST_X + CUST_W + MA_X) / 2
C6_CX = GAP_CX;                     C6_CY = S3_MA_CY
C7_CX = GAP_CX;                     C7_CY = ECR_CY
C8_CX = 435;                     C8_CY = DYNAMO_CY - COFFSET

# ===================================================
# 2. CONTAINERS (outside-in)
# ===================================================

container_box("aws-cloud", CLOUD_X, CLOUD_Y, CLOUD_W, CLOUD_H, GRAY, "transparent",
              icon_file_id="file-cloud", label_text="AWS Cloud", label_color=DARK,
              icon_header_size=HDR_ICON, header_height=HDR_HEIGHT, label_font_size=FONT_HDR)

container_box("cust-account", CUST_X, CUST_Y, CUST_W, CUST_H, GRAY, "transparent",
              icon_file_id="file-account", label_text="Customer\u2019s AWS Account", label_color=DARK,
              icon_header_size=HDR_ICON, header_height=HDR_HEIGHT, label_font_size=FONT_HDR)

container_box("auth", AUTH_X, AUTH_Y, AUTH_W, AUTH_H, GRAY, "transparent",
              label_text="Authentication", label_color=DARK,
              stroke_style="dashed", stroke_width=1, label_font_size=FONT_HDR)

container_box("step-fn", SF_X, SF_Y, SF_W, SF_H, PINK, "transparent",
              icon_file_id="file-stepfn", label_text="AWS Step Functions\nworkflow",
              label_color=DARK, icon_header_size=HDR_ICON,
              header_height=HDR_HEIGHT, label_font_size=FONT_HDR)

container_box("managed-account", MA_X, MA_Y, MA_W, MA_H, GRAY, "transparent",
              icon_file_id="file-account", label_text="AWS Managed Account", label_color=DARK,
              icon_header_size=HDR_ICON, header_height=HDR_HEIGHT, label_font_size=FONT_HDR)

time.sleep(0.3)

# ===================================================
# 3. SERVICE ICONS — Customer's AWS Account
# ===================================================

icon_label_component("cognito", "file-cognito", "Amazon Cognito",
                      cx=COGNITO_CX, cy=COGNITO_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("openid", "file-openid-v2", "OpenID\nConnect",
                      cx=OPENID_CX, cy=OPENID_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("dynamodb", "file-dynamodb", "Amazon DynamoDB",
                      cx=DYNAMO_CX, cy=DYNAMO_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("appsync", "file-appsync", "AWS AppSync",
                      cx=APPSYNC_CX, cy=APPSYNC_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("lambda-mid", "file-lambda", "AWS Lambda",
                      cx=LAMBDA_MID_CX, cy=LAMBDA_MID_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("lambda-sf", "file-lambda", "AWS Lambda",
                      cx=LAMBDA_SF_CX, cy=LAMBDA_SF_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("cloudformation", "file-cloudformation", "AWS CloudFormation",
                      cx=CLOUDFORM_CX, cy=CLOUDFORM_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("cloudfront", "file-cloudfront", "Amazon CloudFront",
                      cx=CLOUDFRONT_CX, cy=CLOUDFRONT_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("s3-cust", "file-s3", "Amazon S3",
                      cx=S3_CUST_CX, cy=S3_CUST_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("fargate", "file-fargate", "AWS Fargate",
                      cx=FARGATE_CX, cy=FARGATE_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("dth-ui", "file-client", "Data Transfer\nHub UI",
                      cx=DTH_CX, cy=DTH_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

time.sleep(0.3)

# ===================================================
# 4. EXTERNAL: User (below AWS Cloud)
# ===================================================
icon_label_component("user", "file-user", "User",
                      cx=USER_CX, cy=USER_CY + ICON_VSHIFT,
                      icon_size=50, font_size=FONT_BODY, text_color=DARK)

time.sleep(0.3)

# ===================================================
# 5. SERVICE ICONS — Managed Account
# ===================================================

icon_label_component("s3-tpl", "file-cfn-tpl-orange", "S3 replication\ncomponent template",
                      cx=S3_TPL_CX, cy=S3_TPL_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("ddb-tpl", "file-cfn-tpl-orange", "DynamoDB\nreplication\ncomponent template",
                      cx=DDB_TPL_CX, cy=DDB_TPL_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("s3-ma", "file-s3", "Amazon S3",
                      cx=S3_MA_CX, cy=S3_MA_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("ecr-tpl", "file-cfn-tpl-orange", "ECR replication\ncomponent\ntemplate",
                      cx=ECR_TPL_CX, cy=ECR_TPL_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("ecr", "file-ecr", "Amazon ECR",
                      cx=ECR_CX, cy=ECR_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("docker", "file-ecr-image", "ECR replication\nDocker image",
                      cx=DOCKER_CX, cy=DOCKER_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

time.sleep(0.3)

# ===================================================
# 6. ARROWS
# ===================================================

# --- External entry arrow into Authentication ---
arrow("a-ext-auth", CUST_X - 30, COGNITO_CY, AUTH_X, COGNITO_CY,
      stroke_color=DARK, stroke_width=2)

# --- User -> Data Transfer Hub UI ---
USER_ICON_TOP = USER_CY - 25
DTH_LABEL_BOTTOM = DTH_CY + ICON_VSHIFT + COMP_HALF_H + LABEL_1LINE_H + 5
arrow("a-user-dth", USER_CX, USER_ICON_TOP, DTH_CX, DTH_LABEL_BOTTOM,
      stroke_color=DARK, stroke_width=2)

# --- DTH vertical trunk (no arrowheads) ---
DTH_ICON_TOP = DTH_CY - SVC_ICON / 2
arrow("a-trunk", DTH_CX, DTH_ICON_TOP,
      DTH_CX, AUTH_Y + AUTH_H,
      stroke_color=DARK, stroke_width=2,
      start_arrowhead=None, end_arrowhead=None)

# --- DTH -> AppSync (circle 2 sits on it) ---
arrow("a-dth-appsync", DTH_CX, APPSYNC_CY,
      APPSYNC_CX - ICON_R, APPSYNC_CY,
      stroke_color=DARK, stroke_width=2)

# --- DTH -> CloudFront (L-shape, circle 1 left of vertical segment) ---
arrow("a-dth-cf", DTH_CX + ICON_R, DTH_CY,
      CLOUDFRONT_CX - ICON_R, CLOUDFRONT_CY,
      stroke_color=DARK, stroke_width=2,
      waypoints=[(BEND_CF, DTH_CY), (BEND_CF, CLOUDFRONT_CY)])

# --- CloudFront -> S3 (customer) ---
arrow("a-cf-s3", CLOUDFRONT_CX + ICON_R, CLOUDFRONT_CY,
      S3_CUST_CX - ICON_R, S3_CUST_CY,
      stroke_color=DARK, stroke_width=2)

# --- AppSync -> Lambda (circle 4 sits on it) ---
arrow("a-appsync-lambda", APPSYNC_CX + ICON_R, APPSYNC_CY,
      LAMBDA_MID_CX - ICON_R, LAMBDA_MID_CY,
      stroke_color=DARK, stroke_width=2)

# --- Lambda -> Step Functions entry (circle 5 sits on it) ---
arrow("a-lambda-sf", LAMBDA_MID_CX + ICON_R, LAMBDA_MID_CY,
      SF_X, LAMBDA_MID_CY,
      stroke_color=DARK, stroke_width=2)

# --- AppSync -> DynamoDB (routed right of Auth, circle 8 on horizontal) ---
AUTH_RIGHT = AUTH_X + AUTH_W
ROUTE_X_C8 = AUTH_RIGHT + 15
arrow("a-appsync-dynamo", APPSYNC_CX, APPSYNC_CY - ICON_R,
      DYNAMO_CX - ICON_R, DYNAMO_CY,
      stroke_color=DARK, stroke_width=2,
      waypoints=[(ROUTE_X_C8, APPSYNC_CY - ICON_R), (ROUTE_X_C8, DYNAMO_CY)])

# --- CloudFormation -> Fargate (down from SF bottom) ---
SF_BOTTOM = SF_Y + SF_H
arrow("a-cfn-fargate", CLOUDFORM_CX, SF_BOTTOM,
      FARGATE_CX, FARGATE_CY - ICON_R,
      stroke_color=DARK, stroke_width=2)

# --- S3 managed -> CloudFormation (arrow left, circle 6 in gap) ---
arrow("a-s3ma-cfn", S3_MA_CX - ICON_R, S3_MA_CY,
      SF_X + SF_W, CLOUDFORM_CY,
      stroke_color=DARK, stroke_width=2)

# --- ECR -> Fargate (arrow left, circle 7 in gap) ---
arrow("a-ecr-fargate", ECR_CX - ICON_R, ECR_CY,
      FARGATE_CX + ICON_R, FARGATE_CY,
      stroke_color=DARK, stroke_width=2)

time.sleep(0.3)

# ===================================================
# 7. NUMBERED CIRCLES (AFTER arrows — higher z-order)
# ===================================================
numbered_circle("c1", 1, cx=C1_CX, cy=C1_CY, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)
numbered_circle("c2", 2, cx=C2_CX, cy=C2_CY, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)
numbered_circle("c3", 3, cx=C3_CX, cy=C3_CY, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)
numbered_circle("c4", 4, cx=C4_CX, cy=C4_CY, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)
numbered_circle("c5", 5, cx=C5_CX, cy=C5_CY, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)
numbered_circle("c6", 6, cx=C6_CX, cy=C6_CY, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)
numbered_circle("c7", 7, cx=C7_CX, cy=C7_CY, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)
numbered_circle("c8", 8, cx=C8_CX, cy=C8_CY, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

time.sleep(0.5)

# ===================================================
# 8. VALIDATION & RESULTS
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
