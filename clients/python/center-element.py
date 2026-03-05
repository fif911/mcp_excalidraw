#!/usr/bin/env python3
"""
Center one element inside another using bounding box math.

Usage:
  python3 center-element.py <child_id> <parent_id> [--api URL]
  python3 center-element.py <child_id> <parent_id> --axis x|y|both [--api URL]

How it works:
  1. GET both elements from the API
  2. Calculate parent center: parent.x + parent.width/2, parent.y + parent.height/2
  3. Calculate child dimensions (for text: estimate from fontSize + text length)
  4. Set child position so its center matches parent center
  5. PUT the new position

For text elements without explicit width/height, estimates:
  - width: len(text) * fontSize * 0.6  (monospace approx)
  - height: fontSize * 1.2 (line height)
"""
import requests
import json
import sys
import argparse

def get_element(api, eid):
    r = requests.get(f"{api}/api/elements/{eid}")
    if r.status_code != 200:
        raise ValueError(f"Element {eid} not found: {r.status_code}")
    data = r.json()
    # API wraps in {"success": true, "element": {...}}
    return data.get('element', data)

def estimate_text_bbox(elem):
    """Estimate bounding box of a text element."""
    text = elem.get('text', '')
    font_size = elem.get('fontSize', 16)
    font_family = str(elem.get('fontFamily', '1'))
    
    # Approximate character width ratios by font family
    # "1" = Virgil (hand-drawn, wider), "2" = Helvetica, "3" = Cascadia (mono)
    char_width_ratio = {'1': 0.55, '2': 0.52, '3': 0.6}.get(font_family, 0.55)
    
    lines = text.split('\n')
    max_line_len = max(len(line) for line in lines)
    
    # If element has explicit width, use it
    w = elem.get('width')
    if not w or w == 0:
        w = max_line_len * font_size * char_width_ratio
    
    h = elem.get('height')
    if not h or h == 0:
        # Excalidraw text height: fontSize * 1.25 per line (includes line spacing)
        # But the RENDERED glyph for digits/caps is ~0.7 * fontSize (no descenders)
        # We use the bounding box height that Excalidraw allocates, not glyph height
        h = len(lines) * font_size * 1.25
    
    # Vertical fudge: Excalidraw positions text from top of bounding box,
    # but the visual center of digits is lower than bbox center (descender space).
    # Apply a small downward shift to compensate.
    elem['_v_fudge'] = font_size * 0.1  # 10% of fontSize downward
    
    return w, h

def get_bbox(elem):
    """Get bounding box (x, y, width, height) for any element."""
    x = elem.get('x', 0)
    y = elem.get('y', 0)
    w = elem.get('width', 0)
    h = elem.get('height', 0)
    
    if elem['type'] == 'text' and (not w or not h):
        w, h = estimate_text_bbox(elem)
    
    return x, y, w, h

def center_element(api, child_id, parent_id, axis='both', dry_run=False):
    child = get_element(api, child_id)
    parent = get_element(api, parent_id)
    
    px, py, pw, ph = get_bbox(parent)
    cx, cy, cw, ch = get_bbox(child)
    
    parent_cx = px + pw / 2
    parent_cy = py + ph / 2
    
    new_x = cx
    new_y = cy
    
    if axis in ('both', 'x'):
        new_x = parent_cx - cw / 2
    if axis in ('both', 'y'):
        new_y = parent_cy - ch / 2
        # Apply vertical fudge for text elements (optical centering)
        v_fudge = child.get('_v_fudge', 0)
        if v_fudge:
            new_y += v_fudge
    
    print(f"Parent {parent_id}: bbox=({px}, {py}, {pw}, {ph}), center=({parent_cx}, {parent_cy})")
    print(f"Child  {child_id}: bbox=({cx}, {cy}, {cw}, {ch})")
    print(f"New position: ({new_x:.1f}, {new_y:.1f}) [was ({cx}, {cy})]")
    
    if dry_run:
        print("(dry run — not applied)")
        return new_x, new_y
    
    update = {}
    if axis in ('both', 'x'):
        update['x'] = round(new_x)
    if axis in ('both', 'y'):
        update['y'] = round(new_y)
    
    r = requests.put(f"{api}/api/elements/{child_id}", json=update)
    print(f"Updated: {r.status_code}")
    return new_x, new_y

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Center one element inside another')
    parser.add_argument('child_id', help='Element to move (child)')
    parser.add_argument('parent_id', help='Element to center within (parent)')
    parser.add_argument('--api', default='http://localhost:3000', help='API base URL')
    parser.add_argument('--axis', default='both', choices=['x', 'y', 'both'], help='Which axis to center')
    parser.add_argument('--dry-run', action='store_true', help='Show changes without applying')
    args = parser.parse_args()
    
    center_element(args.api, args.child_id, args.parent_id, args.axis, args.dry_run)
