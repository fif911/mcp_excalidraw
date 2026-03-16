#!/usr/bin/env python3
"""
Example Diagram Build Script — Template

Copy this file to diagram_building/v_{N}/build-diagram.py
and modify for your specific diagram.

Workflow:
  Read diagram.d2 → icon lookup → clear canvas → upload icons →
  external actors → containers → service nodes → arrows → validate → export

LOCKED CONSTANTS — never pass these as parameters to any component function:
  ICON_SIZE = 65     (all icons)
  FONT_SIZE = 22     (all text)
  HEADER_HEIGHT = 75 (container headers)
"""
import sys
import time

sys.path.insert(0, '/path/to/mcp_excalidraw/clients/python')
from components import *
from utilities.overlap_checks import run_all_overlap_checks

# ═══════════════════════════════════════════
# CONFIGURATION — from components_styling.txt
# ═══════════════════════════════════════════

CANVAS_W = 1800
CANVAS_H = 1000

# Arrow style — define ONCE, unpack into every arrow() call
# Badge style options:
#   Dark circle (AWS standard): label_bg="#1a1a1a", label_shape="circle"
#   Blue square (Step Functions / workflow): label_bg="#147EBA", label_shape="square"
ARROW_STYLE = arrow_style(
    stroke_color="#1a1a1a",
    stroke_width=2,
    label_bg="#1a1a1a",
    label_text_color="#ffffff",
    label_size=32,
    label_font_size=FONT_SIZE,
    label_shape="circle",
)

# Container layout constants
H_PAD = 40    # horizontal padding inside containers
V_PAD = 30    # vertical padding below header / above bottom border
CHILD_GAP = 60  # gap between sibling elements

# ═══════════════════════════════════════════
# 1. SETUP
# ═══════════════════════════════════════════
clear()
time.sleep(0.5)

# Upload icons looked up via search_aws_icons before writing this script.
# Icon resolution priority:
#   1. Official AWS SVG found → upload_svg() + use file_id
#   2. No SVG found → skip (use placeholder)
upload_svg("file-aws-logo",       "icons/aws/Architecture-Group-Icons/AWS-Cloud-logo_32.svg")
upload_svg("file-cloud",          "icons/aws/Architecture-Group-Icons/AWS-Cloud-logo_32.svg")
upload_svg("file-cognito",        "icons/aws/Arch_Security-Identity/Arch_Amazon-Cognito_48.svg")
upload_svg("file-appsync",        "icons/aws/Arch_App-Integration/Arch_AWS-AppSync_48.svg")
upload_svg("file-lambda",         "icons/aws/Arch_Compute/Arch_AWS-Lambda_48.svg")
upload_svg("file-dynamodb",       "icons/aws/Arch_Databases/Arch_Amazon-DynamoDB_48.svg")
upload_svg("file-cloudfront",     "icons/aws/Arch_Networking/Arch_Amazon-CloudFront_48.svg")
upload_svg("file-s3",             "icons/aws/Arch_Storage/Arch_Amazon-S3_48.svg")
upload_svg("file-fargate",        "icons/aws/Arch_Compute/Arch_AWS-Fargate_48.svg")
upload_svg("file-step-functions", "icons/aws/Arch_App-Integration/Arch_AWS-Step-Functions_48.svg")
upload_svg("file-cfn",            "icons/aws/Arch_Management/Arch_AWS-CloudFormation_48.svg")
upload_svg("file-ecr",            "icons/aws/Arch_Compute/Arch_Amazon-ECR_48.svg")
# Resource/generic icons (outline, no color background)
upload_svg("file-user",           "icons/aws/Resource-Icons/Res_General-Icons/Res_User_48_Light.svg")
time.sleep(0.3)

# ═══════════════════════════════════════════
# 2. EXTERNAL ACTORS
# External actors sit OUTSIDE all container boundaries.
# Always verify position against reference image — do not assume they go outside.
# Use icon_cy (not cy) for arrow endpoints.
# ═══════════════════════════════════════════

