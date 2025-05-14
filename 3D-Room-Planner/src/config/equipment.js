// src/config/equipment.js
// Configuration file for equipment models

export const equipmentConfig = {
  // Map of model types to file paths
  modelPaths: {
    // 'SXM200': '/assets/models/SXM200.glb',
    'sBike-5': '/assets/models/sBike-5.glb',
  },
  
  // Map of model types to their physical dimensions (in meters)
  // Used for proper placement and collision detection
  dimensions: {
    // 'SXM200': { width: 0.9, height: 1.5, depth: 1.8 },
    'sBike-5': { width: 0.9, height: 1.5, depth: 1.8 },
  },
  
  // Equipment catalog for UI
  catalog: {
    'SPORTSTECH': [
    //   { id: 'SXM200', name: 'SXM200', icon: '/assets/icons/sBike.webp' },
      { id: 'sBike-5', name: 'sBike-5', icon: '/assets/icons/sBike.webp' },
    ],
  }
};

export default equipmentConfig;