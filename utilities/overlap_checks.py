#!/usr/bin/env python3
"""
Overlap detection utilities for Excalidraw diagrams.

Checks for:
1. Sections (containers) crossing into each other (full nesting is OK)
2. Icons overlapping each other
3. Text-under-icons overlapping other text-under-icons
4. Text-under-icons overlapping arrows
5. Numbered circles (arrow labels) overlapping section borders or arrows

Run directly:  python utilities/overlap_checks.py
Import:        from utilities.overlap_checks import run_all_overlap_checks
"""
import sys
import os

# Allow importing components from clients/python/
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                "clients", "python"))
from components import get_elements, measure_text


# ──────────────────────────────────────────────────────────────────────
#  Geometry helpers
# ──────────────────────────────────────────────────────────────────────

def _bbox(e):
    """Return (x1, y1, x2, y2) bounding box for an element."""
    w = e.get("width", 0)
    h = e.get("height", 0)
    if e["type"] == "text" and (not w or w == 0):
        w, h = measure_text(e.get("text", ""), e.get("fontSize", 22))
    return (e["x"], e["y"], e["x"] + w, e["y"] + h)


def _rects_overlap(a, b):
    """True if two (x1,y1,x2,y2) rectangles overlap at all."""
    return a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]


def _rect_contains(outer, inner):
    """True if outer fully contains inner."""
    return (inner[0] >= outer[0] and inner[2] <= outer[2] and
            inner[1] >= outer[1] and inner[3] <= outer[3])


def _rect_area(r):
    return max(0, r[2] - r[0]) * max(0, r[3] - r[1])


def _overlap_area(a, b):
    """Area of intersection between two rectangles."""
    ox1 = max(a[0], b[0])
    oy1 = max(a[1], b[1])
    ox2 = min(a[2], b[2])
    oy2 = min(a[3], b[3])
    return max(0, ox2 - ox1) * max(0, oy2 - oy1)


def _overlap_pct(a, b):
    """Percentage of smaller rect's area that overlaps with the other."""
    oa = _overlap_area(a, b)
    if oa == 0:
        return 0.0
    smaller = min(_rect_area(a), _rect_area(b))
    if smaller == 0:
        return 0.0
    return oa / smaller * 100


def _segment_intersects_rect(seg, rect):
    """Cohen-Sutherland: does line segment intersect rectangle?"""
    x1, y1, x2, y2 = seg
    bx1, by1, bx2, by2 = rect

    def outcode(x, y):
        code = 0
        if x < bx1: code |= 1
        elif x > bx2: code |= 2
        if y < by1: code |= 4
        elif y > by2: code |= 8
        return code

    c1, c2 = outcode(x1, y1), outcode(x2, y2)
    if c1 == 0 or c2 == 0:
        return True
    if c1 & c2:
        return False
    # Check edge intersections
    dx, dy = x2 - x1, y2 - y1
    edges = [(bx1, by1, bx1, by2), (bx2, by1, bx2, by2),
             (bx1, by1, bx2, by1), (bx1, by2, bx2, by2)]
    for ex1, ey1, ex2, ey2 in edges:
        dex, dey = ex2 - ex1, ey2 - ey1
        denom = dx * dey - dy * dex
        if abs(denom) < 0.001:
            continue
        t = ((ex1 - x1) * dey - (ey1 - y1) * dex) / denom
        u = ((ex1 - x1) * dy - (ey1 - y1) * dx) / denom
        if 0 <= t <= 1 and 0 <= u <= 1:
            return True
    return False


def _segment_crosses_rect_border(seg, rect, margin=0):
    """True if segment crosses the border zone of a rect (not just inside it).
    margin expands the border zone inward."""
    bx1, by1, bx2, by2 = rect
    # Outer border
    if not _segment_intersects_rect(seg, rect):
        return False
    # If segment is fully inside (with margin), it doesn't cross the border
    inner = (bx1 + margin, by1 + margin, bx2 - margin, by2 - margin)
    x1, y1, x2, y2 = seg
    if (inner[0] <= x1 <= inner[2] and inner[1] <= y1 <= inner[3] and
        inner[0] <= x2 <= inner[2] and inner[1] <= y2 <= inner[3]):
        return False
    return True