# User — outside AWS Cloud, left side
user = icon_label_component("user", "file-user", "User", cx=80, cy=700)
user_cx  = user["bbox"]["cx"]
user_cy  = user["bbox"]["icon_cy"]   # use icon_cy for arrows

# Data Transfer Hub UI — outside AWS Cloud, bottom-left
hub = icon_label_component("hub", "file-hub-ui", "Data Transfer\nHub UI", cx=80, cy=550)
hub_cx = hub["bbox"]["cx"]
hub_cy = hub["bbox"]["icon_cy"]

time.sleep(0.3)

# ═══════════════════════════════════════════
# 3. CONTAINERS — outermost first, innermost last
# HARD RULES:
#   - corner_radius=0 always
#   - AWS Cloud is ALWAYS solid stroke_style
#   - Dashed sub-boundaries with text-only label: icon_file_id=None
# ═══════════════════════════════════════════

# AWS Cloud (outermost — always solid, always has AWS logo header)
container_box("aws_cloud",
    x=160, y=20, w=CANVAS_W-180, h=CANVAS_H-40,
    stroke_color="#232F3E",
    fill_color="transparent",
    icon_file_id="file-aws-logo",
    label_text="AWS Cloud",
    label_color="#232F3E",
    stroke_width=2,
    stroke_style="solid",      # ALWAYS solid for AWS Cloud
    corner_radius=0,
)

# Customer's AWS Account (solid, dark header)
container_box("customer_account",
    x=200, y=80, w=900, h=CANVAS_H-120,
    stroke_color="#1a1a1a",
    fill_color="transparent",
    header_bg_color="#232F3E",
    icon_file_id="file-cloud",
    label_text="Customer's AWS Account",
    label_color="#ffffff",
    stroke_width=2,
    stroke_style="solid",
    corner_radius=0,
)

# AWS Managed Account (solid, dark header, right side)
container_box("managed_account",
    x=1120, y=80, w=600, h=CANVAS_H-120,
    stroke_color="#1a1a1a",
    fill_color="transparent",
    header_bg_color="#232F3E",
    icon_file_id="file-cloud",
    label_text="AWS Managed Account",
    label_color="#ffffff",
    stroke_width=2,
    stroke_style="solid",
    corner_radius=0,
)

# Authentication sub-boundary (dashed, no header icon — text-only label)
container_box("auth",
    x=230, y=130, w=280, h=200,
    stroke_color="#1a1a1a",
    fill_color="transparent",
    icon_file_id=None,          # dashed sub-boundaries: no header icon
    label_text="Authentication",
    label_color="#1a1a1a",
    stroke_width=1,
    stroke_style="dashed",
    corner_radius=0,
)

# AWS Step Functions workflow (solid, colored border and header)
container_box("step_functions",
    x=650, y=100, w=380, h=420,
    stroke_color="#E7174E",
    fill_color="transparent",
    header_bg_color="#E7174E",
    icon_file_id="file-step-functions",
    label_text="AWS Step Functions\nworkflow",
    label_color="#ffffff",
    stroke_width=2,
    stroke_style="solid",
    corner_radius=0,
)

time.sleep(0.3)

# ═══════════════════════════════════════════
# 4. SERVICE NODES — place inside containers
# Store icon_cy for each — used as arrow endpoints.
# ═══════════════════════════════════════════

# Authentication sub-boundary
cognito = icon_label_component("cognito", "file-cognito", "Amazon Cognito", cx=285, cy=210)
cognito_cx = cognito["bbox"]["cx"];  cognito_cy = cognito["bbox"]["icon_cy"]

openid = icon_label_component("openid", "file-openid", "OpenID\nConnect", cx=430, cy=210)
openid_cx = openid["bbox"]["cx"];  openid_cy = openid["bbox"]["icon_cy"]

# Customer Account
appsync = icon_label_component("appsync", "file-appsync", "AWS AppSync", cx=390, cy=400)
appsync_cx = appsync["bbox"]["cx"];  appsync_cy = appsync["bbox"]["icon_cy"]

