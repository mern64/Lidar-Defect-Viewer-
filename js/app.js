class DefectViewerApp {
    constructor() {
        this.currentProject = null;
        this.defects = [];
        this.filteredDefects = [];
        this.selectedDefect = null;
        this.isAddingDefect = false;
        this.tempMarker = null;
        
        this.init();
    }
    
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
            this.updateDefectCount();
            console.log("Defect Viewer App initialized");
        });
    }
    
    setupEventListeners() {
        console.log("Setting up event listeners...");
        
        // Load sample data
        const loadSampleBtn = document.getElementById('load-sample-btn');
        if (loadSampleBtn) {
            loadSampleBtn.addEventListener('click', () => {
                console.log("Load Sample Data clicked");
                this.loadSampleData();
            });
        }
        
        // Load GLB model
        const loadGlbBtn = document.getElementById('load-glb-btn');
        if (loadGlbBtn) {
            loadGlbBtn.addEventListener('click', () => {
                console.log("Load GLB Model clicked");
                this.openGLBUploadModal();
            });
        } else {
            console.error("Load GLB button not found!");
        }
        
        // Load IFC model
        const loadIfcBtn = document.getElementById('load-ifc-btn');
        if (loadIfcBtn) {
            loadIfcBtn.addEventListener('click', () => {
                console.log("Load IFC Model clicked");
                this.openIFCUploadModal();
            });
        }
        
        // Defect reporting
        const addDefectBtn = document.getElementById('add-defect-btn');
        if (addDefectBtn) {
            addDefectBtn.addEventListener('click', () => {
                this.openDefectModal();
            });
        }
        
        const defectForm = document.getElementById('defect-form');
        if (defectForm) {
            defectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitDefect();
            });
        }
        
        const cancelDefectBtn = document.getElementById('cancel-defect');
        if (cancelDefectBtn) {
            cancelDefectBtn.addEventListener('click', () => {
                this.closeDefectModal();
            });
        }
        
        const closeDefectModal = document.querySelector('.close');
        if (closeDefectModal) {
            closeDefectModal.addEventListener('click', () => {
                this.closeDefectModal();
            });
        }
        
        const clearCoordinatesBtn = document.getElementById('clear-coordinates');
        if (clearCoordinatesBtn) {
            clearCoordinatesBtn.addEventListener('click', () => {
                document.getElementById('defect-coordinates').value = '';
                this.removeTempMarker();
            });
        }
        
        // GLB modal events
        const loadGlbConfirmBtn = document.getElementById('load-glb-confirm');
        if (loadGlbConfirmBtn) {
            loadGlbConfirmBtn.addEventListener('click', () => {
                console.log("Load GLB Confirm clicked");
                this.loadGLBModel();
            });
        } else {
            console.error("Load GLB Confirm button not found!");
        }
        
        const cancelGlbBtn = document.getElementById('cancel-glb');
        if (cancelGlbBtn) {
            cancelGlbBtn.addEventListener('click', () => {
                this.closeGLBUploadModal();
            });
        }
        
        const closeGlbModal = document.querySelector('.close-glb');
        if (closeGlbModal) {
            closeGlbModal.addEventListener('click', () => {
                this.closeGLBUploadModal();
            });
        }
        
        // IFC modal events
        const loadIfcConfirmBtn = document.getElementById('load-ifc-confirm');
        if (loadIfcConfirmBtn) {
            loadIfcConfirmBtn.addEventListener('click', () => {
                console.log("Load IFC Confirm clicked");
                this.loadIFCModel();
            });
        }
        
        const cancelIfcBtn = document.getElementById('cancel-ifc');
        if (cancelIfcBtn) {
            cancelIfcBtn.addEventListener('click', () => {
                this.closeIFCUploadModal();
            });
        }
        
        const closeIfcModal = document.querySelector('.close-ifc');
        if (closeIfcModal) {
            closeIfcModal.addEventListener('click', () => {
                this.closeIFCUploadModal();
            });
        }
        
        // Image preview
        const defectImageInput = document.getElementById('defect-image');
        if (defectImageInput) {
            defectImageInput.addEventListener('change', (e) => {
                this.previewImage(e.target.files[0]);
            });
        }
        
        // Viewer controls
        const resetViewBtn = document.getElementById('reset-view');
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => {
                if (window.smartRenderer) {
                    window.smartRenderer.set3DView();
                }
            });
        }
        
        const toggleDefectsBtn = document.getElementById('toggle-defects');
        if (toggleDefectsBtn) {
            toggleDefectsBtn.addEventListener('click', () => {
                this.toggleDefectsVisibility();
            });
        }
        
        const toggleXrayBtn = document.getElementById('toggle-xray');
        if (toggleXrayBtn) {
            toggleXrayBtn.addEventListener('click', () => {
                this.toggleXRayMode();
            });
        }
        
        const viewTopBtn = document.getElementById('view-top');
        if (viewTopBtn) {
            viewTopBtn.addEventListener('click', () => {
                if (window.smartRenderer) {
                    window.smartRenderer.setTopView();
                }
            });
        }
        
        const viewFrontBtn = document.getElementById('view-front');
        if (viewFrontBtn) {
            viewFrontBtn.addEventListener('click', () => {
                if (window.smartRenderer) {
                    window.smartRenderer.setFrontView();
                }
            });
        }
        
        const view3dBtn = document.getElementById('view-3d');
        if (view3dBtn) {
            view3dBtn.addEventListener('click', () => {
                if (window.smartRenderer) {
                    window.smartRenderer.set3DView();
                }
            });
        }
        
        // Debug inspector
        const toggleInspectorBtn = document.getElementById('toggle-inspector');
        if (toggleInspectorBtn) {
            toggleInspectorBtn.addEventListener('click', () => {
                this.toggleInspector();
            });
        }
        
        // Defect filters
        const severityFilter = document.getElementById('severity-filter');
        if (severityFilter) {
            severityFilter.addEventListener('change', () => {
                this.filterDefects();
            });
        }
        
        const typeFilter = document.getElementById('type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.filterDefects();
            });
        }
        
        // Defect location selection
        document.addEventListener('defectLocationSelected', (event) => {
            console.log("Defect location selected:", event.detail);
            if (this.isAddingDefect) {
                const coords = event.detail.coordinates;
                document.getElementById('defect-coordinates').value = 
                    `X: ${coords[0].toFixed(2)}, Y: ${coords[1].toFixed(2)}, Z: ${coords[2].toFixed(2)}`;
                
                this.addTempMarker(coords);
            }
        });
        
        // Close defect details
        const closeDetailsBtn = document.getElementById('close-details');
        if (closeDetailsBtn) {
            closeDetailsBtn.addEventListener('click', () => {
                this.closeDefectDetails();
            });
        }
        
        console.log("All event listeners set up successfully");
    }
    
    async loadSampleData() {
        this.showLoading(true, "Loading sample data...");
        
        try {
            console.log("Loading sample data...");
            
            // Load model data
            const modelResponse = await fetch('data/sample-model.json');
            if (!modelResponse.ok) {
                throw new Error(`Failed to load model data: ${modelResponse.status}`);
            }
            const modelData = await modelResponse.json();
            console.log("Model data loaded:", modelData);
            
            // Load defects data
            const defectsResponse = await fetch('data/defects.json');
            if (!defectsResponse.ok) {
                throw new Error(`Failed to load defects data: ${defectsResponse.status}`);
            }
            const defectsData = await defectsResponse.json();
            console.log("Defects data loaded:", defectsData);
            
            if (window.smartRenderer) {
                console.log("Loading model into renderer...");
                // Load the 3D model
                await window.smartRenderer.loadModel(modelData);
                
                // Load defects with coordinates from JSON
                this.defects = defectsData.defects;
                console.log("Loading defects into renderer:", this.defects.length);
                window.smartRenderer.loadDefects(this.defects);
                
                this.updateProjectInfo(defectsData.metadata.project_name);
                this.filterDefects();
                
                console.log("Sample data loaded successfully");
            } else {
                console.error("Smart renderer not available");
            }
            
        } catch (error) {
            console.error("Error loading sample data:", error);
            alert(`Error loading sample data: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    openGLBUploadModal() {
        console.log("Opening GLB upload modal...");
        const modal = document.getElementById('glb-upload-modal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('glb-file').value = '';
            document.getElementById('model-scale').value = '1.0';
            console.log("GLB upload modal opened");
        } else {
            console.error("GLB upload modal element not found!");
        }
    }
    
    closeGLBUploadModal() {
        console.log("Closing GLB upload modal...");
        const modal = document.getElementById('glb-upload-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    async loadGLBModel() {
        console.log("Starting GLB model loading...");
        
        const fileInput = document.getElementById('glb-file');
        const scaleInput = document.getElementById('model-scale');
        
        if (!fileInput || !fileInput.files.length) {
            alert('Please select a GLB/GLTF file');
            return;
        }
        
        const file = fileInput.files[0];
        const scale = parseFloat(scaleInput.value) || 1.0;
        
        console.log("Selected file:", file.name, "Scale:", scale);
        
        if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
            alert('Please select a valid GLB or GLTF file');
            return;
        }
        
        try {
            this.showLoading(true, `Loading ${file.name}...`);
            
            if (window.smartRenderer) {
                console.log("Loading GLB file into renderer...");
                const loadResult = await window.smartRenderer.loadGLBFromFile(file, scale);
                
                console.log("Load result:", loadResult);
                
                // Check if defects were automatically extracted from the model
                if (loadResult && loadResult.extractedDefects && loadResult.extractedDefects.length > 0) {
                    this.defects = loadResult.extractedDefects;
                    console.log(`✅ Using ${this.defects.length} defects extracted from GLB model`);
                    window.smartRenderer.loadDefects(this.defects);
                } else {
                    // No defects extracted - start with empty list
                    console.log("⚠️ No defects extracted from GLB model, starting with empty list");
                    this.defects = [];
                }
                
                this.updateProjectInfo(`GLB: ${file.name}`);
                this.filterDefects();
                
                console.log("GLB model loaded successfully");
            } else {
                console.error("Smart renderer not available");
            }
            
            this.closeGLBUploadModal();
            
        } catch (error) {
            console.error("Error loading GLB model:", error);
            alert(`Error loading GLB model: ${error.message}\n\nMake sure you're using a valid GLB/GLTF file.`);
        } finally {
            this.showLoading(false);
        }
    }
    
    openIFCUploadModal() {
        console.log("Opening IFC upload modal...");
        const modal = document.getElementById('ifc-upload-modal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('ifc-file').value = '';
            document.getElementById('ifc-model-scale').value = '1.0';
            document.getElementById('ifc-extract-defects').checked = true;
            console.log("IFC upload modal opened");
        } else {
            console.error("IFC upload modal element not found!");
        }
    }
    
    closeIFCUploadModal() {
        console.log("Closing IFC upload modal...");
        const modal = document.getElementById('ifc-upload-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    async loadIFCModel() {
        console.log("Starting IFC model loading...");
        
        const fileInput = document.getElementById('ifc-file');
        const scaleInput = document.getElementById('ifc-model-scale');
        const extractDefectsCheckbox = document.getElementById('ifc-extract-defects');
        
        if (!fileInput || !fileInput.files.length) {
            alert('Please select an IFC file');
            return;
        }
        
        const file = fileInput.files[0];
        const scale = parseFloat(scaleInput.value) || 1.0;
        const extractDefects = extractDefectsCheckbox.checked;
        
        console.log("Selected file:", file.name, "Scale:", scale, "Extract defects:", extractDefects);
        
        if (!file.name.toLowerCase().endsWith('.ifc')) {
            alert('Please select a valid IFC file');
            return;
        }
        
        try {
            this.showLoading(true, `Loading IFC model: ${file.name}...`);
            
            if (window.smartRenderer) {
                console.log("Loading IFC file into renderer...");
                const result = await window.smartRenderer.loadIFCFromFile(file, scale, extractDefects);
                
                // If defects were extracted from IFC, use those
                if (extractDefects && result.extractedDefects && result.extractedDefects.length > 0) {
                    this.defects = result.extractedDefects;
                    console.log(`Extracted ${this.defects.length} defect markers from IFC file`);
                    window.smartRenderer.loadDefects(this.defects);
                } else {
                    // Otherwise, try to load from JSON
                    console.log("Loading defects from JSON...");
                    try {
                        const defectsResponse = await fetch('data/defects.json');
                        if (defectsResponse.ok) {
                            const defectsData = await defectsResponse.json();
                            this.defects = defectsData.defects;
                            window.smartRenderer.loadDefects(this.defects);
                        }
                    } catch (e) {
                        console.log("No defects JSON file found, continuing without defects");
                    }
                }
                
                this.updateProjectInfo(`IFC: ${file.name}`);
                this.filterDefects();
                
                console.log("IFC model loaded successfully");
            } else {
                console.error("Smart renderer not available");
            }
            
            this.closeIFCUploadModal();
            
        } catch (error) {
            console.error("Error loading IFC model:", error);
            alert(`Error loading IFC model: ${error.message}\n\nMake sure you're using a valid IFC file.`);
        } finally {
            this.showLoading(false);
        }
    }
    
    filterDefects() {
        const severityFilter = document.getElementById('severity-filter');
        const typeFilter = document.getElementById('type-filter');
        
        if (!severityFilter || !typeFilter) return;
        
        const severityValue = severityFilter.value;
        const typeValue = typeFilter.value;
        
        this.filteredDefects = this.defects.filter(defect => {
            const severityMatch = severityValue === 'all' || defect.severity === severityValue;
            const typeMatch = typeValue === 'all' || defect.defect_type === typeValue;
            
            return severityMatch && typeMatch;
        });
        
        this.renderDefectsList();
    }
    
    renderDefectsList() {
        const defectsList = document.getElementById('defects-list');
        if (!defectsList) return;
        
        if (this.filteredDefects.length === 0) {
            defectsList.innerHTML = `
                <div class="defect-placeholder">
                    <p>No defects match the current filters.</p>
                </div>
            `;
            return;
        }
        
        defectsList.innerHTML = this.filteredDefects.map(defect => `
            <div class="defect-item ${defect.severity}" onclick="app.showDefectDetails('${defect.id}')">
                <div class="defect-header">
                    <span class="defect-type">${this.formatDefectType(defect.defect_type || defect.type)}</span>
                    <span class="defect-severity severity-${defect.severity}">${defect.severity.toUpperCase()}</span>
                </div>
                <div class="defect-description">${defect.description}</div>
                ${defect.notes ? `<div class="defect-notes">📝 ${defect.notes}</div>` : ''}
                <div class="defect-meta">
                    <span class="defect-coordinates">X:${defect.coordinates[0].toFixed(1)} Y:${defect.coordinates[1].toFixed(1)} Z:${defect.coordinates[2].toFixed(1)}</span>
                    <span class="defect-date">${defect.date_reported || defect.timestamp || new Date().toISOString().split('T')[0]}</span>
                </div>
                <div class="defect-item-actions">
                    <button class="focus-btn" onclick="app.focusOnDefect('${defect.id}', event)" title="Focus on defect">Focus</button>
                    <button class="delete-btn" onclick="app.deleteDefect('${defect.id}', event)" title="Delete defect">Delete</button>
                </div>
            </div>
        `).join('');
        
        this.updateDefectCount();
    }
    
    updateDefectCount() {
        const defectCountElement = document.getElementById('defect-count');
        if (!defectCountElement) return;
        
        const totalDefects = this.defects.length;
        const filteredCount = this.filteredDefects.length;
        const countText = filteredCount === totalDefects ? 
            `${totalDefects} defects` : 
            `${filteredCount} of ${totalDefects} defects`;
        
        defectCountElement.textContent = countText;
    }
    
    formatDefectType(type) {
        // Handle undefined or null
        if (!type) return 'Unknown';
        
        // If type contains hyphens, format it nicely
        if (type.includes('-')) {
            return type.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }
        
        // Otherwise just capitalize first letter
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    openDefectModal() {
        this.isAddingDefect = true;
        const modal = document.getElementById('add-defect-modal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('defect-form').reset();
            document.getElementById('defect-coordinates').value = '';
            document.getElementById('image-preview').innerHTML = '';
            
            this.removeTempMarker();
        }
    }
    
    closeDefectModal() {
        this.isAddingDefect = false;
        const modal = document.getElementById('add-defect-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.removeTempMarker();
    }
    
    addTempMarker(coordinates) {
        this.removeTempMarker();
        
        if (window.smartRenderer) {
            this.tempMarker = {
                id: 'temp',
                coordinates: coordinates,
                defect_type: 'temporary',
                severity: 'medium',
                description: 'Temporary marker for new defect'
            };
            window.smartRenderer.addDefectMarker(this.tempMarker);
        }
    }
    
    removeTempMarker() {
        if (this.tempMarker && window.smartRenderer) {
            window.smartRenderer.removeDefectMarker('temp');
            this.tempMarker = null;
        }
    }
    
    previewImage(file) {
        const preview = document.getElementById('image-preview');
        if (!preview) return;
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Defect preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '';
        }
    }
    
    async submitDefect() {
        const coordinatesInput = document.getElementById('defect-coordinates');
        if (!coordinatesInput) return;
        
        const coordinatesText = coordinatesInput.value;
        
        if (!coordinatesText) {
            alert('Please click on the 3D model to set defect coordinates');
            return;
        }
        
        // Parse coordinates from text
        const coordsMatch = coordinatesText.match(/X:\s*([\d.-]+),\s*Y:\s*([\d.-]+),\s*Z:\s*([\d.-]+)/);
        if (!coordsMatch) {
            alert('Invalid coordinates format');
            return;
        }
        
        const coordinates = [
            parseFloat(coordsMatch[1]),
            parseFloat(coordsMatch[2]), 
            parseFloat(coordsMatch[3])
        ];
        
        const newDefect = {
            id: 'defect_' + Date.now(),
            element_id: document.getElementById('defect-element')?.value || 'manual',
            defect_type: document.getElementById('defect-type')?.value,
            description: document.getElementById('defect-description')?.value,
            severity: document.getElementById('defect-severity')?.value,
            coordinates: coordinates,
            status: 'open',
            timestamp: new Date().toISOString(),
            notes: document.getElementById('defect-notes')?.value || '',
            image_file: document.getElementById('defect-image')?.files[0]
        };
        
        // Add to defects array
        this.defects.push(newDefect);
        
        // Add to 3D view
        if (window.smartRenderer) {
            window.smartRenderer.addDefectMarker(newDefect);
        }
        
        // Update UI
        this.filterDefects();
        this.closeDefectModal();
        
        alert('Defect reported successfully!');
    }
    
    showDefectDetails(defectId) {
        const defect = this.defects.find(d => d.id === defectId);
        if (!defect) return;
        
        this.selectedDefect = defect;
        
        const detailContent = document.getElementById('detail-content');
        const defectDetails = document.getElementById('defect-details');
        
        if (detailContent && defectDetails) {
            detailContent.innerHTML = `
                <div class="defect-detail">
                    <div class="defect-edit-section">
                        <label><strong>Type:</strong></label>
                        <select id="edit-defect-type" class="defect-edit-input">
                            <option value="crack" ${defect.type === 'crack' ? 'selected' : ''}>Crack</option>
                            <option value="water-damage" ${defect.type === 'water-damage' ? 'selected' : ''}>Water Damage</option>
                            <option value="structural" ${defect.type === 'structural' ? 'selected' : ''}>Structural</option>
                            <option value="finish" ${defect.type === 'finish' ? 'selected' : ''}>Finish</option>
                            <option value="electrical" ${defect.type === 'electrical' ? 'selected' : ''}>Electrical</option>
                            <option value="plumbing" ${defect.type === 'plumbing' ? 'selected' : ''}>Plumbing</option>
                            <option value="Unknown" ${defect.type === 'Unknown' ? 'selected' : ''}>Unknown</option>
                        </select>
                    </div>
                    
                    <div class="defect-edit-section">
                        <label><strong>Severity:</strong></label>
                        <select id="edit-defect-severity" class="defect-edit-input">
                            <option value="critical" ${defect.severity === 'critical' ? 'selected' : ''}>Critical</option>
                            <option value="high" ${defect.severity === 'high' ? 'selected' : ''}>High</option>
                            <option value="medium" ${defect.severity === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="low" ${defect.severity === 'low' ? 'selected' : ''}>Low</option>
                        </select>
                    </div>
                    
                    <div class="defect-edit-section">
                        <label><strong>Description:</strong></label>
                        <textarea id="edit-defect-description" class="defect-edit-input" rows="3">${defect.description || ''}</textarea>
                    </div>
                    
                    <div class="defect-edit-section">
                        <label><strong>Notes:</strong></label>
                        <textarea id="edit-defect-notes" class="defect-edit-input" rows="3">${defect.notes || ''}</textarea>
                    </div>
                    
                    <div class="defect-edit-section">
                        <label><strong>Images:</strong></label>
                        <input type="file" id="edit-defect-images" accept="image/*" multiple class="defect-edit-input">
                        <div id="defect-images-preview" class="defect-images-preview">
                            ${defect.images && defect.images.length > 0 ? 
                                defect.images.map(img => `<img src="${img}" alt="Defect image" class="defect-thumbnail">`).join('') : 
                                '<p class="no-images">No images uploaded</p>'}
                        </div>
                    </div>
                    
                    <p><strong>Location:</strong> X: ${defect.coordinates[0].toFixed(2)}, Y: ${defect.coordinates[1].toFixed(2)}, Z: ${defect.coordinates[2].toFixed(2)}</p>
                    <p><strong>Element:</strong> ${defect.element_id}</p>
                    <p><strong>Reported:</strong> ${defect.date_reported || new Date().toISOString().split('T')[0]}</p>
                    
                    <div class="defect-actions" style="margin-top: 15px;">
                        <button class="btn-primary" onclick="app.saveDefectEdits('${defect.id}')">Save Changes</button>
                        <button class="btn-secondary" onclick="app.focusOnDefect('${defect.id}', event)">Focus on Defect</button>
                        <button class="btn-danger" onclick="app.deleteDefect('${defect.id}', event)">Delete</button>
                    </div>
                </div>
            `;
            
            defectDetails.style.display = 'block';
            
            // Setup image preview
            const imageInput = document.getElementById('edit-defect-images');
            if (imageInput) {
                imageInput.addEventListener('change', (e) => this.previewDefectImages(e, defect.id));
            }
        }
    }
    
    focusOnDefect(defectId, event) {
        if (event) event.stopPropagation();
        
        if (window.smartRenderer) {
            window.smartRenderer.focusOnDefect(defectId);
        }
    }
    
    closeDefectDetails() {
        const defectDetails = document.getElementById('defect-details');
        if (defectDetails) {
            defectDetails.style.display = 'none';
        }
        this.selectedDefect = null;
    }
    
    saveDefectEdits(defectId) {
        const defect = this.defects.find(d => d.id === defectId);
        if (!defect) return;
        
        // Get edited values
        const type = document.getElementById('edit-defect-type')?.value;
        const severity = document.getElementById('edit-defect-severity')?.value;
        const description = document.getElementById('edit-defect-description')?.value;
        const notes = document.getElementById('edit-defect-notes')?.value;
        
        // Update defect object
        if (type) defect.type = type;
        if (severity) defect.severity = severity;
        if (description) defect.description = description;
        if (notes) defect.notes = notes;
        
        console.log(`Updated defect ${defectId}:`, defect);
        
        // Update the marker appearance (color/line) based on new severity
        if (window.smartRenderer) {
            window.smartRenderer.updateDefectMarker(defect);
        }
        
        // Refresh the defect list
        this.filterDefects();
        
        // Show success message
        alert('Defect updated successfully!');
        
        // Refresh the details view
        this.showDefectDetails(defectId);
    }
    
    previewDefectImages(event, defectId) {
        const defect = this.defects.find(d => d.id === defectId);
        if (!defect) return;
        
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        if (!defect.images) defect.images = [];
        
        const preview = document.getElementById('defect-images-preview');
        if (!preview) return;
        
        // Clear previous preview
        preview.innerHTML = '';
        
        // Read and preview each image
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Store the image data URL
                defect.images.push(e.target.result);
                
                // Create preview element
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'defect-thumbnail';
                img.alt = 'Defect image';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
        
        console.log(`Added ${files.length} images to defect ${defectId}`);
    }
    
    deleteDefect(defectId, event) {
        if (event) event.stopPropagation();
        
        if (confirm('Are you sure you want to delete this defect?')) {
            this.defects = this.defects.filter(d => d.id !== defectId);
            
            if (window.smartRenderer) {
                window.smartRenderer.removeDefectMarker(defectId);
            }
            
            this.filterDefects();
        }
    }
    
    toggleDefectsVisibility() {
        if (window.smartRenderer) {
            const visible = window.smartRenderer.toggleDefectsVisibility();
            const toggleBtn = document.getElementById('toggle-defects');
            if (toggleBtn) {
                toggleBtn.textContent = visible ? 'Hide Defects' : 'Show Defects';
            }
        }
    }
    
    toggleXRayMode() {
        if (window.smartRenderer) {
            const xrayOn = window.smartRenderer.toggleXRayMode();
            const toggleBtn = document.getElementById('toggle-xray');
            if (toggleBtn) {
                toggleBtn.textContent = xrayOn ? 'X-Ray: ON' : 'X-Ray: OFF';
            }
        }
    }
    
    toggleInspector() {
        if (window.smartRenderer && window.smartRenderer.scene) {
            if (window.smartRenderer.scene.debugLayer.isVisible()) {
                window.smartRenderer.scene.debugLayer.hide();
            } else {
                window.smartRenderer.scene.debugLayer.show();
            }
        }
    }
    
    updateProjectInfo(projectName) {
        const projectNameElement = document.getElementById('project-name');
        if (projectNameElement) {
            projectNameElement.textContent = `Project: ${projectName}`;
        }
    }
    
    showLoading(show, message = "Loading...") {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        
        if (loadingOverlay && loadingText) {
            if (show) {
                loadingText.textContent = message;
                loadingOverlay.style.display = 'flex';
            } else {
                loadingOverlay.style.display = 'none';
            }
        }
    }
}

// Initialize the application
const app = new DefectViewerApp();