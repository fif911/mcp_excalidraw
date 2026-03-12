#!/usr/bin/env python3
"""
v55 — Amazon SageMaker Unified Studio Architecture Diagram
Reference: refs/tg_image_565119128.png
"""
import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'clients', 'python'))
from components import *

# ===================================================================
# CONFIGURATION
# ===================================================================
FONT_HDR = 20
FONT_BODY = 18
ICON_SIZE = 65
CIRCLE_SIZE = 50   # must match numbered_circle() default size
CIRCLE_FONT = 18   # must match numbered_circle() default font_size
ICON_R = ICON_SIZE / 2   # 24

AWS_TEAL = "#147eba"
PURPLE = "#7c3aed"
GRAY_FILL = "#e5e7eb"
GRAY_BORDER = "#d1d5db"
TEXT_COLOR = "#1a1a1a"

ASTYLE = arrow_style(
    stroke_color="#1a1a1a", stroke_width=2, stroke_style="solid",
    label_bg="#1a1a1a", label_text_color="#ffffff",
    label_size=CIRCLE_SIZE, label_font_size=CIRCLE_FONT,
)

# ===================================================================
# LAYOUT — all container positions
# ===================================================================
# Adjusted to fix: icon overlap, circle-border clearance (15px min)

CLOUD_X, CLOUD_Y  = 130, 10
CLOUD_W, CLOUD_H  = 1410, 1090

REGION_X, REGION_Y = 140, 85
REGION_W, REGION_H = 1380, 990

# SageMaker group: shifted right 70px for arrow 5 spacing from Lakehouse
SM_X, SM_Y = 350, 140
SM_W, SM_H = 670, 425   # bottom = 565

# Sales Forecasting Project inside SageMaker
PJ_X, PJ_Y = 550, 195
PJ_W, PJ_H = 450, 360   # bottom = 555

# ML capabilities (right of SageMaker) — taller to fit icon at cy=425
ML_X, ML_Y = 1070, 140
ML_W, ML_H = 360, 380    # bottom = 520

# Coding capabilities (below SageMaker, with 90px gap for circles)
CD_X, CD_Y = 340, 655
CD_W, CD_H = 300, 260    # bottom = 915

# Lakehouse (bottom-right, shifted right for spacing from Coding)
LK_X, LK_Y = 740, 655
LK_W, LK_H = 730, 330    # bottom = 985

# Storage & Catalog inside Lakehouse
ST_X, ST_Y = 1030, 710
ST_W, ST_H = 200, 240

CT_X, CT_Y = 1260, 710
CT_W, CT_H = 200, 240

# ===================================================================
# 1. SETUP
# ===================================================================
clear()
time.sleep(0.5)

ICONS_DIR = os.path.join(REPO_ROOT, "icons")
icon_files = {
    "file-cloud-logo": "aws-icons-official/Architecture-Group-Icons_01302026/AWS-Cloud-logo_32.svg",
    "file-region": "aws-icons-official/Architecture-Group-Icons_01302026/Region_32.svg",
    "file-iam": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Security-Identity/48/Arch_AWS-IAM-Identity-Center_48.svg",
    "file-sagemaker-ai": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-SageMaker-AI_48.svg",
    "file-sagemaker": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_Amazon-SageMaker_48.svg",
    "file-q": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-Q_48.svg",
    "file-redshift": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_Amazon-Redshift_48.svg",
    "file-s3": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Storage/48/Arch_Amazon-Simple-Storage-Service_48.svg",
    "file-glue-catalog": "aws-icons-official/Resource-Icons_01302026/Res_Analytics/Res_AWS-Glue_Data-Catalog_48.svg",
    "file-users": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Users_48_Light.svg",
    "file-database": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Database_48_Light.svg",
    "file-git": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Git-Repository_48_Light.svg",
    "file-source-code": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Source-Code_48_Light.svg",
    "file-toolkit": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Toolkit_48_Light.svg",
}
for fid, rel_path in icon_files.items():
    full_path = os.path.join(ICONS_DIR, rel_path)
    if os.path.exists(full_path):
        upload_svg(fid, full_path)
        time.sleep(0.1)
    else:
        print(f"WARNING: Icon not found: {full_path}")
time.sleep(0.5)
print("Icons uploaded")

