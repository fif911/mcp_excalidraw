#!/usr/bin/env python3
"""
Build diagram v54 — Amazon SageMaker Unified Studio ML Engineering Workflow
Recreates the reference architecture: ML engineers → IAM → SageMaker Unified Studio
with Sales Forecasting Project, ML capabilities, Coding capabilities, and Lakehouse.
"""
import sys, time
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[3] / 'clients' / 'python'))
from components import *

# ===================================================
# 0. ICON PACK
# ===================================================
AWS = "aws-icons-official/"
register_icon_pack("v54", {
    # Group / header icons (32px)
    "file-cloud-logo":     AWS + "Architecture-Group-Icons_01302026/AWS-Cloud-logo_32.svg",
    "file-region":         AWS + "Architecture-Group-Icons_01302026/Region_32.svg",
    # Architecture service icons (64px)
    "file-iam-identity":   AWS + "Architecture-Service-Icons_01302026/Arch_Security-Identity/64/Arch_AWS-IAM-Identity-Center_64.svg",
    "file-sagemaker":      AWS + "Architecture-Service-Icons_01302026/Arch_Analytics/64/Arch_Amazon-SageMaker_64.svg",
    "file-sagemaker-ai":   AWS + "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/64/Arch_Amazon-SageMaker-AI_64.svg",
    "file-amazon-q":       AWS + "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/64/Arch_Amazon-Q_64.svg",
    "file-redshift":       AWS + "Architecture-Service-Icons_01302026/Arch_Analytics/64/Arch_Amazon-Redshift_64.svg",
    "file-s3":             AWS + "Architecture-Service-Icons_01302026/Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.svg",
    # Resource icons (48px)
    "file-user":           AWS + "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_User_48_Light.svg",
    "file-database":       AWS + "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Database_48_Light.svg",
    "file-git-repo":       AWS + "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Git-Repository_48_Light.svg",
    "file-glue-catalog":   AWS + "Resource-Icons_01302026/Res_Analytics/Res_AWS-Glue_Data-Catalog_48.svg",
    "file-notebook":       AWS + "Resource-Icons_01302026/Res_Artificial-Intelligence/Res_Amazon-SageMaker-AI_Notebook_48.svg",
    "file-model":          AWS + "Resource-Icons_01302026/Res_Artificial-Intelligence/Res_Amazon-SageMaker-AI_Model_48.svg",
    # Category icons (48px)
    "file-ai-category":    AWS + "Category-Icons_01302026/Arch-Category_48/Arch-Category_Artificial-Intelligence_48.svg",
    "file-devtools-cat":   AWS + "Category-Icons_01302026/Arch-Category_48/Arch-Category_Developer-Tools_48.svg",
    "file-analytics-cat":  AWS + "Category-Icons_01302026/Arch-Category_48/Arch-Category_Analytics_48.svg",
})

# ===================================================
# 1. SETUP
# ===================================================
clear()
time.sleep(0.5)
upload_icons("v54")
time.sleep(0.5)

# ===================================================
# LAYOUT CONSTANTS
# ===================================================
DARK = "#232f3e"
TEAL = "#147eba"
PURPLE = "#7b61ff"
GRAY_FILL = "#e8e8e8"
WHITE = "#ffffff"

SVC_ICON = 65       # main service icon size
SM_ICON = 50        # smaller resource icons inside project
HDR_ICON = 40       # group header icon size
CAT_ICON = 36       # category header icon

FONT_HDR = 20
FONT_LBL = 15
FONT_SM = 13

COMP_GAP = 8
ICON_R = SVC_ICON / 2
SM_R = SM_ICON / 2

CIRCLE_BG = DARK
CIRCLE_SIZE = 32
CIRCLE_R = CIRCLE_SIZE / 2
COFFSET = CIRCLE_R + 5

