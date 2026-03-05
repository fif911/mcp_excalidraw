#!/usr/bin/env python3
"""Crop a region from an image for detailed inspection.

Usage:
    python3 crop_region.py <image_path> <x> <y> <width> <height> [output_path]
    python3 crop_region.py <image_path> --grid <rows> <cols> [output_dir]

Examples:
    # Crop specific region
    python3 crop_region.py diagram.png 100 200 400 300 crop.png

    # Split into 3x3 grid for systematic review
    python3 crop_region.py diagram.png --grid 3 3 crops/
    
    # Crop with percentage-based coordinates (0.0-1.0)
    python3 crop_region.py diagram.png 0.1 0.2 0.5 0.4 --pct crop.png
"""
import sys
import os
from PIL import Image

def crop_region(img_path, x, y, w, h, output_path=None):
    img = Image.open(img_path)
    iw, ih = img.size
    crop = img.crop((x, y, x + w, y + h))
    out = output_path or img_path.replace('.png', f'_crop_{x}_{y}_{w}_{h}.png')
    crop.save(out)
    print(f"Cropped ({x},{y},{w},{h}) from {iw}x{ih} → {out}")
    return out

def crop_grid(img_path, rows, cols, output_dir=None):
    img = Image.open(img_path)
    iw, ih = img.size
    cw, ch = iw // cols, ih // rows
    out_dir = output_dir or os.path.dirname(img_path) or '.'
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for r in range(rows):
        for c in range(cols):
            crop = img.crop((c*cw, r*ch, (c+1)*cw, (r+1)*ch))
            name = f"cell_{r}_{c}.png"
            path = os.path.join(out_dir, name)
            crop.save(path)
            paths.append(path)
            print(f"  {name}: ({c*cw},{r*ch})-({(c+1)*cw},{(r+1)*ch})")
    return paths

if __name__ == '__main__':
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    
    img_path = args[0]
    
    if args[1] == '--grid':
        rows, cols = int(args[2]), int(args[3])
        out_dir = args[4] if len(args) > 4 else None
        crop_grid(img_path, rows, cols, out_dir)
    else:
        pct = '--pct' in args
        nums = [a for a in args[1:] if a != '--pct' and not a.endswith('.png')]
        coords = [float(n) for n in nums[:4]]
        output = next((a for a in args[1:] if a.endswith('.png')), None)
        
        if pct:
            img = Image.open(img_path)
            iw, ih = img.size
            coords = [coords[0]*iw, coords[1]*ih, coords[2]*iw, coords[3]*ih]
        
        crop_region(img_path, int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3]), output)
