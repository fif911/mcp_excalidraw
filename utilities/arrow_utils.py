"""Arrow endpoint and external actor validation utilities."""


def container_border_point(container_id, side, at_y=None, at_x=None):
    """
    Return the exact (x, y) pixel coordinate on a container's border.

    Use this for cross-container arrow endpoints — arrows must stop at
    the receiving container's border, not pierce through to internal icons.

    Args:
        container_id: Element ID of the container
        side: "left", "right", "top", or "bottom"
        at_y: Y coordinate on the border (for left/right sides)
        at_x: X coordinate on the border (for top/bottom sides)

    Returns:
        (x, y) tuple — absolute pixel coordinates on the border
    """
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'clients', 'python'))
    from components import get_element

    el = get_element(container_id)
    x, y, w, h = el['x'], el['y'], el['width'], el['height']

    if side == 'left':
        return x, at_y if at_y is not None else y + h / 2
    elif side == 'right':
        return x + w, at_y if at_y is not None else y + h / 2
    elif side == 'top':
        return at_x if at_x is not None else x + w / 2, y
    elif side == 'bottom':
        return at_x if at_x is not None else x + w / 2, y + h
    else:
        raise ValueError(f"Unknown side '{side}'. Use: left, right, top, bottom")


def external_actor_inside_container(actor_cx, actor_cy, container_ids):
    """
    Validate that an external actor is outside all specified container boundaries.

    Raises ValueError with a clear message if the actor's icon bounding box
    overlaps any container. Call after placing all external actors and before
    building arrows.

    Args:
        actor_cx: Actor icon center X
        actor_cy: Actor icon center Y
        container_ids: List of container element IDs to check against

    Returns:
        True if actor is outside all containers

    Raises:
        ValueError if actor overlaps any container
    """
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'clients', 'python'))
    from components import get_element, ICON_SIZE

    half = ICON_SIZE / 2
    issues = []

    for cid in container_ids:
        el = get_element(cid)
        cx = el['x']
        cy = el['y']
        cw = el['width']
        ch = el['height']

        # Check if icon bbox overlaps container bbox
        if (cx <= actor_cx + half and actor_cx - half <= cx + cw and
                cy <= actor_cy + half and actor_cy - half <= cy + ch):
            issues.append(
                f"External actor at ({actor_cx}, {actor_cy}) overlaps "
                f"container '{cid}' [{cx},{cy} {cw}x{ch}]"
            )

    if issues:
        raise ValueError("\n".join(issues))
    return True