def _arrow_segments(arrow_el):
    """Return list of (x1,y1,x2,y2) absolute segments for an arrow."""
    ox, oy = arrow_el["x"], arrow_el["y"]
    pts = arrow_el.get("points", [])
    abs_pts = [(ox + p[0], oy + p[1]) for p in pts]
    segs = []
    for i in range(len(abs_pts) - 1):
        segs.append((*abs_pts[i], *abs_pts[i + 1]))
    return segs


def _segment_min_dist_to_point(seg, px, py):
    """Minimum distance from point (px,py) to line segment."""
    x1, y1, x2, y2 = seg
    dx, dy = x2 - x1, y2 - y1
    len_sq = dx * dx + dy * dy
    if len_sq == 0:
        return ((px - x1) ** 2 + (py - y1) ** 2) ** 0.5
    t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / len_sq))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return ((px - proj_x) ** 2 + (py - proj_y) ** 2) ** 0.5


def _segment_min_dist_to_rect(seg, rect):
    """Minimum distance from segment to rect border."""
    bx1, by1, bx2, by2 = rect
    # If segment intersects rect, distance is 0
    if _segment_intersects_rect(seg, rect):
        return 0
    # Check distance from segment to each corner and edge
    corners = [(bx1, by1), (bx2, by1), (bx2, by2), (bx1, by2)]
    min_d = float("inf")
    for cx, cy in corners:
        d = _segment_min_dist_to_point(seg, cx, cy)
        min_d = min(min_d, d)
    # Check distance from each rect edge to segment endpoints
    rect_edges = [
        (bx1, by1, bx2, by1), (bx2, by1, bx2, by2),
        (bx2, by2, bx1, by2), (bx1, by2, bx1, by1),
    ]
    x1, y1, x2, y2 = seg
    for re in rect_edges:
        d1 = _segment_min_dist_to_point(re, x1, y1)
        d2 = _segment_min_dist_to_point(re, x2, y2)
        min_d = min(min_d, d1, d2)
    return min_d


# ──────────────────────────────────────────────────────────────────────
#  Element classification helpers
# ──────────────────────────────────────────────────────────────────────

def _classify_elements(elements):
    """Sort elements into categories. Returns dict of lists."""
    by_id = {e["id"]: e for e in elements}

    # Build group membership: group_id → set of element ids
    groups = {}
    for e in elements:
        for gid in e.get("groupIds", []):
            groups.setdefault(gid, set()).add(e["id"])

    # Containers: rectangles with substantial size
    containers = [e for e in elements
                  if e["type"] == "rectangle" and e.get("width", 0) > 80 and e.get("height", 0) > 50]

    # Icons: image elements
    icons = [e for e in elements if e["type"] == "image"]

    # Find which text elements are icon labels (grouped with an image)
    icon_group_ids = set()
    for ic in icons:
        for gid in ic.get("groupIds", []):
            icon_group_ids.add(gid)
    icon_label_texts = []
    for e in elements:
        if e["type"] == "text":
            for gid in e.get("groupIds", []):
                if gid in icon_group_ids:
                    icon_label_texts.append(e)
                    break

    # Numbered circles: ellipses grouped with text (arrow step labels)
    ellipse_groups = set()
    for e in elements:
        if e["type"] == "ellipse":
            for gid in e.get("groupIds", []):
                ellipse_groups.add(gid)
    numbered_circles = []  # (ellipse, text) pairs
    nc_element_ids = set()
    for e in elements:
        if e["type"] == "ellipse":
            for gid in e.get("groupIds", []):
                if gid in ellipse_groups:
                    # Find the text in same group
                    for tid in groups.get(gid, []):
                        t = by_id.get(tid)
                        if t and t["type"] == "text":
                            numbered_circles.append((e, t))
                            nc_element_ids.add(e["id"])
                            nc_element_ids.add(t["id"])
                            break
                    break

    arrows = [e for e in elements if e["type"] == "arrow"]

    return {
        "by_id": by_id,
        "groups": groups,
        "containers": containers,
        "icons": icons,
        "icon_label_texts": icon_label_texts,
        "numbered_circles": numbered_circles,
        "nc_element_ids": nc_element_ids,
        "arrows": arrows,
    }


# ──────────────────────────────────────────────────────────────────────
#  Check 1: Section (container) crossing
# ──────────────────────────────────────────────────────────────────────

