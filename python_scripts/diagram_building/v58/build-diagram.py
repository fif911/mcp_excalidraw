#!/usr/bin/env python3
"""
Build script for v58: AI-Powered Conversational Avatar Architecture
Reference: refs/photo_2026-03-13_15-59-10.jpg
"""
import sys, os, time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "clients", "python"))
from components import *

# ── Constants ──
ICON_SIZE = 65
HALF = ICON_SIZE / 2
FONT_SIZE = 24
ARROW_COLOR = "#6B7280"
CONTAINER_BLUE = "#3B82F6"
CONTAINER_GRAY = "#6B7280"
BOX_COLOR = "#1a1a1a"

ARROW_STYLE = arrow_style(
    stroke_color=ARROW_COLOR, stroke_width=2, stroke_style="solid",
)
DASHED_STYLE = arrow_style(
    stroke_color=ARROW_COLOR, stroke_width=2, stroke_style="dashed",
)

def icy_to_cy(icon_cy_target, label_text, icon_size=ICON_SIZE, font_size=FONT_SIZE, gap=8):
    """Compute component center cy from desired icon_cy."""
    if not label_text or not label_text.strip():
        return icon_cy_target
    _, text_h = measure_text(label_text, font_size)
    total_h = icon_size + gap + text_h
    return icon_cy_target - icon_size / 2 + total_h / 2

# ── Setup ──
print("Clearing canvas...")
clear()
time.sleep(0.5)

# ── Upload icons ──
print("Uploading icons...")
ICONS_BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "icons")
ICONS = {
    "file-users": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Users_48_Light.svg",
    "file-multimedia": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Multimedia_48_Light.svg",
    "file-camera": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Camera_48_Light.svg",
    "file-ai-cat": "custom/Arch-Category_Artificial-Intelligence_48_NoBorder.svg",
    "file-database": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Database_48_Light.svg",
    "file-servers": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Servers_48_Light.svg",
    "file-disk": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Disk_48_Light.svg",
    "file-alert": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Alert_48_Light.svg",
    "file-greengrass": "aws-icons-official/Architecture-Group-Icons_01302026/AWS-IoT-Greengrass-Deployment_32.svg",
    "file-document": "aws-icons-official/Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Document_48_Light.svg",
    "file-appflow": "aws-icons-official/Architecture-Service-Icons_01302026/Arch_Application-Integration/48/Arch_Amazon-AppFlow_48.svg",
}
for fid, rel_path in ICONS.items():
    full_path = os.path.join(ICONS_BASE_DIR, rel_path)
    if os.path.exists(full_path):
        upload_svg(fid, full_path)
    else:
        print(f"  WARNING: Icon not found: {full_path}")

# ────────────────────────────────────────────────────────────────
#  LAYOUT COORDINATES
# ────────────────────────────────────────────────────────────────

# Y-levels (for horizontal arrow alignment)
Y_TOP = 145      # Avatar Engine, Text-to-speech text boxes (moved down for label space)
Y_MID = 245      # SLI, STT, CE text boxes; Avatar UI icon_cy; LLM icon_cy (adjusted for Y_TOP shift)
Y_CAM = 370      # Person Detection text box; Camera icon_cy (adjusted for Y_MID shift)
Y_DATA = 620     # CDS, DIP, KVD icon_cy (moved down to clear CC header)
Y_BOT = 780      # On-premise, Notification Pipeline icon_cy

# Container definitions
# Offline Facility (top-left, dashed)
OFF_X, OFF_Y, OFF_W, OFF_H = 15, 30, 200, 300

# Local Network (main area, solid blue)
LN_X, LN_Y, LN_W, LN_H = 240, 10, 960, 480

# Terminal Hardware (nested in Local Network)
TH_X, TH_Y, TH_W, TH_H = 270, 85, 225, 380

# Customer's Cloud or Datacenter (bottom-left, dashed)
CC_X, CC_Y, CC_W, CC_H = 15, 500, 200, 400

