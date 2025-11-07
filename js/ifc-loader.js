class IFCLoader {
    constructor() {
        this.ifcAPI = new WebIFC.IfcAPI();
        this.isAPIInitialized = false;
    }

    async init() {
        if (!this.isAPIInitialized) {
            await this.ifcAPI.Init();
            this.isAPIInitialized = true;
        }
    }

    async loadIFCIntoMemory(file) {
        await this.init();
        
        const uint8Array = new Uint8Array(await file.arrayBuffer());
        const modelID = await this.ifcAPI.OpenModel(uint8Array);
        return { modelID, uint8Array };
    }

    async convertIFCToGLB(file) {
        try {
            const { modelID } = await this.loadIFCIntoMemory(file);
            
            // Get all geometry
            const allItems = await this.ifcAPI.GetAllItems(modelID);
            console.log('IFC items loaded:', allItems.length);

            // Create a scene to hold the converted geometry
            const scene = new THREE.Scene();
            const ifcLoader = new IFCLoader();
            await ifcLoader.ifcManager.setWasmPath('https://unpkg.com/web-ifc@0.0.36/');
            
            // Load IFC into Three.js scene
            const model = await ifcLoader.parse(await file.arrayBuffer());
            scene.add(model);

            // Export as GLB
            const exporter = new THREE.GLTFExporter();
            return new Promise((resolve) => {
                exporter.parse(scene, function (result) {
                    const glbBlob = new Blob([result], { type: 'model/gltf-binary' });
                    const glbUrl = URL.createObjectURL(glbBlob);
                    resolve(glbUrl);
                }, { binary: true });
            });
        } catch (error) {
            console.error('Error converting IFC to GLB:', error);
            throw error;
        }
    }

    async extractModelData(modelID) {
        const data = {
            spaces: await this.ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCSPACE),
            walls: await this.ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCWALL),
            windows: await this.ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCWINDOW),
            doors: await this.ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCDOOR),
            slabs: await this.ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCSLAB)
        };
        
        return data;
    }
}