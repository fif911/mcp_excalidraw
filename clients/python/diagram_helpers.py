#!/usr/bin/env python3
"""
Diagram component helpers — create properly-aligned component groups.

Usage:
  from diagram_helpers import DiagramAPI
  api = DiagramAPI("http://localhost:3000")
  
  # Create an icon+label component (icon centered above label)
  api.icon_label("my-svc", file_id="file-s3", label="Amazon S3", 
                 cx=500, cy=700, icon_size=65, font_size=22)
  
  # Create a numbered circle with centered text
  api.numbered_circle("c1", number=1, cx=200, cy=300, size=50)
  
  # Create a container with icon+label header
  api.container("sm-ctr", x=300, y=130, w=570, h=350, 
                stroke="#0d9488", fill="#f0fdfa",
                icon_file_id="file-sagemaker", label="Amazon SageMaker")
  
  # Center any child in parent
  api.center("child-id", "parent-id", axis="both")
  
  # Align multiple elements
  api.align(["el1", "el2", "el3"], "center")  # horizontal center
"""
import requests
import json
import base64
import os

class DiagramAPI:
    def __init__(self, base_url="http://localhost:3000"):
        self.base = base_url
        self.api = f"{base_url}/api"
    
    def _post(self, path, data):
        r = requests.post(f"{self.api}{path}", json=data)
        return r.json()
    
    def _put(self, path, data):
        r = requests.put(f"{self.api}{path}", json=data)
        return r.json()
    
    def _get(self, path):
        r = requests.get(f"{self.api}{path}")
        return r.json()
    
    def _delete(self, path):
        r = requests.delete(f"{self.api}{path}")
        return r.json()
    
    def clear(self):
        """Clear all elements."""
        return self._delete("/elements/clear")
    
    def get_elements(self):
        """Get all elements."""
        return self._get("/elements")
    
    def get_element(self, eid):
        """Get single element."""
        data = self._get(f"/elements/{eid}")
        return data.get('element', data)
    
    def create(self, element):
        """Create a single element."""
        return self._post("/elements", element)
    
    def batch_create(self, elements):
        """Create multiple elements."""
        return self._post("/elements/batch", elements)
    
    def update(self, eid, props):
        """Update element properties."""
        return self._put(f"/elements/{eid}", props)
    
    def delete(self, eid):
        """Delete element."""
        return self._delete(f"/elements/{eid}")
    
    def center(self, child_id, parent_id, axis="both"):
        """Center child element inside parent."""
        return self._post("/elements/center", {
            "childIds": [child_id] if isinstance(child_id, str) else child_id,
            "parentId": parent_id,
            "axis": axis
        })
    
    def align(self, element_ids, alignment):
        """Align elements (left/center/right/top/middle/bottom)."""
        return self._post("/elements/align", {
            "elementIds": element_ids,
            "alignment": alignment
        })
    
    def upload_svg(self, file_id, svg_path):
        """Upload an SVG icon file."""
        with open(svg_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        return self._post("/files", [{
            "id": file_id,
            "dataURL": f"data:image/svg+xml;base64,{b64}",
            "mimeType": "image/svg+xml",
        }])
    
    def export_png(self, output_path, scale=2):
        """Export canvas to PNG. Requires browser WebSocket connected."""
        r = requests.post(f"{self.api}/export/image", 
                         json={"format": "png", "background": True})
        d = r.json()
        if d.get('data'):
            data = base64.b64decode(d['data'])
            with open(output_path, 'wb') as f:
                f.write(data)
            return len(data)
        raise RuntimeError(f"Export failed: {d}")
    
    # ─── Component Helpers ───
    
    def numbered_circle(self, prefix, number, cx, cy, size=50):
        """Create a dark circle with centered white number.
        
        Args:
            prefix: ID prefix (e.g. "c1" creates "c1-bg" and "c1-tx")
            number: The number to display
            cx, cy: Center position of the circle
            size: Circle diameter (default 50)
        """
        bg_id = f"{prefix}-bg"
        tx_id = f"{prefix}-tx"
        
        # Circle
        self.create({
            "id": bg_id, "type": "ellipse",
            "x": cx - size/2, "y": cy - size/2,
            "width": size, "height": size,
            "backgroundColor": "#1a1a1a", "strokeColor": "#1a1a1a",
            "strokeWidth": 1, "fillStyle": "solid", "roughness": 0
        })
        
        # Number text (positioned at circle origin, then centered)
        self.create({
            "id": tx_id, "type": "text",
            "x": cx - size/2, "y": cy - size/2,
            "text": str(number), "fontSize": 18, "fontFamily": "2",
            "strokeColor": "#ffffff"
        })
        
        # Center text in circle
        self.center(tx_id, bg_id)
        
        return bg_id, tx_id
    
    def icon_label(self, prefix, file_id, label, cx, cy, 
                   icon_size=65, font_size=22, gap=5,
                   text_color="#000000", font_family="2"):
        """Create an icon centered above a label.
        
        Args:
            prefix: ID prefix (creates "{prefix}-icon" and "{prefix}-lbl")
            file_id: The uploaded file ID for the icon
            label: Text label (can be multi-line with \\n)
            cx, cy: Center position of the whole component
            icon_size: Icon width/height
            gap: Gap between icon bottom and text top
            font_size: Label font size
        Returns:
            (icon_id, label_id)
        """
        icon_id = f"img-{prefix}" if not prefix.startswith("img-") else prefix
        label_id = f"{prefix}-lbl"
        
        # Estimate text height
        lines = label.split('\n')
        text_h = len(lines) * font_size * 1.25
        
        # Total component height
        total_h = icon_size + gap + text_h
        
        # Position icon and text so the group is centered at cy
        icon_y = cy - total_h / 2
        text_y = icon_y + icon_size + gap
        
        # Icon
        self.create({
            "id": icon_id, "type": "image",
            "x": cx - icon_size / 2, "y": icon_y,
            "width": icon_size, "height": icon_size,
            "fileId": file_id, "status": "saved", "scale": [1, 1]
        })
        
        # Label (centered horizontally)
        max_line = max(len(l) for l in lines)
        text_w = max_line * font_size * 0.52  # Helvetica char width
        self.create({
            "id": label_id, "type": "text",
            "x": cx - text_w / 2, "y": text_y,
            "text": label, "fontSize": font_size, "fontFamily": font_family,
            "strokeColor": text_color, "textAlign": "center"
        })
        
        # Align icon and label horizontally
        self.align([icon_id, label_id], "center")
        
        return icon_id, label_id
    
    def service_box(self, prefix, file_id, label, cx, cy,
                    box_w=180, box_h=130, icon_size=65, font_size=22,
                    stroke="#e9ecef", fill="transparent"):
        """Create a service box with icon and label inside, all centered.
        
        Args:
            prefix: ID prefix (creates "{prefix}-box", "img-{prefix}", "{prefix}-lbl")
        Returns:
            (box_id, icon_id, label_id)
        """
        box_id = f"{prefix}-box"
        icon_id = f"img-{prefix}"
        label_id = f"{prefix}-lbl"
        
        lines = label.split('\n')
        text_h = len(lines) * font_size * 1.25
        gap = 5
        total_h = icon_size + gap + text_h
        
        # Box
        self.create({
            "id": box_id, "type": "rectangle",
            "x": cx - box_w / 2, "y": cy - box_h / 2,
            "width": box_w, "height": box_h,
            "strokeColor": stroke, "backgroundColor": fill,
            "strokeWidth": 1, "roughness": 0, "fillStyle": "solid"
        })
        
        # Icon — place at exact center calculation, not rely on center endpoint
        icon_x = cx - icon_size / 2
        icon_y = cy - total_h / 2
        self.create({
            "id": icon_id, "type": "image",
            "x": icon_x, "y": icon_y,
            "width": icon_size, "height": icon_size,
            "fileId": file_id, "status": "saved", "scale": [1, 1]
        })
        
        # Label — centered below icon
        self.create({
            "id": label_id, "type": "text",
            "x": cx - box_w / 2 + 5, "y": icon_y + icon_size + gap,
            "text": label, "fontSize": font_size, "fontFamily": "2",
            "strokeColor": "#000000", "textAlign": "center",
            "width": box_w - 10  # fill box width for centering
        })
        
        return box_id, icon_id, label_id
    
    def container(self, cid, x, y, w, h, stroke, fill="transparent",
                  icon_file_id=None, label=None, label_color=None,
                  stroke_style="solid", stroke_width=2, font_size=22):
        """Create a container box with optional icon+label header.
        
        The icon is placed at top-left corner, label right of icon.
        """
        dash = stroke_style == "dashed"
        self.create({
            "id": cid, "type": "rectangle",
            "x": x, "y": y, "width": w, "height": h,
            "strokeColor": stroke, "backgroundColor": fill,
            "strokeWidth": stroke_width, "roughness": 0,
            "strokeStyle": "dashed" if dash else "solid",
            "fillStyle": "solid" if fill != "transparent" else "hachure"
        })
        
        icon_id = None
        label_id = None
        
        if icon_file_id:
            icon_id = f"img-{cid.replace('-ctr','').replace('-','')}-hdr"
            self.create({
                "id": icon_id, "type": "image",
                "x": x + 8, "y": y + 5,
                "width": 35, "height": 35,
                "fileId": icon_file_id, "status": "saved", "scale": [1, 1]
            })
        
        if label:
            label_id = f"{cid.replace('-ctr','')}-lbl" if '-ctr' in cid else f"{cid}-lbl"
            lx = x + 48 if icon_file_id else x + 10
            self.create({
                "id": label_id, "type": "text",
                "x": lx, "y": y + 8,
                "text": label, "fontSize": font_size, "fontFamily": "2",
                "strokeColor": label_color or stroke
            })
        
        return cid, icon_id, label_id


# ─── Icon Upload Helper ───

ICONS_BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "icons")

