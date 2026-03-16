#!/usr/bin/env python3
"""
Build script for Data Transfer Hub v2 diagram.
Three-phase build: containers -> elements -> arrows+badges

Icon sizes, font sizes, and text alignment are locked in components.py
(ICON_SIZE=65, FONT_SIZE=24). No need to pass them — agents cannot override.
"""
import sys
import os
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'clients', 'python'))
from components import *

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICONS_DIR = os.path.join(REPO_ROOT, "icons")

R = 33  # Half icon + gap for arrow endpoints

ARROW_CFG = arrow_style(
    stroke_color="#545B64", stroke_width=2, stroke_style="solid",
    label_bg="#232F3E", label_text_color="#ffffff",
    label_size=38, label_shape="circle",
)
ARROW_PLAIN = {k: v for k, v in ARROW_CFG.items() if 'label' not in k}

# ===== PHASE 0: Setup =====
print("Phase 0: Setup...")
clear()
time.sleep(0.5)

icon_map = {
    "file-cognito":        "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Security-Identity/64/Arch_Amazon-Cognito_64.svg",
    "file-appsync":        "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Application-Integration/64/Arch_AWS-AppSync_64.svg",
    "file-lambda":         "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Compute/64/Arch_AWS-Lambda_64.svg",
    "file-dynamodb":       "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Databases/64/Arch_Amazon-DynamoDB_64.svg",
    "file-cloudformation": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Management-Tools/64/Arch_AWS-CloudFormation_64.svg",
    "file-cloudfront":     "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Networking-Content-Delivery/64/Arch_Amazon-CloudFront_64.svg",
    "file-s3":             "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.svg",
    "file-fargate":        "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Containers/64/Arch_AWS-Fargate_64.svg",
    "file-ecr":            "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Containers/64/Arch_Amazon-Elastic-Container-Registry_64.svg",
    "file-step-functions": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Application-Integration/64/Arch_AWS-Step-Functions_64.svg",
    "file-cloud-logo":     "aws-icons-official/Architecture-Group-Icons_01302026/AWS-Cloud-logo_32.svg",
    "file-account":        "aws-icons-official/Architecture-Group-Icons_01302026/AWS-Account_32.svg",
    "file-user":           "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_User_48_Light.svg",
    "file-client":         "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Client_48_Light.svg",
    "file-openid":         "custom/icons8-openid.svg",
    "file-cfn-template":   "aws-icons-official/Resource-Icons_01302026/Res_Management-Governance/Res_AWS-CloudFormation_Template_48.svg",
    "file-s3-bucket":      "aws-icons-official/Resource-Icons_01302026/Res_Storage/Res_Amazon-Simple-Storage-Service_Bucket_48.svg",
    "file-ecr-image":      "aws-icons-official/Resource-Icons_01302026/Res_Containers/Res_Amazon-Elastic-Container-Registry_Image_48.svg",
}

for fid, rel_path in icon_map.items():
    full_path = os.path.join(ICONS_DIR, rel_path)
    if os.path.exists(full_path):
        upload_svg(fid, full_path)
    else:
        print(f"  MISSING: {full_path}")

time.sleep(0.3)

# ===== PHASE 1: Containers and Service Elements =====
print("\nPhase 1: Containers and elements...")

# AWS Cloud (outermost)
container_box("aws-cloud", 20, 20, 1640, 1000,
              stroke_color="#545B64", fill_color="transparent",
              icon_file_id="file-cloud-logo", label_text="AWS Cloud",
              label_color="#000000", corner_radius=0)

# Customer's AWS Account
container_box("cust-account", 50, 100, 990, 860,
              stroke_color="#545B64", fill_color="transparent",
              icon_file_id="file-account", label_text="Customer's AWS Account",
              label_color="#000000", corner_radius=0)

# AWS Managed Account
container_box("managed-account", 1090, 100, 520, 860,
              stroke_color="#545B64", fill_color="transparent",
              label_text="AWS Managed Account",
              label_color="#000000", corner_radius=0)