def icy_to_cy(target_icon_cy, label_text, icon_size=SVC_ICON, gap=COMP_GAP, font_size=FONT_LBL):
    if label_text and label_text.strip():
        text_h = estimate_text_height(label_text, font_size)
        return target_icon_cy + gap / 2 + text_h / 2
    return target_icon_cy

# Arrow styles
ARROW_STYLE = arrow_style(
    stroke_color=DARK, stroke_width=2, stroke_style="solid",
    label_bg=CIRCLE_BG, label_text_color=WHITE,
    label_size=CIRCLE_SIZE, label_font_size=FONT_LBL,
)

DASHED_ARROW = arrow_style(
    stroke_color=DARK, stroke_width=2, stroke_style="dashed",
    label_bg=CIRCLE_BG, label_text_color=WHITE,
    label_size=CIRCLE_SIZE, label_font_size=FONT_LBL,
)

# ===================================================
# CONTAINER COORDINATES
# ===================================================
# AWS Cloud (outermost — solid border)
CLOUD_X = 95;   CLOUD_Y = 20;   CLOUD_W = 1510; CLOUD_H = 860

# AWS Region (inside Cloud — gap left of Region for IAM)
REGION_X = 220;  REGION_Y = 75;  REGION_W = 1350; REGION_H = 780

# SageMaker Unified Studio (purple dashed — pushed right for IAM gap)
UNIFIED_X = 300; UNIFIED_Y = 130; UNIFIED_W = 540; UNIFIED_H = 370

# Sales Forecasting Project (inside Unified Studio)
PROJECT_X = 445; PROJECT_Y = 175; PROJECT_W = 360; PROJECT_H = 290

# ML capabilities (right — fills space)
ML_X = 1050;  ML_Y = 115;  ML_W = 320;  ML_H = 260

# Coding capabilities (bottom-left — inside Region)
CODE_X = 280;  CODE_Y = 555;  CODE_W = 340;  CODE_H = 260

# Amazon SageMaker Lakehouse (bottom-right — fills space)
LAKE_X = 660;  LAKE_Y = 545;  LAKE_W = 870;  LAKE_H = 280

# Storage sub-box inside Lakehouse
STOR_X = 1010;  STOR_Y = 600;  STOR_W = 190;  STOR_H = 195

# Catalog sub-box inside Lakehouse
CAT_X = 1240;  CAT_Y = 600;  CAT_W = 230;  CAT_H = 195

# ===================================================
# SERVICE POSITIONS (cx = center X, cy = icon center Y)
# ===================================================
# External: ML engineers (far left, outside Cloud)
USER_CX = 30;       USER_CY = 310

# AWS IAM Identity Center (between Cloud and Region borders)
IAM_CX = 160;       IAM_CY = 310

# SageMaker Unified Studio icon — same Y as IAM for horizontal arrow connection
SM_UNIFIED_CX = 370; SM_UNIFIED_CY = IAM_CY

# Sales Forecasting Project 2x2 grid
DB_CX = 535;        DB_CY = 270      # Database assets (top-left)
GIT_CX = 725;       GIT_CY = 270     # Git repository (top-right)
IDE_CX = 535;       IDE_CY = 390     # Studio IDE (bottom-left)
TOOLS_CX = 725;     TOOLS_CY = 390   # Tools (bottom-right)

# ML capabilities (header is on the container)
SM_ML_CX = 1210;       SM_ML_CY = 280

# Coding capabilities (header is on the container)
Q_CX = 450;           Q_CY = 710

# Amazon SageMaker Lakehouse services
REDSHIFT_CX = 790;    REDSHIFT_CY = 700
S3_CX = 1105;         S3_CY = 710     # centered in Storage box (1010+190/2)
GLUE_CX = 1355;       GLUE_CY = 710  # centered in Catalog box (1240+230/2)