# ────────────────────────────────────────────────────────────────
#  CONTAINERS (bottom z-layer)
# ────────────────────────────────────────────────────────────────
print("Creating containers...")

offline = container_box(
    "offline-facility", x=OFF_X, y=OFF_Y, w=OFF_W, h=OFF_H,
    stroke_color=CONTAINER_GRAY, stroke_style="dashed", stroke_width=2,
    label_text="Offline Facility", label_color="#1a1a1a",
    label_font_size=FONT_SIZE, icon_header_size=ICON_SIZE, header_height=ICON_SIZE,
)

local_net = container_box(
    "local-network", x=LN_X, y=LN_Y, w=LN_W, h=LN_H,
    stroke_color=CONTAINER_BLUE, stroke_style="solid", stroke_width=2,
    icon_file_id="file-greengrass",
    label_text="Local Network", label_color="#1a1a1a",
    label_font_size=FONT_SIZE, icon_header_size=ICON_SIZE, header_height=ICON_SIZE,
)

terminal_hw = container_box(
    "terminal-hw", x=TH_X, y=TH_Y, w=TH_W, h=TH_H,
    stroke_color=CONTAINER_BLUE, stroke_style="solid", stroke_width=2,
    label_text="Terminal Hardware", label_color="#1a1a1a",
    label_font_size=FONT_SIZE, icon_header_size=ICON_SIZE, header_height=ICON_SIZE,
)

cust_cloud = container_box(
    "cust-cloud", x=CC_X, y=CC_Y, w=CC_W, h=CC_H,
    stroke_color=CONTAINER_GRAY, stroke_style="dashed", stroke_width=2,
    label_text="Customer's Cloud or\nDatacenter", label_color="#1a1a1a",
    label_font_size=FONT_SIZE, icon_header_size=ICON_SIZE, header_height=ICON_SIZE,
)

# ────────────────────────────────────────────────────────────────
#  SERVICE TEXT BOXES (dark bordered, inside Local Network)
# ────────────────────────────────────────────────────────────────
print("Creating service text boxes...")

TB_STYLE = dict(stroke_color=BOX_COLOR, text_color=BOX_COLOR,
                stroke_width=2, fill_color="#ffffff",
                font_size=FONT_SIZE, min_width=180, corner_radius=0)

tb_ae = text_box("tb-ae", "Avatar Engine", cx=665, cy=Y_TOP, **TB_STYLE)
tb_tts = text_box("tb-tts", "Text-to-speech", cx=1010, cy=Y_TOP, **TB_STYLE)
tb_sli = text_box("tb-sli", "Spoken\nLanguage\nIdentification", cx=615, cy=Y_MID, **TB_STYLE)
tb_stt = text_box("tb-stt", "Speech-to-text", cx=820, cy=Y_MID, **TB_STYLE)
tb_ce = text_box("tb-ce", "Conversational\nEngine", cx=1020, cy=Y_MID, **TB_STYLE)
tb_pd = text_box("tb-pd", "Person Detection", cx=710, cy=Y_CAM, **TB_STYLE)

# ────────────────────────────────────────────────────────────────
#  ICON + LABEL COMPONENTS
# ────────────────────────────────────────────────────────────────
print("Creating icon+label components...")

# Users (inside Offline Facility)
users = icon_label_component(
    "users", "file-users", "Users",
    cx=115, cy=icy_to_cy(Y_MID, "Users"),
    icon_size=ICON_SIZE, font_size=FONT_SIZE,
)

# Avatar UI (inside Terminal Hardware, upper area)
avatar_ui = icon_label_component(
    "avatar-ui", "file-multimedia", "Avatar UI",
    cx=385, cy=icy_to_cy(Y_MID, "Avatar UI"),
    icon_size=ICON_SIZE, font_size=FONT_SIZE,
    icon_bg_color="#DBEAFE",
)

