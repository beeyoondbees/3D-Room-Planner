// src/store/reducers/sceneReducer.js
// Reducer for scene-related state

import * as ActionTypes from '../actionTypes';

// Initial state for the scene
const initialState = {
  viewMode: '3D', // '2D' or '3D'
  gridVisible: true,
  roomDimensions: {
    width: 10,
    height: 3,
    depth: 8
  },
  wallColor: 0xffffff,
  floorTexture: '/assets/textures/floor/grid.png',
  ceilingVisible: false,
  transformMode: 'translate', // 'translate', 'rotate', or 'scale'
  transformSpace: 'world', // 'world' or 'local'
  snapEnabled: true,
  snapValues: {
    translation: 0.5,
    rotation: Math.PI / 12, // 15 degrees
    scale: 0.1
  },
  lighting: {
    ambient: 0.5,
    directional: 0.8,
    directionalPosition: { x: 5, y: 10, z: 7.5 }
  },
  shadows: {
    enabled: true,
    quality: 'medium' // 'low', 'medium', 'high'
  },
  renderingQuality: 'medium', // 'low', 'medium', 'high'
  backgroundColor: 0xf0f0f0,
  fog: {
    enabled: true,
    color: 0xf0f0f0,
    near: 20,
    far: 50
  },
  cameraViews: {
    default: {
      position: { x: 5, y: 5, z: 10 },
      target: { x: 0, y: 0, z: 0 }
    },
    top: {
      position: { x: 0, y: 15, z: 0 },
      target: { x: 0, y: 0, z: 0 }
    }
  },
  currentCameraView: 'default',
  uiPreferences: {
    showMeasurements: false,
    showLabels: true,
    darkMode: false,
    controlPanelPosition: 'right', // 'left', 'right'
    showStats: false
  },
  undoStack: [],
  redoStack: []
};

// Helper functions for state immutability
const updateObject = (oldObject, newValues) => {
  return { ...oldObject, ...newValues };
};

const updateNestedObject = (state, path, value) => {
  // Deep clone the state
  const newState = JSON.parse(JSON.stringify(state));
  
  // Navigate to the nested property
  let current = newState;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]];
  }
  
  // Update the value
  current[path[path.length - 1]] = value;
  
  return newState;
};

