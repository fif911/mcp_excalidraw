#!/usr/bin/env python3
"""
Build script for Data Transfer Hub v4 diagram.
Three-phase build: containers+elements -> arrows+badges -> validation
"""
import sys
import os
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'clients', 'python'))
from components import *
from utilities.overlap_checks import run_all_overlap_checks
from utilities.arrow_utils import container_border_point, external_actor_inside_container

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
    "file-cloud-hdr":      "aws-icons-official/Architecture-Group-Icons_01302026/AWS-Cloud_32.svg",
    "file-user":           "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_User_48_Light.svg",
    "file-client":         "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Client_48_Light.svg",
    "file-openid":         "custom/icons8-openid.svg",
    "file-cfn-template-orange": "custom/Res_AWS-CloudFormation_Template_48_Orange.svg",
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

# --- Containers (outermost first) ---

# AWS Cloud (outermost — always solid, no header_bg_color)
container_box("aws-cloud", 20, 20, 1860, 1000,
              stroke_color="#545B64", fill_color="transparent",
              icon_file_id="file-cloud-logo", label_text="AWS Cloud",
              label_color="#000000", corner_radius=0)

# Customer's AWS Account (shifted right to leave room for external actors)
container_box("cust-account", 200, 100, 980, 860,
              stroke_color="#545B64", fill_color="transparent",
              icon_file_id="file-cloud-hdr", label_text="Customer's AWS Account",
              label_color="#000000", corner_radius=0)

# AWS Managed Account
container_box("managed-account", 1230, 100, 530, 860,
              stroke_color="#545B64", fill_color="transparent",
              icon_file_id="file-cloud-hdr",
              label_text="AWS Managed Account",
              label_color="#000000", corner_radius=0)

# Authentication (dashed sub-boundary, no header icon)
container_box("auth-box", 225, 230, 310, 175,
              stroke_color="#545B64", fill_color="transparent",
              label_text="Authentication", label_color="#000000",
              stroke_style="dashed", stroke_width=1.5, corner_radius=0)

# AWS Step Functions workflow (pink border only — NO header_bg_color)
container_box("sfn-box", 850, 165, 280, 480,
              stroke_color="#E7157B", fill_color="transparent",
              icon_file_id="file-step-functions",
              label_text="AWS Step Functions\nworkflow",
              label_color="#000000", corner_radius=0)

time.sleep(0.3)

# --- External Actors (outside Customer Account, inside AWS Cloud) ---

dth_ui = icon_label_component("dth", "file-client", "Data Transfer\nHub UI",
                               cx=110, cy=640)
user = icon_label_component("user", "file-user", "User",
                             cx=110, cy=870)

# Validate external actors are outside Customer Account
external_actor_inside_container(110, 640, ["cust-account"])
external_actor_inside_container(110, 870, ["cust-account"])
print("  External actors validated: outside Customer Account")

# --- Service Elements inside Customer Account ---

# Inside Authentication
cognito = icon_label_component("cognito", "file-cognito", "Amazon Cognito",
                                cx=320, cy=330)
openid = icon_label_component("openid", "file-openid", "OpenID\nConnect",
                               cx=460, cy=330)

# DynamoDB — above middle area
dynamodb = icon_label_component("dynamodb", "file-dynamodb", "Amazon DynamoDB",
                                 cx=710, cy=230)

# Inside Step Functions workflow (vertical stack)
lambda_sf = icon_label_component("lambda-sf", "file-lambda", "AWS Lambda",
                                  cx=990, cy=330)
cloudformation = icon_label_component("cfn", "file-cloudformation", "AWS CloudFormation",
                                       cx=990, cy=510)

# Middle row
appsync = icon_label_component("appsync", "file-appsync", "AWS AppSync",
                                cx=550, cy=510)
lambda_mid = icon_label_component("lambda", "file-lambda", "AWS Lambda",
                                   cx=730, cy=510)

# Bottom row
cloudfront = icon_label_component("cloudfront", "file-cloudfront", "Amazon CloudFront",
                                   cx=550, cy=790)
s3_cust = icon_label_component("s3-cust", "file-s3", "Amazon S3",
                                cx=730, cy=790)
fargate = icon_label_component("fargate", "file-fargate", "AWS Fargate",
                                cx=990, cy=790)

# --- Managed Account — 2-col x 3-row grid ---

s3_repl = icon_label_component("s3-repl", "file-cfn-template-orange",
                                "S3 replication\ncomponent\ntemplate",
                                cx=1350, cy=280)
dynamodb_repl = icon_label_component("ddb-repl", "file-cfn-template-orange",
                                      "DynamoDB\nreplication\ncomponent template",
                                      cx=1610, cy=280)
s3_managed = icon_label_component("s3-mgd", "file-s3-bucket", "Amazon S3",
                                   cx=1350, cy=510)
ecr_repl = icon_label_component("ecr-repl", "file-cfn-template-orange",
                                 "ECR replication\ncomponent\ntemplate",
                                 cx=1610, cy=510)
ecr = icon_label_component("ecr", "file-ecr", "Amazon ECR",
                            cx=1350, cy=790)