ALL_ICONS = {
    "file-cloud": "Architecture-Group-Icons_01302026/AWS-Cloud-logo_32.svg",
    "file-region": "Architecture-Group-Icons_01302026/Region_32.svg",
    "file-sagemaker": "Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_Amazon-SageMaker_48.svg",
    "file-sagemaker-ai": "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-SageMaker-AI_48.svg",
    "file-iam": "Architecture-Service-Icons_01302026/Arch_Security-Identity/48/Arch_AWS-IAM-Identity-Center_48.svg",
    "file-s3": "Architecture-Service-Icons_01302026/Arch_Storage/48/Arch_Amazon-Simple-Storage-Service_48.svg",
    "file-redshift": "Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_Amazon-Redshift_48.svg",
    "file-glue": "Architecture-Service-Icons_01302026/Arch_Analytics/48/Arch_AWS-Glue_48.svg",
    "file-q": "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-Q_48.svg",
    "file-codewhisperer": "Architecture-Service-Icons_01302026/Arch_Artificial-Intelligence/48/Arch_Amazon-CodeWhisperer_48.svg",
    "file-user": "Category-Icons_01302026/Arch-Category_32/Arch-Category_End-User-Computing_32.svg",
    "file-glue-catalog": "Resource-Icons_01302026/Res_Analytics/Res_AWS-Glue_Data-Catalog_48.svg",
    # Simple line-art icons for inner project components:
    "file-database": "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Database_48_Light.svg",
    "file-codecommit": "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Git-Repository_48_Light.svg",
    "file-cloud9": "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Source-Code_48_Light.svg",
    "file-sysmgr": "Resource-Icons_01302026/Res_General-Icons/Res_48_Light/Res_Toolkit_48_Light.svg",
}

def upload_all_icons(api: DiagramAPI):
    """Upload all 16 SVG icons to the server."""
    for fid, rel_path in ALL_ICONS.items():
        full_path = os.path.join(ICONS_BASE, rel_path)
        if os.path.exists(full_path):
            api.upload_svg(fid, full_path)
            print(f"  ✓ {fid}")
        else:
            print(f"  ✗ {fid}: NOT FOUND at {full_path}")


def verify_icons(api: DiagramAPI):
    """Check if all icons are loaded, upload missing ones."""
    r = api._get("/files")
    loaded = set()
    files = r if isinstance(r, list) else r.get('files', [])
    for f in files:
        loaded.add(f.get('id', ''))
    
    missing = set(ALL_ICONS.keys()) - loaded
    if missing:
        print(f"Missing {len(missing)} icons, uploading...")
        for fid in missing:
            rel_path = ALL_ICONS[fid]
            full_path = os.path.join(ICONS_BASE, rel_path)
            if os.path.exists(full_path):
                api.upload_svg(fid, full_path)
                print(f"  ✓ {fid}")
        return False
    return True


if __name__ == "__main__":
    api = DiagramAPI()
    print("Uploading all icons...")
    upload_all_icons(api)
    print("Done.")