def check_section_crossings(elements=None, margin=3):
    """
    Detect containers whose borders cross into each other.
    Full nesting (one completely inside another) is OK.
    Partial overlap is an error.

    Args:
        elements: list of Excalidraw elements (fetched if None)
        margin: pixel tolerance for border crossing detection

    Returns:
        list of issue dicts with keys: type, severity, message, details
    """
    if elements is None:
        elements = get_elements().get("elements", [])
    info = _classify_elements(elements)
    containers = info["containers"]
    issues = []

    for i, c1 in enumerate(containers):
        bb1 = _bbox(c1)
        for c2 in containers[i + 1:]:
            bb2 = _bbox(c2)
            if not _rects_overlap(bb1, bb2):
                continue
            # Check if one fully contains the other (OK)
            if _rect_contains(bb1, bb2) or _rect_contains(bb2, bb1):
                continue
            # Partial overlap — this is the error case
            pct = _overlap_pct(bb1, bb2)
            issues.append({
                "type": "SECTION_CROSSING",
                "severity": "error",
                "message": (
                    f"Section '{c1['id']}' and '{c2['id']}' partially overlap "
                    f"({pct:.0f}% of smaller section)."
                ),
                "details": {
                    "section_a": c1["id"],
                    "section_b": c2["id"],
                    "bbox_a": {"x": bb1[0], "y": bb1[1], "w": bb1[2]-bb1[0], "h": bb1[3]-bb1[1]},
                    "bbox_b": {"x": bb2[0], "y": bb2[1], "w": bb2[2]-bb2[0], "h": bb2[3]-bb2[1]},
                    "overlap_pct": round(pct, 1),
                },
            })

    return issues


# ──────────────────────────────────────────────────────────────────────
#  Check 2: Icon-to-icon overlap
# ──────────────────────────────────────────────────────────────────────

def check_icon_overlaps(elements=None, margin=5):
    """
    Detect icons (image elements) that overlap each other.

    Args:
        elements: list of Excalidraw elements (fetched if None)
        margin: minimum gap in pixels between icons

    Returns:
        list of issue dicts
    """
    if elements is None:
        elements = get_elements().get("elements", [])
    info = _classify_elements(elements)
    icons = info["icons"]
    issues = []

    for i, ic1 in enumerate(icons):
        bb1 = _bbox(ic1)
        # Expand by margin
        bb1m = (bb1[0] - margin, bb1[1] - margin, bb1[2] + margin, bb1[3] + margin)
        for ic2 in icons[i + 1:]:
            bb2 = _bbox(ic2)
            if not _rects_overlap(bb1m, bb2):
                continue
            oa = _overlap_area(bb1, bb2)
            gap = -1  # overlapping
            if oa == 0:
                # They don't truly overlap, but they're within margin
                # Calculate actual gap
                dx = max(0, max(bb2[0] - bb1[2], bb1[0] - bb2[2]))
                dy = max(0, max(bb2[1] - bb1[3], bb1[1] - bb2[3]))
                gap = (dx**2 + dy**2) ** 0.5

            if oa > 0:
                issues.append({
                    "type": "ICON_OVERLAP",
                    "severity": "error",
                    "message": (
                        f"Icon '{ic1['id']}' overlaps icon '{ic2['id']}' "
                        f"by {oa:.0f}px² area."
                    ),
                    "details": {
                        "icon_a": ic1["id"],
                        "icon_b": ic2["id"],
                        "overlap_area": round(oa),
                        "bbox_a": {"x": bb1[0], "y": bb1[1], "w": bb1[2]-bb1[0], "h": bb1[3]-bb1[1]},
                        "bbox_b": {"x": bb2[0], "y": bb2[1], "w": bb2[2]-bb2[0], "h": bb2[3]-bb2[1]},
                    },
                })
            else:
                issues.append({
                    "type": "ICON_TOO_CLOSE",
                    "severity": "warning",
                    "message": (
                        f"Icon '{ic1['id']}' is only {gap:.0f}px from icon '{ic2['id']}' "
                        f"(min recommended: {margin}px)."
                    ),
                    "details": {
                        "icon_a": ic1["id"],
                        "icon_b": ic2["id"],
                        "gap_px": round(gap),
                        "min_margin": margin,
                    },
                })

    return issues


