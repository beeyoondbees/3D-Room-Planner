// src/config/equipment.js
// Configuration file for equipment models

export const equipmentConfig = {
  // Map of model types to file paths
  modelPaths: {
    'sBike': '/assets/models/sBike.glb',
    'sTreadPro': '/assets/models/sTreadPro.glb',
    'sPad500': '/assets/models/sPad500.glb',
    'sRow': '/assets/models/sRow.glb',
  },
  
  // Map of model types to their physical dimensions (in meters)
  // Used for proper placement and collision detection
  dimensions: {
    'sBike': { width: 0.9, height: 1.5, depth: 1.8 },
    'sTreadPro': { width: 0.9, height: 1.5, depth: 1.8 },
    'sPad500': { width: 0.9, height: 1.5, depth: 1.8 },
    'sRow': { width: 0.9, height: 1.5, depth: 1.8 },
  },
  
  // Equipment catalog for UI
  catalog: {
    'Products': [
      { id: 'sBike', name: 'sBike', icon: '/assets/icons/sBike.png' },
      { id: 'sTreadPro', name: 'sTreadPro', icon: '/assets/icons/sTreadPro.png' },
      { id: 'sPad500', name: 'sPad500', icon: '/assets/icons/sPad500.png' },
      { id: 'sRow', name: 'sRow', icon: '/assets/icons/sRow.png' },
    ],
  }
};


export default equipmentConfig;