# ===================================================================
# 2. CONTAINERS (outside-in)
# ===================================================================
container_box("aws-cloud", CLOUD_X, CLOUD_Y, CLOUD_W, CLOUD_H,
              stroke_color=AWS_TEAL, stroke_style="solid", stroke_width=2,
              fill_color="transparent",
              icon_file_id="file-cloud-logo", label_text="AWS Cloud",
              label_color=TEXT_COLOR,
              icon_header_size=ICON_SIZE, header_height=ICON_SIZE,
              label_font_size=FONT_HDR)

container_box("aws-region", REGION_X, REGION_Y, REGION_W, REGION_H,
              stroke_color=AWS_TEAL, stroke_style="dashed", stroke_width=2,
              fill_color="transparent",
              icon_file_id="file-region", label_text="AWS Region",
              label_color=TEXT_COLOR,
              icon_header_size=ICON_SIZE, header_height=ICON_SIZE,
              label_font_size=FONT_HDR)

container_box("sagemaker-group", SM_X, SM_Y, SM_W, SM_H,
              stroke_color=AWS_TEAL, stroke_style="solid", stroke_width=2,
              fill_color="transparent",
              icon_file_id="file-sagemaker-ai", label_text="Amazon SageMaker",
              label_color=TEXT_COLOR,
              icon_header_size=ICON_SIZE, header_height=ICON_SIZE,
              label_font_size=FONT_HDR)

container_box("project", PJ_X, PJ_Y, PJ_W, PJ_H,
              stroke_color=PURPLE, stroke_style="solid", stroke_width=2,
              fill_color="transparent",
              label_text="Sales Forecasting Project",
              label_color=TEXT_COLOR,
              header_height=35, label_font_size=FONT_HDR)

container_box("ml-cap", ML_X, ML_Y, ML_W, ML_H,
              stroke_color=AWS_TEAL, stroke_style="solid", stroke_width=2,
              fill_color="transparent",
              icon_file_id="file-sagemaker-ai", label_text="ML capabilities",
              label_color=TEXT_COLOR,
              icon_header_size=ICON_SIZE, header_height=ICON_SIZE,
              label_font_size=FONT_HDR)

container_box("coding-cap", CD_X, CD_Y, CD_W, CD_H,
              stroke_color=AWS_TEAL, stroke_style="solid", stroke_width=2,
              fill_color="transparent",
              icon_file_id="file-source-code", label_text="Coding capabilities",
              label_color=TEXT_COLOR,
              icon_header_size=ICON_SIZE, header_height=ICON_SIZE,
              label_font_size=FONT_HDR)

container_box("lakehouse", LK_X, LK_Y, LK_W, LK_H,
              stroke_color=AWS_TEAL, stroke_style="solid", stroke_width=2,
              fill_color="transparent",
              label_text="Amazon SageMaker Lakehouse",
              label_color=AWS_TEAL,
              header_height=35, label_font_size=FONT_HDR)

container_box("storage-box", ST_X, ST_Y, ST_W, ST_H,
              stroke_color=GRAY_BORDER, stroke_style="solid", stroke_width=1,
              fill_color=GRAY_FILL,
              label_text="Storage", label_color=TEXT_COLOR,
              header_height=30, label_font_size=FONT_HDR)

container_box("catalog-box", CT_X, CT_Y, CT_W, CT_H,
              stroke_color=GRAY_BORDER, stroke_style="solid", stroke_width=1,
              fill_color=GRAY_FILL,
              label_text="Catalog", label_color=TEXT_COLOR,
              header_height=30, label_font_size=FONT_HDR)

time.sleep(0.3)

# ===================================================================
# 3. SERVICE ICONS
# ===================================================================

# --- External: ML engineers (outside Cloud) ---
ml_eng = icon_label_component("ml-eng", "file-users", "ML\nengineers",
                               cx=55, cy=340, icon_size=50,
                               font_size=FONT_BODY, text_color=TEXT_COLOR)

# --- IAM Identity Center (inside Region, left of SageMaker group) ---
# cx=285: icon right (317.5) < SageMaker left (350) with 32px clearance
iam = icon_label_component("iam", "file-iam", "AWS IAM\nIdentity Center",
                            cx=285, cy=340, icon_size=ICON_SIZE,
                            font_size=FONT_BODY, text_color=TEXT_COLOR)