# Camera (inside Terminal Hardware, lower area)
camera = icon_label_component(
    "camera", "file-camera", "Camera",
    cx=385, cy=icy_to_cy(Y_CAM, "Camera"),
    icon_size=ICON_SIZE, font_size=FONT_SIZE,
    icon_bg_color="#DBEAFE",
)

# Large Language Model (far right, outside Local Network)
llm = icon_label_component(
    "llm", "file-ai-cat", "Large\nLanguage\nModel",
    cx=1290, cy=icy_to_cy(Y_MID, "Large\nLanguage\nModel"),
    icon_size=ICON_SIZE, font_size=FONT_SIZE,
)

# Knowledge Vector DB (right side, below Local Network)
kvd = icon_label_component(
    "kvd", "file-database", "Knowledge\nVector DB",
    cx=1080, cy=icy_to_cy(Y_DATA, "Knowledge\nVector DB"),
    icon_size=ICON_SIZE, font_size=FONT_SIZE,
)

# Customer's Data Sources (inside Customer's Cloud)
cds = icon_label_component(
    "cds", "file-servers", "Customer's\nData Sources",
    cx=115, cy=icy_to_cy(Y_DATA, "Customer's\nData Sources"),
    icon_size=ICON_SIZE, font_size=FONT_SIZE,
)

# On-premise Systems (inside Customer's Cloud)
ops = icon_label_component(
    "ops", "file-disk", "On-premise\nSystems",
    cx=115, cy=icy_to_cy(Y_BOT, "On-premise\nSystems"),
    icon_size=ICON_SIZE, font_size=FONT_SIZE,
)

# Data Indexing Pipeline (center-bottom)
dip = icon_label_component(
    "dip", "file-document", "Data Indexing\nPipeline",
    cx=400, cy=icy_to_cy(Y_DATA, "Data Indexing\nPipeline"),
    icon_size=ICON_SIZE, font_size=FONT_SIZE,
)

# Notification Pipeline (bottom center)
np_comp = icon_label_component(
    "np", "file-alert", "Notification Pipeline",
    cx=400, cy=icy_to_cy(Y_BOT, "Notification Pipeline"),
    icon_size=ICON_SIZE, font_size=FONT_SIZE,
)

# Pink/Magenta service icon (no label) — reference shows magenta square with orbit design
# Using AppFlow icon (pink #E7157B with circular flow design, closest match)
magenta_icon = icon_label_component(
    "magenta-svc", "file-appflow", "",
    cx=655, cy=730,
    icon_size=ICON_SIZE, font_size=FONT_SIZE,
)

# ────────────────────────────────────────────────────────────────
#  ARROWS
# ────────────────────────────────────────────────────────────────
print("Creating arrows...")

# Get positions
u_icx, u_icy = users["bbox"]["icon_cx"], users["bbox"]["icon_cy"]
aui_icx, aui_icy = avatar_ui["bbox"]["icon_cx"], avatar_ui["bbox"]["icon_cy"]
cam_icx, cam_icy = camera["bbox"]["icon_cx"], camera["bbox"]["icon_cy"]
llm_icx, llm_icy = llm["bbox"]["icon_cx"], llm["bbox"]["icon_cy"]
kvd_icx, kvd_icy = kvd["bbox"]["icon_cx"], kvd["bbox"]["icon_cy"]
cds_icx, cds_icy = cds["bbox"]["icon_cx"], cds["bbox"]["icon_cy"]
ops_icx, ops_icy = ops["bbox"]["icon_cx"], ops["bbox"]["icon_cy"]
dip_icx, dip_icy = dip["bbox"]["icon_cx"], dip["bbox"]["icon_cy"]
np_icx, np_icy = np_comp["bbox"]["icon_cx"], np_comp["bbox"]["icon_cy"]

# Text box edges
def box_edges(tb):
    b = tb["bbox"]
    return b["x"], b["y"], b["x"] + b["w"], b["y"] + b["h"], b["cx"], b["cy"]

