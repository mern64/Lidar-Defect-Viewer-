# Changelog - LIDAR Defect Viewer

## Version 1.0.0 (November 7, 2025)

### Overview
Complete implementation of an IFC/GLB defect tracking viewer with automatic defect marker extraction from Blender exports.

---

## Features Implemented

### 1. **Automatic Defect Extraction from GLB Models**
- **Detection System**: Automatically identifies defect markers in GLB files exported from Blender
  - Detects meshes with names containing: `snapshot`, `proxy`, `defect`, `marker`, `sphere`, `ball`, `point`
  - Uses case-insensitive pattern matching
  - Extracts position data after all model transforms are applied

- **Two-Pass Extraction Process**:
  - First pass: Identifies defect markers and applies materials
  - Second pass: Extracts accurate positions after scaling/positioning transforms
  - Prevents coordinate mismatch issues

- **GLB Mesh Registration**:
  - Original defect meshes from Blender are registered as markers (no duplicate creation)
  - Meshes are tagged with metadata: `isDefectMarker`, `defectId`, `elementId`
  - Stored in `defectMarkers` Map with `isFromGLB: true` flag

### 2. **Building Element Color System**
Custom color scheme for different building elements:
- **Walls**: Pale yellow (RGB: 1.0, 1.0, 0.8)
- **Floors/Slabs**: Pale green (RGB: 0.8, 0.95, 0.8)
- **Doors**: Blue (RGB: 0.3, 0.5, 0.9)
- **Objects/Furniture**: Light brown (RGB: 0.7, 0.55, 0.4)

**Detection Methods**:
- Name-based: Searches for keywords in mesh names (wall, floor, door, etc.)
- Geometry-based: Analyzes dimensions and position for classification
  - Floors: Thin horizontal surfaces (height < 0.15m, Y position < 0.5m)
  - Walls: Tall vertical surfaces (height > 2.5m, thin profile)
  - Doors: Medium height rectangular objects (1.8-2.5m)

### 3. **Material System**
- **Material Type**: StandardMaterial (replaced PBR for better color preservation)
- **Properties Applied**:
  - `diffuseColor`: Base color
  - `ambientColor`: Ambient lighting response
  - `specularColor`: Specular highlights (white, 0.3, 0.3, 0.3)
  - No emissive color for building elements
  - Simple, predictable color rendering

### 4. **X-Ray Transparency Mode**
- **Constant Alpha Transparency**:
  - Walls: 20% opacity (alpha = 0.2)
  - Floors: 30% opacity (alpha = 0.3)
  - Doors: 40% opacity (alpha = 0.4)
  - Objects: 70% opacity (alpha = 0.7)
  - Defect markers: 90% opacity (alpha = 0.9)

- **Rendering Settings**:
  - Alpha mode: `MATERIAL_ALPHABLEND`
  - `needDepthPrePass = true` for proper transparency sorting
  - Automatically enabled on model load

### 5. **Editable Defect Management**

#### Defect Data Structure
```javascript
{
  id: "defect_1",
  type: "Unknown" | "crack" | "water-damage" | "structural" | "finish" | "electrical" | "plumbing",
  severity: "critical" | "high" | "medium" | "low",
  description: "Defect marker detected at [mesh name]",
  coordinates: [x, y, z],
  element_id: "mesh_name",
  date_reported: "YYYY-MM-DD",
  status: "pending",
  notes: "",
  images: []
}
```

#### Editable Fields
- **Type**: Dropdown selector with 7 predefined types
- **Severity**: 4-level selector (critical, high, medium, low)
- **Description**: Multi-line text area
- **Notes**: Multi-line text area for additional information
- **Images**: File upload with preview thumbnails

#### UI Features
- **Defect List**: 
  - Shows type, severity, description, coordinates, and date
  - Click to view full details
  - "Focus" button to center camera on defect
  - "Delete" button to remove defect

- **Defect Details Panel**:
  - Scrollable panel (max-height: calc(100vh - 200px))
  - Edit forms with proper focus states
  - Image preview gallery (100x100px thumbnails)
  - Three action buttons: Save Changes, Focus on Defect, Delete

### 6. **Severity Color Coding**
Visual indicators based on severity level:
- **Critical**: Red (RGB: 1.0, 0.0, 0.0)
- **High**: Orange (RGB: 1.0, 0.5, 0.0)
- **Medium**: Yellow (RGB: 1.0, 1.0, 0.0)
- **Low**: Green (RGB: 0.0, 1.0, 0.0)