# --- SageMaker Unified Studio (inside SageMaker, left of Project) ---
# cx=445: label right ~527 < Project left 550 with 23px clearance
unified = icon_label_component("unified", "file-sagemaker",
                                "Amazon SageMaker\nUnified Studio",
                                cx=445, cy=340, icon_size=ICON_SIZE,
                                font_size=FONT_BODY, text_color=TEXT_COLOR)

# --- 2x2 Grid inside Project ---
# Project: x=480, y=170, w=450, h=360, header=40
# Content area: y=210 to y=530 (320px)
grid_lcx = PJ_X + PJ_W * 0.25   # 592.5
grid_rcx = PJ_X + PJ_W * 0.75   # 817.5
grid_tcy = PJ_Y + 35 + (PJ_H - 35) * 0.25  # ~311
grid_bcy = 425  # aligned with SageMaker ML for horizontal arrow 4

db_assets = icon_label_component("db-assets", "file-database", "Database assets",
                                  cx=grid_lcx, cy=grid_tcy, icon_size=ICON_SIZE,
                                  font_size=FONT_BODY, text_color=TEXT_COLOR)

git_repo = icon_label_component("git-repo", "file-git", "Git repository",
                                 cx=grid_rcx, cy=grid_tcy, icon_size=ICON_SIZE,
                                 font_size=FONT_BODY, text_color=TEXT_COLOR)

studio_ide = icon_label_component("studio-ide", "file-source-code", "Studio IDE",
                                   cx=grid_lcx, cy=grid_bcy, icon_size=ICON_SIZE,
                                   font_size=FONT_BODY, text_color=TEXT_COLOR)

tools_comp = icon_label_component("tools", "file-toolkit", "Tools",
                                   cx=grid_rcx, cy=grid_bcy, icon_size=ICON_SIZE,
                                   font_size=FONT_BODY, text_color=TEXT_COLOR)

# --- Amazon SageMaker in ML capabilities ---
# cy=425 matches grid_bcy for horizontal arrow 4
sagemaker_ml = icon_label_component("sagemaker-ml", "file-sagemaker-ai",
                                     "Amazon SageMaker",
                                     cx=ML_X + ML_W / 2, cy=425, icon_size=ICON_SIZE,
                                     font_size=FONT_BODY, text_color=TEXT_COLOR)

# --- Amazon Q Developer in Coding capabilities ---
q_dev = icon_label_component("q-dev", "file-q", "Amazon Q\nDeveloper",
                              cx=CD_X + CD_W / 2, cy=810, icon_size=ICON_SIZE,
                              font_size=FONT_BODY, text_color=TEXT_COLOR)

# --- Redshift Serverless in Lakehouse ---
redshift = icon_label_component("redshift", "file-redshift",
                                 "Amazon Redshift\nServerless",
                                 cx=855, cy=840, icon_size=ICON_SIZE,
                                 font_size=FONT_BODY, text_color=TEXT_COLOR)

# --- S3 in Storage ---
s3 = icon_label_component("s3", "file-s3", "Amazon S3",
                           cx=ST_X + ST_W / 2, cy=855, icon_size=ICON_SIZE,
                           font_size=FONT_BODY, text_color=TEXT_COLOR)

# --- Glue Data Catalog in Catalog ---
glue = icon_label_component("glue", "file-glue-catalog",
                             "AWS Glue\nData Catalog",
                             cx=CT_X + CT_W / 2, cy=855, icon_size=ICON_SIZE,
                             font_size=FONT_BODY, text_color=TEXT_COLOR)

time.sleep(0.3)

