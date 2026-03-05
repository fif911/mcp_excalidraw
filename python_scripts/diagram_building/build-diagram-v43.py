#!/usr/bin/env python3
"""
Build diagram v43 — AWS Step Functions Image Processing Architecture
Faithful recreation of the reference diagram with front-end, Step Functions workflow,
parallel processing text boxes, and AI service icons.
"""
import sys, time
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[2] / 'clients' / 'python'))
from components import *

# ===================================================
# 0. ICON PACK
# ===================================================
register_icon_pack("v43", {
    # Container headers
    "file-cloud":       "Architecture-Group-Icons_01302026/AWS-Cloud-logo_32.svg",
    "file-stepfn":      "Architecture-Service-Icons_01302026/Arch_Application-Integration/48/Arch_AWS-Step-Functions_48.svg",
    # Front-end services
    "file-amplify":     "Architecture-Service-Icons_01302026/Arch_Front-End-Web-Mobile/48/Arch_AWS-Amplify_48.svg",
    "file-cognito":     "Architecture-Service-Icons_01302026/Arch_Security-Identity/48/Arch_Amazon-Cognito_48.svg",
    "file-s3":          "Architecture-Service-Icons_01302026/Arch_Storage/48/Arch_Amazon-Simple-Storage-Service_48.svg",
    "file-apigw":       "Architecture-Service-Icons_01302026/Arch_Networking-Content-Delivery/48/Arch_Amazon-API-Gateway_48.svg",
    # AI services (right side)
    "file-textract":    "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-Textract_48.svg",
    "file-rekognition": "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-Rekognition_48.svg",
    "file-sagemaker":   "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-SageMaker-AI_48.svg",
    "file-translate":   "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-Translate_48.svg",
    "file-polly":       "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-Polly_48.svg",
    # Resource icons
    "file-users":       "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Users_48_Light.svg",
    "file-mobile":      "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Mobile-client_48_Light.svg",
    "file-sdk":         "Architecture-Service-Icons_01302026/Arch_Developer-Tools/48/Arch_AWS-Tools-and-SDKs_48.svg",
})

# ===================================================
# 1. SETUP
# ===================================================
clear()
time.sleep(0.5)
upload_icons("v43")
time.sleep(0.5)

# ===================================================
# LAYOUT CONSTANTS
# ===================================================
# Colors
DARK = "#1a1a1a"
GRAY = "#879196"
RED = "#d32f2f"
GREEN = "#2e7d32"
PINK = "#d63384"
TEAL = "#0d9488"
S3_GREEN = "#3f8624"

# Shared style for all numbered circles — single color for consistency
CIRCLE_BG = DARK
CIRCLE_SIZE = 40

# Shared icon size for all service icons (AWS SVGs include their own bg colors)
SVC_ICON = 69       # 55 × 1.25

# --- Coordinate grid ---
# AWS Cloud container
CLOUD_X = 220
CLOUD_Y = 10
CLOUD_W = 530
CLOUD_H = 910

# Front end container (inside AWS Cloud)
FE_X = 270
FE_Y = 85
FE_W = 440
FE_H = 520

# Step Functions container (right of AWS Cloud)
SF_X = 770
SF_Y = 10
SF_W = 440
SF_H = 910

# Parallel processing sub-container (inside Step Functions)
# Only contains the 3 parallel chips: extract text, describe face, describe image
PP_X = 850
PP_Y = 115
PP_W = 310
PP_H = 400

# Service icon x-centers
SVC_X = 580         # Front-end service icons
CIRCLE_X = 330      # Numbered circles in front-end

# AI service icons (far right — enough clearance from SF/PP borders for labels)
AI_X = 1340

# Text box x-center (parallel processing)
TB_X = 950

# Vertical positions for front-end rows (cy of icon_label_component)
ROW1_Y = 220       # Amplify
ROW2_Y = 355       # Cognito
ROW3_Y = 490       # S3
ROW4_Y = 720       # API Gateway (below front-end, still in cloud)

# Vertical positions for text boxes (cy)
TB1_Y = 200        # extract text
TB2_Y = 330        # describe face
TB3_Y = 460        # describe image
TB4_Y = 590        # prep and translate
TB5_Y = 720        # create audio
TB6_Y = 840        # store audio

