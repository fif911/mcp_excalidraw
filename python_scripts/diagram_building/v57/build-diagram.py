#!/usr/bin/env python3
"""
v57 Build Script: AWS SageMaker Unified Studio Architecture
Reference: refs/tg_image_565119128.png
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'clients', 'python'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from components import (
    clear, upload_svg, icon_label_component, numbered_circle,
    container_box, service_in_container, grid_2x2,
    arrow, arrow_style, measure_text, create
)
from utilities.overlap_checks import run_all_overlap_checks

# ── Constants ──
ICON_SIZE = 65
FONT_SIZE = 24
ICONS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'icons')
TEAL = "#1a9e8f"
PURPLE = "#7B61FF"
BLACK = "#1a1a1a"
GRAY_BG = "#e8e8e8"

ARROW_STYLE = arrow_style(
    stroke_color=BLACK, stroke_width=2, stroke_style="solid",
    label_bg=BLACK, label_text_color="#ffffff",
    label_size=50, label_font_size=24, label_shape="circle"
)

ICONS = {
    "file-cloud-logo": "aws-icons-official/Architecture-Group-Icons_01302026/AWS-Cloud-logo_32.svg",
    "file-region": "aws-icons-official/Architecture-Group-Icons_01302026/Region_32.svg",
    "file-sagemaker-ai": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-SageMaker-AI_48.svg",
    "file-sagemaker": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_Amazon-SageMaker_48.svg",
    "file-iam": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Security-Identity/48/Arch_AWS-IAM-Identity-Center_48.svg",
    "file-redshift": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_Amazon-Redshift_48.svg",
    "file-s3": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Storage/48/Arch_Amazon-Simple-Storage-Service_48.svg",
    "file-q": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-Q_48.svg",
    "file-user": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_User_48_Light.svg",
    "file-database": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Database_48_Light.svg",
    "file-git-repo": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Git-Repository_48_Light.svg",
    "file-source-code": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Source-Code_48_Light.svg",
    "file-toolkit": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Toolkit_48_Light.svg",
    "file-programming": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Programming-Language_48_Light.svg",
    "file-glue-dc": "aws-icons-official/Resource-Icons_01302026/Res_Analytics/Res_AWS-Glue_Data-Catalog_48.svg",
    "file-ai-cat": "custom/Arch-Category_Artificial-Intelligence_48_NoBorder.svg",
}


def upload_all():
    for fid, rel_path in ICONS.items():
        full_path = os.path.join(ICONS_DIR, rel_path)
        if os.path.exists(full_path):
            upload_svg(fid, full_path)
        else:
            print(f"WARNING: Icon not found: {full_path}")


def build():
    print("=== v57: AWS SageMaker Unified Studio Architecture ===")
    clear()
    upload_all()

    # ════════════════════════════════════════════
    # LAYOUT - carefully spaced to avoid overlaps
    # ════════════════════════════════════════════

    # Outer containers
    cloud_x, cloud_y = 80, 15
    cloud_w, cloud_h = 1420, 960

    region_x, region_y = 260, 75
    region_w, region_h = 1225, 885

    # SageMaker container (upper-left of region)
    sm_x, sm_y = 290, 150
    sm_w, sm_h = 620, 390

    # Sales Forecasting Project (inside SageMaker, right portion)
    sfp_x, sfp_y = 525, 230
    sfp_w, sfp_h = 370, 295

    # ML capabilities (right of SageMaker)
    ml_x, ml_y = 980, 150
    ml_w, ml_h = 300, 390

    # Coding capabilities (below SageMaker, left)
    cc_x, cc_y = 340, 610
    cc_w, cc_h = 290, 260

    # Lakehouse (bottom-right)
    lh_x, lh_y = 650, 610
    lh_w, lh_h = 820, 340

    # Sub-containers inside Lakehouse
    st_x, st_y = 950, 680
    st_w, st_h = 200, 250

    cat_x, cat_y = 1210, 680
    cat_w, cat_h = 235, 250

    # ════════════════════════════════════════════
    # CONTAINERS (back to front)
    # ════════════════════════════════════════════

    container_box("aws-cloud", cloud_x, cloud_y, cloud_w, cloud_h,
                  stroke_color=TEAL, stroke_style="solid", stroke_width=2,
                  icon_file_id="file-cloud-logo", label_text="AWS Cloud",
                  label_color=BLACK, icon_header_size=ICON_SIZE)

    container_box("aws-region", region_x, region_y, region_w, region_h,
                  stroke_color=TEAL, stroke_style="dashed", stroke_width=2,
                  icon_file_id="file-region", label_text="AWS Region",
                  label_color=BLACK, icon_header_size=ICON_SIZE)

    container_box("sagemaker", sm_x, sm_y, sm_w, sm_h,
                  stroke_color=TEAL, stroke_style="solid", stroke_width=2,
                  icon_file_id="file-sagemaker-ai", label_text="Amazon SageMaker",
                  label_color=BLACK, icon_header_size=ICON_SIZE)

    container_box("sfp", sfp_x, sfp_y, sfp_w, sfp_h,
                  stroke_color=PURPLE, stroke_style="solid", stroke_width=2,
                  label_text="Sales Forecasting Project",
                  label_color=PURPLE, label_font_size=FONT_SIZE)

    container_box("ml-cap", ml_x, ml_y, ml_w, ml_h,
                  stroke_color=TEAL, stroke_style="solid", stroke_width=2,
                  icon_file_id="file-ai-cat", label_text="ML capabilities",
                  label_color=BLACK, icon_header_size=ICON_SIZE)

    container_box("coding-cap", cc_x, cc_y, cc_w, cc_h,
                  stroke_color=BLACK, stroke_style="solid", stroke_width=2,
                  icon_file_id="file-programming", label_text="Coding capabilities",
                  label_color=BLACK, icon_header_size=ICON_SIZE)

    container_box("lakehouse", lh_x, lh_y, lh_w, lh_h,
                  stroke_color=TEAL, stroke_style="solid", stroke_width=2,
                  label_text="Amazon SageMaker Lakehouse",
                  label_color=BLACK, label_font_size=FONT_SIZE)

    container_box("storage", st_x, st_y, st_w, st_h,
                  stroke_color="transparent", stroke_style="solid", stroke_width=2,
                  fill_color=GRAY_BG, label_text="Storage", label_color=BLACK,
                  label_font_size=FONT_SIZE)

    container_box("catalog", cat_x, cat_y, cat_w, cat_h,
                  stroke_color="transparent", stroke_style="solid", stroke_width=2,
                  fill_color=GRAY_BG, label_text="Catalog", label_color=BLACK,
                  label_font_size=FONT_SIZE)

    # ════════════════════════════════════════════
    # ICONS
    # ════════════════════════════════════════════

    # ML engineers — outside AWS Cloud
    ml_eng = icon_label_component("ml-eng", "file-user", "ML\nengineers",
                                   cx=20, cy=360,
                                   icon_size=ICON_SIZE, font_size=FONT_SIZE)

    # IAM — inside AWS Cloud, outside Region, with space for label
    iam = icon_label_component("iam", "file-iam", "AWS IAM\nIdentity Center",
                                cx=175, cy=360,
                                icon_size=ICON_SIZE, font_size=FONT_SIZE)

    # Unified Studio — inside SageMaker, left portion, clear of SFP
    unified = icon_label_component("unified", "file-sagemaker-ai",
                                    "Amazon SageMaker\nUnified Studio",
                                    cx=405, cy=350,
                                    icon_size=ICON_SIZE, font_size=FONT_SIZE)

    # 2x2 grid inside SFP
    sfp_items = grid_2x2("sfp-grid", [
        {"file_id": "file-database", "label": "Database assets", "id_suffix": "db-assets"},
        {"file_id": "file-git-repo", "label": "Git repository", "id_suffix": "git-repo"},
        {"file_id": "file-source-code", "label": "Studio IDE", "id_suffix": "studio-ide"},
        {"file_id": "file-toolkit", "label": "Tools", "id_suffix": "tools"},
    ], container_id="sfp", header_h=40, icon_size=ICON_SIZE, font_size=FONT_SIZE)

    # SageMaker inside ML capabilities
    sm_ml = service_in_container("sm-ml", "file-sagemaker-ai", "Amazon SageMaker",
                                  container_id="ml-cap",
                                  icon_size=ICON_SIZE, font_size=FONT_SIZE)

    # Q Developer inside Coding capabilities
    q_dev = service_in_container("q-dev", "file-q", "Amazon Q\nDeveloper",
                                  container_id="coding-cap",
                                  icon_size=ICON_SIZE, font_size=FONT_SIZE)

    # Redshift Serverless (inside Lakehouse, left area - shifted right for label clearance)
    redshift = icon_label_component("redshift", "file-redshift",
                                     "Amazon Redshift\nServerless",
                                     cx=760, cy=775,
                                     icon_size=ICON_SIZE, font_size=FONT_SIZE)

    # S3 inside Storage
    s3 = service_in_container("s3", "file-s3", "Amazon S3",
                               container_id="storage",
                               icon_size=ICON_SIZE, font_size=FONT_SIZE)

    # Glue Data Catalog inside Catalog
    glue = service_in_container("glue", "file-glue-dc", "AWS Glue\nData Catalog",
                                 container_id="catalog",
                                 icon_size=ICON_SIZE, font_size=FONT_SIZE)

    # ════════════════════════════════════════════
    # ARROWS
    # ════════════════════════════════════════════

    ml_eng_icx = ml_eng["bbox"]["icon_cx"]
    ml_eng_icy = ml_eng["bbox"]["icon_cy"]
    iam_icx = iam["bbox"]["icon_cx"]
    iam_icy = iam["bbox"]["icon_cy"]
    unified_icx = unified["bbox"]["icon_cx"]
    unified_icy = unified["bbox"]["icon_cy"]
    ide_icx = sfp_items[2]["bbox"]["icon_cx"]
    ide_icy = sfp_items[2]["bbox"]["icon_cy"]
    tools_icx = sfp_items[3]["bbox"]["icon_cx"]
    tools_icy = sfp_items[3]["bbox"]["icon_cy"]
    git_icx = sfp_items[1]["bbox"]["icon_cx"]
    git_icy = sfp_items[1]["bbox"]["icon_cy"]
    db_icx = sfp_items[0]["bbox"]["icon_cx"]
    db_icy = sfp_items[0]["bbox"]["icon_cy"]
    sm_ml_icx = sm_ml["bbox"]["icon_cx"]
    sm_ml_icy = sm_ml["bbox"]["icon_cy"]

    # Arrow 1: ML engineers → IAM (horizontal)
    a1_sx = ml_eng_icx + ICON_SIZE / 2 + 3
    a1_ex = iam_icx - ICON_SIZE / 2 - 3
    a1_y = ml_eng_icy
    arrow("a1", a1_sx, a1_y, a1_ex, a1_y,
          label_number=1,
          label_cx=(a1_sx + a1_ex) / 2 + 10,
          label_cy=a1_y - 55,
          **ARROW_STYLE)

    # Arrow 2: IAM → Unified Studio (horizontal)
    a2_sx = iam_icx + ICON_SIZE / 2 + 3
    a2_ex = unified_icx - ICON_SIZE / 2 - 3
    a2_y = unified_icy
    arrow("a2", a2_sx, a2_y, a2_ex, a2_y,
          label_number=2,
          label_cx=unified_icx,
          label_cy=unified["bbox"]["y"] + unified["bbox"]["h"] + 30,
          **ARROW_STYLE)

    # Arrow 3: Coding area → Studio IDE (upward, offset to avoid label)
    # Use L-shape: go up at offset x, then horizontal to icon bottom
    a3_route_x = ide_icx - 50  # offset left to avoid "Studio IDE" label
    a3_sy = cc_y - 5  # just above coding capabilities
    a3_ey = sfp_y + sfp_h  # bottom of SFP
    arrow("a3", a3_route_x, a3_sy, a3_route_x, a3_ey,
          label_number=3,
          label_cx=a3_route_x - 40, label_cy=(a3_sy + a3_ey) / 2,
          **ARROW_STYLE)

    # Arrow 4: SageMaker right edge → Amazon SageMaker (ML capabilities)
    a4_sx = sm_x + sm_w
    a4_ex = sm_ml_icx - ICON_SIZE / 2 - 3
    a4_y = sm_ml_icy
    arrow("a4", a4_sx, a4_y, a4_ex, a4_y,
          label_number=4,
          label_cx=ml_x + ml_w - 30,
          label_cy=ml_y + 55,
          **ARROW_STYLE)

    # Arrow 5: Tools area → Lakehouse (downward)
    a5_x = tools_icx
    a5_sy = sm_y + sm_h  # bottom of SageMaker
    a5_ey = lh_y  # top of Lakehouse
    arrow("a5", a5_x, a5_sy, a5_x, a5_ey,
          label_number=5,
          label_cx=a5_x - 45, label_cy=(a5_sy + a5_ey) / 2,
          **ARROW_STYLE)

    # Arrow 6: SageMaker (ML cap) → Lakehouse (DASHED, downward)
    a6_x = sm_ml_icx
    a6_sy = ml_y + ml_h
    a6_ey = lh_y
    arrow("a6", a6_x, a6_sy, a6_x, a6_ey,
          stroke_style="dashed",
          label_number=6,
          label_cx=a6_x + 45, label_cy=(a6_sy + a6_ey) / 2,
          stroke_color=BLACK, stroke_width=2,
          label_bg=BLACK, label_text_color="#ffffff",
          label_size=50, label_font_size=24, label_shape="circle")

    # Internal: Git repository → Database assets (leftward)
    arrow("a-git-db", git_icx - ICON_SIZE / 2 - 3, git_icy,
          db_icx + ICON_SIZE / 2 + 3, git_icy,
          stroke_color=BLACK, stroke_width=2, stroke_style="solid")

    # ════════════════════════════════════════════
    # OVERLAP CHECKS
    # ════════════════════════════════════════════
    print("\n=== Running overlap checks ===")
    report = run_all_overlap_checks()
    if isinstance(report, dict):
        total = report.get('total_errors', 0)
        checks = report.get('checks', [])
        if isinstance(checks, list):
            for check in checks:
                if isinstance(check, dict):
                    issues = check.get('issues', [])
                    name = check.get('name', '?')
                    if issues:
                        print(f"  {name}: {len(issues)} issues")
                        for i in issues[:5]:
                            msg = i.get('message', str(i)) if isinstance(i, dict) else str(i)
                            safe = msg.encode('ascii', 'replace').decode('ascii')
                            print(f"    - {safe[:150]}")
        print(f"\n  Total errors: {total}")
    print("\n=== Build complete ===")


if __name__ == "__main__":
    build()