ae_l, ae_t, ae_r, ae_b, ae_cx, ae_cy = box_edges(tb_ae)
tts_l, tts_t, tts_r, tts_b, tts_cx, tts_cy = box_edges(tb_tts)
sli_l, sli_t, sli_r, sli_b, sli_cx, sli_cy = box_edges(tb_sli)
stt_l, stt_t, stt_r, stt_b, stt_cx, stt_cy = box_edges(tb_stt)
ce_l, ce_t, ce_r, ce_b, ce_cx, ce_cy = box_edges(tb_ce)
pd_l, pd_t, pd_r, pd_b, pd_cx, pd_cy = box_edges(tb_pd)

# ── 1. Users ↔ Avatar UI (bidirectional, dashed) ──
arrow("a-users-aui",
      u_icx + HALF, u_icy,
      aui_icx - HALF - 6, aui_icy,  # -6 to account for bg padding
      start_arrowhead="arrow", end_arrowhead="arrow",
      **DASHED_STYLE)
# Place label above the arrow midpoint
mid_x = (u_icx + HALF + aui_icx - HALF) / 2
arrow_label("a-users-aui", "interact with",
            font_size=FONT_SIZE, text_color="#1a1a1a", offset_y=-20)

# ── 2. Avatar Engine → Avatar UI ("real time avatar generation") ──
# L-shaped: AE left → left just past TH edge → down to Avatar UI top
# TH auto-expands to ~295px wide, right edge at ~565. Use x=570 for route.
# Route vertical segment at x=525, just left of SLI box (left edge ~525)
ae_route_x = 525
arrow("a-ae-aui",
      ae_l, ae_cy,
      aui_icx + HALF + 6, aui_icy,
      waypoints=[(ae_route_x, ae_cy), (ae_route_x, aui_icy)],
      end_arrowhead="arrow",
      **ARROW_STYLE)
# "real time avatar generation" label — positioned above AE box, right of TH header
# TH auto-expands to ~565px right edge. Position label starting at x=570 to clear TH.
tw_rt, th_rt = measure_text("real time\navatar generation", FONT_SIZE)
label_x = 570  # just past TH right edge
label_y = round(ae_cy - th_rt - 6)  # just above AE horizontal segment
create({
    "id": "lbl-rtag", "type": "text",
    "x": label_x,
    "y": label_y,
    "text": "real time\navatar generation",
    "fontSize": FONT_SIZE, "fontFamily": "2",
    "strokeColor": "#1a1a1a",
})

# ── 3. Avatar Engine ↔ Text-to-speech (bidirectional) ──
arrow("a-ae-tts",
      ae_r, ae_cy,
      tts_l, tts_cy,
      start_arrowhead="arrow", end_arrowhead="arrow",
      **ARROW_STYLE)

# ── 4. Avatar UI → Spoken Language Identification ──
arrow("a-aui-sli",
      aui_icx + HALF + 6, aui_icy,  # +6 for bg padding
      sli_l, sli_cy,
      end_arrowhead="arrow",
      **ARROW_STYLE)

# ── 5. SLI → Speech-to-text ──
arrow("a-sli-stt",
      sli_r, sli_cy,
      stt_l, stt_cy,
      end_arrowhead="arrow",
      **ARROW_STYLE)

# ── 6. Speech-to-text → Conversational Engine ──
arrow("a-stt-ce",
      stt_r, stt_cy,
      ce_l, ce_cy,
      end_arrowhead="arrow",
      **ARROW_STYLE)

# ── 7. Camera → Person Detection ──
arrow("a-cam-pd",
      cam_icx + HALF + 6, cam_icy,  # +6 for bg padding
      pd_l, pd_cy,
      end_arrowhead="arrow",
      **ARROW_STYLE)