# ===================================================================
# 4. ARROWS + NUMBERED CIRCLES (manual positioning)
# ===================================================================
# Read actual icon centers
ml_icx, ml_icy = ml_eng["bbox"]["icon_cx"], ml_eng["bbox"]["icon_cy"]
iam_icx, iam_icy = iam["bbox"]["icon_cx"], iam["bbox"]["icon_cy"]
uni_icx, uni_icy = unified["bbox"]["icon_cx"], unified["bbox"]["icon_cy"]
tools_icx, tools_icy = tools_comp["bbox"]["icon_cx"], tools_comp["bbox"]["icon_cy"]
sm_icx, sm_icy = sagemaker_ml["bbox"]["icon_cx"], sagemaker_ml["bbox"]["icon_cy"]
ide_icx, ide_icy = studio_ide["bbox"]["icon_cx"], studio_ide["bbox"]["icon_cy"]
qdev_icx, qdev_icy = q_dev["bbox"]["icon_cx"], q_dev["bbox"]["icon_cy"]
db_icx, db_icy = db_assets["bbox"]["icon_cx"], db_assets["bbox"]["icon_cy"]
git_icx, git_icy = git_repo["bbox"]["icon_cx"], git_repo["bbox"]["icon_cy"]

print(f"Icon centers: IAM=({iam_icx},{iam_icy}), Unified=({uni_icx},{uni_icy})")
print(f"  Tools=({tools_icx},{tools_icy}), SageMaker ML=({sm_icx},{sm_icy})")
print(f"  Studio IDE=({ide_icx},{ide_icy}), Q Dev=({qdev_icx},{qdev_icy})")

# --- Arrow 1: ML engineers -> IAM (horizontal) ---
a1_sx = ml_icx + 25           # right edge of user icon (50/2=25)
a1_ex = iam_icx - ICON_R      # left edge of IAM
a1_y = ml_icy
arrow("a1", a1_sx, a1_y, a1_ex, iam_icy, **ASTYLE)

# Circle 1: above arrow, fully inside Region, clear of IAM icon
# Place well above the icons and fully inside Region (x>140+20+8=168)
c1_cx = 195   # left edge=170, clearance from Region(140)=30px, from Cloud(130)=40px
c1_cy = 250   # above IAM icon top (~307)
numbered_circle("c1", 1, cx=c1_cx, cy=c1_cy)

# --- Arrow 2: IAM -> Unified Studio (horizontal) ---
a2_sx = iam_icx + ICON_R
a2_ex = uni_icx - ICON_R
# Both have same cy=315, so icon_cy should be identical
arrow("a2", a2_sx, iam_icy, a2_ex, uni_icy, **ASTYLE)

# Circle 2: below Unified Studio (matches reference placement)
# Unified Studio at cx=445, component bottom ~374
c2_cx = 445
c2_cy = 433   # below Unified Studio, inside SageMaker container
numbered_circle("c2", 2, cx=c2_cx, cy=c2_cy)

# (Git -> DB arrow removed; arrow 5 now enters DB from right)

# --- Arrow 3: Q Developer -> Studio IDE (L-shape, right then up) ---
# Exit Q Dev RIGHT edge, go right to align with Studio IDE X (592.5 > header end ~551),
# then up to just below "Studio IDE" label text (no crossing).
ide_bottom = studio_ide["bbox"]["y"] + studio_ide["bbox"]["h"]

arrow("a3",
      qdev_icx + ICON_R, qdev_icy,          # Q Dev right edge
      ide_icx, ide_bottom + 2,               # just below Studio IDE label
      waypoints=[(ide_icx, qdev_icy)],       # L-bend: right then up
      **ASTYLE)

# Circle 3: to the right of vertical segment, in gap between SageMaker (540) and Coding (600)
c3_cy = (SM_Y + SM_H + CD_Y) / 2   # midpoint of gap = 570
c3_cx = ide_icx + CIRCLE_SIZE / 2 + 8  # to the right of arrow at x=592.5
numbered_circle("c3", 3, cx=round(c3_cx), cy=round(c3_cy))

# --- Arrow 4: Studio IDE -> SageMaker ML (U-shape over icons) ---
# Tools blocks direct horizontal path. Route above top row icons via x=665
# (between DB assets right ~625 and Git repo left ~785, clearing both).
a4_vx = 780    # vertical segment x — clear of DB label (~730 right) and Git icon (~855 left)
a4_hy = 252    # horizontal route y — below PJ header text (~230) with 22px gap, above icons (~278)
arrow("a4",
      ide_icx + ICON_R, ide_icy,          # start: Studio IDE right edge
      sm_icx, sm_icy - ICON_R,            # end: SageMaker ML icon top
      waypoints=[(a4_vx, ide_icy), (a4_vx, a4_hy), (sm_icx, a4_hy)],
      label_number=4,
      label_cx=sm_icx + CIRCLE_SIZE / 2 + 8,  # right of downward segment in ML cap
      label_cy=(a4_hy + sm_icy - ICON_R) / 2,
      **ASTYLE)

