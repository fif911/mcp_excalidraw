#!/usr/bin/env python3
"""
Build diagram v41 — AWS SageMaker Architecture
Uses SmartArrowRouter for ALL arrows. Zero manual coordinate hardcoding for arrows.
"""
import sys, time
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[2] / 'clients' / 'python'))
from components import *

ARROW_COLOR = "#ff0000"
ARROW_WIDTH = 6

# ═══════════════════════════════════════════
# 1. SETUP
# ═══════════════════════════════════════════
clear()
time.sleep(0.5)
upload_all_icons()
time.sleep(0.3)

# ═══════════════════════════════════════════
# 2. CONTAINERS
# ═══════════════════════════════════════════
container_box("aws-cloud", 30, 5, 1780, 980, "#879196", "transparent",
              icon_file_id="file-cloud", label_text="AWS Cloud", label_color="#1a1a1a",
              icon_header_size=45)

container_box("aws-region", 150, 55, 1630, 920, "#879196", "transparent",
              icon_file_id="file-region", label_text="AWS Region", label_color="#1a1a1a",
              stroke_style="dashed", stroke_width=1, icon_header_size=45)

container_box("sm-ctr", 240, 130, 790, 450, "#0d9488", "#f0fdfa",
              icon_file_id="file-sagemaker", label_text="Amazon SageMaker", label_color="#1a1a1a",
              icon_header_size=55)

container_box("proj", 480, 200, 460, 360, "#9333ea", "#faf5ff",
              label_text="Sales Forecasting Project", label_color="#1a1a1a")

container_box("ml-ctr", 1130, 130, 420, 450, "#0d9488", "#f0fdfa",
              icon_file_id="file-sagemaker", label_text="ML capabilities", label_color="#1a1a1a",
              icon_header_size=55)

container_box("code-ctr", 300, 630, 400, 340, "#6366f1", "#eef2ff",
              icon_file_id="file-codewhisperer", label_text="Coding capabilities", label_color="#1a1a1a",
              icon_header_size=55)

container_box("lake-ctr", 740, 630, 1030, 340, "#0d9488", "#f0fdfa",
              label_text="Amazon SageMaker Lakehouse", label_color="#1a1a1a")

container_box("stor-ctr", 1150, 690, 250, 250, "#879196", "#f1f3f3",
              label_text="Storage", label_color="#1a1a1a")

container_box("cat-ctr", 1440, 690, 290, 250, "#879196", "#f1f3f3",
              label_text="Catalog", label_color="#1a1a1a")

time.sleep(0.5)

# ═══════════════════════════════════════════
# 3. SERVICE COMPONENTS
# ═══════════════════════════════════════════
icon_label_component("person", "file-user", "ML\nengineers", cx=-10, cy=290, 
                      icon_size=50, text_color="#1a1a1a")

icon_label_component("iam", "file-iam", "AWS IAM\nIdentity Center", cx=90, cy=320, 
                      icon_size=60, text_color="#1a1a1a")

icon_label_component("us", "file-sagemaker-ai", "Amazon SageMaker\nUnified Studio", cx=350, cy=340,
                      icon_size=65, text_color="#1a1a1a")

service_in_container("sm-ml", "file-sagemaker-ai", "Amazon SageMaker", "ml-ctr", icon_size=65)
for eid in ['sm-ml-lbl']:
    try: update(eid, {'strokeColor': '#1a1a1a'})
    except: pass

service_in_container("q", "file-q", "Amazon Q\nDeveloper", "code-ctr", icon_size=65)

icon_label_component("rs", "file-redshift", "Amazon Redshift\nServerless", cx=870, cy=810, 
                      icon_size=65, text_color="#1a1a1a")

service_in_container("s3", "file-s3", "Amazon S3", "stor-ctr", icon_size=65)
service_in_container("glue", "file-glue-catalog", "AWS Glue\nData Catalog", "cat-ctr", icon_size=65)

time.sleep(0.3)

for eid_prefix in ['q-lbl', 's3-lbl', 'glue-lbl', 'rs-lbl', 'sm-ml-lbl']:
    for suffix in ['', '-0', '-1']:
        try: update(eid_prefix + suffix, {'strokeColor': '#1a1a1a'})
        except: pass

