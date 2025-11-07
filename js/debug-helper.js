// Debug helper functions
function analyzeMeshName(meshName) {
    const tests = {
        'wall': ['wall', 'ifcwall'],
        'floor': ['floor', 'slab', 'ifcfloor'],
        'door': ['door', 'ifcdoor'],
        'object': ['furniture', 'object', 'ifcfurnishing'],
        'ceiling': ['ceiling', 'ifcceiling'],
        'window': ['window', 'ifcwindow'],
        'beam': ['beam', 'ifcbeam'],
        'column': ['column', 'ifccolumn']
    };

    console.log('Analyzing mesh:', meshName);
    const lowerName = meshName.toLowerCase();
    
    for (const [type, keywords] of Object.entries(tests)) {
        for (const keyword of keywords) {
            if (lowerName.includes(keyword)) {
                console.log(`Match found: "${keyword}" indicates type "${type}"`);
                return type;
            }
        }
    }
    
    console.log('No matching type found, using default');
    return 'default';
}