# ──────────────────────────────────────────────────────────────────────
#  Check 3: Text-under-icon overlaps
# ──────────────────────────────────────────────────────────────────────

def check_icon_label_overlaps(elements=None, margin=3):
    """
    Detect label text beneath icons that overlaps with other icon labels.

    Args:
        elements: list of Excalidraw elements (fetched if None)
        margin: extra pixel margin around text bounding boxes

    Returns:
        list of issue dicts
    """
    if elements is None:
        elements = get_elements().get("elements", [])
    info = _classify_elements(elements)
    labels = info["icon_label_texts"]
    issues = []

    for i, t1 in enumerate(labels):
        bb1 = _bbox(t1)
        bb1m = (bb1[0] - margin, bb1[1] - margin, bb1[2] + margin, bb1[3] + margin)
        for t2 in labels[i + 1:]:
            bb2 = _bbox(t2)
            if not _rects_overlap(bb1m, bb2):
                continue
            text1 = t1.get("text", "")[:40]
            text2 = t2.get("text", "")[:40]
            oa = _overlap_area(bb1, bb2)
            issues.append({
                "type": "LABEL_OVERLAP",
                "severity": "error",
                "message": (
                    f"Label '{text1}' ({t1['id']}) overlaps label "
                    f"'{text2}' ({t2['id']}) by {oa:.0f}px²."
                ),
                "details": {
                    "text_a": {"id": t1["id"], "text": text1,
                               "pos": {"x": bb1[0], "y": bb1[1]},
                               "size": {"w": bb1[2]-bb1[0], "h": bb1[3]-bb1[1]}},
                    "text_b": {"id": t2["id"], "text": text2,
                               "pos": {"x": bb2[0], "y": bb2[1]},
                               "size": {"w": bb2[2]-bb2[0], "h": bb2[3]-bb2[1]}},
                    "overlap_area": round(oa),
                },
            })

    return issues


# ──────────────────────────────────────────────────────────────────────
#  Check 4: Text-under-icon overlapping with arrows
# ──────────────────────────────────────────────────────────────────────

def check_label_arrow_overlaps(elements=None, margin=8):
    """
    Detect icon label text that overlaps with arrow paths.

    Args:
        elements: list of Excalidraw elements (fetched if None)
        margin: pixel buffer around text boxes for arrow proximity

    Returns:
        list of issue dicts
    """
    if elements is None:
        elements = get_elements().get("elements", [])
    info = _classify_elements(elements)
    labels = info["icon_label_texts"]
    arrows = info["arrows"]
    nc_ids = info["nc_element_ids"]
    issues = []

    for t in labels:
        if t["id"] in nc_ids:
            continue  # skip numbered circle text
        bb = _bbox(t)
        bbm = (bb[0] - margin, bb[1] - margin, bb[2] + margin, bb[3] + margin)
        text_preview = t.get("text", "")[:40]

        for a in arrows:
            segs = _arrow_segments(a)
            for seg in segs:
                if _segment_intersects_rect(seg, bbm):
                    issues.append({
                        "type": "LABEL_ARROW_OVERLAP",
                        "severity": "error",
                        "message": (
                            f"Label '{text_preview}' ({t['id']}) overlaps "
                            f"arrow '{a['id']}'."
                        ),
                        "details": {
                            "label_id": t["id"],
                            "label_text": text_preview,
                            "label_bbox": {"x": bb[0], "y": bb[1],
                                           "w": bb[2]-bb[0], "h": bb[3]-bb[1]},
                            "arrow_id": a["id"],
                        },
                    })
                    break  # one hit per arrow is enough

    return issues


# ──────────────────────────────────────────────────────────────────────
#  Check 5: Numbered circles overlapping section borders or arrows
# ──────────────────────────────────────────────────────────────────────