lambda1 = icon_label_component("lambda1", "file-lambda", "AWS Lambda", cx=545, cy=400)
lambda1_cx = lambda1["bbox"]["cx"];  lambda1_cy = lambda1["bbox"]["icon_cy"]

dynamodb = icon_label_component("dynamodb", "file-dynamodb", "Amazon DynamoDB", cx=490, cy=200)
dynamodb_cx = dynamodb["bbox"]["cx"];  dynamodb_cy = dynamodb["bbox"]["icon_cy"]

cloudfront = icon_label_component("cloudfront", "file-cloudfront", "Amazon CloudFront", cx=330, cy=620)
cloudfront_cx = cloudfront["bbox"]["cx"];  cloudfront_cy = cloudfront["bbox"]["icon_cy"]

s3_customer = icon_label_component("s3-customer", "file-s3", "Amazon S3", cx=480, cy=620)
s3_cx = s3_customer["bbox"]["cx"];  s3_cy = s3_customer["bbox"]["icon_cy"]

fargate = icon_label_component("fargate", "file-fargate", "AWS Fargate", cx=710, cy=580)
fargate_cx = fargate["bbox"]["cx"];  fargate_cy = fargate["bbox"]["icon_cy"]

# Step Functions interior
lambda_sf = icon_label_component("lambda-sf", "file-lambda", "AWS Lambda", cx=840, cy=220)
lambda_sf_cx = lambda_sf["bbox"]["cx"];  lambda_sf_cy = lambda_sf["bbox"]["icon_cy"]

cfn = icon_label_component("cfn", "file-cfn", "AWS CloudFormation", cx=840, cy=380)
cfn_cx = cfn["bbox"]["cx"];  cfn_cy = cfn["bbox"]["icon_cy"]

# Managed Account — 2x2 grid of template icons
grid_2x2("managed", [
    {"file_id": "file-s3-tmpl",    "label": "S3 replication\ncomponent template",      "id_suffix": "s3-tmpl"},
    {"file_id": "file-db-tmpl",    "label": "DynamoDB replication\ncomponent template", "id_suffix": "db-tmpl"},
    {"file_id": "file-s3",         "label": "Amazon S3",                                "id_suffix": "s3-managed"},
    {"file_id": "file-ecr-tmpl",   "label": "ECR replication\ncomponent template",      "id_suffix": "ecr-tmpl"},
], "managed_account")

ecr = icon_label_component("ecr", "file-ecr", "Amazon ECR", cx=1250, cy=620)
ecr_cx = ecr["bbox"]["cx"];  ecr_cy = ecr["bbox"]["icon_cy"]

ecr_img = icon_label_component("ecr-img", "file-ecr-img", "ECR replication\nDocker image", cx=1430, cy=620)

time.sleep(0.3)

# Auto-expand containers to fit children
fit_container("customer_account",
    ["cognito", "openid", "appsync", "lambda1", "dynamodb",
     "cloudfront", "s3-customer", "fargate"],
    padding=40, header_height=HEADER_HEIGHT)
fit_container("managed_account",
    ["managed-s3-tmpl", "managed-db-tmpl", "managed-s3-managed",
     "managed-ecr-tmpl", "ecr", "ecr-img"],
    padding=40, header_height=HEADER_HEIGHT)
fit_container("step_functions",
    ["lambda-sf", "cfn"], padding=40, header_height=HEADER_HEIGHT)

time.sleep(0.3)

# ═══════════════════════════════════════════
# 5. ARROWS — follow icons_graph_structure.md exactly
# Use **ARROW_STYLE on every call — never set stroke per-arrow.
# Use icon_cy as endpoints, not cy.
# For cross-container arrows: end at container BORDER, not internal icon.
# ═══════════════════════════════════════════

# Arrow 1: Hub UI → CloudFront (horizontal)
arrow("a-hub-cf", hub_cx + ICON_SIZE/2, hub_cy,
      cloudfront_cx - ICON_SIZE/2, cloudfront_cy,
      label_number=1, **ARROW_STYLE)

