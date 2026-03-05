#!/usr/bin/env python3
"""
Build diagram v42 — AWS Step Functions Image Processing Architecture
Reproduces the reference diagram with front-end, Step Functions workflow,
parallel processing text boxes, and AI service icons.
"""
import sys, time
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[2] / 'clients' / 'python'))
from components import *

# ═══════════════════════════════════════════
# 0. ICON PACK for this diagram
# ═══════════════════════════════════════════
register_icon_pack("v42", {
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

# ═══════════════════════════════════════════
# 1. SETUP
# ═══════════════════════════════════════════
clear()
time.sleep(0.5)
upload_icons("v42")
time.sleep(0.5)

# ═══════════════════════════════════════════
# LAYOUT CONSTANTS
# ═══════════════════════════════════════════
# Colors
DARK = "#1a1a1a"
GRAY = "#879196"
RED = "#d32f2f"
GREEN = "#2e7d32"
PINK = "#d63384"
TEAL = "#0d9488"
S3_GREEN = "#3f8624"

# Coordinate grid
LEFT_EXT = 30       # External elements x
CLOUD_X = 200       # AWS Cloud container x
CLOUD_Y = 10        # AWS Cloud container y
CLOUD_W = 620       # AWS Cloud width
CLOUD_H = 780       # AWS Cloud height (extends to cover API Gateway)

FE_X = 250          # Front end container x
FE_Y = 60           # Front end container y
FE_W = 520          # Front end width
FE_H = 410          # Front end height

# Step Functions container (right side)
SF_X = 700
SF_Y = 10
SF_W = 420
SF_H = 750

# Parallel processing sub-container
PP_X = 730
PP_Y = 100
PP_W = 360
PP_H = 660

# Service icon x positions
SVC_ICON_X = 580    # Service icons in front-end (right side)
LABEL_X = 380       # Arrow labels x center
CIRCLE_X = 310      # Numbered circles x

# Right-side AI service icons
AI_X = 1200

# Text box x center (parallel processing)
TB_X = 880

# Vertical positions for front-end rows
ROW1_Y = 190       # Amplify
ROW2_Y = 310       # Cognito
ROW3_Y = 430       # S3
ROW4_Y = 620       # API Gateway (below front end)

# Vertical positions for text boxes
TB1_Y = 170        # extract text
TB2_Y = 280        # describe face
TB3_Y = 390        # describe image
TB4_Y = 500        # prep and translate
TB5_Y = 610        # create audio
TB6_Y = 720        # store audio

# ═══════════════════════════════════════════
# 2. CONTAINERS
# ═══════════════════════════════════════════
container_box("aws-cloud", CLOUD_X, CLOUD_Y, CLOUD_W, CLOUD_H, GRAY, "transparent",
              icon_file_id="file-cloud", label_text="AWS Cloud", label_color=DARK,
              icon_header_size=40)

container_box("front-end", FE_X, FE_Y, FE_W, FE_H, GRAY, "transparent",
              label_text="Front end", label_color=DARK,
              stroke_style="dashed", stroke_width=1, label_font_size=20)

container_box("step-fn", SF_X, SF_Y, SF_W, SF_H, PINK, "transparent",
              icon_file_id="file-stepfn", label_text="AWS Step Functions\nworkflow",
              label_color=DARK, icon_header_size=50,
              header_bg_color=PINK + "30")

container_box("parallel", PP_X, PP_Y, PP_W, PP_H, DARK, "transparent",
              label_text="Parallel processing", label_color=DARK,
              label_font_size=20)

time.sleep(0.3)

# ═══════════════════════════════════════════
# 3. EXTERNAL ELEMENTS (left side)
# ═══════════════════════════════════════════
# People/Users icon (far left bottom)
icon_label_component("people", "file-users", "", cx=50, cy=450, icon_size=45, text_color=DARK)

# Mobile client (phone icon with label)
icon_label_component("mobile", "file-mobile", "mobile client", cx=130, cy=450,
                      icon_size=45, text_color=DARK)

# AWS SDK (purple bg, above mobile)
icon_label_component("sdk", "file-sdk", "AWS SDK", cx=100, cy=310,
                      icon_size=55, text_color=DARK,
                      icon_bg_color="#7b1fa2")

# People → mobile client
arrow("a-people-mobile", 75, 450, 100, 450, stroke_color=DARK, stroke_width=1)

# Mobile → SDK (up)
arrow("a-mobile-sdk", 130, 420, 100, 345, stroke_color=DARK, stroke_width=1,
      waypoints=[(130, 380), (100, 380)])

# SDK → into cloud (right)
arrow("a-sdk-cloud", 135, 310, CLOUD_X, 310, stroke_color=DARK, stroke_width=1,
      start_arrowhead=None, end_arrowhead=None)

time.sleep(0.3)

# ═══════════════════════════════════════════
# 4. FRONT-END SERVICES (inside front-end container)
# ═══════════════════════════════════════════
# Row 1: Amplify
icon_label_component("amplify", "file-amplify", "AWS Amplify", cx=SVC_ICON_X, cy=ROW1_Y,
                      icon_size=55, text_color=DARK, icon_bg_color=RED)

# Row 2: Cognito
icon_label_component("cognito", "file-cognito", "Amazon Cognito", cx=SVC_ICON_X, cy=ROW2_Y,
                      icon_size=55, text_color=DARK, icon_bg_color=RED)

# Row 3: S3
icon_label_component("s3-fe", "file-s3", "Amazon S3", cx=SVC_ICON_X, cy=ROW3_Y,
                      icon_size=55, text_color=DARK, icon_bg_color=S3_GREEN)

# Row 4: API Gateway (below front-end container)
icon_label_component("apigw", "file-apigw", "Amazon API Gateway", cx=SVC_ICON_X, cy=ROW4_Y,
                      icon_size=55, text_color=DARK, icon_bg_color=PINK)

time.sleep(0.3)

# ═══════════════════════════════════════════
# 5. NUMBERED CIRCLES
# ═══════════════════════════════════════════
numbered_circle("c1", 1, cx=CIRCLE_X, cy=ROW1_Y - 20, size=40)
numbered_circle("c2", 2, cx=CIRCLE_X, cy=ROW2_Y - 20, size=40)
numbered_circle("c3", 3, cx=CIRCLE_X, cy=ROW3_Y - 20, size=40)
numbered_circle("c4", 4, cx=CIRCLE_X, cy=ROW4_Y - 20, size=40, bg_color=GREEN)
numbered_circle("c5", 5, cx=SF_X + 30, cy=ROW1_Y, size=40)
numbered_circle("c6", 6, cx=AI_X - 65, cy=TB6_Y + 10, size=40, bg_color=GREEN)
numbered_circle("c7", 7, cx=SF_X + 30, cy=ROW2_Y, size=40)

time.sleep(0.3)

# ═══════════════════════════════════════════
# 6. ARROW LABELS (italic text annotations)
# ═══════════════════════════════════════════
# These are plain text placed between numbered circles and service icons
create({
    "id": "lbl-html", "type": "text",
    "x": 350, "y": ROW1_Y - 30,
    "text": "HTML, CSS,\nJavaScript",
    "fontSize": 14, "fontFamily": "2", "strokeColor": DARK,
})

create({
    "id": "lbl-auth", "type": "text",
    "x": 380, "y": ROW2_Y - 20,
    "text": "authenticate",
    "fontSize": 14, "fontFamily": "2", "strokeColor": DARK,
})

create({
    "id": "lbl-store", "type": "text",
    "x": 365, "y": ROW3_Y - 20,
    "text": "store image\nfiles",
    "fontSize": 14, "fontFamily": "2", "strokeColor": DARK,
})

create({
    "id": "lbl-api", "type": "text",
    "x": 345, "y": ROW4_Y - 30,
    "text": "dynamic API calls\nover HTTPS",
    "fontSize": 14, "fontFamily": "2", "strokeColor": DARK,
})

# ═══════════════════════════════════════════
# 7. TEXT BOXES (parallel processing workflow)
# ═══════════════════════════════════════════
text_box("tb-extract",   "extract text",       cx=TB_X, cy=TB1_Y)
text_box("tb-face",      "describe face",      cx=TB_X, cy=TB2_Y)
text_box("tb-image",     "describe image",     cx=TB_X, cy=TB3_Y)
text_box("tb-translate", "prep and\ntranslate", cx=TB_X, cy=TB4_Y)
text_box("tb-audio",     "create audio",       cx=TB_X, cy=TB5_Y)
text_box("tb-store",     "store audio",        cx=TB_X, cy=TB6_Y)

time.sleep(0.3)

# ═══════════════════════════════════════════
# 8. AI SERVICE ICONS (right side)
# ═══════════════════════════════════════════
icon_label_component("textract",    "file-textract",    "Amazon Textract",    cx=AI_X, cy=TB1_Y,
                      icon_size=55, text_color=DARK, icon_bg_color=TEAL)
icon_label_component("rekognition", "file-rekognition", "Amazon Rekognition", cx=AI_X, cy=TB2_Y,
                      icon_size=55, text_color=DARK, icon_bg_color=TEAL)
icon_label_component("sagemaker",   "file-sagemaker",   "Amazon SageMaker",  cx=AI_X, cy=TB3_Y,
                      icon_size=55, text_color=DARK, icon_bg_color=TEAL)
icon_label_component("translate",   "file-translate",   "Amazon Translate",  cx=AI_X, cy=TB4_Y,
                      icon_size=55, text_color=DARK, icon_bg_color=TEAL)
icon_label_component("polly",       "file-polly",       "Amazon Polly",      cx=AI_X, cy=TB5_Y,
                      icon_size=55, text_color=DARK, icon_bg_color=TEAL)
icon_label_component("s3-out",      "file-s3",          "Amazon S3",         cx=AI_X, cy=TB6_Y,
                      icon_size=55, text_color=DARK, icon_bg_color=S3_GREEN)

time.sleep(0.3)

# ═══════════════════════════════════════════
# 9. ARROWS
# ═══════════════════════════════════════════
# Front-end: label text → service icons (horizontal arrows from circles to icons)
for row_y, aid in [(ROW1_Y, "a-r1"), (ROW2_Y, "a-r2"), (ROW3_Y, "a-r3")]:
    arrow(aid, CIRCLE_X + 25, row_y - 20, SVC_ICON_X - 40, row_y - 20,
          stroke_color=DARK, stroke_width=1)

# Step 4 arrow
arrow("a-r4", CIRCLE_X + 25, ROW4_Y - 20, SVC_ICON_X - 40, ROW4_Y - 20,
      stroke_color=DARK, stroke_width=1)

# Front end → Step Functions (horizontal, from front-end right edge to SF left)
arrow("a-fe-sf", FE_X + FE_W, ROW1_Y, SF_X, ROW1_Y,
      stroke_color=DARK, stroke_width=1)
arrow("a-fe-sf2", FE_X + FE_W, ROW2_Y, SF_X, ROW2_Y,
      stroke_color=DARK, stroke_width=1)

# API Gateway vertical arrows (up to front-end, down/right)
arrow("a-apigw-up", SVC_ICON_X, ROW3_Y + 50, SVC_ICON_X, ROW4_Y - 55,
      stroke_color=DARK, stroke_width=1,
      start_arrowhead="arrow", end_arrowhead="arrow")

# Text box vertical chain (down arrows between text boxes)
for i, (y1, y2) in enumerate([(TB1_Y, TB2_Y), (TB3_Y, TB4_Y), (TB4_Y, TB5_Y), (TB5_Y, TB6_Y)]):
    arrow(f"a-tb-v{i}", TB_X, y1 + 20, TB_X, y2 - 20,
          stroke_color=DARK, stroke_width=1)

# describe face → describe image (special: no arrow between extract text and describe face)
# These are parallel, not sequential — but describe image → prep is sequential
arrow("a-tb-fi", TB_X, TB2_Y + 20, TB_X, TB3_Y - 20,
      stroke_color=DARK, stroke_width=1, end_arrowhead=None, start_arrowhead=None)

# Text boxes → AI services (horizontal arrows)
for tb_y, ai_id in [(TB1_Y, "a-tb-ai1"), (TB2_Y, "a-tb-ai2"), (TB3_Y, "a-tb-ai3"),
                     (TB4_Y, "a-tb-ai4"), (TB5_Y, "a-tb-ai5"), (TB6_Y, "a-tb-ai6")]:
    arrow(ai_id, TB_X + 80, tb_y, AI_X - 45, tb_y,
          stroke_color=DARK, stroke_width=1)

# SDK entry arrows into front-end rows
arrow("a-in-r1", CLOUD_X, 310, CIRCLE_X - 25, ROW1_Y - 20,
      stroke_color=DARK, stroke_width=1,
      waypoints=[(CLOUD_X + 50, 310), (CLOUD_X + 50, ROW1_Y - 20)])
arrow("a-in-r2", CLOUD_X + 50, 310, CIRCLE_X - 25, ROW2_Y - 20,
      stroke_color=DARK, stroke_width=1, start_arrowhead=None)
arrow("a-in-r3", CLOUD_X + 50, 310, CIRCLE_X - 25, ROW3_Y - 20,
      stroke_color=DARK, stroke_width=1, start_arrowhead=None,
      waypoints=[(CLOUD_X + 50, ROW3_Y - 20)])
arrow("a-in-r4", CLOUD_X + 50, 310, CIRCLE_X - 25, ROW4_Y - 20,
      stroke_color=DARK, stroke_width=1, start_arrowhead=None,
      waypoints=[(CLOUD_X + 50, ROW4_Y - 20)])

time.sleep(0.5)

# ═══════════════════════════════════════════
# 10. RESULTS
# ═══════════════════════════════════════════
n = len(get_elements()['elements'])
print(f"\nDiagram built with {n} elements")

issues = validate_diagram()
if issues:
    print(f"\n⚠ {len(issues)} issues found:")
    for iss in issues:
        print(f"  - {iss}")
else:
    print("\n✅ All validation passed — zero issues")