# --- Arrow 5: Lakehouse <-> Database assets (L-shaped, bidirectional) ---
# L-shape: up from Lakehouse top, then left into DB assets right edge
# Vertical segment at Project center x, in gap between DB and Git columns
a5_vx = PJ_X + PJ_W / 2   # 775 — centered between icon columns, inside Lakehouse
arrow("a5",
      a5_vx, LK_Y,                       # start: Lakehouse top border
      db_icx + ICON_R, db_icy,           # end: Database assets right edge
      waypoints=[(a5_vx, db_icy)],        # L-bend: up then left
      start_arrowhead="arrow", end_arrowhead="arrow",
      **ASTYLE)

# Circle 5: right of vertical segment, in gap between SageMaker bottom and Lakehouse top
c5_cy = (SM_Y + SM_H + LK_Y) / 2
c5_cx = a5_vx + CIRCLE_SIZE / 2 + 10
if c5_cy - CIRCLE_SIZE / 2 < SM_Y + SM_H + 5:
    c5_cy = SM_Y + SM_H + CIRCLE_SIZE / 2 + 8
if c5_cy + CIRCLE_SIZE / 2 > LK_Y - 5:
    c5_cy = LK_Y - CIRCLE_SIZE / 2 - 8
numbered_circle("c5", 5, cx=round(c5_cx), cy=round(c5_cy))

# --- Arrow 6: SageMaker ML -> Lakehouse (dashed, vertical, down) ---
# Must avoid "Amazon SageMaker" label text below icon.
# Label at y ~ sm_icy+32.5+8=sm_icy+40.5, height ~22.5, so bottom ~sm_icy+63
# Start arrow from below label: y = sm_icy + ICON_R + 8 + 22.5 + 20
sm_label_bottom_approx = sm_icy + ICON_R + 8 + FONT_BODY * 1.25
a6_start_y = sm_label_bottom_approx + 20  # clear the label with margin

arrow("a6",
      sm_icx, a6_start_y,
      sm_icx, LK_Y,
      stroke_color="#1a1a1a", stroke_width=2, stroke_style="dashed",
      label_bg="#1a1a1a", label_text_color="#ffffff",
      label_size=CIRCLE_SIZE, label_font_size=CIRCLE_FONT)

# Circle 6: right of arrow, in gap between ML cap bottom (455) and Lakehouse top (600)
c6_cy = (ML_Y + ML_H + LK_Y) / 2   # (455+600)/2 = 527.5
c6_cx = sm_icx + CIRCLE_SIZE / 2 + 10
# Ensure doesn't cross ML cap bottom or Lakehouse top
if c6_cy - CIRCLE_SIZE / 2 < ML_Y + ML_H + 5:
    c6_cy = ML_Y + ML_H + CIRCLE_SIZE / 2 + 8
if c6_cy + CIRCLE_SIZE / 2 > LK_Y - 5:
    c6_cy = LK_Y - CIRCLE_SIZE / 2 - 8
numbered_circle("c6", 6, cx=round(c6_cx), cy=round(c6_cy))

time.sleep(0.5)

# ===================================================================
# 5. VALIDATION
# ===================================================================
all_issues = []
all_issues += validate_arrow_paths()
all_issues += validate_diagram()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from utilities.overlap_checks import run_all_overlap_checks
report = run_all_overlap_checks()

n = len(get_elements().get('elements', []))
print(f"\nDiagram built with {n} elements")

if all_issues:
    print(f"\n--- {len(all_issues)} validation issues ---")
    for iss in all_issues:
        safe = iss.encode('ascii', 'replace').decode('ascii')
        print(f"  - {safe}")

if report:
    summary = report.get('summary', '') if isinstance(report, dict) else str(report)
    safe_summary = str(summary).encode('ascii', 'replace').decode('ascii')
    print(f"\n--- Overlap report ---")
    print(safe_summary)

if not all_issues:
    print("\nAll structural validation passed")

print("\nBuild complete.")