# ===================================================
# 2. CONTAINERS (outside-in)
# ===================================================
container_box("aws-cloud", CLOUD_X, CLOUD_Y, CLOUD_W, CLOUD_H, TEAL, "transparent",
              icon_file_id="file-cloud-logo", label_text="AWS Cloud", label_color=DARK,
              icon_header_size=HDR_ICON, header_height=HDR_ICON, label_font_size=FONT_HDR,
              stroke_style="solid", stroke_width=2)

container_box("aws-region", REGION_X, REGION_Y, REGION_W, REGION_H, TEAL, "transparent",
              icon_file_id="file-region", label_text="AWS Region", label_color=TEAL,
              icon_header_size=HDR_ICON, header_height=HDR_ICON, label_font_size=FONT_HDR,
              stroke_style="dashed", stroke_width=2)

container_box("unified-studio", UNIFIED_X, UNIFIED_Y, UNIFIED_W, UNIFIED_H, PURPLE, "transparent",
              icon_file_id="file-analytics-cat", label_text="Unified Studio",
              label_color=DARK, icon_header_size=HDR_ICON, header_height=HDR_ICON,
              label_font_size=FONT_HDR, stroke_style="dashed", stroke_width=2)

container_box("sales-project", PROJECT_X, PROJECT_Y, PROJECT_W, PROJECT_H, DARK, "transparent",
              label_text="Sales Forecasting Project", label_color=PURPLE,
              stroke_style="solid", stroke_width=2, label_font_size=FONT_HDR)

container_box("ml-cap", ML_X, ML_Y, ML_W, ML_H, TEAL, "transparent",
              icon_file_id="file-ai-category", label_text="ML capabilities", label_color=DARK,
              icon_header_size=HDR_ICON, header_height=HDR_ICON,
              stroke_style="solid", stroke_width=2, label_font_size=FONT_HDR)

container_box("coding-cap", CODE_X, CODE_Y, CODE_W, CODE_H, TEAL, "transparent",
              icon_file_id="file-devtools-cat", label_text="Coding capabilities", label_color=DARK,
              icon_header_size=HDR_ICON, header_height=HDR_ICON,
              stroke_style="solid", stroke_width=2, label_font_size=FONT_HDR)

container_box("lakehouse", LAKE_X, LAKE_Y, LAKE_W, LAKE_H, TEAL, "transparent",
              label_text="Amazon SageMaker Lakehouse", label_color=DARK,
              stroke_style="solid", stroke_width=2, label_font_size=FONT_HDR)

container_box("storage-box", STOR_X, STOR_Y, STOR_W, STOR_H, "#cccccc", GRAY_FILL,
              label_text="Storage", label_color=DARK,
              stroke_style="solid", stroke_width=1, label_font_size=FONT_HDR)

container_box("catalog-box", CAT_X, CAT_Y, CAT_W, CAT_H, "#cccccc", GRAY_FILL,
              label_text="Catalog", label_color=DARK,
              stroke_style="solid", stroke_width=1, label_font_size=FONT_HDR)

time.sleep(0.3)

# ===================================================
# 3. SERVICE ICONS — External
# ===================================================
LBL_USER = "ML\nengineers"
icon_label_component("ml-user", "file-user", LBL_USER,
                      cx=USER_CX, cy=icy_to_cy(USER_CY, LBL_USER, SM_ICON, font_size=FONT_SM),
                      icon_size=SM_ICON, font_size=FONT_SM, text_color=DARK)

# ===================================================
# 4. AWS IAM Identity Center
# ===================================================
LBL_IAM = "AWS IAM\nIdentity Center"
icon_label_component("iam", "file-iam-identity", LBL_IAM,
                      cx=IAM_CX, cy=icy_to_cy(IAM_CY, LBL_IAM),
                      icon_size=SVC_ICON, font_size=FONT_SM, text_color=DARK)

