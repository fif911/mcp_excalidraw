"""Excalidraw diagram validation utilities."""
from .overlap_checks import (
    run_all_overlap_checks,
    check_section_crossings,
    check_icon_overlaps,
    check_icon_label_overlaps,
    check_label_arrow_overlaps,
    check_numbered_circle_overlaps,
)
from .arrow_utils import (
    container_border_point,
    external_actor_inside_container,
)
