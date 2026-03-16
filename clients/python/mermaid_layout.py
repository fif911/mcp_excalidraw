#!/usr/bin/env python3
"""
D2-to-Mermaid flowchart converter + render-and-discover workflow.

Converts a D2 diagram spec into Mermaid flowchart-v2 syntax for auto-layout,
then discovers the Mermaid-generated elements by their predictable IDs.

Mermaid flowchart-v2 preserves element IDs:
  - Vertices:  id = node_name (from Mermaid syntax)
  - Arrows:    id = "{start}_{end}"
  - Subgraphs: id = subgraph_name
"""
import re
import time
import requests

API = "http://localhost:3000/api"


def _get(path):
    return requests.get(f"{API}{path}").json()


def _post(path, data):
    return requests.post(f"{API}{path}", json=data).json()


# ── D2 Parser (lightweight, matches diagram.d2 format) ──────────────────

def _parse_d2(source):
    """
    Parse D2 source into a flat structure of shapes and connections.

    Returns:
        shapes: dict of {full_id: {"label": str, "style": dict, "children": list, "parent": str|None}}
        connections: list of {"from": str, "to": str, "label": str, "bidirectional": bool}
    """
    shapes = {}
    connections = []
    context_stack = []

    def full_id(local):
        parts = context_stack + [local]
        return ".".join(parts)

    def ensure_shape(fid, label=None):
        if fid not in shapes:
            parts = fid.split(".")
            parent = ".".join(parts[:-1]) if len(parts) > 1 else None
            shapes[fid] = {
                "label": label or parts[-1],
                "style": {},
                "children": [],
                "parent": parent,
            }
            if parent:
                ensure_shape(parent)
                if fid not in shapes[parent]["children"]:
                    shapes[parent]["children"].append(fid)
        elif label:
            shapes[fid]["label"] = label

    lines = source.split("\n")
    for raw_line in lines:
        line = re.sub(r"#.*", "", raw_line).strip()
        if not line:
            continue

        # Block open: "key: Label {" or "key {"
        m = re.match(r"^([\w\s.'-]+?)(?::\s*(.+?))?\s*\{$", line)
        if m:
            local = m.group(1).strip().replace(" ", "_")
            label = m.group(2).strip() if m.group(2) else None
            fid = full_id(local)
            ensure_shape(fid, label)
            context_stack.append(local)
            continue

        # Block close
        if line == "}":
            if context_stack:
                context_stack.pop()
            continue

        # Style attribute on current container: "style.X: value"
        # (D2 syntax for styling the containing block)
        m = re.match(r"^style\.([\w-]+):\s*(.+)$", line)
        if m and context_stack:
            attr_name = m.group(1)
            value = m.group(2).strip().strip('"')
            current_id = ".".join(context_stack)
            if current_id in shapes:
                shapes[current_id]["style"][attr_name] = value
            continue

        # Connection: a -> b: label
        m = re.match(r"^(.+?)\s*(->|<-|<->|--)\s*(.+?)(?::\s*(.*))?$", line)
        if m:
            raw_from = m.group(1).strip().replace(" ", "_")
            arrow = m.group(2)
            raw_to = m.group(3).strip().replace(" ", "_")
            label = m.group(4).strip() if m.group(4) else ""

            # Resolve fully qualified IDs — search existing shapes first
            from_id = _resolve_id(raw_from, context_stack, shapes)
            to_id = _resolve_id(raw_to, context_stack, shapes)

            ensure_shape(from_id)
            ensure_shape(to_id)

            bidirectional = arrow in ("<->", "--")
            actual_from = to_id if arrow == "<-" else from_id
            actual_to = from_id if arrow == "<-" else to_id

            connections.append({
                "from": actual_from,
                "to": actual_to,
                "label": label,
                "bidirectional": bidirectional,
            })
            continue

        # Attribute on named element: key.style.X: value OR key.shape: value
        m = re.match(r"^([\w.'-]+)\.(shape|style\.[\w-]+|icon|label):\s*(.+)$", line)
        if m:
            local = m.group(1).replace(" ", "_")
            attr = m.group(2)
            value = m.group(3)
            fid = full_id(local)
            ensure_shape(fid)
            if attr.startswith("style."):
                shapes[fid]["style"][attr.replace("style.", "")] = value
            continue

        # Simple declaration: "key: Label"
        m = re.match(r"^([\w\s.'-]+?)(?::\s*(.+))?$", line)
        if m:
            local = m.group(1).strip().replace(" ", "_")
            label = m.group(2).strip() if m.group(2) else None
            ensure_shape(full_id(local), label)

    return shapes, connections


def _resolve_id(raw_id, context_stack, shapes):
    """
    Resolve a potentially qualified ID, searching existing shapes.

    D2 connections at root level may reference nodes like
    'customer_account.data_transfer_hub' which were actually defined as
    'aws_cloud.customer_account.data_transfer_hub'. We search for the
    best match among existing shapes.
    """
    # Try exact match in current context first
    if context_stack:
        fid = ".".join(context_stack + [raw_id])
        if fid in shapes:
            return fid

    # Try as-is (root-level qualified)
    if raw_id in shapes:
        return raw_id

    # Search for existing shapes that end with this path
    if "." in raw_id:
        suffix = "." + raw_id
        matches = [sid for sid in shapes if sid.endswith(suffix)]
        if len(matches) == 1:
            return matches[0]
        # If multiple matches, prefer the shortest (most specific)
        if matches:
            return min(matches, key=len)

    # Fall back to context-qualified or root-level
    if context_stack:
        return ".".join(context_stack + [raw_id])
    return raw_id