ecr_docker = icon_label_component("ecr-docker", "file-ecr-image",
                                   "ECR replication\nDocker image",
                                   cx=1610, cy=790)

time.sleep(0.3)

# ===== PHASE 2: Arrows and Numbered Badges =====
print("\nPhase 2: Arrows and badges...")

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

# Get SFN left border for arrow 5
sfn_border_x, _ = container_border_point("sfn-box", "left", at_y=lsf_y)

# Gap midpoint between Customer Account and Managed Account
# Customer Account right edge ~ 1180, Managed Account left ~ 1230
gap_cx = 1205

# --- Arrow #1: DTH -> CloudFront (L-shape: right then down) ---
mid1_x = 350
arrow("a1", dth_x + R, dth_y + 8, cf_x - R, cf_y,
      waypoints=[(mid1_x, dth_y + 8), (mid1_x, cf_y)],
      label_number=1, label_cx=mid1_x + 24, label_cy=dth_y + 60,
      **ARROW_CFG)

# --- Arrow #2: DTH -> AppSync (L-shape: right then up) ---
arrow("a2", dth_x + R, dth_y - 8, app_x - R, app_y,
      waypoints=[(300, dth_y - 8), (300, app_y)],
      label_number=2, label_cx=340, label_cy=app_y - 24,
      **ARROW_CFG)

# (User is standalone — no arrow connects to it)

# --- Arrow #4: AppSync -> Lambda (horizontal right) ---
arrow("a4", app_x + R, app_y, lam_x - R, lam_y,
      label_number=4,
      **ARROW_CFG)

# --- Arrow #5: Lambda -> SFN border (straight horizontal at Lambda Y) ---
arrow("a5", lam_x + R, lam_y, sfn_border_x, lam_y,
      label_number=5,
      **ARROW_CFG)

# --- Arrow #6: S3 Managed -> CloudFormation (horizontal, cross-container, right-to-left) ---
# Badge manually positioned in gap between containers
arrow("a6", s3m_x - R, s3m_y, cfn_x + R, cfn_y,
      label_number=6, label_cx=gap_cx, label_cy=s3m_y - 28,
      **ARROW_CFG)

# --- Arrow #7: ECR -> Fargate (horizontal, cross-container, right-to-left) ---
# Badge manually positioned in gap between containers
arrow("a7", ecr_x - R, ecr_y, fg_x + R, fg_y,
      label_number=7, label_cx=gap_cx, label_cy=ecr_y - 28,
      **ARROW_CFG)

# --- Arrow #8: AppSync -> DynamoDB (L-shape: up then right) ---
arrow("a8", app_x, app_y - R, ddb_x - R, ddb_y,
      waypoints=[(app_x, ddb_y)],
      label_number=8, label_cx=app_x + 28, label_cy=ddb_y - 28,
      **ARROW_CFG)

# --- Arrow #3: DTH UI -> Auth box border (L-shape via left side) ---
# Badge on the vertical segment, offset right to clear AWS Cloud border
auth_border_x, auth_border_y = container_border_point("auth-box", "left", at_y=cog_y)
a3_vert_mid_y = (dth_y - R + auth_border_y) / 2
arrow("a3", dth_x, dth_y - R, auth_border_x, auth_border_y,
      waypoints=[(dth_x, auth_border_y)],
      label_number=3, label_cx=dth_x + 28, label_cy=a3_vert_mid_y,
      **ARROW_CFG)

# --- Unlabeled: CloudFront -> S3 (Customer) ---
arrow("a-cf-s3", cf_x + R, cf_y, s3c_x - R, s3c_y, **ARROW_PLAIN)

# --- Unlabeled: SFN border -> Fargate (exits Step Functions at bottom) ---
sfn_bot_x, sfn_bot_y = container_border_point("sfn-box", "bottom", at_x=cfn_x)
arrow("a-sfn-fg", sfn_bot_x, sfn_bot_y, fg_x, fg_y - R, **ARROW_PLAIN)

time.sleep(0.5)

# ===== PHASE 3: Validation =====
print("\nPhase 3: Validation...")
# Skip all badge text IDs (badges sit adjacent to arrows by design)
skip_ids = {"a1-lbl-tx", "a2-lbl-tx", "a3-lbl-tx", "a4-lbl-tx",
            "a5-lbl-tx", "a6-lbl-tx", "a7-lbl-tx", "a8-lbl-tx"}
issues = validate_arrow_paths(skip_text_ids=skip_ids) + validate_diagram()
report = run_all_overlap_checks()

n = len(get_elements().get('elements', []))
print(f"\nDiagram built with {n} elements")

if issues:
    print(f"\n--- {len(issues)} issues found ---")
    for iss in issues:
        print(f"  - {iss}")
else:
    print("\nAll validation passed!")

# Export
output_dir = os.path.dirname(os.path.abspath(__file__))
export_screenshot(os.path.join(output_dir, "diagram.png"))
save_state(os.path.join(output_dir, "diagram.excalidraw"))
print("\nExported diagram.png and diagram.excalidraw")
print("Build complete!")