def check_numbered_circle_overlaps(elements=None, border_margin=5, arrow_margin=3):
    """
    Detect numbered circles (step labels on arrows) that overlap with:
    - Section (container) borders
    - Other arrows (not the arrow they label)

    Args:
        elements: list of Excalidraw elements (fetched if None)
        border_margin: extra margin when checking container border crossings
        arrow_margin: extra margin when checking arrow proximity

    Returns:
        list of issue dicts
    """
    if elements is None:
        elements = get_elements().get("elements", [])
    info = _classify_elements(elements)
    numbered_circles = info["numbered_circles"]
    containers = info["containers"]
    arrows = info["arrows"]
    issues = []

    for ellipse, text_el in numbered_circles:
        circ_bb = _bbox(ellipse)
        circ_label = text_el.get("text", "?")

        # Determine which arrow this circle belongs to (by group or proximity)
        parent_arrow_id = _find_parent_arrow(ellipse, arrows, info["groups"])

        # 5a: Check against container borders
        for c in containers:
            c_bb = _bbox(c)
            # Circle is OK if fully inside or fully outside the container
            if _rect_contains(c_bb, circ_bb):
                continue
            if not _rects_overlap(circ_bb, c_bb):
                continue
            # Crosses the border
            issues.append({
                "type": "CIRCLE_BORDER_OVERLAP",
                "severity": "error",
                "message": (
                    f"Step circle '{circ_label}' ({ellipse['id']}) crosses "
                    f"border of section '{c['id']}'."
                ),
                "details": {
                    "circle_id": ellipse["id"],
                    "circle_label": circ_label,
                    "circle_bbox": {"x": circ_bb[0], "y": circ_bb[1],
                                    "w": circ_bb[2]-circ_bb[0], "h": circ_bb[3]-circ_bb[1]},
                    "section_id": c["id"],
                    "section_bbox": {"x": c_bb[0], "y": c_bb[1],
                                     "w": c_bb[2]-c_bb[0], "h": c_bb[3]-c_bb[1]},
                },
            })

        # 5b: Check against other arrows (not the parent arrow)
        circ_bbm = (circ_bb[0] - arrow_margin, circ_bb[1] - arrow_margin,
                    circ_bb[2] + arrow_margin, circ_bb[3] + arrow_margin)
        for a in arrows:
            if a["id"] == parent_arrow_id:
                continue
            segs = _arrow_segments(a)
            for seg in segs:
                if _segment_intersects_rect(seg, circ_bbm):
                    issues.append({
                        "type": "CIRCLE_ARROW_OVERLAP",
                        "severity": "warning",
                        "message": (
                            f"Step circle '{circ_label}' ({ellipse['id']}) overlaps "
                            f"arrow '{a['id']}' (not its parent arrow)."
                        ),
                        "details": {
                            "circle_id": ellipse["id"],
                            "circle_label": circ_label,
                            "arrow_id": a["id"],
                            "parent_arrow_id": parent_arrow_id,
                        },
                    })
                    break

    return issues


def _find_parent_arrow(ellipse, arrows, groups):
    """Determine which arrow a numbered circle belongs to.

    Strategy: the circle's group or ID prefix often matches the arrow ID.
    E.g., circle "a5-lbl-bg" belongs to arrow "a5".
    Falls back to proximity check.
    """
    eid = ellipse["id"]
    # Convention: "{arrow_id}-lbl-bg"
    for suffix in ("-lbl-bg", "-bg"):
        if eid.endswith(suffix):
            candidate = eid[: -len(suffix)]
            # Check if candidate matches an arrow
            for a in arrows:
                if a["id"] == candidate:
                    return a["id"]

    # Check shared group with arrow label prefix
    ell_groups = set(ellipse.get("groupIds", []))
    for a in arrows:
        arrow_label_group = f"g-{a['id']}-lbl"
        if arrow_label_group in ell_groups:
            return a["id"]

    # Proximity fallback: find nearest arrow
    cx = ellipse["x"] + ellipse.get("width", 0) / 2
    cy = ellipse["y"] + ellipse.get("height", 0) / 2
    best_dist = float("inf")
    best_id = None
    for a in arrows:
        segs = _arrow_segments(a)
        for seg in segs:
            d = _segment_min_dist_to_point(seg, cx, cy)
            if d < best_dist:
                best_dist = d
                best_id = a["id"]
    return best_id


# ──────────────────────────────────────────────────────────────────────
#  Main: run all checks and produce summary
# ──────────────────────────────────────────────────────────────────────