# ===================================================
# 2. CONTAINERS (outside-in)
# ===================================================
# All icons — headers and services — use the same size
HDR_ICON = SVC_ICON

container_box("aws-cloud", CLOUD_X, CLOUD_Y, CLOUD_W, CLOUD_H, GRAY, "transparent",
              icon_file_id="file-cloud", label_text="AWS Cloud", label_color=DARK,
              icon_header_size=HDR_ICON)

container_box("front-end", FE_X, FE_Y, FE_W, FE_H, GRAY, "transparent",
              label_text="Front end", label_color=DARK,
              stroke_style="dashed", stroke_width=1, label_font_size=20)

container_box("step-fn", SF_X, SF_Y, SF_W, SF_H, PINK, "transparent",
              icon_file_id="file-stepfn", label_text="AWS Step Functions\nworkflow",
              label_color=DARK, icon_header_size=HDR_ICON,
              header_bg_color=PINK + "30", header_height=SVC_ICON)

container_box("parallel", PP_X, PP_Y, PP_W, PP_H, GRAY, "transparent",
              label_text="Parallel processing", label_color=DARK,
              stroke_style="dashed", stroke_width=1, label_font_size=20)

time.sleep(0.3)

# ===================================================
# 3. EXTERNAL ELEMENTS (left side)
# ===================================================
# People/Users icon
icon_label_component("people", "file-users", "", cx=50, cy=520, icon_size=50, text_color=DARK)

# Mobile client (phone + label)
icon_label_component("mobile", "file-mobile", "mobile client", cx=130, cy=520,
                      icon_size=50, text_color=DARK)

# AWS SDK (purple bg, above mobile)
icon_label_component("sdk", "file-sdk", "AWS SDK", cx=130, cy=350,
                      icon_size=SVC_ICON, text_color=DARK)

# People -> mobile
arrow("a-people-mobile", 75, 520, 105, 520, stroke_color=DARK, stroke_width=1)

# Mobile -> SDK (up)
arrow("a-mobile-sdk", 130, 488, 130, 395, stroke_color=DARK, stroke_width=1)

# SDK -> into cloud (horizontal line, no arrowheads)
arrow("a-sdk-cloud", 162, 350, CLOUD_X, 350, stroke_color=DARK, stroke_width=1,
      start_arrowhead=None, end_arrowhead=None)

time.sleep(0.3)

# ===================================================
# 4. FRONT-END SERVICES
# ===================================================
# AWS SVGs already include colored backgrounds — no icon_bg_color needed
# Row 1: Amplify
icon_label_component("amplify", "file-amplify", "AWS Amplify", cx=SVC_X, cy=ROW1_Y,
                      icon_size=SVC_ICON, text_color=DARK)

# Row 2: Cognito
icon_label_component("cognito", "file-cognito", "Amazon Cognito", cx=SVC_X, cy=ROW2_Y,
                      icon_size=SVC_ICON, text_color=DARK)

# Row 3: S3
icon_label_component("s3-fe", "file-s3", "Amazon S3", cx=SVC_X, cy=ROW3_Y,
                      icon_size=SVC_ICON, text_color=DARK)

# Row 4: API Gateway (below front-end container)
icon_label_component("apigw", "file-apigw", "Amazon API Gateway", cx=SVC_X, cy=ROW4_Y,
                      icon_size=SVC_ICON, text_color=DARK)

time.sleep(0.3)

# ===================================================
# 5. NUMBERED CIRCLES
# ===================================================
numbered_circle("c1", 1, cx=CIRCLE_X, cy=ROW1_Y - 20, size=CIRCLE_SIZE, bg_color=CIRCLE_BG)
numbered_circle("c2", 2, cx=CIRCLE_X, cy=ROW2_Y - 20, size=CIRCLE_SIZE, bg_color=CIRCLE_BG)
numbered_circle("c3", 3, cx=CIRCLE_X, cy=ROW3_Y - 20, size=CIRCLE_SIZE, bg_color=CIRCLE_BG)
numbered_circle("c4", 4, cx=CIRCLE_X, cy=ROW4_Y - 20, size=CIRCLE_SIZE, bg_color=CIRCLE_BG)
numbered_circle("c5", 5, cx=SF_X + 40, cy=ROW1_Y, size=CIRCLE_SIZE, bg_color=CIRCLE_BG)
numbered_circle("c7", 7, cx=SF_X + 40, cy=ROW2_Y, size=CIRCLE_SIZE, bg_color=CIRCLE_BG)
# Circle 6 created after AI icons (section 8) for correct z-order

