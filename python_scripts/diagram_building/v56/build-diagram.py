#!/usr/bin/env python3
"""Build script for v56: AWS SageMaker Unified Studio Architecture"""

import sys, os, time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO_ROOT, 'clients', 'python'))

from components import *

# ─── Constants ───
TEAL = "#1a9e8f"
PURPLE = "#7B61FF"
DARK = "#1a1a1a"
WHITE = "#ffffff"
LIGHT_GRAY = "#e8e8e8"

ICON_SIZE = 65
HDR_ICON = ICON_SIZE     # HARD RULE: all icons same size
FONT_SIZE = 24   # HARD RULE: single font size for everything
CIRCLE_SIZE = 50

ARROW_STYLE = arrow_style(
    stroke_color=DARK, stroke_width=2, stroke_style="solid",
    label_bg=DARK, label_text_color=WHITE,
    label_size=CIRCLE_SIZE, label_font_size=FONT_SIZE,
    label_shape="circle"
)
DASHED_STYLE = arrow_style(
    stroke_color=DARK, stroke_width=2, stroke_style="dashed",
    label_bg=DARK, label_text_color=WHITE,
    label_size=CIRCLE_SIZE, label_font_size=FONT_SIZE,
    label_shape="circle"
)

HALF = ICON_SIZE / 2   # 32.5 — all icons use ICON_SIZE

# ═══════════════════════════════════════════════════
print("Step 1: Clear canvas")
clear()
time.sleep(0.5)

# ═══════════════════════════════════════════════════
print("Step 2: Upload icons")
register_icon_pack("v56", {
    "file-cloud-logo":    "aws-icons-official/Architecture-Group-Icons_01302026/AWS-Cloud-logo_32.svg",
    "file-region":        "aws-icons-official/Architecture-Group-Icons_01302026/Region_32.svg",
    "file-sagemaker-ai":  "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-SageMaker-AI_48.svg",
    "file-iam":           "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Security-Identity/48/Arch_AWS-IAM-Identity-Center_48.svg",
    "file-user":          "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_User_48_Light.svg",
    "file-database":      "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Database_48_Light.svg",
    "file-git-repo":      "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Git-Repository_48_Light.svg",
    "file-source-code":   "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Source-Code_48_Light.svg",
    "file-toolkit":       "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Toolkit_48_Light.svg",
    "file-ai-brain-v2":   "custom/Arch-Category_Artificial-Intelligence_48_NoBorder.svg",
    "file-coding-hdr":    "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Source-Code_48_Light.svg",
    "file-q":             "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-Q_48.svg",
    "file-redshift":      "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_Amazon-Redshift_48.svg",
    "file-s3":            "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Storage/48/Arch_Amazon-Simple-Storage-Service_48.svg",
    "file-glue-dc":       "aws-icons-official/Resource-Icons_01302026/Res_Analytics/Res_AWS-Glue_Data-Catalog_48.svg",
})
upload_icons("v56")
time.sleep(0.3)

# ═══════════════════════════════════════════════════
print("Step 3: Containers")
# Layout shift: +45px on inner containers to accommodate 65px header icons
# Region hdr bottom = 65+65=130, so inner containers start at y≥150
# Bottom row shifted +45 too → 570. Outer containers grown to match.

container_box("aws-cloud", 100, 15, 1360, 930,
    stroke_color=TEAL, fill_color="transparent",
    icon_file_id="file-cloud-logo", label_text="AWS Cloud",
    label_color=DARK, icon_header_size=HDR_ICON,
    stroke_style="solid", label_font_size=FONT_SIZE)  # HARD RULE: AWS Cloud is always solid

container_box("aws-region", 240, 65, 1205, 865,
    stroke_color=TEAL, fill_color="transparent",
    icon_file_id="file-region", label_text="AWS Region",
    label_color=DARK, icon_header_size=HDR_ICON,
    stroke_style="dashed", label_font_size=FONT_SIZE)

container_box("sagemaker", 270, 150, 580, 345,
    stroke_color=TEAL, fill_color="transparent",
    icon_file_id="file-sagemaker-ai", label_text="Amazon SageMaker",
    label_color=DARK, icon_header_size=HDR_ICON,
    label_font_size=FONT_SIZE)

container_box("sfp", 465, 230, 370, 250,
    stroke_color=PURPLE, fill_color="transparent",
    label_text="Sales Forecasting Project",
    label_color=PURPLE, label_font_size=FONT_SIZE)