def run_all_overlap_checks(icon_margin=5, label_margin=3, label_arrow_margin=8,
                           border_margin=5, circle_arrow_margin=3,
                           section_margin=3):
    """
    Run every overlap check and return a structured report.

    Returns:
        dict with:
          - total_errors: int
          - total_warnings: int
          - checks: list of {name, status, issues}
          - summary: str  (human-readable for agent consumption)
    """
    elements = get_elements().get("elements", [])

    checks = [
        ("Section crossings", check_section_crossings(elements, margin=section_margin)),
        ("Icon overlaps", check_icon_overlaps(elements, margin=icon_margin)),
        ("Icon-label overlaps", check_icon_label_overlaps(elements, margin=label_margin)),
        ("Label-arrow overlaps", check_label_arrow_overlaps(elements, margin=label_arrow_margin)),
        ("Numbered-circle overlaps", check_numbered_circle_overlaps(
            elements, border_margin=border_margin, arrow_margin=circle_arrow_margin)),
    ]

    total_errors = 0
    total_warnings = 0
    check_results = []

    for name, issues in checks:
        errs = sum(1 for i in issues if i["severity"] == "error")
        warns = sum(1 for i in issues if i["severity"] == "warning")
        total_errors += errs
        total_warnings += warns
        status = "PASS" if not issues else ("FAIL" if errs else "WARN")
        check_results.append({"name": name, "status": status, "issues": issues})

    # Build human-readable summary
    lines = []
    lines.append(f"=== OVERLAP CHECK REPORT ===")
    lines.append(f"Errors: {total_errors}  |  Warnings: {total_warnings}")
    lines.append("")

    for cr in check_results:
        icon = {"PASS": "[OK]", "FAIL": "[FAIL]", "WARN": "[WARN]"}[cr["status"]]
        lines.append(f"{icon} {cr['name']}: {len(cr['issues'])} issue(s)")
        for issue in cr["issues"]:
            prefix = "  ERROR" if issue["severity"] == "error" else "  WARN"
            lines.append(f"  {prefix}: {issue['message']}")
            # Add actionable fix hints from details
            d = issue["details"]
            if issue["type"] == "SECTION_CROSSING":
                lines.append(
                    f"    -> Move '{d['section_a']}' or '{d['section_b']}' so one "
                    f"fully contains the other, or they don't overlap at all."
                )
            elif issue["type"] == "ICON_OVERLAP":
                lines.append(
                    f"    -> Shift '{d['icon_a']}' or '{d['icon_b']}' apart. "
                    f"Icon A at ({d['bbox_a']['x']},{d['bbox_a']['y']}), "
                    f"Icon B at ({d['bbox_b']['x']},{d['bbox_b']['y']})."
                )
            elif issue["type"] == "LABEL_OVERLAP":
                lines.append(
                    f"    -> Reposition '{d['text_a']['id']}' or '{d['text_b']['id']}'. "
                    f"A at ({d['text_a']['pos']['x']:.0f},{d['text_a']['pos']['y']:.0f}), "
                    f"B at ({d['text_b']['pos']['x']:.0f},{d['text_b']['pos']['y']:.0f})."
                )
            elif issue["type"] == "LABEL_ARROW_OVERLAP":
                lines.append(
                    f"    -> Reroute arrow '{d['arrow_id']}' away from label, "
                    f"or move the icon so its label clears the arrow path."
                )
            elif issue["type"] == "CIRCLE_BORDER_OVERLAP":
                lines.append(
                    f"    -> Move circle '{d['circle_label']}' inward/outward so it "
                    f"doesn't straddle section '{d['section_id']}' border."
                )
            elif issue["type"] == "CIRCLE_ARROW_OVERLAP":
                lines.append(
                    f"    -> Shift circle '{d['circle_label']}' away from arrow "
                    f"'{d['arrow_id']}' (parent arrow: '{d['parent_arrow_id']}')."
                )

    if total_errors == 0 and total_warnings == 0:
        lines.append("")
        lines.append("All overlap checks passed. No issues found.")

    summary = "\n".join(lines)

    return {
        "total_errors": total_errors,
        "total_warnings": total_warnings,
        "checks": check_results,
        "summary": summary,
    }


# ──────────────────────────────────────────────────────────────────────
#  CLI entry point
# ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    report = run_all_overlap_checks()
    print(report["summary"])
    sys.exit(1 if report["total_errors"] > 0 else 0)