time.sleep(0.3)

# ===================================================
# 6. ARROW LABELS (placed fully ABOVE arrow lines)
# ===================================================
# Arrows run at row_y - 20. For 2-line labels (~35px tall), bottom must be above arrow.
# For 1-line labels (~18px tall), same rule.
create({
    "id": "lbl-html", "type": "text",
    "x": 368, "y": ROW1_Y - 58,
    "text": "HTML, CSS,\nJavaScript",
    "fontSize": 14, "fontFamily": "2", "strokeColor": DARK,
})

create({
    "id": "lbl-auth", "type": "text",
    "x": 392, "y": ROW2_Y - 42,
    "text": "authenticate",
    "fontSize": 14, "fontFamily": "2", "strokeColor": DARK,
})

create({
    "id": "lbl-store", "type": "text",
    "x": 380, "y": ROW3_Y - 58,
    "text": "store image\nfiles",
    "fontSize": 14, "fontFamily": "2", "strokeColor": DARK,
})

create({
    "id": "lbl-api", "type": "text",
    "x": 358, "y": ROW4_Y - 58,
    "text": "dynamic API calls\nover HTTPS",
    "fontSize": 14, "fontFamily": "2", "strokeColor": DARK,
})

# ===================================================
# 7. TEXT BOXES (parallel processing workflow)
# ===================================================
text_box("tb-extract",   "extract text",        cx=TB_X, cy=TB1_Y)
text_box("tb-face",      "describe face",       cx=TB_X, cy=TB2_Y)
text_box("tb-image",     "describe image",      cx=TB_X, cy=TB3_Y)
text_box("tb-translate", "prep and\ntranslate", cx=TB_X, cy=TB4_Y)
text_box("tb-audio",     "create audio",        cx=TB_X, cy=TB5_Y)
text_box("tb-store",     "store audio",         cx=TB_X, cy=TB6_Y)

time.sleep(0.3)

# ===================================================
# 8. AI SERVICE ICONS (right side)
# ===================================================
icon_label_component("textract",    "file-textract",    "Amazon Textract",    cx=AI_X, cy=TB1_Y,
                      icon_size=SVC_ICON, text_color=DARK)
icon_label_component("rekognition", "file-rekognition", "Amazon Rekognition", cx=AI_X, cy=TB2_Y,
                      icon_size=SVC_ICON, text_color=DARK)
icon_label_component("sagemaker",   "file-sagemaker",   "Amazon SageMaker",  cx=AI_X, cy=TB3_Y,
                      icon_size=SVC_ICON, text_color=DARK)
icon_label_component("translate",   "file-translate",   "Amazon Translate",  cx=AI_X, cy=TB4_Y,
                      icon_size=SVC_ICON, text_color=DARK)
icon_label_component("polly",       "file-polly",       "Amazon Polly",      cx=AI_X, cy=TB5_Y,
                      icon_size=SVC_ICON, text_color=DARK)
icon_label_component("s3-out",      "file-s3",          "Amazon S3",         cx=AI_X, cy=TB6_Y,
                      icon_size=SVC_ICON, text_color=DARK)

# Circle 6 (green) — positioned ABOVE the store audio -> S3 arrow, like reference
# Sits above the arrow line so it never overlaps
# cx must be >= SF right edge (1210) + radius (20) + margin = 1235
numbered_circle("c6", 6, cx=1235, cy=TB6_Y - 30, size=CIRCLE_SIZE, bg_color=CIRCLE_BG)

time.sleep(0.3)

# ===================================================
# 9. ARROWS
# ===================================================