container_box("ml-cap", 925, 150, 310, 340,
    stroke_color=TEAL, fill_color="transparent",
    icon_file_id="file-ai-brain-v2", label_text="ML capabilities",
    label_color=DARK, icon_header_size=HDR_ICON,
    label_font_size=FONT_SIZE)

container_box("coding-cap", 340, 570, 235, 270,
    stroke_color=DARK, fill_color="transparent",
    icon_file_id="file-coding-hdr", label_text="Coding capabilities",
    label_color=DARK, icon_header_size=HDR_ICON,
    label_font_size=FONT_SIZE)

container_box("lakehouse", 645, 570, 800, 340,
    stroke_color=TEAL, fill_color="transparent",
    label_text="Amazon SageMaker Lakehouse",
    label_color=DARK, label_font_size=FONT_SIZE)

container_box("storage", 930, 640, 200, 250,
    stroke_color="transparent", fill_color=LIGHT_GRAY,
    label_text="Storage", label_color=DARK,
    label_font_size=FONT_SIZE)

container_box("catalog", 1185, 640, 230, 250,
    stroke_color="transparent", fill_color=LIGHT_GRAY,
    label_text="Catalog", label_color=DARK,
    label_font_size=FONT_SIZE)

time.sleep(0.3)

# ═══════════════════════════════════════════════════
print("Step 4: Service icons")

# ML engineers shifted left (x=20) so 24px "engineers" label doesn't overlap IAM's "Identity Center"
ml_eng = icon_label_component("ml-eng", "file-user", "ML\nengineers",
    20, 345, icon_size=ICON_SIZE, font_size=FONT_SIZE)

iam = icon_label_component("iam", "file-iam", "AWS IAM\nIdentity Center",
    180, 345, icon_size=ICON_SIZE, font_size=FONT_SIZE)

# Unified Studio — cx=380 keeps labels left of SFP (465) and right of arrow a3 path (290)
unified = icon_label_component("unified", "file-sagemaker-ai",
    "Amazon SageMaker\nUnified Studio",
    380, 345, icon_size=ICON_SIZE, font_size=FONT_SIZE)

grid_items = grid_2x2("sfp-grid", [
    {"file_id": "file-database",   "label": "Database assets", "id_suffix": "db-assets"},
    {"file_id": "file-git-repo",   "label": "Git repository",  "id_suffix": "git-repo"},
    {"file_id": "file-source-code","label": "Studio IDE",       "id_suffix": "studio-ide"},
    {"file_id": "file-toolkit",    "label": "Tools",            "id_suffix": "tools"},
], "sfp", header_h=38, icon_size=ICON_SIZE, font_size=FONT_SIZE)
db_assets, git_repo, studio_ide, tools_item = grid_items

# SM-ML — positioned so icon_cy matches Tools icon_cy for horizontal arrow 4
tools_icy = tools_item["bbox"]["icon_cy"]
sm_ml = icon_label_component("sm-ml", "file-sagemaker-ai", "Amazon SageMaker",
    1080, tools_icy + 15, icon_size=ICON_SIZE, font_size=FONT_SIZE)

q_dev = service_in_container("q-dev", "file-q", "Amazon Q\nDeveloper",
    "coding-cap", icon_size=ICON_SIZE, font_size=FONT_SIZE)

redshift = icon_label_component("redshift", "file-redshift",
    "Amazon Redshift\nServerless", 740, 770, icon_size=ICON_SIZE, font_size=FONT_SIZE)

s3 = icon_label_component("s3", "file-s3", "Amazon S3",
    1030, 775, icon_size=ICON_SIZE, font_size=FONT_SIZE)

glue = icon_label_component("glue", "file-glue-dc", "AWS Glue\nData Catalog",
    1300, 775, icon_size=ICON_SIZE, font_size=FONT_SIZE)

time.sleep(0.3)

# ═══════════════════════════════════════════════════
print("Step 5: Arrows")

ml_icx,  ml_icy  = ml_eng["bbox"]["icon_cx"],      ml_eng["bbox"]["icon_cy"]
iam_icx, iam_icy = iam["bbox"]["icon_cx"],          iam["bbox"]["icon_cy"]
uni_icx, uni_icy = unified["bbox"]["icon_cx"],       unified["bbox"]["icon_cy"]
db_icx,  db_icy  = db_assets["bbox"]["icon_cx"],     db_assets["bbox"]["icon_cy"]
git_icx, git_icy = git_repo["bbox"]["icon_cx"],      git_repo["bbox"]["icon_cy"]
ide_icx, ide_icy = studio_ide["bbox"]["icon_cx"],    studio_ide["bbox"]["icon_cy"]
tl_icx,  tl_icy  = tools_item["bbox"]["icon_cx"],    tools_item["bbox"]["icon_cy"]
sm_icx,  sm_icy  = sm_ml["bbox"]["icon_cx"],         sm_ml["bbox"]["icon_cy"]
q_icx,   q_icy   = q_dev["bbox"]["icon_cx"],         q_dev["bbox"]["icon_cy"]