Applied to:
- Defect marker spheres (emissive and diffuse color)
- Vertical indicator lines to ground
- Defect card borders in list

### 7. **Camera Focus System**
- **Functionality**: 
  - `focusOnDefect(defectId)` targets specific markers
  - Camera positioned at marker + offset (-5, 5, -5)
  - Smooth camera movement to target position
  
- **Fixed Issues**:
  - Now uses actual GLB mesh positions (not duplicate markers)
  - Looks up markers in `defectMarkers` Map by ID
  - Works correctly with extracted defects

### 8. **Smart Defect Loading**
- **Priority System**:
  1. Check if defects were extracted from GLB (`extractedDefects.length > 0`)
  2. If yes: Use extracted defects
  3. If no: Start with empty list (no fake data loaded)

- **Duplicate Prevention**:
  - `loadDefects()` skips creating markers for defects already in the Map
  - GLB markers are preserved when loading new defect data
  - Only non-GLB markers are cleared on reload

### 9. **Marker Update System**
- **updateDefectMarker()** method:
  - Updates severity-based colors without recreating marker
  - Regenerates indicator line with new color
  - Updates material diffuse and emissive colors
  - Preserves GLB mesh integrity (no disposal/recreation)

- **removeDefectMarker()** handling:
  - GLB markers: Hidden (`isVisible = false`) but not disposed
  - Manual markers: Fully disposed
  - Indicator lines always disposed and recreated

---

## Technical Architecture

### File Structure
```
Lidar-Defect-Viewer-/
├── index.html                 # Main HTML structure
├── README.md                  # Project documentation
├── CHANGELOG.md              # This file - version history
├── css/
│   └── style.css             # All styling including defect editing UI
├── js/
│   ├── app.js                # Application logic & UI management
│   └── babylon-smart-renderer.js  # 3D rendering & defect extraction
└── data/
    ├── defects.json          # Sample defect data (no longer loaded by default)
    └── sample-model.json     # Sample model metadata
```

### Key Technologies
- **Babylon.js v8.36.0**: 3D rendering engine with WebGL2
- **StandardMaterial**: Material system for predictable colors
- **JavaScript ES6+**: Modern syntax with async/await
- **CSS3**: Flexbox layouts, custom properties, animations

### Browser Compatibility
- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Supported (WebGL2)
- Mobile: ⚠️ Limited (performance constraints)

---

## Known Limitations

1. **IFC File Support**: 
   - Currently loads GLB format only
   - IFC files must be exported from Blender as GLB with defect markers

2. **Defect Marker Naming Convention**:
   - Must include keywords: `snapshot`, `proxy`, `defect`, `marker`, `sphere`, `ball`, or `point`
   - Case-insensitive but must be in mesh name

3. **Image Storage**:
   - Images stored as data URLs in memory
   - No backend persistence
   - Large images may impact performance

4. **Model Size**:
   - Optimized for models up to ~10MB GLB files
   - Larger models may cause performance issues
   - Automatic scaling targets 10 scene units

---

## API Reference

### BabylonSmartRenderer

#### Methods

**loadGLBFromFile(file, scale)**
```javascript
// Returns: { result: BABYLON.SceneLoaderResult, extractedDefects: Array }
const loadResult = await renderer.loadGLBFromFile(file, 1.0);
```

**loadDefects(defectsData)**
```javascript
// Loads defects, skipping those already registered from GLB
await renderer.loadDefects([defect1, defect2, ...]);
```

**focusOnDefect(defectId)**
```javascript
// Moves camera to focus on specific defect marker
renderer.focusOnDefect("defect_1");
```

**updateDefectMarker(defectData)**
```javascript
// Updates marker appearance (color, line) without recreation
renderer.updateDefectMarker({
  id: "defect_1",
  severity: "critical",
  coordinates: [x, y, z],
  ...
});
```

**removeDefectMarker(defectId)**
```javascript
// Hides GLB markers, disposes manual markers
renderer.removeDefectMarker("defect_1");
```

### DefectViewerApp

#### Methods

**loadGLBModel(file, scale)**
```javascript
// Main entry point for loading models
await app.loadGLBModel(file, 1.0);
```

**showDefectDetails(defectId)**
```javascript
// Shows editable defect details panel
app.showDefectDetails("defect_1");
```

**saveDefectEdits(defectId)**
```javascript
// Saves edited defect data and updates marker
app.saveDefectEdits("defect_1");
```

**focusOnDefect(defectId, event)**
```javascript
// Focus camera on defect (callable from UI)
app.focusOnDefect("defect_1", event);
```