# --- Front-end: circle -> service icon (horizontal) ---
for row_y, aid in [(ROW1_Y, "a-r1"), (ROW2_Y, "a-r2"), (ROW3_Y, "a-r3")]:
    arrow(aid, CIRCLE_X + 25, row_y - 20, SVC_X - 40, row_y - 20,
          stroke_color=DARK, stroke_width=1)

# Step 4 arrow (circle 4 -> API Gateway)
arrow("a-r4", CIRCLE_X + 25, ROW4_Y - 20, SVC_X - 40, ROW4_Y - 20,
      stroke_color=DARK, stroke_width=1)

# --- Front end -> Step Functions (horizontal, from right edge to SF left) ---
arrow("a-fe-sf1", FE_X + FE_W, ROW1_Y, SF_X, ROW1_Y,
      stroke_color=DARK, stroke_width=1)
arrow("a-fe-sf2", FE_X + FE_W, ROW2_Y, SF_X, ROW2_Y,
      stroke_color=DARK, stroke_width=1)

# --- S3 <-> API Gateway (double-headed vertical arrow) ---
arrow("a-s3-apigw", SVC_X, ROW3_Y + 60, SVC_X, ROW4_Y - 65,
      stroke_color=DARK, stroke_width=1,
      start_arrowhead="arrow", end_arrowhead="arrow")

# --- Text box vertical chain ---
# Parallel section: no arrows between extract text, describe face, describe image
# (they run in parallel in Step Functions)

# describe image -> prep and translate (sequential from here)
arrow("a-tb-img-prep", TB_X, TB3_Y + 30, TB_X, TB4_Y - 30,
      stroke_color=DARK, stroke_width=1)

# prep and translate -> create audio
arrow("a-tb-prep-audio", TB_X, TB4_Y + 35, TB_X, TB5_Y - 30,
      stroke_color=DARK, stroke_width=1)

# create audio -> store audio
arrow("a-tb-audio-store", TB_X, TB5_Y + 30, TB_X, TB6_Y - 30,
      stroke_color=DARK, stroke_width=1)

# --- Text boxes -> AI services (horizontal arrows) ---
# All text boxes → AI services (single horizontal arrow each)
for tb_y, ai_id in [(TB1_Y, "a-ai1"), (TB2_Y, "a-ai2"), (TB3_Y, "a-ai3"),
                     (TB4_Y, "a-ai4"), (TB5_Y, "a-ai5"), (TB6_Y, "a-ai6")]:
    arrow(ai_id, TB_X + 80, tb_y, AI_X - 45, tb_y,
          stroke_color=DARK, stroke_width=1)

# --- SDK entry arrows branching into front-end rows ---
BRANCH_X = CLOUD_X + 40  # vertical trunk inside cloud

# Branch up to row 1
arrow("a-in-r1", CLOUD_X, 350, CIRCLE_X - 25, ROW1_Y - 20,
      stroke_color=DARK, stroke_width=1,
      waypoints=[(BRANCH_X, 350), (BRANCH_X, ROW1_Y - 20)])

# Branch to row 2 (down then right, orthogonal)
arrow("a-in-r2", BRANCH_X, 350, CIRCLE_X - 25, ROW2_Y - 20,
      stroke_color=DARK, stroke_width=1, start_arrowhead=None,
      waypoints=[(BRANCH_X, ROW2_Y - 20)])

# Branch down to row 3
arrow("a-in-r3", BRANCH_X, 350, CIRCLE_X - 25, ROW3_Y - 20,
      stroke_color=DARK, stroke_width=1, start_arrowhead=None,
      waypoints=[(BRANCH_X, ROW3_Y - 20)])

# Branch down to row 4
arrow("a-in-r4", BRANCH_X, 350, CIRCLE_X - 25, ROW4_Y - 20,
      stroke_color=DARK, stroke_width=1, start_arrowhead=None,
      waypoints=[(BRANCH_X, ROW4_Y - 20)])

time.sleep(0.5)

# ===================================================
# 10. VALIDATION & RESULTS
# ===================================================
n = len(get_elements()['elements'])
print(f"\nDiagram built with {n} elements")

issues = validate_diagram()
issues += validate_arrow_paths()
if issues:
    print(f"\n{len(issues)} issues found:")
    for iss in issues:
        print(f"  - {iss}")
else:
    print("\nAll validation passed - zero issues")
