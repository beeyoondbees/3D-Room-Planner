// src/config/roomDefaults.js
// Default configuration for room dimensions, appearance, and presets

const roomDefaults = {
  // Default room dimensions (in meters)
  dimensions: {
    width: 10,
    height: 3,
    depth: 8
  },
  
  // Wall configuration
  walls: {
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.0,
    // Whether to include all walls (false = open on right side for better visibility)
    includeAllWalls: false
  },
  
  // Floor configuration
  floor: {
    color: 0xcccccc,
    roughness: 0.8,
    metalness: 0.2,
    textureRepeat: 5, // How many times to repeat texture across room
    defaultTexture: '/assets/textures/floor/grid.png'
  },
  
  // Ceiling configuration
  ceiling: {
    color: 0xeeeeee,
    roughness: 0.8,
    metalness: 0.0,
    // Whether ceiling is visible initially
    visible: false
  },
  
  // Lighting configuration
  lighting: {
    ambient: {
      color: 0xffffff,
      intensity: 0.5
    },
    directional: {
      color: 0xffffff,
      intensity: 0.8,
      position: { x: 5, y: 10, z: 7.5 },
      castShadow: true,
      shadowMapSize: 2048
    },
    pointLights: [
      {
        color: 0xffffcc,
        intensity: 0.3,
        distance: 15,
        decay: 2,
        position: { x: -3, y: 2.5, z: 2 },
        castShadow: true
      },
      {
        color: 0xffffcc,
        intensity: 0.3,
        distance: 15,
        decay: 2,
        position: { x: 3, y: 2.5, z: 2 },
        castShadow: true
      },
      {
        color: 0xffffcc,
        intensity: 0.3,
        distance: 15,
        decay: 2,
        position: { x: -3, y: 2.5, z: -2 },
        castShadow: true
      },
      {
        color: 0xffffcc,
        intensity: 0.3,
        distance: 15,
        decay: 2,
        position: { x: 3, y: 2.5, z: -2 },
        castShadow: true
      }
    ]
  },
  
  // Environment configuration
  environment: {
    backgroundColor: 0xf0f0f0,
    fog: {
      enabled: true,
      color: 0xf0f0f0,
      near: 20,
      far: 50
    },
    groundPlane: {
      size: 50,
      color: 0xdddddd,
      roughness: 0.9,
      metalness: 0.1
    }
  },
  
  // Room presets for different types of spaces
  presets: {
    // Standard room (default)
    default: {
      dimensions: { width: 10, height: 3, depth: 8 },
      walls: { color: 0xffffff },
      floor: { 
        color: 0xcccccc,
        texture: '/assets/textures/floor/grid.png'
      },
      lighting: {
        ambient: { intensity: 0.5 },
        directional: { intensity: 0.8 }
      }
    },
    
    // Home gym preset
    homeGym: {
      dimensions: { width: 6, height: 2.8, depth: 5 },
      walls: { color: 0xf5f5f5 },
      floor: { 
        color: 0xd7c9aa,
        texture: '/assets/textures/floor/wood.png'
      },
      lighting: {
        ambient: { intensity: 0.6 },
        directional: { intensity: 0.7 }
      }
    },
    
    // Commercial gym preset
    commercialGym: {
      dimensions: { width: 15, height: 4, depth: 12 },
      walls: { color: 0xe0e0e0 },
      floor: { 
        color: 0x3a3a3a,
        texture: '/assets/textures/floor/rubber.png'
      },
      lighting: {
        ambient: { intensity: 0.7 },
        directional: { intensity: 0.8 }
      }
    },
    
    // Fitness studio preset
    studioSpace: {
      dimensions: { width: 10, height: 3.5, depth: 8 },
      walls: { color: 0xffffff },
      floor: { 
        color: 0xd4cfc9,
        texture: '/assets/textures/floor/studio.png'
      },
      lighting: {
        ambient: { intensity: 0.8 },
        directional: { intensity: 0.6 }
      }
    },
    
    // Hotel gym preset
    hotelGym: {
      dimensions: { width: 8, height: 3, depth: 6 },
      walls: { color: 0xf2f2f2 },
      floor: { 
        color: 0x8c8c8c,
        texture: '/assets/textures/floor/carpet.png'
      },
      lighting: {
        ambient: { intensity: 0.65 },
        directional: { intensity: 0.7 }
      }
    },
    
    // Corporate wellness center preset
    corporateGym: {
      dimensions: { width: 12, height: 3.2, depth: 10 },
      walls: { color: 0xeaeaea },
      floor: { 
        color: 0x505050,
        texture: '/assets/textures/floor/tile.png'
      },
      lighting: {
        ambient: { intensity: 0.7 },
        directional: { intensity: 0.75 }
      }
    }
  },
  
  // Default camera positions for different views
  cameraPositions: {
    default3D: {
      position: { x: 5, y: 5, z: 10 },
      target: { x: 0, y: 0, z: 0 }
    },
    top: {
      position: { x: 0, y: 15, z: 0 },
      target: { x: 0, y: 0, z: 0 }
    },
    front: {
      position: { x: 0, y: 1.7, z: 15 },
      target: { x: 0, y: 1.7, z: 0 }
    },
    side: {
      position: { x: 15, y: 1.7, z: 0 },
      target: { x: 0, y: 1.7, z: 0 }
    },
    corner: {
      position: { x: 10, y: 5, z: 10 },
      target: { x: 0, y: 1, z: 0 }
    }
  }
};

export default roomDefaults;