# Authentication (dashed, shrunk to fit content with padding)
container_box("auth-box", 75, 215, 310, 175,
              stroke_color="#545B64", fill_color="transparent",
              label_text="Authentication", label_color="#000000",
              stroke_style="dashed", stroke_width=1.5, corner_radius=0)

# AWS Step Functions workflow (pink border)
container_box("sfn-box", 700, 165, 280, 480,
              stroke_color="#E7157B", fill_color="transparent",
              icon_file_id="file-step-functions",
              label_text="AWS Step Functions\nworkflow",
              label_color="#000000", corner_radius=0)

time.sleep(0.3)

# --- Service Elements ---

# Inside Authentication
cognito = icon_label_component("cognito", "file-cognito", "Amazon Cognito",
                                cx=170, cy=310)
openid = icon_label_component("openid", "file-openid", "OpenID\nConnect",
                               cx=310, cy=310)

# Top area - DynamoDB
dynamodb = icon_label_component("dynamodb", "file-dynamodb", "Amazon DynamoDB",
                                 cx=560, cy=270)

# Inside Step Functions workflow
lambda_sf = icon_label_component("lambda-sf", "file-lambda", "AWS Lambda",
                                  cx=840, cy=330)
cloudformation = icon_label_component("cfn", "file-cloudformation", "AWS CloudFormation",
                                       cx=840, cy=510)

# Middle row
appsync = icon_label_component("appsync", "file-appsync", "AWS AppSync",
                                cx=400, cy=510)
lambda_mid = icon_label_component("lambda", "file-lambda", "AWS Lambda",
                                   cx=580, cy=510)

# Left side - Data Transfer Hub UI (Light variant for white bg)
dth_ui = icon_label_component("dth", "file-client", "Data Transfer\nHub UI",
                               cx=150, cy=640)

# Bottom row
cloudfront = icon_label_component("cloudfront", "file-cloudfront", "Amazon CloudFront",
                                   cx=400, cy=790)
s3_cust = icon_label_component("s3-cust", "file-s3", "Amazon S3",
                                cx=600, cy=790)
fargate = icon_label_component("fargate", "file-fargate", "AWS Fargate",
                                cx=840, cy=790)

# User (inside Customer Account, below DTH)
user = icon_label_component("user", "file-user", "User",
                             cx=150, cy=870)

# Managed Account (2-col, 3-row grid) — left col cx=1210, right col cx=1440
s3_repl = icon_label_component("s3-repl", "file-cfn-template",
                                "S3 replication\ncomponent\ntemplate",
                                cx=1210, cy=280)
dynamodb_repl = icon_label_component("ddb-repl", "file-cfn-template",
                                      "DynamoDB\nreplication\ncomponent\ntemplate",
                                      cx=1440, cy=280)
s3_managed = icon_label_component("s3-mgd", "file-s3-bucket", "Amazon S3",
                                   cx=1210, cy=510)
ecr_repl = icon_label_component("ecr-repl", "file-cfn-template",
                                 "ECR replication\ncomponent\ntemplate",
                                 cx=1440, cy=510)
# Row 3 at cy=790 to match Fargate row — horizontal arrows need matching Y
ecr = icon_label_component("ecr", "file-ecr", "Amazon ECR",
                            cx=1210, cy=790)
ecr_docker = icon_label_component("ecr-docker", "file-ecr-image",
                                   "ECR replication\nDocker image",
                                   cx=1440, cy=790)

time.sleep(0.3)

# ===== PHASE 3: Arrows and Numbered Badges =====
print("\nPhase 3: Arrows and badges...")

def ic(comp):
    return comp["bbox"]["icon_cx"], comp["bbox"]["icon_cy"]

cog_x, cog_y = ic(cognito)
app_x, app_y = ic(appsync)
lam_x, lam_y = ic(lambda_mid)
ddb_x, ddb_y = ic(dynamodb)
dth_x, dth_y = ic(dth_ui)
cf_x, cf_y = ic(cloudfront)
s3c_x, s3c_y = ic(s3_cust)
fg_x, fg_y = ic(fargate)
lsf_x, lsf_y = ic(lambda_sf)
cfn_x, cfn_y = ic(cloudformation)
s3m_x, s3m_y = ic(s3_managed)
ecr_x, ecr_y = ic(ecr)
usr_x, usr_y = ic(user)

