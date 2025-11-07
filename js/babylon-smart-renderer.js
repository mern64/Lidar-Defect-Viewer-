class BabylonSmartRenderer {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = null;
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.defectMarkers = new Map();
        this.buildingMeshes = new Map();
        this.transparencyEnabled = true;
        this.xrayMode = true;
        this.defectsVisible = true;
        this.currentModelType = "none";
        this.modelScale = 1.0;
        this.isInitialized = false;
        this.initializationPromise = null;

        // Define building element colors
        this.elementColors = {
            wall: new BABYLON.Color3(1.0, 1.0, 0.8),      // Pale yellow for walls
            floor: new BABYLON.Color3(0.8, 0.95, 0.8),    // Pale green for floors
            door: new BABYLON.Color3(0.3, 0.5, 0.9),      // Blue for doors
            default: new BABYLON.Color3(0.7, 0.55, 0.4)   // Light brown for objects/default
        };
        
        console.log("BabylonSmartRenderer constructor called for canvas:", canvasId);
        this.initializationPromise = this.init();
    }
    
    async init() {
        console.log("Initializing Babylon.js renderer...");
        
        try {
            // Wait for DOM to be fully ready
            if (document.readyState !== 'complete') {
                await new Promise(resolve => window.addEventListener('load', resolve));
            }
            
            // Check if canvas exists
            this.canvas = document.getElementById(this.canvasId);
            if (!this.canvas) {
                console.error("Canvas element not found with id:", this.canvasId);
                throw new Error(`Canvas element not found: ${this.canvasId}`);
            }
            
            console.log("Canvas found, creating engine...");
            
            // Create Babylon.js engine with enhanced options
            this.engine = new BABYLON.Engine(this.canvas, true, {
                preserveDrawingBuffer: true,
                stencil: true,
                antialias: true,
                adaptToDeviceRatio: true
            });
            
            // Create scene with enhanced settings
            this.scene = new BABYLON.Scene(this.engine);
            this.scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 1.0);
            this.scene.useRightHandedSystem = true;  // Match glTF coordinate system
            
            // Enable physically based rendering features
            this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
            this.scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
            this.scene.environmentIntensity = 1.0;
            
            // Create ArcRotateCamera for better orbit and zoom control
            this.camera = new BABYLON.ArcRotateCamera(
                "camera",
                BABYLON.Tools.ToRadians(45),  // alpha (rotation)
                BABYLON.Tools.ToRadians(65),  // beta (elevation)
                10,                           // radius (distance)
                BABYLON.Vector3.Zero(),       // target
                this.scene
            );
            this.camera.attachControl(this.canvas, true);
            
            // Set camera limits and behavior
            this.camera.minZ = 0.1;
            this.camera.lowerRadiusLimit = 1;   // Minimum zoom (closest)
            this.camera.upperRadiusLimit = 100;  // Maximum zoom (furthest)
            this.camera.wheelPrecision = 50;     // Mouse wheel sensitivity
            this.camera.pinchPrecision = 50;     // Touch pinch sensitivity
            this.camera.panningSensibility = 50; // Panning sensitivity
            this.camera.useBouncingBehavior = true; // Smooth bounce at limits
            this.camera.useAutoRotationBehavior = false; // Disable auto-rotation
            
            // Add zoom methods
            this.zoomFactor = 1.2; // Zoom in/out factor per click
            
            // Create lighting
            this.setupLighting();
            
            // Create ground grid
            this.createGrid();
            
            // Set up transparency system
            this.setupTransparencySystem();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Start render loop
            this.engine.runRenderLoop(() => {
                if (this.scene) {
                    this.scene.render();
                    this.updateCameraInfo();
                    this.updateTransparency();
                }
            });
            
            // Handle window resize
            window.addEventListener("resize", () => {
                if (this.engine) {
                    this.engine.resize();
                }
            });
            
            // Handle engine disposal on page unload
            window.addEventListener("beforeunload", () => {
                if (this.engine) {
                    this.engine.dispose();
                }
            });
            
            this.isInitialized = true;
            this.updateModelInfo();
            
            console.log("Babylon.js renderer initialized successfully!");
            return this;
            
        } catch (error) {
            console.error("Error initializing Babylon.js renderer:", error);
            this.isInitialized = false;
            throw error;
        }
    }
    
    // Ensure the renderer is ready before any operations
    async ensureInitialized() {
        if (this.isInitialized) {
            return this;
        }
        
        if (this.initializationPromise) {
            return await this.initializationPromise;
        }
        
        // Re-initialize if needed
        this.initializationPromise = this.init();
        return await this.initializationPromise;
    }
    
    setupTransparencySystem() {
        if (this.camera) {
            this.lastCameraPosition = this.camera.position.clone();
            this.lastCameraTarget = this.camera.target ? this.camera.target.clone() : new BABYLON.Vector3(0, 0, 0);
        }
        this.transparencyUpdateInterval = 30; // Update every 30 frames (less frequent)
        this.frameCount = 0;
    }
    
    updateTransparency() {
        if (!this.transparencyEnabled || !this.xrayMode || !this.isInitialized || !this.camera) {
            console.log('Transparency disabled:', {
                transparencyEnabled: this.transparencyEnabled,
                xrayMode: this.xrayMode,
                isInitialized: this.isInitialized,
                hasCamera: !!this.camera
            });
            return;
        }
        
        this.frameCount++;
        if (this.frameCount < this.transparencyUpdateInterval) return;
        this.frameCount = 0;
        
        // Only update if camera moved or rotated significantly
        if (!this.lastCameraPosition) {
            this.lastCameraPosition = this.camera.position.clone();
            this.lastCameraTarget = this.camera.target ? this.camera.target.clone() : new BABYLON.Vector3(0, 0, 0);
            return;
        }
        
        const cameraMoved = this.lastCameraPosition.subtract(this.camera.position).lengthSquared() > 0.1;
        const cameraRotated = this.lastCameraTarget && this.camera.target ? 
            this.lastCameraTarget.subtract(this.camera.target).lengthSquared() > 0.1 : false;
        
        if (!cameraMoved && !cameraRotated) return;
        
        this.lastCameraPosition = this.camera.position.clone();
        this.lastCameraTarget = this.camera.target ? this.camera.target.clone() : new BABYLON.Vector3(0, 0, 0);
        
        // Update transparency for all building meshes
        this.buildingMeshes.forEach((meshData, elementId) => {
            this.updateMeshTransparency(meshData.mesh);
        });
    }
    
    updateMeshTransparency(mesh) {
        if (!mesh.material || !this.camera) return;
        
        // Skip defect markers
        if (mesh.metadata && mesh.metadata.isDefectMarker) {
            return;
        }
        
        try {
            // Determine mesh type
            let meshType = 'default';
            if (mesh.metadata && mesh.metadata.originalMaterial) {
                meshType = mesh.metadata.originalMaterial.elementType;
            }
            
            // Simple transparency based on element type
            let alpha = 1.0;
            
            if (meshType === 'wall') {
                alpha = 0.2; // All walls very transparent
            } else if (meshType === 'floor') {
                alpha = 0.3; // Floors transparent
            } else if (meshType === 'door') {
                alpha = 0.4; // Doors semi-transparent
            } else {
                alpha = 0.7; // Objects (furniture) more visible
            }
            
            // Apply transparency
            if (mesh.material.alpha !== alpha) {
                mesh.material.alpha = alpha;
                
                // Ensure proper transparency mode
                if (alpha < 0.99) {
                    mesh.material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
                } else {
                    mesh.material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
                }
            }
            
        } catch (error) {
            console.warn("Error updating mesh transparency:", error);
        }
    }
    
    setupLighting() {
        // Clear any existing lights
        this.scene.lights.forEach(light => light.dispose());
        
        // Main hemispheric light for ambient illumination (like online viewers)
        const hemisphericLight = new BABYLON.HemisphericLight(
            "hemisphericLight", 
            new BABYLON.Vector3(0, 1, 0), 
            this.scene
        );
        hemisphericLight.intensity = 0.8;
        hemisphericLight.diffuse = new BABYLON.Color3(1, 1, 1);
        hemisphericLight.specular = new BABYLON.Color3(0.1, 0.1, 0.1);
        hemisphericLight.groundColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        
        // Key directional light from top-right (like studio lighting)
        const keyLight = new BABYLON.DirectionalLight(
            "keyLight", 
            new BABYLON.Vector3(-0.5, -1, -0.5), 
            this.scene
        );
        keyLight.intensity = 0.5;
        keyLight.diffuse = new BABYLON.Color3(1, 1, 1);
        keyLight.specular = new BABYLON.Color3(0.2, 0.2, 0.2);
        
        // Fill light from opposite side (softer)
        const fillLight = new BABYLON.DirectionalLight(
            "fillLight",
            new BABYLON.Vector3(0.5, -0.5, 0.5),
            this.scene
        );
        fillLight.intensity = 0.3;
        fillLight.diffuse = new BABYLON.Color3(0.9, 0.9, 1);
        fillLight.specular = new BABYLON.Color3(0, 0, 0);
        
        // Set scene ambient color for better color preservation
        this.scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    }
    
    createGrid() {
        try {
            // Create ground plane
            const ground = BABYLON.MeshBuilder.CreateGround("ground", {
                width: 100,
                height: 100
            }, this.scene);
            
            const groundMaterial = new BABYLON.GridMaterial("groundMat", this.scene);
            groundMaterial.majorUnitFrequency = 10;
            groundMaterial.minorUnitVisibility = 0.3;
            groundMaterial.gridRatio = 1;
            groundMaterial.backFaceCulling = false;
            groundMaterial.opacity = 0.1;
            ground.material = groundMaterial;
            
            // Create coordinate axes
            this.createAxesHelper(20);
        } catch (error) {
            console.error("Error creating grid:", error);
        }
    }
    
    createAxesHelper(size = 5) {
        try {
            // X-axis (Red)
            const xAxis = BABYLON.MeshBuilder.CreateLines("xAxis", {
                points: [
                    BABYLON.Vector3.Zero(),
                    new BABYLON.Vector3(size, 0, 0)
                ]
            }, this.scene);
            xAxis.color = new BABYLON.Color3(1, 0, 0);
            
            // Y-axis (Green)
            const yAxis = BABYLON.MeshBuilder.CreateLines("yAxis", {
                points: [
                    BABYLON.Vector3.Zero(),
                    new BABYLON.Vector3(0, size, 0)
                ]
            }, this.scene);
            yAxis.color = new BABYLON.Color3(0, 1, 0);
            
            // Z-axis (Blue)
            const zAxis = BABYLON.MeshBuilder.CreateLines("zAxis", {
                points: [
                    BABYLON.Vector3.Zero(),
                    new BABYLON.Vector3(0, 0, size)
                ]
            }, this.scene);
            zAxis.color = new BABYLON.Color3(0, 0, 1);
        } catch (error) {
            console.error("Error creating axes helper:", error);
        }
    }
    
    setupEventHandlers() {
        try {
            // Click event for defect placement
            this.scene.onPointerObservable.add((pointerInfo) => {
                switch (pointerInfo.type) {
                    case BABYLON.PointerEventTypes.POINTERPICK:
                        if (pointerInfo.pickInfo.hit) {
                            const point = pointerInfo.pickInfo.pickedPoint;
                            this.onDefectLocationSelected(point);
                        }
                        break;
                }
            });
        } catch (error) {
            console.error("Error setting up event handlers:", error);
        }
    }
    
    onDefectLocationSelected(coordinates) {
        console.log("Defect location selected in renderer:", coordinates);
        const event = new CustomEvent('defectLocationSelected', {
            detail: { 
                coordinates: [coordinates.x, coordinates.y, coordinates.z] 
            }
        });
        document.dispatchEvent(event);
    }
    
    async loadModel(modelData) {
        await this.ensureInitialized();
        
        if (modelData.model_type === "glb" && modelData.model_path) {
            // Load GLB model
            return await this.loadGLBModel(modelData.model_path, modelData.scale || 1.0);
        } else {
            // Load procedural model
            return await this.loadProceduralModel(modelData);
        }
    }
    
    async loadGLBModel(modelPath, scale = 1.0) {
        await this.ensureInitialized();
        
        try {
            this.showLoading("Loading GLB model...");
            
            // Clear existing model
            this.clearModel();
            
            // Setup environment for PBR materials
            const envTexture = new BABYLON.CubeTexture(
                "https://playground.babylonjs.com/textures/environmentSpecular.env",
                this.scene
            );
            this.scene.environmentTexture = envTexture;
            this.scene.createDefaultSkybox(envTexture, true, 1000);
            this.scene.environmentIntensity = 1.0;
            
            this.modelScale = scale;
            this.currentModelType = "glb";
            
            console.log("Loading GLB model from:", modelPath);
            const { rootUrl, fileName } = this.resolveAssetPath(modelPath);
            const pluginExtension = this.getFileExtensionHint(modelPath) || ".glb";
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "",
                rootUrl,
                fileName,
                this.scene,
                undefined,
                pluginExtension
            );
            
            console.log("GLB model loaded successfully:", result);
            
            // Apply scale and settings to loaded meshes
            result.meshes.forEach(mesh => {
                if (mesh !== result.meshes[0]) { // Don't scale the root node
                    mesh.scaling.scaleInPlace(scale);
                }
                
                if (mesh.material) {
                    // Enable transparency for X-ray effect
                    mesh.material.alpha = 0.7;
                    mesh.material.backFaceCulling = false;
                    
                    // Store original material for reference
                    mesh.metadata = {
                        ...mesh.metadata,
                        originalMaterial: mesh.material,
                        elementId: mesh.name || "unknown",
                        isGLB: true
                    };
                }
                
                // Enable picking for defect placement
                mesh.isPickable = true;
                
                // Store reference for transparency management
                this.buildingMeshes.set(mesh.name || `mesh_${Date.now()}`, {
                    mesh: mesh,
                    elementData: {
                        id: mesh.name,
                        type: "GLB_Mesh",
                        name: mesh.name
                    }
                });
            });
            
            // Fit model to view
            this.fitModelToView();
            
            // Apply X-ray mode
            this.applyXRayMode();
            
            this.updateModelInfo();
            this.hideLoading();
            
            return result;
            
        } catch (error) {
            console.error("Error loading GLB model:", error);
            this.hideLoading();
            throw error;
        }
    }
    
    async loadGLBFromFile(file, userScale = 1.0) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            try {
                this.showLoading("Loading GLB model and calculating proper scale...");
                
                // Clear existing model
                this.clearModel();
                
                this.currentModelType = "glb";
                
                // We'll set the actual scale after analyzing the model size
                
                console.log("Creating object URL for file:", file.name);
                const objectURL = URL.createObjectURL(file);
                console.log("Loading GLB from object URL...");
                const pluginExtension = this.getFileExtensionHint(file.name) || ".glb";
                
                BABYLON.SceneLoader.ImportMeshAsync(
                    "",
                    "",
                    objectURL,
                    this.scene,
                    undefined,
                    pluginExtension
                ).then(result => {
                    console.log("GLB file loaded successfully:", result);
                    
                    try {
                        // Calculate appropriate scale and position based on model size
                        let computedScale = 1.0;
                        if (result.meshes.length > 0) {
                            // Get the overall bounds of the model
                            let minBox = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
                            let maxBox = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
                            
                            result.meshes.forEach(mesh => {
                                const boundingBox = mesh.getBoundingInfo().boundingBox;
                                minBox = BABYLON.Vector3.Minimize(minBox, boundingBox.minimumWorld);
                                maxBox = BABYLON.Vector3.Maximize(maxBox, boundingBox.maximumWorld);
                            });
                            
                            // Calculate model dimensions
                            const size = maxBox.subtract(minBox);
                            const maxDimension = Math.max(size.x, size.y, size.z);
                            
                            // Target a reasonable size in scene units
                            const targetSize = 10;
                            computedScale = targetSize / maxDimension;
                            
                            console.log(`Model natural size: ${maxDimension}, computed scale: ${computedScale}`);
                            
                            // Apply scale and position adjustment to root node
                            const rootNode = result.meshes[0];
                            if (rootNode) {
                                // Apply scale uniformly
                                rootNode.scaling = new BABYLON.Vector3(computedScale, computedScale, computedScale);
                                
                                // Calculate the scaled bounding box
                                let scaledMin = minBox.multiply(new BABYLON.Vector3(computedScale, computedScale, computedScale));
                                
                                // Calculate required Y offset to place bottom of model at ground level
                                const yOffset = -scaledMin.y;
                                
                                // Adjust position to place model on ground
                                rootNode.position = new BABYLON.Vector3(0, yOffset, 0);
                                
                                console.log(`Adjusting model Y position by ${yOffset} units to align with ground`);
                            }
                        }
                        
                        // Array to store extracted defect positions
                        const extractedDefects = [];
                        let defectCounter = 1;
                        
                        // First pass: Apply materials and identify defect markers (but don't extract positions yet)
                        const defectMarkerMeshes = [];
                        
                        result.meshes.forEach(mesh => {
                            if (mesh.material) {
                                // Determine element type from mesh name or metadata
                                const meshName = mesh.name.toLowerCase();
                                let elementType = 'default';
                                let isDefectMarker = false;
                                
                                console.log('Processing mesh:', mesh.name, ' -> lowercase:', meshName);
                                
                                // First check mesh name for common defect marker patterns
                                if (meshName.includes('defect') || meshName.includes('marker') || 
                                    meshName.includes('issue') || meshName.includes('sphere') ||
                                    meshName.includes('ball') || meshName.includes('point') ||
                                    meshName.includes('snapshot') || meshName.includes('proxy')) {
                                    isDefectMarker = true;
                                    console.log('  ✅ DETECTED AS DEFECT MARKER BY NAME PATTERN!');
                                } else {
                                    console.log('  ❌ NOT a defect marker (name check)');
                                }
                                
                                // Also check by geometry - small spherical objects
                                if (!isDefectMarker && mesh.getTotalVertices() > 0 && mesh.getTotalVertices() < 1000) {
                                    const boundingBox = mesh.getBoundingInfo().boundingBox;
                                    const meshSize = boundingBox.maximumWorld.subtract(boundingBox.minimumWorld);
                                    const avgSize = (meshSize.x + meshSize.y + meshSize.z) / 3;
                                    const variance = Math.abs(meshSize.x - avgSize) + Math.abs(meshSize.y - avgSize) + Math.abs(meshSize.z - avgSize);
                                    
                                    // Small spherical object (dimensions similar and small)
                                    if (variance < avgSize * 0.5 && avgSize < 0.5) {
                                        // Check material color for yellow/golden
                                        const mat = mesh.material;
                                        if (mat) {
                                            let isYellow = false;
                                            
                                            // Check different material types
                                            if (mat.albedoColor) {
                                                const color = mat.albedoColor;
                                                isYellow = (color.r > 0.6 && color.g > 0.5 && color.b < 0.4);
                                            } else if (mat.diffuseColor) {
                                                const color = mat.diffuseColor;
                                                isYellow = (color.r > 0.6 && color.g > 0.5 && color.b < 0.4);
                                            } else if (mat.emissiveColor) {
                                                const color = mat.emissiveColor;
                                                isYellow = (color.r > 0.6 && color.g > 0.5 && color.b < 0.4);
                                            }
                                            
                                            if (isYellow) {
                                                isDefectMarker = true;
                                                console.log('  -> Detected as defect marker by geometry and color');
                                            }
                                        }
                                    }
                                }
                                
                                if (!isDefectMarker) {
                                    // Process as building element
                                    // First try name-based detection
                                    if (meshName.includes('wall') || meshName.includes('wand') || meshName.includes('mur')) {
                                        elementType = 'wall';
                                    } else if (meshName.includes('floor') || meshName.includes('slab') || 
                                              meshName.includes('boden') || meshName.includes('sol') ||
                                              meshName.includes('ground')) {
                                        elementType = 'floor';
                                    } else if (meshName.includes('door') || meshName.includes('tür') || 
                                              meshName.includes('porte') || meshName.includes('entrada')) {
                                        elementType = 'door';
                                    } else {
                                        // If name doesn't match, try geometry-based detection
                                        const boundingBox = mesh.getBoundingInfo().boundingBox;
                                        const size = boundingBox.maximumWorld.subtract(boundingBox.minimumWorld);
                                        const minY = boundingBox.minimumWorld.y;
                                        const maxY = boundingBox.maximumWorld.y;
                                        
                                        console.log(`  -> Size: X=${size.x.toFixed(2)}, Y=${size.y.toFixed(2)}, Z=${size.z.toFixed(2)}, MinY=${minY.toFixed(2)}`);
                                        
                                        // Floor detection: thin horizontal surface near the bottom (Y close to 0)
                                        if (size.y < 0.15 && minY < 0.5) {
                                            elementType = 'floor';
                                        }
                                        // Wall detection: tall vertical surface (height > 2.5 or much taller than width/depth)
                                        else if ((size.y > 2.5 && Math.min(size.x, size.z) < 0.5) || 
                                                (size.y > Math.max(size.x, size.z) * 3)) {
                                            elementType = 'wall';
                                        }
                                        // Door detection: vertical rectangle, moderate height (1.8-2.5m tall, thin)
                                        else if (size.y > 1.8 && size.y < 2.5 && Math.min(size.x, size.z) < 0.2) {
                                            elementType = 'door';
                                        }
                                    }
                                    
                                    console.log(`  -> Detected type: ${elementType}`);

                                    // Create standard material for better color rendering
                                    const mat = new BABYLON.StandardMaterial(mesh.name + "_material", this.scene);
                                    
                                    // Set material properties
                                    const color = this.elementColors[elementType] || this.elementColors.default;
                                    mat.diffuseColor = color;
                                    mat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Subtle specular
                                    mat.ambientColor = color.scale(0.3); // Add ambient for better color
                                    console.log(`  -> Applying color:`, color);
                                    
                                    // Set transparency mode for X-ray support
                                    if (this.xrayMode) {
                                        mat.alpha = 0.7; // More opaque initially
                                        mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
                                    } else {
                                        mat.alpha = 1;
                                        mat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
                                    }
                                    
                                    mat.backFaceCulling = false;  // Show both sides
                                    mat.twoSidedLighting = true;

                                    // Store original color for reference
                                    const originalProps = {
                                        elementType: elementType,
                                        color: this.elementColors[elementType].clone(),
                                        alpha: 1
                                    };

                                    // Replace original material
                                    mesh.material = mat;
                                    
                                    // Enhance PBR properties if available
                                    if (mesh.material.albedoTexture) {
                                        mesh.material.useAlphaFromAlbedoTexture = true;
                                    }
                                    
                                    // Store reference to original state
                                    mesh.metadata = {
                                        ...mesh.metadata,
                                        originalMaterial: originalProps,
                                        elementId: mesh.name || "unknown",
                                        isGLB: true
                                    };
                                } else {
                                    // This is a defect marker - store it for later extraction
                                    console.log('  🎯 DEFECT MARKER IDENTIFIED! Will extract position after transforms...');
                                    
                                    // Tag the mesh temporarily
                                    mesh.metadata = {
                                        ...mesh.metadata,
                                        isDefectMarker: true,
                                        elementId: mesh.name || "unknown",
                                        tempDefectId: `defect_${defectCounter}`
                                    };
                                    
                                    defectMarkerMeshes.push(mesh);
                                    defectCounter++;
                                }
                            }
                            
                            // Enable picking and optimize mesh
                            mesh.isPickable = true;
                            mesh.freezeWorldMatrix(); // Optimize static meshes
                            mesh.doNotSyncBoundingInfo = true;
                            
                            // Store reference for transparency management
                            this.buildingMeshes.set(mesh.name || `mesh_${Date.now()}`, {
                                mesh: mesh,
                                elementData: {
                                    id: mesh.name,
                                    type: "GLB_Mesh",
                                    name: mesh.name
                                }
                            });
                        });
                        
                        // Second pass: Now extract defect positions AFTER all transforms are applied
                        console.log(`=== Second pass: Extracting ${defectMarkerMeshes.length} defect positions ===`);
                        defectMarkerMeshes.forEach(mesh => {
                            // Now get the position with all transforms applied
                            const position = mesh.getAbsolutePosition();
                            const defectId = mesh.metadata.tempDefectId;
                            
                            console.log(`  🎯 EXTRACTING position for ${defectId} at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
                            
                            // Create defect data object with correct position
                            const defectData = {
                                id: defectId,
                                type: "Unknown",
                                severity: "medium",
                                description: `Defect marker detected at ${mesh.name}`,
                                coordinates: [position.x, position.y, position.z],
                                element_id: mesh.name,
                                date_reported: new Date().toISOString().split('T')[0],
                                status: "pending",
                                notes: "",
                                images: []
                            };
                            
                            extractedDefects.push(defectData);
                            
                            // Update mesh metadata with final defect ID
                            mesh.metadata.defectId = defectId;
                            delete mesh.metadata.tempDefectId;
                            
                            // Create indicator line to ground
                            const line = BABYLON.MeshBuilder.CreateLines(`defect_line_${defectId}`, {
                                points: [
                                    new BABYLON.Vector3(position.x, position.y, position.z),
                                    new BABYLON.Vector3(position.x, 0, position.z)
                                ]
                            }, this.scene);
                            line.color = this.getSeverityColor(defectData.severity);
                            
                            // Store the GLB mesh as the marker
                            this.defectMarkers.set(defectId, {
                                marker: mesh,
                                line: line,
                                defectData: defectData,
                                isFromGLB: true
                            });
                            
                            console.log(`  ✅ Registered GLB mesh with correct position: ${defectId}`);
                        });
                        
                        // Fit model to view
                        this.fitModelToView();
                        
                        // Apply X-ray mode
                        this.applyXRayMode();
                        
                        this.updateModelInfo();
                        this.hideLoading();
                        
                        console.log('==============================================');
                        console.log(`📊 EXTRACTION COMPLETE: Found ${extractedDefects.length} defect markers`);
                        console.log('Extracted defects:', extractedDefects);
                        console.log('==============================================');
                        
                        resolve({
                            result: result,
                            extractedDefects: extractedDefects
                        });
                    } catch (processingError) {
                        this.hideLoading();
                        reject(new Error(`Error processing GLB file: ${processingError.message}`));
                    } finally {
                        URL.revokeObjectURL(objectURL);
                    }
                }).catch(loadError => {
                    URL.revokeObjectURL(objectURL);
                    this.hideLoading();
                    console.error("Failed to load GLB file:", loadError);
                    reject(new Error(`Failed to load GLB file: ${loadError.message || loadError}`));
                });
                
            } catch (error) {
                console.error("Error in loadGLBFromFile:", error);
                this.hideLoading();
                reject(error);
            }
        });
    }
    
    async loadIFCFromFile(file, scale = 1.0, extractDefects = true) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log("Creating object URL for file:", file.name);
                const objectURL = URL.createObjectURL(file);
                console.log("Loading IFC from object URL...");
                
                this.showLoading();
                
                // Clear existing model
                this.clearModel();
                
                // Read the IFC file as text
                const text = await file.text();
                
                // Use Babylon.js to import the IFC file
                // Note: IFC files need to be converted to a format Babylon can read
                // For now, we'll use a workaround by treating it as a scene file
                
                BABYLON.SceneLoader.ImportMeshAsync("", "", `data:${text}`, this.scene, null, ".ifc").then(result => {
                    try {
                        console.log("IFC file loaded successfully:", result);
                        
                        this.currentModelType = "ifc";
                        let extractedDefects = [];
                        
                        // Calculate bounding box for scaling
                        let minBox = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
                        let maxBox = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
                        
                        result.meshes.forEach(mesh => {
                            const boundingBox = mesh.getBoundingInfo().boundingBox;
                            minBox = BABYLON.Vector3.Minimize(minBox, boundingBox.minimumWorld);
                            maxBox = BABYLON.Vector3.Maximize(maxBox, boundingBox.maximumWorld);
                        });
                        
                        // Calculate model dimensions and scale
                        const size = maxBox.subtract(minBox);
                        const maxDimension = Math.max(size.x, size.y, size.z);
                        const targetSize = 10;
                        const computedScale = (targetSize / maxDimension) * scale;
                        
                        console.log(`IFC model natural size: ${maxDimension}, computed scale: ${computedScale}`);
                        
                        // Apply scale and position to root node
                        const rootNode = result.meshes[0];
                        if (rootNode) {
                            rootNode.scaling = new BABYLON.Vector3(computedScale, computedScale, computedScale);
                            const scaledMin = minBox.multiply(new BABYLON.Vector3(computedScale, computedScale, computedScale));
                            const yOffset = -scaledMin.y;
                            rootNode.position = new BABYLON.Vector3(0, yOffset, 0);
                            console.log(`Adjusting IFC model Y position by ${yOffset} units to align with ground`);
                        }
                        
                        // Process meshes
                        result.meshes.forEach(mesh => {
                            if (mesh.material) {
                                const meshName = mesh.name.toLowerCase();
                                let elementType = 'default';
                                let isDefectMarker = false;
                                
                                // Check if this is a defect marker (sphere with yellow/golden color)
                                if (extractDefects && mesh.getTotalVertices() < 1000) {
                                    // Check if it's sphere-like (roughly equal dimensions)
                                    const boundingBox = mesh.getBoundingInfo().boundingBox;
                                    const meshSize = boundingBox.maximumWorld.subtract(boundingBox.minimumWorld);
                                    const avgSize = (meshSize.x + meshSize.y + meshSize.z) / 3;
                                    const variance = Math.abs(meshSize.x - avgSize) + Math.abs(meshSize.y - avgSize) + Math.abs(meshSize.z - avgSize);
                                    
                                    // If dimensions are similar (low variance) and small, likely a sphere marker
                                    if (variance < avgSize * 0.5 && avgSize < 0.5) {
                                        // Check material color
                                        const mat = mesh.material;
                                        if (mat.diffuseColor) {
                                            const color = mat.diffuseColor;
                                            // Check if color is yellowish (high R and G, low B)
                                            if (color.r > 0.7 && color.g > 0.6 && color.b < 0.5) {
                                                isDefectMarker = true;
                                            }
                                        }
                                    }
                                }
                                
                                if (isDefectMarker) {
                                    // Extract defect information
                                    const position = mesh.getAbsolutePosition();
                                    extractedDefects.push({
                                        id: `defect_ifc_${extractedDefects.length + 1}`,
                                        type: "Unknown",
                                        severity: "medium",
                                        description: `Defect marker from IFC file`,
                                        coordinates: {
                                            x: position.x,
                                            y: position.y,
                                            z: position.z
                                        },
                                        element_id: mesh.name,
                                        date_reported: new Date().toISOString().split('T')[0]
                                    });
                                    
                                    // Hide or remove the original marker mesh
                                    mesh.isVisible = false;
                                    console.log(`Extracted defect marker at position:`, position);
                                } else {
                                    // Apply element colors to building components
                                    // Detect element type
                                    if (meshName.includes('wall') || meshName.includes('wand') || meshName.includes('mur')) {
                                        elementType = 'wall';
                                    } else if (meshName.includes('floor') || meshName.includes('slab') || 
                                              meshName.includes('boden') || meshName.includes('sol') || meshName.includes('ground')) {
                                        elementType = 'floor';
                                    } else if (meshName.includes('door') || meshName.includes('tür') || 
                                              meshName.includes('porte') || meshName.includes('entrada')) {
                                        elementType = 'door';
                                    } else {
                                        // Geometry-based detection
                                        const boundingBox = mesh.getBoundingInfo().boundingBox;
                                        const size = boundingBox.maximumWorld.subtract(boundingBox.minimumWorld);
                                        const minY = boundingBox.minimumWorld.y;
                                        
                                        if (size.y < 0.15 && minY < 0.5) {
                                            elementType = 'floor';
                                        } else if ((size.y > 2.5 && Math.min(size.x, size.z) < 0.5) || 
                                                  (size.y > Math.max(size.x, size.z) * 3)) {
                                            elementType = 'wall';
                                        } else if (size.y > 1.8 && size.y < 2.5 && Math.min(size.x, size.z) < 0.2) {
                                            elementType = 'door';
                                        }
                                    }
                                    
                                    // Create PBR material with colors
                                    const pbr = new BABYLON.PBRMaterial(mesh.name + "_material", this.scene);
                                    const color = this.elementColors[elementType] || this.elementColors.default;
                                    pbr.albedoColor = color;
                                    pbr.roughness = 0.4;
                                    pbr.metallic = 0.1;
                                    pbr.transparencyMode = BABYLON.Material.MATERIAL_ALPHATEST;
                                    pbr.backFaceCulling = true;
                                    pbr.twoSidedLighting = true;
                                    pbr.alpha = 1;
                                    
                                    mesh.material = pbr;
                                    mesh.metadata = {
                                        ...mesh.metadata,
                                        originalMaterial: {
                                            elementType: elementType,
                                            color: color.clone(),
                                            alpha: 1
                                        },
                                        elementId: mesh.name || "unknown",
                                        isIFC: true
                                    };
                                }
                            }
                            
                            // Enable picking
                            mesh.isPickable = true;
                            
                            // Store reference for transparency management
                            if (!isDefectMarker) {
                                this.buildingMeshes.set(mesh.name || `mesh_${Date.now()}`, {
                                    mesh: mesh,
                                    elementData: {
                                        id: mesh.name,
                                        type: "IFC_Element",
                                        name: mesh.name
                                    }
                                });
                            }
                        });
                        
                        console.log(`Extracted ${extractedDefects.length} defect markers from IFC file`);
                        
                        // Fit model to view
                        this.fitModelToView();
                        
                        // Apply X-ray mode
                        this.applyXRayMode();
                        
                        this.updateModelInfo();
                        this.hideLoading();
                        
                        resolve({
                            result: result,
                            extractedDefects: extractedDefects
                        });
                    } catch (processingError) {
                        this.hideLoading();
                        reject(new Error(`Error processing IFC file: ${processingError.message}`));
                    } finally {
                        URL.revokeObjectURL(objectURL);
                    }
                }).catch(loadError => {
                    URL.revokeObjectURL(objectURL);
                    this.hideLoading();
                    console.error("Failed to load IFC file:", loadError);
                    reject(new Error(`Failed to load IFC file: ${loadError.message || loadError}. Note: IFC support requires a compatible loader.`));
                });
                
            } catch (error) {
                console.error("Error in loadIFCFromFile:", error);
                this.hideLoading();
                reject(error);
            }
        });
    }

    resolveAssetPath(assetPath) {
        if (!assetPath) {
            return { rootUrl: "", fileName: "" };
        }
        const trimmed = assetPath.trim();
        const normalized = trimmed.replace(/\\/g, "/");
        // Absolute or blob/data URLs can be passed directly as filename
        if (normalized.startsWith("blob:") || normalized.startsWith("data:")) {
            return { rootUrl: "", fileName: normalized };
        }
        const isAbsolute = /^[a-zA-Z]+:\/\//.test(normalized);
        const queryIndex = normalized.indexOf("?");
        const hashIndex = normalized.indexOf("#");
        const cutIndex = queryIndex !== -1 ? queryIndex : (hashIndex !== -1 ? hashIndex : normalized.length);
        const basePath = normalized.slice(0, cutIndex);
        const suffix = normalized.slice(cutIndex);
        const lastSlash = basePath.lastIndexOf("/");
        if (lastSlash === -1) {
            return { rootUrl: "", fileName: normalized };
        }
        const rootUrl = basePath.slice(0, lastSlash + 1);
        const fileName = basePath.slice(lastSlash + 1) + suffix;
        if (isAbsolute) {
            return { rootUrl, fileName };
        }
        return { rootUrl, fileName };
    }

    getFileExtensionHint(fileName) {
        if (!fileName) {
            return undefined;
        }
        const normalized = fileName.toLowerCase().split('?')[0].split('#')[0];
        const lower = normalized;
        if (lower.endsWith(".glb")) {
            return ".glb";
        }
        if (lower.endsWith(".gltf")) {
            return ".gltf";
        }
        return undefined;
    }
    
    async loadProceduralModel(modelData) {
        await this.ensureInitialized();
        
        try {
            this.showLoading("Creating procedural model...");
            
            // Clear existing model
            this.clearModel();
            
            this.currentModelType = "procedural";
            
            // Create building elements
            modelData.geometry.forEach(element => {
                this.createSmartElementMesh(element);
            });
            
            // Center the model in view
            this.fitModelToView();
            
            // Apply initial transparency
            this.applyXRayMode();
            
            this.updateModelInfo();
            this.hideLoading();
            
        } catch (error) {
            console.error("Error loading procedural model:", error);
            this.hideLoading();
            throw error;
        }
    }
    
    createSmartElementMesh(element) {
        try {
            let mesh;
            const elementType = element.type.toLowerCase();
            
            // Use provided dimensions or default ones
            const dimensions = element.dimensions || [2, 2, 2];
            
            if (elementType.includes('wall')) {
                mesh = BABYLON.MeshBuilder.CreateBox(`element_${element.id}`, {
                    width: dimensions[0],
                    height: dimensions[1],
                    depth: dimensions[2]
                }, this.scene);
            } else if (elementType.includes('slab') || elementType.includes('floor')) {
                mesh = BABYLON.MeshBuilder.CreateBox(`element_${element.id}`, {
                    width: dimensions[0],
                    height: dimensions[1],
                    depth: dimensions[2]
                }, this.scene);
            } else {
                mesh = BABYLON.MeshBuilder.CreateBox(`element_${element.id}`, {
                    width: dimensions[0],
                    height: dimensions[1],
                    depth: dimensions[2]
                }, this.scene);
            }
            
            // Position the element
            mesh.position = new BABYLON.Vector3(
                element.position[0],
                element.position[1],
                element.position[2]
            );
            
            // Create material
            const material = new BABYLON.StandardMaterial(`${element.id}_mat`, this.scene);
            material.diffuseColor = new BABYLON.Color3(
                element.color[0],
                element.color[1],
                element.color[2]
            );
            material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            material.alpha = 0.7;
            material.backFaceCulling = false;
            
            mesh.material = material;
            mesh.metadata = {
                elementId: element.id,
                elementType: element.type,
                name: element.name,
                originalColor: element.color,
                isGLB: false
            };
            
            // Enable picking
            mesh.isPickable = true;
            
            // Store reference
            this.buildingMeshes.set(element.id, {
                mesh: mesh,
                elementData: element
            });
            
            return mesh;
            
        } catch (error) {
            console.error('Error creating element mesh:', error);
            return null;
        }
    }
    
    async loadDefects(defectsData) {
        await this.ensureInitialized();
        
        // Don't clear existing defects from GLB - only clear manually added ones
        // Clear only markers that are not from GLB
        const markersToRemove = [];
        this.defectMarkers.forEach((markerData, id) => {
            if (!markerData.isFromGLB) {
                markersToRemove.push(id);
            }
        });
        markersToRemove.forEach(id => {
            const markerData = this.defectMarkers.get(id);
            if (markerData) {
                markerData.marker?.dispose();
                markerData.line?.dispose();
                this.defectMarkers.delete(id);
            }
        });
        
        // Add defect markers only for defects not already in the map
        defectsData.forEach(defect => {
            if (!this.defectMarkers.has(defect.id)) {
                this.addDefectMarker(defect);
            } else {
                console.log(`Skipping marker creation for ${defect.id} - already registered from GLB`);
            }
        });
        
        console.log(`Loaded ${defectsData.length} defects (${this.defectMarkers.size} total markers)`);
    }
    
    addDefectMarker(defectData) {
        if (!this.defectsVisible || !this.isInitialized) return;
        
        try {
            const [x, y, z] = defectData.coordinates;
            
            // Create defect marker (sphere)
            const marker = BABYLON.MeshBuilder.CreateSphere(`defect_${defectData.id}`, {
                diameter: 0.4,
                segments: 32
            }, this.scene);
            
            marker.position = new BABYLON.Vector3(x, y, z);
            
            // Create glowing material
            const material = new BABYLON.StandardMaterial(`defect_mat_${defectData.id}`, this.scene);
            material.diffuseColor = this.getSeverityColor(defectData.severity);
            material.specularColor = new BABYLON.Color3(1, 1, 1);
            material.emissiveColor = this.getSeverityColor(defectData.severity);
            material.alpha = 0.9;
            
            marker.material = material;
            marker.metadata = { 
                defectId: defectData.id,
                defectData: defectData
            };
            
            // Add pulsing animation
            this.addGlowAnimation(marker);
            
            // Create indicator line to ground
            const line = BABYLON.MeshBuilder.CreateLines(`defect_line_${defectData.id}`, {
                points: [
                    new BABYLON.Vector3(x, y, z),
                    new BABYLON.Vector3(x, 0, z)
                ]
            }, this.scene);
            line.color = this.getSeverityColor(defectData.severity);
            
            // Store reference
            this.defectMarkers.set(defectData.id, { 
                marker: marker, 
                line: line,
                defectData: defectData
            });
        } catch (error) {
            console.error("Error adding defect marker:", error);
        }
    }
    
    addGlowAnimation(mesh) {
        try {
            // Scale animation
            const scaleAnimation = new BABYLON.Animation(
                "scalePulse",
                "scaling",
                30,
                BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            
            const scaleKeys = [
                { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
                { frame: 15, value: new BABYLON.Vector3(1.3, 1.3, 1.3) },
                { frame: 30, value: new BABYLON.Vector3(1, 1, 1) }
            ];
            
            scaleAnimation.setKeys(scaleKeys);
            mesh.animations.push(scaleAnimation);
            this.scene.beginAnimation(mesh, 0, 30, true);
        } catch (error) {
            console.error("Error adding glow animation:", error);
        }
    }
    
    getSeverityColor(severity) {
        const colors = {
            'critical': new BABYLON.Color3(1, 0, 0),     // Red
            'high': new BABYLON.Color3(1, 0.5, 0),       // Orange
            'medium': new BABYLON.Color3(1, 1, 0),       // Yellow
            'low': new BABYLON.Color3(0, 1, 0)           // Green
        };
        return colors[severity.toLowerCase()] || new BABYLON.Color3(1, 1, 1);
    }
    
    removeDefectMarker(defectId) {
        const markerData = this.defectMarkers.get(defectId);
        if (markerData) {
            try {
                // Don't dispose GLB markers, just hide them
                if (markerData.isFromGLB) {
                    markerData.marker.isVisible = false;
                } else {
                    markerData.marker.dispose();
                }
                markerData.line.dispose();
            } catch (error) {
                console.warn("Error disposing defect marker:", error);
            }
            this.defectMarkers.delete(defectId);
        }
    }
    
    updateDefectMarker(defectData) {
        const markerData = this.defectMarkers.get(defectData.id);
        if (markerData) {
            // Update the line color
            if (markerData.line) {
                markerData.line.dispose();
            }
            const [x, y, z] = defectData.coordinates;
            const line = BABYLON.MeshBuilder.CreateLines(`defect_line_${defectData.id}`, {
                points: [
                    new BABYLON.Vector3(x, y, z),
                    new BABYLON.Vector3(x, 0, z)
                ]
            }, this.scene);
            line.color = this.getSeverityColor(defectData.severity);
            markerData.line = line;
            
            // Update marker material color
            const marker = markerData.marker;
            if (marker && marker.material) {
                const material = marker.material;
                const newColor = this.getSeverityColor(defectData.severity);
                material.diffuseColor = newColor;
                material.emissiveColor = newColor;
            }
            
            // Update stored defect data
            markerData.defectData = defectData;
            
            console.log(`Updated marker appearance for ${defectData.id} with severity ${defectData.severity}`);
        }
    }
    
    clearDefects() {
        this.defectMarkers.forEach((markerData, defectId) => {
            try {
                markerData.marker.dispose();
                markerData.line.dispose();
            } catch (error) {
                console.warn("Error disposing defect marker:", error);
            }
        });
        this.defectMarkers.clear();
    }
    
    clearModel() {
        // Remove all building meshes (except ground and axes)
        this.buildingMeshes.forEach((meshData, elementId) => {
            if (meshData.mesh.name !== "ground" && 
                !meshData.mesh.name.startsWith("xAxis") &&
                !meshData.mesh.name.startsWith("yAxis") &&
                !meshData.mesh.name.startsWith("zAxis")) {
                try {
                    meshData.mesh.dispose();
                } catch (error) {
                    console.warn("Error disposing mesh:", error);
                }
            }
        });
        this.buildingMeshes.clear();
        
        // Remove defect markers
        this.clearDefects();
        
        this.currentModelType = "none";
        this.updateModelInfo();
    }
    
    toggleDefectsVisibility() {
        this.defectsVisible = !this.defectsVisible;
        
        this.defectMarkers.forEach((markerData, defectId) => {
            markerData.marker.setEnabled(this.defectsVisible);
            markerData.line.setEnabled(this.defectsVisible);
        });
        
        return this.defectsVisible;
    }
    
    toggleXRayMode() {
        this.xrayMode = !this.xrayMode;
        this.applyXRayMode();
        return this.xrayMode;
    }
    
    applyXRayMode() {
        this.buildingMeshes.forEach((meshData, elementId) => {
            if (meshData.mesh.material) {
                const material = meshData.mesh.material;
                
                // Skip defect markers
                if (meshData.mesh.metadata && meshData.mesh.metadata.isDefectMarker) {
                    return;
                }
                
                if (this.xrayMode) {
                    // Enable transparency for X-ray mode
                    material.alpha = 0.3;  // More transparent for better X-ray effect
                    material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
                    
                    // For PBR materials, also adjust these properties
                    if (material.albedoColor) {
                        material.useAlphaFromAlbedoTexture = true;
                    }
                } else {
                    // Restore to opaque
                    material.alpha = 1.0;
                    material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
                }
                
                // Force material update
                material.markDirty(BABYLON.Material.MiscDirtyFlag);
            }
        });
        
        console.log(`X-ray mode ${this.xrayMode ? 'enabled' : 'disabled'}`);
    }
    
    setTopView() {
        if (!this.scene || this.buildingMeshes.size === 0) return;

        // Calculate model bounds
        let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
        let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
        
        this.buildingMeshes.forEach(({ mesh }) => {
            const boundingBox = mesh.getBoundingInfo().boundingBox;
            min = BABYLON.Vector3.Minimize(min, boundingBox.minimumWorld);
            max = BABYLON.Vector3.Maximize(max, boundingBox.maximumWorld);
        });

        // Calculate center and size
        const center = min.add(max).scale(0.5);
        const size = max.subtract(min);
        const maxDimension = Math.max(size.x, size.z); // Only consider horizontal dimensions
        const height = size.y;

        if (this.camera) {
            // Position camera above model center
            const distance = Math.max(maxDimension * 1.2, height * 2); // Ensure we can see the whole model
            this.camera.position = new BABYLON.Vector3(
                center.x,
                center.y + distance,
                center.z
            );
            this.camera.setTarget(center);
        }
    }

    setFrontView() {
        if (!this.scene || this.buildingMeshes.size === 0) return;

        // Calculate model bounds
        let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
        let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
        
        this.buildingMeshes.forEach(({ mesh }) => {
            const boundingBox = mesh.getBoundingInfo().boundingBox;
            min = BABYLON.Vector3.Minimize(min, boundingBox.minimumWorld);
            max = BABYLON.Vector3.Maximize(max, boundingBox.maximumWorld);
        });

        // Calculate center and size
        const center = min.add(max).scale(0.5);
        const size = max.subtract(min);
        const maxDimension = Math.max(size.x, size.y);

        if (this.camera) {
            // Position camera in front of model
            const distance = maxDimension * 1.5;
            this.camera.position = new BABYLON.Vector3(
                center.x,
                center.y,
                center.z - distance
            );
            this.camera.setTarget(center);
        }
    }    set3DView() {
        if (!this.scene || this.buildingMeshes.size === 0) return;

        // Calculate model bounds
        let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
        let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
        
        this.buildingMeshes.forEach(({ mesh }) => {
            const boundingBox = mesh.getBoundingInfo().boundingBox;
            min = BABYLON.Vector3.Minimize(min, boundingBox.minimumWorld);
            max = BABYLON.Vector3.Maximize(max, boundingBox.maximumWorld);
        });

        // Calculate center and size
        const center = min.add(max).scale(0.5);
        const size = max.subtract(min);
        const maxDimension = Math.max(size.x, size.y, size.z);

        // Set up camera for 3/4 view
        const distance = maxDimension * 1.5;
        if (this.camera) {
            this.camera.position = new BABYLON.Vector3(
                center.x - distance,
                center.y + distance * 0.7,
                center.z - distance
            );
            this.camera.setTarget(center);
        }
    }
    
    fitModelToView() {
        if (!this.scene || this.buildingMeshes.size === 0) return;

        // Calculate bounding box of all meshes
        let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
        let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
        
        this.buildingMeshes.forEach(({ mesh }) => {
            const boundingBox = mesh.getBoundingInfo().boundingBox;
            min = BABYLON.Vector3.Minimize(min, boundingBox.minimumWorld);
            max = BABYLON.Vector3.Maximize(max, boundingBox.maximumWorld);
        });

        // Calculate center and size
        const center = min.add(max).scale(0.5);
        const size = max.subtract(min);
        const maxDimension = Math.max(size.x, size.y, size.z);

        // Position camera based on model size
        const distance = maxDimension * 1.5; // Adjust multiplier to change zoom level
        this.camera.position = new BABYLON.Vector3(
            center.x - distance,
            center.y + distance * 0.7,
            center.z - distance
        );

        // Set target to model center
        this.camera.setTarget(center);
    }
    
    updateCameraInfo() {
        if (this.camera) {
            const pos = this.camera.position;
            const cameraInfo = `X:${pos.x.toFixed(1)} Y:${pos.y.toFixed(1)} Z:${pos.z.toFixed(1)}`;
            const cameraInfoElement = document.getElementById('camera-position');
            if (cameraInfoElement) {
                cameraInfoElement.textContent = cameraInfo;
            }
        }
    }
    
    updateModelInfo() {
        const modelInfoElement = document.getElementById('model-type');
        if (modelInfoElement) {
            modelInfoElement.textContent = `Model: ${this.currentModelType.toUpperCase()}`;
        }
    }

    zoomIn() {
        if (!this.camera) return;
        
        const targetRadius = this.camera.radius / this.zoomFactor;
        this.camera.radius = Math.max(targetRadius, this.camera.lowerRadiusLimit);
    }

    zoomOut() {
        if (!this.camera) return;
        
        const targetRadius = this.camera.radius * this.zoomFactor;
        this.camera.radius = Math.min(targetRadius, this.camera.upperRadiusLimit);
    }
    
    showLoading(message = "Loading...") {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        
        if (loadingOverlay && loadingText) {
            loadingText.textContent = message;
            loadingOverlay.style.display = 'flex';
        }
    }
    
    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    // Method to focus camera on a specific defect
    focusOnDefect(defectId) {
        const markerData = this.defectMarkers.get(defectId);
        if (markerData && this.camera) {
            const defectPos = markerData.marker.position;
            this.camera.position = defectPos.add(new BABYLON.Vector3(-5, 5, -5));
            this.camera.setTarget(defectPos);
        }
    }
    
    // Check if renderer is ready
    isReady() {
        return this.isInitialized;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, initializing Babylon renderer...");
    try {
        window.smartRenderer = new BabylonSmartRenderer('3d-viewer');
        
        // Wait for initialization to complete
        await window.smartRenderer.ensureInitialized();
        
        console.log("Babylon renderer initialized and ready!");
        console.log("Smart renderer available:", window.smartRenderer);
        console.log("Renderer initialized:", window.smartRenderer.isInitialized);
        
    } catch (error) {
        console.error("Failed to initialize Babylon renderer:", error);
        // Show error to user
        alert("Failed to initialize 3D viewer. Please refresh the page and try again.");
    }
});