# ===================================================
# 5. SageMaker Unified Studio — service icon inside purple container
#    (arrow target; container header handles the structural title)
# ===================================================
LBL_SM_UNIFIED = "Amazon SageMaker\nUnified Studio"
icon_label_component("sm-unified", "file-sagemaker", LBL_SM_UNIFIED,
                      cx=SM_UNIFIED_CX, cy=icy_to_cy(SM_UNIFIED_CY, LBL_SM_UNIFIED, SM_ICON, font_size=FONT_SM),
                      icon_size=SM_ICON, font_size=FONT_SM, text_color=DARK)

# ===================================================
# 6. Sales Forecasting Project — 2x2 grid
# ===================================================
LBL_DB = "Database assets"
icon_label_component("db-assets", "file-database", LBL_DB,
                      cx=DB_CX, cy=icy_to_cy(DB_CY, LBL_DB, SM_ICON, font_size=FONT_SM),
                      icon_size=SM_ICON, font_size=FONT_SM, text_color=DARK)

LBL_GIT = "Git repository"
icon_label_component("git-repo", "file-git-repo", LBL_GIT,
                      cx=GIT_CX, cy=icy_to_cy(GIT_CY, LBL_GIT, SM_ICON, font_size=FONT_SM),
                      icon_size=SM_ICON, font_size=FONT_SM, text_color=DARK)

LBL_IDE = "Studio IDE"
icon_label_component("studio-ide", "file-notebook", LBL_IDE,
                      cx=IDE_CX, cy=icy_to_cy(IDE_CY, LBL_IDE, SM_ICON, font_size=FONT_SM),
                      icon_size=SM_ICON, font_size=FONT_SM, text_color=DARK)

LBL_TOOLS = "Tools"
icon_label_component("tools", "file-model", LBL_TOOLS,
                      cx=TOOLS_CX, cy=icy_to_cy(TOOLS_CY, LBL_TOOLS, SM_ICON, font_size=FONT_SM),
                      icon_size=SM_ICON, font_size=FONT_SM, text_color=DARK)

LBL_SM_ML = "Amazon SageMaker"
icon_label_component("sm-ml", "file-sagemaker-ai", LBL_SM_ML,
                      cx=SM_ML_CX, cy=icy_to_cy(SM_ML_CY, LBL_SM_ML),
                      icon_size=SVC_ICON, font_size=FONT_LBL, text_color=DARK)

LBL_Q = "Amazon Q\nDeveloper"
icon_label_component("amazon-q", "file-amazon-q", LBL_Q,
                      cx=Q_CX, cy=icy_to_cy(Q_CY, LBL_Q),
                      icon_size=SVC_ICON, font_size=FONT_LBL, text_color=DARK)

# ===================================================
# 9. Amazon SageMaker Lakehouse services
# ===================================================
LBL_REDSHIFT = "Amazon Redshift\nServerless"
icon_label_component("redshift", "file-redshift", LBL_REDSHIFT,
                      cx=REDSHIFT_CX, cy=icy_to_cy(REDSHIFT_CY, LBL_REDSHIFT),
                      icon_size=SVC_ICON, font_size=FONT_SM, text_color=DARK)

LBL_S3 = "Amazon S3"
icon_label_component("s3", "file-s3", LBL_S3,
                      cx=S3_CX, cy=icy_to_cy(S3_CY, LBL_S3),
                      icon_size=SVC_ICON, font_size=FONT_SM, text_color=DARK)

LBL_GLUE = "AWS Glue\nData Catalog"
icon_label_component("glue-cat", "file-glue-catalog", LBL_GLUE,
                      cx=GLUE_CX, cy=icy_to_cy(GLUE_CY, LBL_GLUE, SM_ICON, font_size=FONT_SM),
                      icon_size=SM_ICON, font_size=FONT_SM, text_color=DARK)

time.sleep(0.3)

# ===================================================
# 10. ARROWS
# ===================================================

# A1: ML engineers → IAM Identity Center (solid, right)
# Start at right edge of user icon, end at left edge of IAM icon
arrow("a-user-iam", USER_CX + SM_R + 5, USER_CY,
      IAM_CX - ICON_R - 2, IAM_CY,
      **ARROW_STYLE)

