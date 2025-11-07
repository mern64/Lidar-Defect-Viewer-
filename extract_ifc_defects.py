#!/usr/bin/env python3
"""
Extract defect marker positions from IFC file
This script finds small yellow spheres in the IFC file and exports their positions as JSON
"""

import json
import sys

try:
    import ifcopenshell
    import ifcopenshell.geom
except ImportError:
    print("ERROR: ifcopenshell not installed")
    print("Please install it with: pip install ifcopenshell")
    sys.exit(1)

def extract_defects_from_ifc(ifc_file_path, output_json_path="data/defects_from_ifc.json"):
    """Extract defect markers (small yellow spheres) from IFC file"""
    
    print(f"Loading IFC file: {ifc_file_path}")
    ifc_file = ifcopenshell.open(ifc_file_path)
    
    defects = []
    defect_counter = 1
    
    # Settings for geometry processing
    settings = ifcopenshell.geom.settings()
    settings.set(settings.USE_WORLD_COORDS, True)
    
    # Get all products (building elements)
    products = ifc_file.by_type("IfcProduct")
    print(f"Found {len(products)} products in IFC file")
    
    for product in products:
        try:
            # Get the name of the element
            name = product.Name or ""
            element_type = product.is_a()
            
            # Check if this might be a defect marker by name
            is_potential_marker = any(keyword in name.lower() for keyword in 
                                     ['defect', 'marker', 'sphere', 'ball', 'issue', 'problem', 'point'])
            
            # Get shape for geometric analysis
            if product.Representation:
                shape = ifcopenshell.geom.create_shape(settings, product)
                
                # Get bounding box
                bbox = shape.geometry.verts
                if len(bbox) > 0:
                    # Calculate bounding box dimensions
                    x_coords = [bbox[i] for i in range(0, len(bbox), 3)]
                    y_coords = [bbox[i+1] for i in range(0, len(bbox), 3)]
                    z_coords = [bbox[i+2] for i in range(0, len(bbox), 3)]
                    
                    min_x, max_x = min(x_coords), max(x_coords)
                    min_y, max_y = min(y_coords), max(y_coords)
                    min_z, max_z = min(z_coords), max(z_coords)
                    
                    size_x = max_x - min_x
                    size_y = max_y - min_y
                    size_z = max_z - min_z
                    
                    avg_size = (size_x + size_y + size_z) / 3
                    variance = abs(size_x - avg_size) + abs(size_y - avg_size) + abs(size_z - avg_size)
                    
                    # Check if it's a small sphere-like object (similar dimensions, small size)
                    is_spherical = variance < avg_size * 0.5 and avg_size < 0.5
                    
                    # Check material/color (if available)
                    is_yellow = False
                    if hasattr(product, 'HasAssociations'):
                        for association in product.HasAssociations:
                            if association.is_a('IfcRelAssociatesMaterial'):
                                material = association.RelatingMaterial
                                # Check for yellow/golden material
                                if hasattr(material, 'Name') and material.Name:
                                    mat_name = material.Name.lower()
                                    is_yellow = any(color in mat_name for color in 
                                                  ['yellow', 'gold', 'amber', 'warning'])
                    
                    # If it matches defect marker criteria
                    if (is_potential_marker or is_spherical) and avg_size < 1.0:
                        center_x = (min_x + max_x) / 2
                        center_y = (min_y + max_y) / 2
                        center_z = (min_z + max_z) / 2
                        
                        defect = {
                            "id": f"defect_ifc_{defect_counter}",
                            "type": "Unknown",
                            "severity": "medium",
                            "description": f"Defect marker extracted from IFC (element: {name or element_type})",
                            "coordinates": {
                                "x": round(center_x, 3),
                                "y": round(center_y, 3),
                                "z": round(center_z, 3)
                            },
                            "element_id": str(product.GlobalId),
                            "element_name": name,
                            "element_type": element_type,
                            "date_reported": "2025-11-07",
                            "status": "open",
                            "size": round(avg_size, 3)
                        }
                        
                        defects.append(defect)
                        print(f"Found defect marker {defect_counter}: {name} at ({center_x:.2f}, {center_y:.2f}, {center_z:.2f})")
                        defect_counter += 1
                        
        except Exception as e:
            # Skip elements that can't be processed
            continue
    
    # Create output data structure
    output_data = {
        "metadata": {
            "project_name": "IFC Extracted Defects",
            "export_date": "2025-11-07",
            "ifc_file": ifc_file_path,
            "total_defects": len(defects)
        },
        "defects": defects
    }
    
    # Save to JSON
    with open(output_json_path, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\n✓ Successfully extracted {len(defects)} defect markers")
    print(f"✓ Saved to: {output_json_path}")
    
    return defects

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_ifc_defects.py <ifc_file_path> [output_json_path]")
        print("\nExample:")
        print("  python extract_ifc_defects.py sisiran.ifc")
        print("  python extract_ifc_defects.py sisiran.ifc data/my_defects.json")
        sys.exit(1)
    
    ifc_file_path = sys.argv[1]
    output_json_path = sys.argv[2] if len(sys.argv) > 2 else "data/defects_from_ifc.json"
    
    try:
        extract_defects_from_ifc(ifc_file_path, output_json_path)
    except FileNotFoundError:
        print(f"ERROR: IFC file not found: {ifc_file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
