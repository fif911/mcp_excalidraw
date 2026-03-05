#!/usr/bin/env python3
"""
Example Diagram Build Script — Template

Copy this file to clients/{client}/{project}/diagrams/build-diagram-v1.py
and modify for your specific diagram.

Workflow: clear → upload icons → containers → services → arrows → validate → export
"""
import sys
import time

# Adjust this path to point to mcp_excalidraw/scripts/
sys.path.insert(0, '/path/to/mcp_excalidraw/scripts')
from components import *

# ═══════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════
# Customize colors, arrow style, canvas dimensions here.

ARROW_COLOR = "#ff0000"      # Red arrows for visibility
ARROW_WIDTH = 6              # Thick for proposals
CANVAS_W = 1800              # Total canvas width
CANVAS_H = 1000              # Total canvas height

# ═══════════════════════════════════════════
# 1. SETUP — Clear canvas and upload icons
# ═══════════════════════════════════════════
clear()
time.sleep(0.5)

# Upload the AWS icon pack (or register your own pack first)
upload_icons("aws")
time.sleep(0.3)

# ═══════════════════════════════════════════
# 2. CONTAINERS — Build outside-in
# ═══════════════════════════════════════════
# Outermost container
container_box("outer", 30, 5, CANVAS_W, CANVAS_H,
              stroke_color="#879196",          # Gray border
              fill_color="transparent",
              icon_file_id="file-cloud",       # Header icon (optional)
              label_text="Cloud Environment",
              label_color="#1a1a1a",
              icon_header_size=45)

# Inner containers
container_box("svc-group", 100, 80, 600, 400,
              stroke_color="#0d9488",          # Teal
              fill_color="#f0fdfa",            # Light teal fill
              label_text="Service Group")

container_box("data-group", 800, 80, 500, 400,
              stroke_color="#0d9488",
              fill_color="#f0fdfa",
              label_text="Data Layer")

time.sleep(0.3)

# ═══════════════════════════════════════════
# 3. SERVICE COMPONENTS — Icon + label pairs
# ═══════════════════════════════════════════
# Standalone component at specific coordinates
icon_label_component("user", "file-user", "End Users",
                     cx=0, cy=300, icon_size=50, text_color="#1a1a1a")

# Component centered inside a container
service_in_container("main-svc", "file-sagemaker-ai", "Main Service",
                     "svc-group", icon_size=65)

# Component at explicit coordinates
icon_label_component("storage", "file-s3", "Object Storage",
                     cx=1050, cy=300, icon_size=65, text_color="#1a1a1a")

# 2x2 grid of components inside a container
grid_2x2("tools", [
    {"file_id": "file-database",   "label": "Database",       "id_suffix": "db"},
    {"file_id": "file-codecommit", "label": "Git\nRepository", "id_suffix": "git"},
    {"file_id": "file-cloud9",     "label": "IDE",            "id_suffix": "ide"},
    {"file_id": "file-sysmgr",     "label": "Tools",          "id_suffix": "tools"},
], "svc-group", header_h=50, icon_size=55, font_size=22)

time.sleep(0.3)

# Fix label colors to black (components default to #000000 which is fine)
for prefix in ['db', 'git', 'ide', 'tools']:
    for suffix in ['-lbl', '-lbl-0', '-lbl-1']:
        try:
            update(prefix + suffix, {'strokeColor': '#1a1a1a'})
        except Exception:
            pass

# ═══════════════════════════════════════════
# 4. NUMBERED CIRCLES — Step indicators
# ═══════════════════════════════════════════
numbered_circle("c1", 1, cx=50, cy=250)
numbered_circle("c2", 2, cx=750, cy=200)

time.sleep(0.3)

# ═══════════════════════════════════════════
# 5. ARROWS — Connections between elements
# ═══════════════════════════════════════════

# Option A: Elbowed arrows (auto-routed by Excalidraw frontend)
# Best for simple, direct connections
elbowed_arrow("a-user-svc", "img-user", "img-main-svc",
              stroke_color=ARROW_COLOR, stroke_width=ARROW_WIDTH)

# Option B: Manual waypoints for precise routing
# Use when elbowed routing doesn't produce a good path
# arrow("a-svc-storage", sx, sy, ex, ey,
#       waypoints=[(mid_x, sy), (mid_x, ey)],
#       stroke_color=ARROW_COLOR, stroke_width=ARROW_WIDTH)

# Option C: Dashed arrow for secondary/indirect flows
elbowed_arrow("a-svc-data", "img-main-svc", "img-storage",
              stroke_color=ARROW_COLOR, stroke_width=ARROW_WIDTH,
              stroke_style="dashed")

time.sleep(0.5)

# ═══════════════════════════════════════════
# 6. VALIDATION
# ═══════════════════════════════════════════
all_issues = []

# Structural checks
all_issues += validate_arrow_paths()
all_issues += validate_diagram()

# Report
n = len(get_elements().get('elements', []))
print(f"\nDiagram built with {n} elements")

if all_issues:
    print(f"\n--- {len(all_issues)} issues found ---")
    for iss in all_issues:
        print(f"  - {iss}")
    sys.exit(1)
else:
    print("\nAll validation passed — zero issues")

# ═══════════════════════════════════════════
# 7. EXPORT (optional — can also run manually)
# ═══════════════════════════════════════════
# Uncomment to auto-export after build:
# export_screenshot("diagram-v1.png")
# save_state("canvas-state-v1.json")