**deleteDefect(defectId, event)**
```javascript
// Removes defect from list and scene
app.deleteDefect("defect_1", event);
```

---

## Workflow Guide

### Exporting from Blender

1. **Create your IFC model** in Blender with BlenderBIM addon
2. **Add defect markers**:
   - Create small spheres/cubes at defect locations
   - Name them with "Snapshot-" prefix (e.g., "IfcBuildingElementProxy/Snapshot-123")
   - Make them visible yellow/golden color
3. **Export as GLB**:
   - File → Export → glTF 2.0 (.glb/.gltf)
   - Format: GLB
   - Include: Cameras, Lights (optional)
   - Ensure defect markers are included

### Loading in Viewer

1. **Open the viewer** in a web browser
2. **Click "Load GLB Model"**
3. **Select your exported .glb file**
4. **Set scale** (default 1.0 is usually fine)
5. **Click "Load"**

### Managing Defects

1. **View extracted defects** in the right panel
2. **Click on a defect** to open details
3. **Edit fields**:
   - Select appropriate type (crack, water-damage, etc.)
   - Set severity (critical, high, medium, low)
   - Add description and notes
   - Upload reference images
4. **Click "Save Changes"**
5. **Use "Focus"** button to navigate to defect location
6. **Use "Delete"** to remove if needed

---

## CSS Classes Reference

### Defect Editing Interface
- `.defect-edit-section`: Container for each editable field
- `.defect-edit-input`: Styled input/select/textarea
- `.defect-images-preview`: Image gallery container
- `.defect-thumbnail`: 100x100px image preview
- `.defect-actions`: Button container (flex layout)
- `.defect-item-actions`: Small action buttons on defect cards

### Severity Badges
- `.severity-critical`: Red background
- `.severity-high`: Orange background
- `.severity-medium`: Yellow background
- `.severity-low`: Green background

---

## Performance Optimizations

1. **Mesh Freezing**: `mesh.freezeWorldMatrix()` for static elements
2. **Bounding Info**: `mesh.doNotSyncBoundingInfo = true` to prevent recalculation
3. **Material Reuse**: Single material per element type
4. **Defect Marker Map**: O(1) lookup using Map instead of array search
5. **Alpha Pre-pass**: `needDepthPrePass` for correct transparency sorting

---

## Future Enhancement Ideas

- [ ] Backend integration for persistent storage
- [ ] Export defect report as PDF
- [ ] Multi-user collaboration features
- [ ] Annotation tools (drawing on model)
- [ ] Measurement tools
- [ ] Compare before/after models
- [ ] Mobile app version
- [ ] AR viewing mode
- [ ] Direct IFC file support (without GLB conversion)
- [ ] Defect filtering by type/severity/date
- [ ] Batch defect operations

---

## Troubleshooting

### Defects not detected
- **Check mesh names** contain keywords: snapshot, proxy, defect, marker, sphere, ball, point
- **Verify meshes are visible** in Blender export settings
- **Check console** for detection messages: "✅ DETECTED AS DEFECT MARKER"

### Focus not working
- **Ensure defects are loaded**: Check "📊 EXTRACTION COMPLETE" in console
- **Verify marker registration**: Look for "✅ Registered GLB mesh" messages
- **Check defectMarkers Map**: Should contain entries with `isFromGLB: true`

### Wrong defect positions
- **Issue resolved** in v1.0.0 with two-pass extraction
- Positions now extracted AFTER all transforms applied
- If still incorrect, check model scale factor

### Transparency not working
- **X-ray mode enabled** automatically on GLB load
- Check that materials have `alpha < 1.0`
- Verify `alphaMode = MATERIAL_ALPHABLEND`

---

## Version History

### v1.0.0 (November 7, 2025)
- ✅ Initial release
- ✅ Automatic defect extraction from GLB
- ✅ Custom building element colors
- ✅ X-ray transparency mode
- ✅ Editable defect management
- ✅ Severity color coding
- ✅ Camera focus system
- ✅ Two-pass coordinate extraction
- ✅ GLB mesh registration (no duplicates)

---

## Credits

**Developed**: November 7, 2025  
**Engine**: Babylon.js v8.36.0  
**Platform**: Web (HTML5 + WebGL2)  
**License**: [Your License Here]

---

## Contact & Support

For questions, issues, or feature requests:
- GitHub: mern64
- Email: m_imran_mohamad@soc.uum.edu.my
- Documentation: See README.md for setup instructions
