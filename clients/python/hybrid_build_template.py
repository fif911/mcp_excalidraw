#!/usr/bin/env python3
"""
Hybrid build template: Mermaid layout + custom AWS components.

This template shows the standard workflow for building AWS architecture diagrams
using Mermaid's layout engine for auto-positioning, then overlaying AWS styling.

Usage:
    1. Copy this file to your diagram_building/v_{N}/ folder
    2. Fill in the diagram-specific values (icon_map, container_styles, etc.)
    3. Run: python build.py

Workflow:
    clear() → d2_to_mermaid_flowchart() → render_and_discover()
    → upload icons → replace_with_aws_icon() per node
    → style_container() per container → add_badge_to_arrow() per numbered arrow
    → validate → export
"""
import os
import sys

# Add clients/python to path
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(REPO_ROOT, "clients", "python"))
sys.path.insert(0, REPO_ROOT)

from components import (
    clear, upload_svg, arrow_style,
    replace_with_aws_icon, style_container, add_badge_to_arrow,
    validate_diagram, validate_arrow_paths,
    export_screenshot, ICONS_BASE,
)
from mermaid_layout import d2_to_mermaid_flowchart, render_and_discover

# ── CONFIG ──────────────────────────────────────────────────────────────

# Path to the D2 diagram spec
D2_FILE = os.path.join(os.path.dirname(__file__), "diagram.d2")

# Arrow styling — applied to all numbered badges
ARROW_CFG = arrow_style(
    stroke_color="#545B64", stroke_width=2, stroke_style="solid",
    label_bg="#232F3E", label_text_color="#ffffff",
    label_size=38, label_shape="circle",
)

# Map D2 leaf node IDs → icon file_ids and SVG paths
# Fill in from search_aws_icons results
ICON_MAP = {
    # "d2.full.id": ("file-id", "relative/path/from/icons/dir.svg"),
    # Example:
    # "aws_cloud.customer_account.auth.cognito": ("file-cognito", "aws-icons-official/.../Arch_Amazon-Cognito_64.svg"),
}

# Map D2 leaf node IDs → display labels
LABELS = {
    # "d2.full.id": "Display Label",
}

# Container styling overrides (by Mermaid subgraph ID)
CONTAINER_STYLES = {
    # "aws_cloud": {"stroke_color": "#545B64", "label_text": "AWS Cloud", "icon_file_id": "file-aws-cloud"},
    # "aws_cloud__customer_account": {"stroke_color": "#545B64", "label_text": "Customer's AWS Account"},
}

# Arrow number → D2 connection badge number
# Mermaid arrow IDs follow pattern: "{from_mermaid_id}_{to_mermaid_id}"
ARROW_BADGES = {
    # "from_id_to_id": 1,
}


# ── BUILD ───────────────────────────────────────────────────────────────

def build():
    # Phase 0: Clear canvas and read D2 spec
    clear()

    with open(D2_FILE) as f:
        d2_source = f.read()

    # Phase 1: Convert D2 → Mermaid and render for auto-layout
    mermaid_str, node_id_map = d2_to_mermaid_flowchart(d2_source, direction="LR")
    print(f"Generated Mermaid ({len(mermaid_str)} chars), {len(node_id_map)} leaf nodes")
    print(mermaid_str[:500])

    discovered = render_and_discover(mermaid_str, node_id_map, timeout=10)
    print(f"Discovered: {len(discovered['nodes'])} nodes, "
          f"{len(discovered['containers'])} containers, "
          f"{len(discovered['arrows'])} arrows")

    if not discovered["nodes"]:
        print("ERROR: No elements discovered — is the canvas frontend open?")
        return

    # Phase 2: Upload icons
    for d2_id, (file_id, rel_path) in ICON_MAP.items():
        full_path = os.path.join(ICONS_BASE, rel_path)
        if os.path.exists(full_path):
            upload_svg(file_id, full_path)
        else:
            print(f"WARNING: Icon not found: {full_path}")

    # Phase 3: Replace Mermaid nodes with AWS icon components
    for d2_id, node_info in discovered["nodes"].items():
        if d2_id in ICON_MAP:
            file_id = ICON_MAP[d2_id][0]
            label = LABELS.get(d2_id, d2_id.split(".")[-1])
            replace_with_aws_icon(node_info["element_id"], file_id, label)

    # Phase 4: Style containers
    for mid, style_kwargs in CONTAINER_STYLES.items():
        if mid in discovered["containers"]:
            style_container(mid, **style_kwargs)

    # Phase 5: Add numbered badges to arrows
    for arrow_id, number in ARROW_BADGES.items():
        if arrow_id in discovered["arrows"]:
            add_badge_to_arrow(arrow_id, number,
                               label_bg=ARROW_CFG.get("label_bg", "#232F3E"),
                               label_text_color=ARROW_CFG.get("label_text_color", "#ffffff"),
                               label_size=ARROW_CFG.get("label_size", 38),
                               label_shape=ARROW_CFG.get("label_shape", "circle"))

    # Phase 6: Validate
    issues = validate_diagram() + validate_arrow_paths()
    if issues:
        print(f"\n--- {len(issues)} issues found ---")
        for iss in issues:
            print(f"  - {iss}")
    else:
        print("\nAll validations passed!")

    # Phase 7: Export
    output_dir = os.path.dirname(__file__)
    export_screenshot(os.path.join(output_dir, "diagram.png"))
    print("Done!")


if __name__ == "__main__":
    build()