# ── D2 → Mermaid Flowchart Converter ────────────────────────────────────

def _sanitize_mermaid_id(d2_id):
    """Convert a D2 fully-qualified ID to a valid Mermaid node ID."""
    return d2_id.replace(".", "__")


def d2_to_mermaid_flowchart(d2_source, direction="LR"):
    """
    Convert D2 diagram syntax to Mermaid flowchart-v2 syntax.

    Only leaf nodes become Mermaid vertices. Containers become subgraphs.
    Connections become edges with optional labels.

    Args:
        d2_source: D2 diagram definition string
        direction: Flowchart direction — "LR", "TB", "RL", "BT"

    Returns:
        (mermaid_str, node_id_map)
        - mermaid_str: Mermaid flowchart definition
        - node_id_map: dict mapping D2 full IDs to Mermaid node IDs
    """
    shapes, connections = _parse_d2(d2_source)
    node_id_map = {}  # d2_full_id -> mermaid_id
    lines = [f"graph {direction}"]

    def _emit_shape(d2_id, indent=2):
        shape = shapes[d2_id]
        mid = _sanitize_mermaid_id(d2_id)

        if shape["children"]:
            # Container → subgraph
            lines.append(f"{' ' * indent}subgraph {mid}[\"{shape['label']}\"]")
            for child_id in shape["children"]:
                _emit_shape(child_id, indent + 2)
            lines.append(f"{' ' * indent}end")
        else:
            # Leaf node → vertex
            node_id_map[d2_id] = mid
            lines.append(f"{' ' * indent}{mid}[\"{shape['label']}\"]")

    # Emit root-level shapes
    root_shapes = [sid for sid, s in shapes.items() if s["parent"] is None]
    for sid in root_shapes:
        _emit_shape(sid)

    # Emit connections
    for conn in connections:
        from_mid = _sanitize_mermaid_id(conn["from"])
        to_mid = _sanitize_mermaid_id(conn["to"])

        # Resolve to leaf nodes — if source/target is a container,
        # Mermaid connects to the subgraph itself
        if conn["bidirectional"]:
            arrow = "<-->"
        else:
            arrow = "-->"

        if conn["label"]:
            lines.append(f"  {from_mid} {arrow}|{conn['label']}| {to_mid}")
        else:
            lines.append(f"  {from_mid} {arrow} {to_mid}")

    mermaid_str = "\n".join(lines)
    return mermaid_str, node_id_map


# ── Render and Discover ─────────────────────────────────────────────────

def render_and_discover(mermaid_str, node_id_map, timeout=10, poll_interval=0.5):
    """
    Send Mermaid diagram to frontend for conversion, then discover created elements.

    The create_from_mermaid flow is async (WebSocket to frontend), so we poll
    for element creation.

    Args:
        mermaid_str: Mermaid flowchart definition
        node_id_map: dict from d2_to_mermaid_flowchart — maps D2 IDs to Mermaid IDs
        timeout: max seconds to wait for elements to appear
        poll_interval: seconds between polls

    Returns:
        dict with keys:
          - nodes: {d2_id: {element_id, x, y, w, h}}
          - containers: {mermaid_id: {element_id, x, y, w, h}}
          - arrows: {arrow_id: {element_id, x, y, points}}
          - all_elements: full elements list from canvas
    """
    # Count elements before
    before = _get("/elements")
    before_count = len(before.get("elements", []))

    # Send Mermaid to frontend
    _post("/elements/from-mermaid", {
        "mermaidDiagram": mermaid_str,
        "config": {
            "startOnLoad": False,
            "flowchart": {"curve": "linear"},
            "themeVariables": {"fontSize": "20px"},
            "maxEdges": 500,
            "maxTextSize": 50000,
        }
    })

    # Poll until new elements appear
    elapsed = 0
    elements = []
    while elapsed < timeout:
        time.sleep(poll_interval)
        elapsed += poll_interval
        data = _get("/elements")
        elements = data.get("elements", [])
        if len(elements) > before_count:
            break

    if len(elements) <= before_count:
        return {"nodes": {}, "containers": {}, "arrows": {}, "all_elements": []}

    # Build reverse map: mermaid_id -> d2_id
    reverse_map = {v: k for k, v in node_id_map.items()}

    # Categorize discovered elements
    nodes = {}
    containers = {}
    arrows = {}

    for el in elements:
        eid = el.get("id", "")
        etype = el.get("type", "")

        if etype == "arrow":
            arrows[eid] = {
                "element_id": eid,
                "x": el.get("x", 0),
                "y": el.get("y", 0),
                "points": el.get("points", []),
            }
        elif etype in ("rectangle", "ellipse", "diamond"):
            # Check if it's a node we know about
            if eid in reverse_map:
                d2_id = reverse_map[eid]
                nodes[d2_id] = {
                    "element_id": eid,
                    "x": el.get("x", 0),
                    "y": el.get("y", 0),
                    "w": el.get("width", 0),
                    "h": el.get("height", 0),
                }
            else:
                # Could be a subgraph container
                containers[eid] = {
                    "element_id": eid,
                    "x": el.get("x", 0),
                    "y": el.get("y", 0),
                    "w": el.get("width", 0),
                    "h": el.get("height", 0),
                }

    return {
        "nodes": nodes,
        "containers": containers,
        "arrows": arrows,
        "all_elements": elements,
    }