# Get label bottoms for clearance
cfn_el = get_element('cfn-lbl')
cfn_lines = cfn_el['text'].count('\n') + 1
cfn_lbl_bot = cfn_el['y'] + cfn_el['fontSize'] * 1.3 * cfn_lines

# --- Arrow #1: DTH -> CloudFront (L-shape: right then down) ---
# Exits DTH right, slightly below center to separate from DTH->AppSync
mid1_x = 280
arrow("a1", dth_x + R, dth_y + 8, cf_x - R, cf_y,
      waypoints=[(mid1_x, dth_y + 8), (mid1_x, cf_y)],
      label_number=1, label_cx=mid1_x + 22, label_cy=dth_y - 22,
      **ARROW_CFG)

# --- Arrow #2: DTH -> AppSync (Z-shape: right, up, right) ---
arrow("a2", dth_x + R, dth_y - 8, app_x - R, app_y,
      waypoints=[(250, dth_y - 8), (250, app_y)],
      label_number=2, label_cx=290, label_cy=app_y - 22,
      **ARROW_CFG)

# Arrow #3 removed — User has no arrows, no external entry into DTH

# --- Arrow #4: AppSync -> Lambda (horizontal right) ---
arrow("a4", app_x + R, app_y, lam_x - R, lam_y,
      label_number=4,
      **ARROW_CFG)

# --- Arrow #5: Lambda -> SFN Lambda (L-shape: right then up) ---
sfn_entry_x = 720
arrow("a5", lam_x + R, lam_y, lsf_x - R, lsf_y,
      waypoints=[(sfn_entry_x, lam_y), (sfn_entry_x, lsf_y)],
      label_number=5, label_cx=660, label_cy=lam_y - 22,
      **ARROW_CFG)

# --- Arrow #6: S3 Managed -> CloudFormation (straight horizontal) ---
arrow("a6", s3m_x - R, s3m_y, cfn_x + R, cfn_y,
      label_number=6, label_cx=990, label_cy=s3m_y - 22,
      **ARROW_CFG)

# --- Arrow #7: ECR -> Fargate (horizontal, same Y row) ---
arrow("a7", ecr_x - R, ecr_y, fg_x + R, fg_y,
      label_number=7, label_cx=950, label_cy=ecr_y - 22,
      **ARROW_CFG)

# --- Arrow #8: AppSync -> DynamoDB (L-shape: up from top, then right) ---
# Exits AppSync from top to avoid overlapping arrow #4
# Badge on vertical segment, outside auth-box (right edge ~385)
arrow("a8", app_x, app_y - R, ddb_x - R, ddb_y,
      waypoints=[(app_x, ddb_y)],
      label_number=8, label_cx=420, label_cy=(app_y + ddb_y) / 2,
      **ARROW_CFG)

# --- Unlabeled: DTH -> Cognito (authentication flow, L-shape via x=60) ---
arrow("a-dth-cog", dth_x, dth_y - R, cog_x - R, cog_y,
      waypoints=[(60, dth_y - R), (60, cog_y)],
      **ARROW_PLAIN)

# --- Unlabeled: CloudFront -> S3 ---
arrow("a-cf-s3", cf_x + R, cf_y, s3c_x - R, s3c_y, **ARROW_PLAIN)

# --- Unlabeled: CloudFormation -> Fargate (start well below label) ---
arrow("a-cfn-fg", cfn_x, cfn_lbl_bot + 20, fg_x, fg_y - R, **ARROW_PLAIN)

time.sleep(0.5)

# ===== VALIDATION =====
print("\nValidation...")
issues = validate_arrow_paths() + validate_diagram()

n = len(get_elements().get('elements', []))
print(f"\nDiagram built with {n} elements")

if issues:
    print(f"\n--- {len(issues)} issues found ---")
    for iss in issues:
        print(f"  - {iss}")
else:
    print("\nAll validation passed!")

print("\nBuild complete!")