# ═══════════════════════════════════════════
# 4. INNER PROJECT GRID
# ═══════════════════════════════════════════
grid_2x2("proj-inner", [
    {"file_id": "file-database", "label": "Database\nassets", "id_suffix": "db"},
    {"file_id": "file-codecommit", "label": "Git\nrepository", "id_suffix": "git"},
    {"file_id": "file-cloud9", "label": "Studio IDE", "id_suffix": "ide"},
    {"file_id": "file-sysmgr", "label": "Tools", "id_suffix": "tools"},
], "proj", header_h=50, icon_size=55, font_size=22)

for prefix in ['db', 'git', 'ide', 'tools']:
    for suffix in ['-lbl', '-lbl-0', '-lbl-1']:
        try: update(prefix + suffix, {'strokeColor': '#1a1a1a'})
        except: pass

time.sleep(0.3)

# ═══════════════════════════════════════════
# 5. NUMBERED CIRCLES
# ═══════════════════════════════════════════
numbered_circle("c1", 1, cx=190, cy=295)
numbered_circle("c2", 2, cx=370, cy=480)
numbered_circle("c3", 3, cx=485, cy=605)
numbered_circle("c4", 4, cx=1105, cy=195)
numbered_circle("c5", 5, cx=645, cy=605)
numbered_circle("c6", 6, cx=1265, cy=545)

time.sleep(0.3)

# ═══════════════════════════════════════════
# 6. ARROWS — ALL via SmartArrowRouter
# ═══════════════════════════════════════════
from smart_arrow import SmartArrowRouter

router = SmartArrowRouter()
all_issues = []

print("\n=== Building arrows v41 ===\n")

# Arrow 1: Person → IAM (approach from left at IAM's y level)
r = router.smart_arrow("img-person", "img-iam", exit_side="right",
    waypoints=[(85, 288)],
    arrow_id="a-ml-iam")
all_issues.extend(r['issues'])

# Arrow 2: IAM → Unified Studio
r = router.smart_arrow("img-iam", "img-us", exit_side="right",
    arrow_id="a-iam-us")
all_issues.extend(r['issues'])

# Arrow 3: Q Developer → Studio IDE
# Exit Q right, go right to x=640 (past code-ctr-lbl right margin), then up to IDE
r = router.smart_arrow("img-q", "img-ide", exit_side="right",
    waypoints=[(640, 798), (640, 465)],
    arrow_id="a-code-ide")
all_issues.extend(r['issues'])

# Arrow 4: IDE → SageMaker ML
# Exit right, up to y=420 (above tools margin), right to x=960, up to y=110 (above ml-ctr header),
# right to x=1420, down to SM-ML level, enter from right
r = router.smart_arrow("img-ide", "img-sm-ml", exit_side="right",
    waypoints=[(693, 420), (960, 420), (960, 110), (1420, 110), (1420, 367)],
    arrow_id="a-ide-ml")
all_issues.extend(r['issues'])

# Arrow 5: Tools → ML container
r = router.smart_arrow("img-tools", "ml-ctr", exit_side="right",
    arrow_id="a-tools-ml")
all_issues.extend(r['issues'])

# Arrow 6: Database → Lakehouse
# Exit left from db, go down to y=600 (gap between sm-ctr and code-ctr/lake-ctr), right, then into lake-ctr
r = router.smart_arrow("img-db", "lake-ctr", exit_side="left",
    waypoints=[(498, 600), (1000, 600), (1000, 660)],
    arrow_id="a-db-lake")
all_issues.extend(r['issues'])

# Arrow 7: SageMaker ML → Lakehouse (dashed)
r = router.smart_arrow("img-sm-ml", "lake-ctr", exit_side="right",
    waypoints=[(1560, 367), (1560, 660)],
    arrow_id="a-ml-lake", stroke_style="dashed")
all_issues.extend(r['issues'])

# Arrow 8: Git → DB (inside project, purple, thin)
r = router.smart_arrow("img-git", "img-db", exit_side="left",
    arrow_id="a-git-db",
    stroke_color="#9333ea", stroke_width=1)
all_issues.extend(r['issues'])

time.sleep(0.5)

# ═══════════════════════════════════════════
# 7. RESULTS
# ═══════════════════════════════════════════
n = len(get_elements()['elements'])
print(f"\nDiagram built with {n} elements")

if all_issues:
    print(f"\n❌ BUILD FAILED — {len(all_issues)} issues found:")
    for iss in all_issues:
        print(f"  - {iss}")
    sys.exit(1)
else:
    print("\n✅ All validation passed — zero issues")