print(f"  ML:{ml_icx:.0f},{ml_icy:.0f} IAM:{iam_icx:.0f},{iam_icy:.0f} Uni:{uni_icx:.0f},{uni_icy:.0f}")
print(f"  DB:{db_icx:.0f},{db_icy:.0f} Git:{git_icx:.0f},{git_icy:.0f} IDE:{ide_icx:.0f},{ide_icy:.0f} Tools:{tl_icx:.0f},{tl_icy:.0f}")
print(f"  SM:{sm_icx:.0f},{sm_icy:.0f} Q:{q_icx:.0f},{q_icy:.0f}")

# ── Arrow 1: ML engineers → IAM (horizontal) ──
arrow("a1",
    ml_icx + HALF, ml_icy,
    iam_icx - HALF, iam_icy,
    label_number=1,
    label_cx=70, label_cy=ml_icy - 65,  # cx=70 keeps circle fully outside cloud (x=100)
    **ARROW_STYLE)

# ── Arrow 2: IAM → Unified Studio (horizontal) ──
uni_label_bottom = unified["bbox"]["y"] + unified["bbox"]["h"]
arrow("a2",
    iam_icx + HALF, iam_icy,
    uni_icx - HALF, uni_icy,
    label_number=2,
    label_cx=380, label_cy=uni_label_bottom + 30,
    **ARROW_STYLE)

# ── Arrow 3: Q Dev → Studio IDE (L-shape) ──
# Route: Q left → x=290 left of labels → up to IDE left edge
ide_enter_y = ide_icy + HALF - 2
arrow("a3",
    q_icx - HALF, q_icy,
    ide_icx - HALF, ide_enter_y,
    waypoints=[(290, q_icy), (290, ide_enter_y)],
    label_number=3,
    label_cx=290, label_cy=532,
    **ARROW_STYLE)

# ── Arrow 4: Tools → SM-ML (horizontal, same y) ──
arrow("a4",
    tl_icx + HALF, tl_icy,
    sm_icx - HALF, sm_icy,
    label_number=4,
    label_cx=887, label_cy=tl_icy - 55,
    **ARROW_STYLE)

# ── Arrow 5: SFP bottom → Lakehouse top (vertical) ──
sfp_bottom = 230 + 250   # 480
lake_top = 570
a5_x = (ide_icx + tl_icx) / 2
arrow("a5",
    a5_x, sfp_bottom,
    a5_x, lake_top,
    label_number=5,
    label_cx=a5_x + 35, label_cy=(sfp_bottom + lake_top) / 2,
    **ARROW_STYLE)

# ── Arrow 6: SM-ML → Lakehouse (dashed, vertical) ──
sm_bottom = sm_ml["bbox"]["y"] + sm_ml["bbox"]["h"] + 15
arrow("a6",
    sm_icx, sm_bottom,
    sm_icx, lake_top,
    label_number=6,
    label_cx=sm_icx + 35, label_cy=(sm_bottom + lake_top) / 2,
    **DASHED_STYLE)

# ── Internal: Git → Database (horizontal left) ──
arrow("a-git-db",
    git_icx - HALF, git_icy,
    db_icx + HALF, db_icy,
    stroke_color=DARK, stroke_width=2)

time.sleep(0.3)

# ═══════════════════════════════════════════════════
print("\nStep 6: Overlap checks")
sys.path.insert(0, os.path.join(REPO_ROOT, 'utilities'))
from overlap_checks import run_all_overlap_checks
report = run_all_overlap_checks()
checks = report.get("checks", [])
for c in checks:
    issues = c.get("issues", [])
    if issues:
        name = c['name']
        print(f"  {c['status']} {name}: {len(issues)}")
        for iss in issues[:3]:
            msg = str(iss.get('message', iss)).encode('ascii', 'replace').decode()
            print(f"    - {msg}")
print(f"\n  Errors: {report.get('total_errors',0)}  Warnings: {report.get('total_warnings',0)}")

# ═══════════════════════════════════════════════════
print("\nStep 7: Save")
save_state(os.path.join(SCRIPT_DIR, "diagram.excalidraw"))
print("Build complete!")