# Arrow 2: Cognito → AppSync (L-shaped — different Y, enter from left)
mid_x = (cognito_cx + appsync_cx) / 2
arrow("a-cognito-appsync",
      start_x=cognito_cx, start_y=cognito_cy,
      end_x=appsync_cx - ICON_SIZE/2, end_y=appsync_cy,
      waypoints=[(mid_x, cognito_cy), (mid_x, appsync_cy)],
      label_number=2, **ARROW_STYLE)

# Arrow 3: User → AppSync (L-shaped, comes from outside container)
arrow("a-user-appsync",
      start_x=user_cx + ICON_SIZE/2, start_y=user_cy,
      end_x=appsync_cx - ICON_SIZE/2, end_y=appsync_cy,
      waypoints=[(200, user_cy), (200, appsync_cy)],
      label_number=3, **ARROW_STYLE)

# Arrow 4: AppSync → Lambda
arrow("a-appsync-lambda",
      start_x=appsync_cx + ICON_SIZE/2, start_y=appsync_cy,
      end_x=lambda1_cx - ICON_SIZE/2,   end_y=lambda1_cy,
      label_number=4, **ARROW_STYLE)

# Arrow 5: Lambda → Step Functions (end at Step Functions LEFT BORDER)
step_fn_el = get_element("step_functions")
arrow("a-lambda-sf",
      start_x=lambda1_cx + ICON_SIZE/2, start_y=lambda1_cy,
      end_x=step_fn_el["x"],            end_y=lambda_sf_cy,
      label_number=5, **ARROW_STYLE)

# Arrow 6: S3 (Managed) → CloudFormation (cross-container — end at Step Functions border)
s3_managed = get_element("img-managed-s3-managed")
arrow("a-s3-cfn",
      start_x=s3_managed["x"] + s3_managed["width"]/2, start_y=s3_managed["y"] + s3_managed["height"]/2,
      end_x=step_fn_el["x"] + step_fn_el["width"],      end_y=cfn_cy,
      label_number=6, **ARROW_STYLE)

# Arrow 7: ECR → Fargate (cross-container)
arrow("a-ecr-fargate",
      start_x=ecr_cx - ICON_SIZE/2, start_y=ecr_cy,
      end_x=fargate_cx + ICON_SIZE/2, end_y=fargate_cy,
      label_number=7, **ARROW_STYLE)

# Arrow 8: Lambda → DynamoDB (vertical — route vertically between them)
arrow("a-lambda-dynamo",
      start_x=lambda1_cx, start_y=lambda1_cy - ICON_SIZE/2,
      end_x=dynamodb_cx,  end_y=dynamodb_cy + ICON_SIZE/2,
      label_number=8, **ARROW_STYLE)

# CloudFormation → Fargate (vertical inside Step Functions + out)
arrow("a-cfn-fargate",
      start_x=cfn_cx, start_y=cfn_cy + ICON_SIZE/2,
      end_x=fargate_cx, end_y=fargate_cy - ICON_SIZE/2,
      **ARROW_STYLE)  # no label_number — no badge on this arrow

time.sleep(0.5)

# ═══════════════════════════════════════════
# 6. VALIDATION
# ═══════════════════════════════════════════
issues = []
issues += validate_arrow_paths()
issues += validate_diagram()
report = run_all_overlap_checks()

n = len(get_elements().get("elements", []))
print(f"\nDiagram built: {n} elements")

if issues:
    print(f"\n--- {len(issues)} issues ---")
    for i in issues:
        print(f"  {i}")
    sys.exit(1)
else:
    print("Validation passed — zero issues")

# ═══════════════════════════════════════════
# 7. EXPORT
# ═══════════════════════════════════════════
export_screenshot("diagram_building/v_N/diagram.png")
save_state("diagram_building/v_N/diagram.excalidraw")
print("Exported successfully")