# A2: IAM Identity Center → SageMaker Unified Studio icon (horizontal, same Y) [label: 1]
arrow("a-iam-unified", IAM_CX + ICON_R + 2, IAM_CY,
      SM_UNIFIED_CX - SM_R - 2, IAM_CY,
      **ARROW_STYLE, label_number=1)

# A3: SageMaker Unified Studio → ML capabilities (solid, right) [circle 4]
arrow("a-unified-ml", UNIFIED_X + UNIFIED_W + 2, 300,
      ML_X - 2, 300,
      **ARROW_STYLE, label_number=4)

# A4: Coding cap → Studio IDE (L-shaped, approach from left) [standalone circle 3]
# "Studio IDE" label bbox with 8px margin spans x≈494–576, y≈415–448.
# Vertical segment at x=475 clears the label. Horizontal at y=390 is above label.
# Bend at y=528 (below Unified Studio border at y=500, above Coding cap at y=555).
_C3_Y = 528                                    # bend Y — circle 3 sits here
_APPR3_X = 475                                  # vertical approach X, left of label bbox
arrow("a-q-ide", IDE_CX, CODE_Y - 2,
      IDE_CX - SM_R - 2, IDE_CY,
      **ARROW_STYLE,
      waypoints=[[IDE_CX, _C3_Y],
                 [_APPR3_X, _C3_Y],
                 [_APPR3_X, IDE_CY]])

# A5: Lakehouse ↔ Tools (L-shaped bidirectional, approach from left) [standalone circle 5]
# "Tools" label bbox with 8px margin spans x≈699–751, y≈415–448.
# Vertical segment at x=660 clears the label. First segment goes UP so start
# arrowhead points DOWN toward Lakehouse.
_C5_Y = 525                                     # bend Y — circle 5 sits here
_APPR5_X = 660                                   # vertical approach X, left of label bbox
arrow("a-lake-tools", TOOLS_CX, LAKE_Y - 2,
      TOOLS_CX - SM_R - 2, TOOLS_CY,
      **ARROW_STYLE, start_arrowhead="arrow",
      waypoints=[[TOOLS_CX, _C5_Y],
                 [_APPR5_X, _C5_Y],
                 [_APPR5_X, TOOLS_CY]])

# A6: Amazon SageMaker (ML cap) → Lakehouse (dashed, down) [label: 6]
arrow("a-sm-lake", SM_ML_CX, ML_Y + ML_H + 2,
      SM_ML_CX, LAKE_Y - 2,
      **DASHED_ARROW, label_number=6)

# A7: Git repository → Database assets (solid, left — internal)
arrow("a-git-db", GIT_CX - SM_R - 2, GIT_CY,
      DB_CX + SM_R + 2, DB_CY,
      **ARROW_STYLE)

time.sleep(0.2)

# ===================================================
# 11. NUMBERED CIRCLES — standalone circles per reference image
# ===================================================

# Circle 2 — right below the SageMaker Unified Studio icon + label
numbered_circle("c2", 2, cx=SM_UNIFIED_CX, cy=SM_UNIFIED_CY + SM_R + COMP_GAP + 55,
                size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_LBL)

# Circle 3 — at arrow bend point in gap, below Unified Studio border (y=500)
numbered_circle("c3", 3, cx=IDE_CX, cy=_C3_Y,
                size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_LBL)

# Circle 5 — at arrow bend point in gap, below Unified Studio border (y=500)
numbered_circle("c5", 5, cx=TOOLS_CX, cy=_C5_Y,
                size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_LBL)

time.sleep(0.5)

# ===================================================
# 12. OVERLAP CHECKS & VALIDATION
# ===================================================
from utilities.overlap_checks import run_all_overlap_checks
report = run_all_overlap_checks()
import json as _json
print(_json.dumps(report, indent=2, default=str, ensure_ascii=True))

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
