#!/usr/bin/env python3
"""
Build diagram v44 — AWS Step Functions Image Processing Architecture
Faithful recreation of the reference diagram with front-end, Step Functions workflow,
parallel processing text boxes, and AI service icons.
"""
import sys, time
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[2] / 'clients' / 'python'))
from components import *

# ===================================================
# 0. ICON PACK
# ===================================================
register_icon_pack("v44", {
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
upload_icons("v44")
time.sleep(0.5)

# ===================================================
# LAYOUT CONSTANTS
# ===================================================
# Colors
DARK = "#1a1a1a"
GRAY = "#879196"
PINK = "#d63384"

# Shared style for all numbered circles
CIRCLE_BG = DARK
CIRCLE_SIZE = 40

# Shared icon size for all service icons
SVC_ICON = 69

# Two font sizes — headers and body
FONT_HDR = 28
FONT_BODY = 20

# --- Coordinate grid ---
HDR_HEIGHT = 75

# AWS Cloud container (outer — encompasses Step Functions + AI services)
# Extends above and below Step Functions so nesting is clearly visible
CLOUD_X = 220
CLOUD_Y = -20
CLOUD_W = 1250
CLOUD_H = 1000

# Step Functions container (nested inside AWS Cloud, shorter on both top and bottom)
SF_X = 770
SF_Y = 10
SF_W = 440
SF_H = 920

# Sub-section Y — derived from SF_Y (not CLOUD_Y) so sub-containers clear the SF header
SUB_Y = SF_Y + HDR_HEIGHT + 25  # = 110

# Front end container (inside AWS Cloud)
FE_X = 270
FE_Y = SUB_Y
FE_W = 440
FE_H = 540

# Parallel processing sub-container (inside Step Functions)
PP_X = 850
PP_Y = SUB_Y
PP_W = 310
PP_H = 460

# Service icon x-centers
SVC_X = 580
CIRCLE_X = 330

# AI service icons (far right)
AI_X = 1340

# Text box x-center (parallel processing)
TB_X = 950
TB_MIN_W = 150
TB_MAX_H = 50

# Vertical positions for front-end rows (cy of icon_label_component)
ROW1_Y = 240   # Amplify
ROW2_Y = 380   # Cognito
ROW3_Y = 520   # S3
ROW4_Y = 760   # API Gateway (below front-end, still in cloud)

# Vertical positions for text boxes (cy)
TB1_Y = 230    # extract text
TB2_Y = 360    # describe face
TB3_Y = 490    # describe image
TB4_Y = 620    # prep and translate
TB5_Y = 750    # create audio
TB6_Y = 880    # store audio

# --- Arrow edge constants ---
COMP_GAP = 8
LABEL_1LINE_H = FONT_BODY * 1.25
ICON_VSHIFT = (COMP_GAP + LABEL_1LINE_H) / 2
CIRCLE_R = CIRCLE_SIZE / 2
ICON_R = SVC_ICON / 2
TB_HALF_W = TB_MIN_W / 2
TB_HALF_H = TB_MAX_H / 2
COMP_HALF_H = (SVC_ICON + COMP_GAP + LABEL_1LINE_H) / 2

# ===================================================
# 2. CONTAINERS (outside-in)
# ===================================================
HDR_ICON = SVC_ICON

container_box("aws-cloud", CLOUD_X, CLOUD_Y, CLOUD_W, CLOUD_H, GRAY, "transparent",
              icon_file_id="file-cloud", label_text="AWS Cloud", label_color=DARK,
              icon_header_size=HDR_ICON, header_height=HDR_HEIGHT, label_font_size=FONT_HDR)

container_box("front-end", FE_X, FE_Y, FE_W, FE_H, GRAY, "transparent",
              label_text="Front end", label_color=DARK,
              stroke_style="dashed", stroke_width=1, label_font_size=FONT_HDR)

container_box("step-fn", SF_X, SF_Y, SF_W, SF_H, PINK, "transparent",
              icon_file_id="file-stepfn", label_text="AWS Step Functions\nworkflow",
              label_color=DARK, icon_header_size=HDR_ICON,
              header_bg_color=PINK + "30", header_height=HDR_HEIGHT,
              header_fill=False, label_font_size=FONT_HDR)

container_box("parallel", PP_X, PP_Y, PP_W, PP_H, GRAY, "transparent",
              label_text="Parallel processing", label_color=DARK,
              stroke_style="dashed", stroke_width=1, label_font_size=FONT_HDR)

time.sleep(0.3)

# ===================================================
# 3. EXTERNAL ELEMENTS (left side)
# ===================================================
MOBILE_CX = 130; MOBILE_CY = 560; MOBILE_SZ = 50
SDK_CX = 130;    SDK_CY = 380
PEOPLE_CX = 50;  PEOPLE_CY = MOBILE_CY; PEOPLE_SZ = 50

PEOPLE_R = PEOPLE_SZ / 2
MOBILE_R = MOBILE_SZ / 2
SDK_R = SVC_ICON / 2

# People/Users icon (no label)
icon_label_component("people", "file-users", None, cx=PEOPLE_CX, cy=PEOPLE_CY, icon_size=PEOPLE_SZ,
                      font_size=FONT_BODY, text_color=DARK)

# Mobile client
icon_label_component("mobile", "file-mobile", "mobile client", cx=MOBILE_CX, cy=MOBILE_CY + ICON_VSHIFT,
                      icon_size=MOBILE_SZ, font_size=FONT_BODY, text_color=DARK)

# AWS SDK
icon_label_component("sdk", "file-sdk", "AWS SDK", cx=SDK_CX, cy=SDK_CY + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

# People → mobile (horizontal)
arrow("a-people-mobile", PEOPLE_CX + PEOPLE_R, MOBILE_CY, MOBILE_CX - MOBILE_R, MOBILE_CY,
      stroke_color=DARK, stroke_width=1)

# Mobile → SDK (vertical up)
SDK_COMP_BOTTOM = SDK_CY + ICON_VSHIFT + COMP_HALF_H
arrow("a-mobile-sdk", MOBILE_CX, MOBILE_CY - MOBILE_R, SDK_CX, SDK_COMP_BOTTOM + 3,
      stroke_color=DARK, stroke_width=1)

# SDK → cloud entry (horizontal, no arrowheads)
arrow("a-sdk-cloud", SDK_CX + SDK_R, SDK_CY, CLOUD_X, SDK_CY,
      stroke_color=DARK, stroke_width=1,
      start_arrowhead=None, end_arrowhead=None)

time.sleep(0.3)

# ===================================================
# 4. FRONT-END SERVICES
# ===================================================
icon_label_component("amplify", "file-amplify", "AWS Amplify", cx=SVC_X, cy=ROW1_Y + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("cognito", "file-cognito", "Amazon Cognito", cx=SVC_X, cy=ROW2_Y + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("s3-fe", "file-s3", "Amazon S3", cx=SVC_X, cy=ROW3_Y + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

icon_label_component("apigw", "file-apigw", "Amazon API Gateway", cx=SVC_X, cy=ROW4_Y + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

time.sleep(0.3)

# ===================================================
# 5. NUMBERED CIRCLES
# ===================================================
numbered_circle("c1", 1, cx=CIRCLE_X, cy=ROW1_Y, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)
numbered_circle("c2", 2, cx=CIRCLE_X, cy=ROW2_Y, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)
numbered_circle("c3", 3, cx=CIRCLE_X, cy=ROW3_Y, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)
numbered_circle("c4", 4, cx=CIRCLE_X, cy=ROW4_Y, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

C57_X = (SF_X + PP_X) / 2
numbered_circle("c5", 5, cx=C57_X, cy=ROW1_Y, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)
numbered_circle("c7", 7, cx=C57_X, cy=ROW2_Y, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

time.sleep(0.3)

# ===================================================
# 6. ARROW LABELS (placed above arrow lines)
# ===================================================
ARROW_LEFT = CIRCLE_X + CIRCLE_R
ARROW_RIGHT = SVC_X - ICON_R
ARROW_MID_X = (ARROW_LEFT + ARROW_RIGHT) / 2

labels = [
    ("lbl-html",  "HTML, CSS,\nJavaScript",       ROW1_Y),
    ("lbl-auth",  "authenticate",                  ROW2_Y),
    ("lbl-store", "store image\nfiles",            ROW3_Y),
    ("lbl-api",   "dynamic API calls\nover HTTPS", ROW4_Y),
]
for lid, text, row_y in labels:
    tw, th = measure_text(text, FONT_BODY)
    create({
        "id": lid, "type": "text",
        "x": round(ARROW_MID_X - tw / 2, 1), "y": round(row_y - th - 4, 1),
        "text": text,
        "fontSize": FONT_BODY, "fontFamily": "2", "strokeColor": DARK,
    })

# ===================================================
# 7. TEXT BOXES (parallel processing workflow)
# ===================================================
text_box("tb-extract",   "extract text",        cx=TB_X, cy=TB1_Y, font_size=FONT_BODY, min_width=TB_MIN_W, max_height=TB_MAX_H)
text_box("tb-face",      "describe face",       cx=TB_X, cy=TB2_Y, font_size=FONT_BODY, min_width=TB_MIN_W, max_height=TB_MAX_H)
text_box("tb-image",     "describe image",      cx=TB_X, cy=TB3_Y, font_size=FONT_BODY, min_width=TB_MIN_W, max_height=TB_MAX_H)
text_box("tb-translate", "prep and\ntranslate", cx=TB_X, cy=TB4_Y, font_size=FONT_BODY, min_width=TB_MIN_W, max_height=TB_MAX_H)
text_box("tb-audio",     "create audio",        cx=TB_X, cy=TB5_Y, font_size=FONT_BODY, min_width=TB_MIN_W, max_height=TB_MAX_H)
text_box("tb-store",     "store audio",         cx=TB_X, cy=TB6_Y, font_size=FONT_BODY, min_width=TB_MIN_W, max_height=TB_MAX_H)

time.sleep(0.3)

# ===================================================
# 8. AI SERVICE ICONS (right side)
# ===================================================
icon_label_component("textract",    "file-textract",    "Amazon Textract",    cx=AI_X, cy=TB1_Y + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)
icon_label_component("rekognition", "file-rekognition", "Amazon Rekognition", cx=AI_X, cy=TB2_Y + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)
icon_label_component("sagemaker",   "file-sagemaker",   "Amazon SageMaker",  cx=AI_X, cy=TB3_Y + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)
icon_label_component("translate",   "file-translate",   "Amazon Translate",  cx=AI_X, cy=TB4_Y + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)
icon_label_component("polly",       "file-polly",       "Amazon Polly",      cx=AI_X, cy=TB5_Y + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)
icon_label_component("s3-out",      "file-s3",          "Amazon S3",         cx=AI_X, cy=TB6_Y + ICON_VSHIFT,
                      icon_size=SVC_ICON, font_size=FONT_BODY, text_color=DARK)

# Circle 6 — between PP right border and SF right border
C6_X = (PP_X + PP_W + SF_X + SF_W) / 2
numbered_circle("c6", 6, cx=C6_X, cy=TB6_Y - CIRCLE_R - 5, size=CIRCLE_SIZE, bg_color=CIRCLE_BG, font_size=FONT_BODY)

time.sleep(0.3)

# ===================================================
# 9. ARROWS
# ===================================================

# --- Front-end: circle right edge -> service icon left edge ---
for row_y, aid in [(ROW1_Y, "a-r1"), (ROW2_Y, "a-r2"), (ROW3_Y, "a-r3")]:
    arrow(aid, CIRCLE_X + CIRCLE_R, row_y, SVC_X - ICON_R, row_y,
          stroke_color=DARK, stroke_width=1)

# Circle 4 → API Gateway
arrow("a-r4", CIRCLE_X + CIRCLE_R, ROW4_Y, SVC_X - ICON_R, ROW4_Y,
      stroke_color=DARK, stroke_width=1)

# --- Front end right edge → Step Functions left edge ---
arrow("a-fe-sf1", FE_X + FE_W, ROW1_Y, SF_X, ROW1_Y,
      stroke_color=DARK, stroke_width=1)
arrow("a-fe-sf2", FE_X + FE_W, ROW2_Y, SF_X, ROW2_Y,
      stroke_color=DARK, stroke_width=1)

# --- S3 ↕ API Gateway (bidirectional) ---
S3_LABEL_BOTTOM = ROW3_Y + ICON_VSHIFT + COMP_HALF_H
APIGW_ICON_TOP = ROW4_Y + ICON_VSHIFT - COMP_HALF_H
arrow("a-s3-apigw", SVC_X, S3_LABEL_BOTTOM, SVC_X, APIGW_ICON_TOP,
      stroke_color=DARK, stroke_width=1,
      start_arrowhead="arrow", end_arrowhead="arrow")

# --- Text box vertical chain ---
# describe image → prep and translate
arrow("a-tb-img-prep", TB_X, TB3_Y + TB_HALF_H, TB_X, TB4_Y - TB_HALF_H,
      stroke_color=DARK, stroke_width=1)

# prep and translate → create audio
arrow("a-tb-prep-audio", TB_X, TB4_Y + TB_HALF_H, TB_X, TB5_Y - TB_HALF_H,
      stroke_color=DARK, stroke_width=1)

# create audio → store audio
arrow("a-tb-audio-store", TB_X, TB5_Y + TB_HALF_H, TB_X, TB6_Y - TB_HALF_H,
      stroke_color=DARK, stroke_width=1)

# --- Text box right edge → AI service icon left edge ---
for tb_y, ai_id in [(TB1_Y, "a-ai1"), (TB2_Y, "a-ai2"), (TB3_Y, "a-ai3"),
                     (TB4_Y, "a-ai4"), (TB5_Y, "a-ai5"), (TB6_Y, "a-ai6")]:
    arrow(ai_id, TB_X + TB_HALF_W, tb_y, AI_X - ICON_R, tb_y,
          stroke_color=DARK, stroke_width=1)

# --- SDK entry arrows branching into front-end rows ---
BRANCH_X = CLOUD_X + 40

# Branch up to row 1
arrow("a-in-r1", CLOUD_X, SDK_CY, CIRCLE_X - CIRCLE_R, ROW1_Y,
      stroke_color=DARK, stroke_width=1,
      waypoints=[(BRANCH_X, SDK_CY), (BRANCH_X, ROW1_Y)])

# Branch to row 2
arrow("a-in-r2", BRANCH_X, SDK_CY, CIRCLE_X - CIRCLE_R, ROW2_Y,
      stroke_color=DARK, stroke_width=1, start_arrowhead=None,
      waypoints=[(BRANCH_X, ROW2_Y)])

# Branch down to row 3
arrow("a-in-r3", BRANCH_X, SDK_CY, CIRCLE_X - CIRCLE_R, ROW3_Y,
      stroke_color=DARK, stroke_width=1, start_arrowhead=None,
      waypoints=[(BRANCH_X, ROW3_Y)])

# Branch down to row 4
arrow("a-in-r4", BRANCH_X, SDK_CY, CIRCLE_X - CIRCLE_R, ROW4_Y,
      stroke_color=DARK, stroke_width=1, start_arrowhead=None,
      waypoints=[(BRANCH_X, ROW4_Y)])

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
        print(f"  - {iss.encode('ascii', 'replace').decode()}")
else:
    print("\nAll validation passed - zero issues")
