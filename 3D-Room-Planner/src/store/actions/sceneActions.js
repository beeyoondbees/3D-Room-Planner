// src/store/actions/sceneActions.js
// Action creators for scene-related operations

import * as ActionTypes from '../actionTypes';

// Set the view mode (2D or 3D)
export const setViewMode = (mode) => ({
  type: ActionTypes.SET_VIEW_MODE,
  payload: mode
});

// Toggle grid visibility
export const toggleGridVisibility = () => ({
  type: ActionTypes.TOGGLE_GRID_VISIBILITY
});

// Set grid visibility explicitly
export const setGridVisibility = (visible) => ({
  type: ActionTypes.SET_GRID_VISIBILITY,
  payload: visible
});

// Change room dimensions
export const setRoomDimensions = (width, height, depth) => ({
  type: ActionTypes.SET_ROOM_DIMENSIONS,
  payload: { width, height, depth }
});

// Set room wall color
export const setWallColor = (color) => ({
  type: ActionTypes.SET_WALL_COLOR,
  payload: color
});

// Set room floor texture
export const setFloorTexture = (texturePath) => ({
  type: ActionTypes.SET_FLOOR_TEXTURE,
  payload: texturePath
});

// Toggle ceiling visibility
export const toggleCeiling = () => ({
  type: ActionTypes.TOGGLE_CEILING
});

// Apply a preset room configuration
export const applyRoomPreset = (presetName) => ({
  type: ActionTypes.APPLY_ROOM_PRESET,
  payload: presetName
});

// Set camera position
export const setCameraPosition = (position, target) => ({
  type: ActionTypes.SET_CAMERA_POSITION,
  payload: { position, target }
});

// Reset camera to default position
export const resetCamera = () => ({
  type: ActionTypes.RESET_CAMERA
});

// Set transform mode (translate, rotate, scale)
export const setTransformMode = (mode) => ({
  type: ActionTypes.SET_TRANSFORM_MODE,
  payload: mode
});

// Toggle transform mode (cycle through translate, rotate, scale)
export const toggleTransformMode = () => ({
  type: ActionTypes.TOGGLE_TRANSFORM_MODE
});

// Toggle snap to grid
export const toggleSnap = () => ({
  type: ActionTypes.TOGGLE_SNAP
});

// Set snap values
export const setSnapValues = (translation, rotation, scale) => ({
  type: ActionTypes.SET_SNAP_VALUES,
  payload: { translation, rotation, scale }
});

// Toggle local/world space for transforms
export const toggleTransformSpace = () => ({
  type: ActionTypes.TOGGLE_TRANSFORM_SPACE
});

// Set shadow quality
export const setShadowQuality = (quality) => ({
  type: ActionTypes.SET_SHADOW_QUALITY,
  payload: quality
});

// Toggle shadows on/off
export const toggleShadows = () => ({
  type: ActionTypes.TOGGLE_SHADOWS
});

// Set rendering quality (affects antialiasing, texture quality, etc.)
export const setRenderingQuality = (quality) => ({
  type: ActionTypes.SET_RENDERING_QUALITY,
  payload: quality
});

// Set ambient light intensity
export const setAmbientLight = (intensity) => ({
  type: ActionTypes.SET_AMBIENT_LIGHT,
  payload: intensity
});

// Set directional light intensity and position
export const setDirectionalLight = (intensity, position) => ({
  type: ActionTypes.SET_DIRECTIONAL_LIGHT,
  payload: { intensity, position }
});

// Take a screenshot of the scene
export const takeScreenshot = () => ({
  type: ActionTypes.TAKE_SCREENSHOT
});

// Save camera position with a name
export const saveCameraView = (name) => ({
  type: ActionTypes.SAVE_CAMERA_VIEW,
  payload: name
});

// Load a saved camera view
export const loadCameraView = (name) => ({
  type: ActionTypes.LOAD_CAMERA_VIEW,
  payload: name
});

// Undo the last action
export const undo = () => ({
  type: ActionTypes.UNDO
});

// Redo the last undone action
export const redo = () => ({
  type: ActionTypes.REDO
});

// Reset the scene to initial state
export const resetScene = () => ({
  type: ActionTypes.RESET_SCENE
});

// Set UI preferences
export const setUIPreferences = (preferences) => ({
  type: ActionTypes.SET_UI_PREFERENCES,
  payload: preferences
});

// Set scene background color
export const setBackgroundColor = (color) => ({
  type: ActionTypes.SET_BACKGROUND_COLOR,
  payload: color
});

// Set scene fog parameters
export const setFog = (enabled, color, near, far) => ({
  type: ActionTypes.SET_FOG,
  payload: { enabled, color, near, far }
});

// Thunk action to zoom to fit selection
export const zoomToFit = (object, offset = 1.25) => {
  return (dispatch, getState, { sceneManager }) => {
    // This is a thunk that accesses the sceneManager 
    // to perform the zoom operation
    if (sceneManager && sceneManager.orbitControls) {
      sceneManager.orbitControls.zoomToFit(object, offset);
      
      // Dispatch a regular action to update the state if needed
      dispatch({
        type: ActionTypes.ZOOM_TO_FIT,
        payload: { object, offset }
      });
    }
  };
};

// Thunk to perform a room size update with collision check
export const updateRoomSize = (width, height, depth) => {
  return (dispatch, getState, { sceneManager }) => {
    // Check if any objects would be outside the new room dimensions
    const outOfBoundsObjects = sceneManager.checkRoomBounds(width, height, depth);
    
    if (outOfBoundsObjects.length > 0) {
      // Some objects would be outside the new room
      dispatch({
        type: ActionTypes.ROOM_RESIZE_CONFLICT,
        payload: { width, height, depth, outOfBoundsObjects }
      });
    } else {
      // No conflicts, proceed with resize
      sceneManager.changeRoomSize(width, height, depth);
      
      dispatch({
        type: ActionTypes.SET_ROOM_DIMENSIONS,
        payload: { width, height, depth }
      });
    }
  };
};