# ── 8. Person Detection → Conversational Engine ──
# L-shaped: PD right → right to CE x → up to CE bottom
arrow("a-pd-ce",
      pd_r, pd_cy,
      ce_cx, ce_b,
      waypoints=[(ce_cx, pd_cy)],
      end_arrowhead="arrow",
      **ARROW_STYLE)

# ── 9. Conversational Engine ↔ Large Language Model (bidirectional) ──
arrow("a-ce-llm",
      ce_r, ce_cy,
      llm_icx - HALF, llm_icy,
      start_arrowhead="arrow", end_arrowhead="arrow",
      **ARROW_STYLE)

# ── 10. Knowledge Vector DB → Conversational Engine ("get context") ──
# L-shaped: KVD top → up → left to CE bottom
# Route vertical segment at KVD's x, then horizontal to CE bottom
arrow("a-kvd-ce",
      kvd_icx, kvd_icy - HALF,
      ce_cx, ce_b,
      waypoints=[(kvd_icx, ce_b + 50), (ce_cx, ce_b + 50)],
      end_arrowhead="arrow",
      **ARROW_STYLE)
# "get context" label on the vertical segment (right side)
arrow_label("a-kvd-ce", "get context",
            font_size=FONT_SIZE, text_color="#1a1a1a", offset_x=60, offset_y=0)

# ── 11. LLM → Knowledge Vector DB ("event notification") ──
# Route RIGHT of LLM label to avoid crossing it:
# LLM bottom → down to KVD y → left to KVD right edge
# But LLM label extends below icon. Need to route to the RIGHT of LLM.
# Go from LLM right side → right → down → left to KVD
llm_label_bottom = llm["bbox"]["y"] + llm["bbox"]["h"]
# Route far enough right to clear "Language" label (widest line ~107px centered at llm_icx)
route_x = llm_icx + HALF + 60  # route well right of LLM label

arrow("a-llm-kvd",
      llm_icx + HALF, llm_icy,
      kvd_icx + HALF, kvd_icy,
      waypoints=[(route_x, llm_icy), (route_x, kvd_icy)],
      end_arrowhead="arrow",
      **ARROW_STYLE)
arrow_label("a-llm-kvd", "event\nnotification",
            font_size=FONT_SIZE, text_color="#1a1a1a", offset_x=50, offset_y=0)

# ── 12. Customer's Data Sources → Data Indexing Pipeline (dashed) ──
arrow("a-cds-dip",
      cds_icx + HALF, cds_icy,
      dip_icx - HALF, dip_icy,
      end_arrowhead="arrow",
      **DASHED_STYLE)

# ── 13. Data Indexing Pipeline → Knowledge Vector DB ──
arrow("a-dip-kvd",
      dip_icx + HALF, dip_icy,
      kvd_icx - HALF, kvd_icy,
      end_arrowhead="arrow",
      **ARROW_STYLE)

# ── 14. Notification Pipeline → On-premise Systems (dashed) ──
arrow("a-np-ops",
      np_icx - HALF, np_icy,
      ops_icx + HALF, ops_icy,
      end_arrowhead="arrow",
      **DASHED_STYLE)

# ────────────────────────────────────────────────────────────────
#  OVERLAP CHECKS
# ────────────────────────────────────────────────────────────────
print("\nRunning overlap checks...")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))
from utilities.overlap_checks import run_all_overlap_checks
report = run_all_overlap_checks()
try:
    print(report)
except UnicodeEncodeError:
    print(str(report).encode('ascii', 'replace').decode('ascii'))

issues = validate_arrow_paths()
if issues:
    print("\nArrow validation issues:")
    for i in issues:
        print(f"  - {i}")
else:
    print("\nNo arrow validation issues found.")

diag_issues = validate_diagram()
if diag_issues:
    print("\nDiagram validation issues:")
    for i in diag_issues:
        print(f"  - {i}")
else:
    print("\nNo diagram validation issues found.")

print("\n=== Build complete! ===")