// Main reducer function
const sceneReducer = (state = initialState, action) => {
  switch (action.type) {
    case ActionTypes.SET_VIEW_MODE:
      return {
        ...state,
        viewMode: action.payload
      };
      
    case ActionTypes.TOGGLE_GRID_VISIBILITY:
      return {
        ...state,
        gridVisible: !state.gridVisible
      };
      
    case ActionTypes.SET_GRID_VISIBILITY:
      return {
        ...state,
        gridVisible: action.payload
      };
      
    case ActionTypes.SET_ROOM_DIMENSIONS:
      return {
        ...state,
        roomDimensions: action.payload
      };
      
    case ActionTypes.SET_WALL_COLOR:
      return {
        ...state,
        wallColor: action.payload
      };
      
    case ActionTypes.SET_FLOOR_TEXTURE:
      return {
        ...state,
        floorTexture: action.payload
      };
      
    case ActionTypes.TOGGLE_CEILING:
      return {
        ...state,
        ceilingVisible: !state.ceilingVisible
      };
      
    case ActionTypes.APPLY_ROOM_PRESET:
      // Apply preset configurations
      const preset = getRoomPreset(action.payload);
      return {
        ...state,
        ...preset
      };
      
    case ActionTypes.SET_CAMERA_POSITION:
      return updateNestedObject(
        state, 
        ['cameraViews', state.currentCameraView], 
        action.payload
      );
      
    case ActionTypes.RESET_CAMERA:
      return {
        ...state,
        currentCameraView: 'default'
      };
      
    case ActionTypes.SET_TRANSFORM_MODE:
      return {
        ...state,
        transformMode: action.payload
      };
      
    case ActionTypes.TOGGLE_TRANSFORM_MODE:
      // Cycle through transform modes
      const modes = ['translate', 'rotate', 'scale'];
      const currentIndex = modes.indexOf(state.transformMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return {
        ...state,
        transformMode: modes[nextIndex]
      };
      
    case ActionTypes.TOGGLE_SNAP:
      return {
        ...state,
        snapEnabled: !state.snapEnabled
      };
      
    case ActionTypes.SET_SNAP_VALUES:
      return {
        ...state,
        snapValues: action.payload
      };
      
    case ActionTypes.TOGGLE_TRANSFORM_SPACE:
      return {
        ...state,
        transformSpace: state.transformSpace === 'world' ? 'local' : 'world'
      };
      
    case ActionTypes.SET_SHADOW_QUALITY:
      return updateNestedObject(
        state,
        ['shadows', 'quality'],
        action.payload
      );
      
    case ActionTypes.TOGGLE_SHADOWS:
      return updateNestedObject(
        state,
        ['shadows', 'enabled'],
        !state.shadows.enabled
      );
      
    case ActionTypes.SET_RENDERING_QUALITY:
      return {
        ...state,
        renderingQuality: action.payload
      };
      
    case ActionTypes.SET_AMBIENT_LIGHT:
      return updateNestedObject(
        state,
        ['lighting', 'ambient'],
        action.payload
      );
      
    case ActionTypes.SET_DIRECTIONAL_LIGHT:
      return {
        ...state,
        lighting: {
          ...state.lighting,
          directional: action.payload.intensity,
          directionalPosition: action.payload.position
        }
      };
      
    case ActionTypes.SAVE_CAMERA_VIEW:
      // Save current camera view under a name
      return {
        ...state,
        cameraViews: {
          ...state.cameraViews,
          [action.payload]: state.cameraViews[state.currentCameraView]
        }
      };
      
    case ActionTypes.LOAD_CAMERA_VIEW:
      // Load a saved camera view
      return {
        ...state,
        currentCameraView: action.payload
      };
      
    case ActionTypes.SET_UI_PREFERENCES:
      return {
        ...state,
        uiPreferences: {
          ...state.uiPreferences,
          ...action.payload
        }
      };
      
    case ActionTypes.SET_BACKGROUND_COLOR:
      return {
        ...state,
        backgroundColor: action.payload
      };
      
    case ActionTypes.SET_FOG:
      return {
        ...state,
        fog: action.payload
      };
      
    case ActionTypes.RESET_SCENE:
      // Reset to initial state, but keep certain user preferences
      const { uiPreferences } = state;
      return {
        ...initialState,
        uiPreferences
      };
      
    case ActionTypes.UNDO:
      // Handle undo - detailed implementation would depend on undo/redo system
      if (state.undoStack.length === 0) return state;
      
      const lastAction = state.undoStack[state.undoStack.length - 1];
      
      return {
        ...state,
        ...lastAction.prevState,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, { 
          action: lastAction.action, 
          prevState: lastAction.newState 
        }]
      };
      
    case ActionTypes.REDO:
      // Handle redo - detailed implementation would depend on undo/redo system
      if (state.redoStack.length === 0) return state;
      
      const nextAction = state.redoStack[state.redoStack.length - 1];
      
      return {
        ...state,
        ...nextAction.prevState,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, { 
          action: nextAction.action, 
          prevState: state.currentState 
        }]
      };
      
    // Handle model actions that affect the scene state
    case ActionTypes.ADD_MODEL:
    case ActionTypes.REMOVE_MODEL:
    case ActionTypes.UPDATE_MODEL_POSITION:
    case ActionTypes.UPDATE_MODEL_ROTATION:
    case ActionTypes.UPDATE_MODEL_SCALE:
    case ActionTypes.DUPLICATE_MODEL:
      // Save current state to undo stack
      // This would be implemented differently in a real application
      // with middleware or thunks to avoid performance issues
      return {
        ...state,
        undoStack: [...state.undoStack, { 
          action, 
          prevState: state,
          newState: null // This would be filled in by middleware
        }],
        redoStack: [] // Clear redo stack on new action
      };
            
    default:
      return state;
  }
};

// Helper function to get room presets
const getRoomPreset = (presetName) => {
  switch (presetName) {
    case 'homeGym':
      return {
        roomDimensions: { width: 6, height: 2.8, depth: 5 },
        wallColor: 0xf5f5f5,
        floorTexture: '/assets/textures/floor/wood.png',
        lighting: {
          ambient: 0.6,
          directional: 0.7,
          directionalPosition: { x: 3, y: 8, z: 4 }
        }
      };
      
    case 'commercialGym':
      return {
        roomDimensions: { width: 15, height: 4, depth: 12 },
        wallColor: 0xe0e0e0,
        floorTexture: '/assets/textures/floor/rubber.png',
        lighting: {
          ambient: 0.7,
          directional: 0.8,
          directionalPosition: { x: 8, y: 15, z: 10 }
        }
      };
      
    case 'studioSpace':
      return {
        roomDimensions: { width: 10, height: 3.5, depth: 8 },
        wallColor: 0xffffff,
        floorTexture: '/assets/textures/floor/studio.png',
        lighting: {
          ambient: 0.8,
          directional: 0.6,
          directionalPosition: { x: 5, y: 10, z: 5 }
        }
      };
      
    default:
      // Default room setup
      return {
        roomDimensions: { width: 10, height: 3, depth: 8 },
        wallColor: 0xffffff,
        floorTexture: '/assets/textures/floor/grid.png',
        lighting: {
          ambient: 0.5,
          directional: 0.8,
          directionalPosition: { x: 5, y: 10, z: 7.5 }
        }
      };
  }
};

export default sceneReducer;