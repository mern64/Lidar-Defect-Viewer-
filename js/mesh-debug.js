// Mesh processing debug functions
function debugMeshProcessing(mesh) {
    const meshInfo = {
        name: mesh.name,
        id: mesh.id,
        material: mesh.material ? {
            name: mesh.material.name,
            id: mesh.material.id
        } : 'no material'
    };
    
    console.log('Processing mesh:', meshInfo);
    return meshInfo;
}

function debugElementType(meshName) {
    const typeChecks = [
        { type: 'wall', pattern: 'wall' },
        { type: 'floor', pattern: 'floor' },
        { type: 'door', pattern: 'door' },
        { type: 'object', pattern: 'object' },
        { type: 'ceiling', pattern: 'ceiling' },
        { type: 'window', pattern: 'window' },
        { type: 'beam', pattern: 'beam' },
        { type: 'column', pattern: 'column' }
    ];
    
    const lowerName = meshName.toLowerCase();
    console.log('Checking type for mesh:', lowerName);
    
    for (const check of typeChecks) {
        if (lowerName.includes(check.pattern)) {
            console.log(`Found match: ${check.type}`);
            return check.type;
        }
    }
    
    console.log('No type match found, using default');
    return 'default';
}

function debugColorAssignment(elementType, colors) {
    console.log('Color assignment:', {
        elementType,
        availableColors: Object.keys(colors),
        selectedColor: colors[elementType] ? 
            `RGB(${colors[elementType].r}, ${colors[elementType].g}, ${colors[elementType].b})` : 
            'not found'
    });
}