// src/store/actions/modelActions.js
// Action creators for model-related operations

import * as ActionTypes from '../actionTypes';

// Add a new model to the scene
export const addModel = (modelType, position) => ({
  type: ActionTypes.ADD_MODEL,
  payload: { modelType, position }
});

// Remove a model from the scene
export const removeModel = (modelId) => ({
  type: ActionTypes.REMOVE_MODEL,
  payload: modelId
});

// Update a model's position
export const updateModelPosition = (modelId, position) => ({
  type: ActionTypes.UPDATE_MODEL_POSITION,
  payload: { modelId, position }
});

// Update a model's rotation
export const updateModelRotation = (modelId, rotation) => ({
  type: ActionTypes.UPDATE_MODEL_ROTATION,
  payload: { modelId, rotation }
});

// Update a model's scale
export const updateModelScale = (modelId, scale) => ({
  type: ActionTypes.UPDATE_MODEL_SCALE,
  payload: { modelId, scale }
});

// Duplicate a model
export const duplicateModel = (modelId) => ({
  type: ActionTypes.DUPLICATE_MODEL,
  payload: modelId
});

// Select a model
export const selectModel = (modelId) => ({
  type: ActionTypes.SELECT_MODEL,
  payload: modelId
});

// Deselect the currently selected model
export const deselectModel = () => ({
  type: ActionTypes.DESELECT_MODEL
});

// Set model animation state
export const setModelAnimation = (modelId, animate) => ({
  type: ActionTypes.SET_MODEL_ANIMATION,
  payload: { modelId, animate }
});

// Update model properties
export const updateModelProperties = (modelId, properties) => ({
  type: ActionTypes.UPDATE_MODEL_PROPERTIES,
  payload: { modelId, properties }
});

// Group selected models
export const groupModels = (modelIds) => ({
  type: ActionTypes.GROUP_MODELS,
  payload: modelIds
});

// Ungroup a model group
export const ungroupModels = (groupId) => ({
  type: ActionTypes.UNGROUP_MODELS,
  payload: groupId
});

// Lock a model (prevent selection/editing)
export const lockModel = (modelId) => ({
  type: ActionTypes.LOCK_MODEL,
  payload: modelId
});

// Unlock a model
export const unlockModel = (modelId) => ({
  type: ActionTypes.UNLOCK_MODEL,
  payload: modelId
});

// Hide a model
export const hideModel = (modelId) => ({
  type: ActionTypes.HIDE_MODEL,
  payload: modelId
});

// Show a model
export const showModel = (modelId) => ({
  type: ActionTypes.SHOW_MODEL,
  payload: modelId
});

// Set model layer
export const setModelLayer = (modelId, layer) => ({
  type: ActionTypes.SET_MODEL_LAYER,
  payload: { modelId, layer }
});

// Set model color/material
export const setModelMaterial = (modelId, material) => ({
  type: ActionTypes.SET_MODEL_MATERIAL,
  payload: { modelId, material }
});

// Reset model transform to default
export const resetModelTransform = (modelId) => ({
  type: ActionTypes.RESET_MODEL_TRANSFORM,
  payload: modelId
});

// Apply a preset configuration to a model
export const applyModelPreset = (modelId, presetName) => ({
  type: ActionTypes.APPLY_MODEL_PRESET,
  payload: { modelId, presetName }
});

// Align models (left, right, top, bottom, center)
export const alignModels = (modelIds, alignment) => ({
  type: ActionTypes.ALIGN_MODELS,
  payload: { modelIds, alignment }
});

// Distribute models evenly
export const distributeModels = (modelIds, axis) => ({
  type: ActionTypes.DISTRIBUTE_MODELS,
  payload: { modelIds, axis }
});

// Add a label to a model
export const addModelLabel = (modelId, label) => ({
  type: ActionTypes.ADD_MODEL_LABEL,
  payload: { modelId, label }
});

// Update model label
export const updateModelLabel = (modelId, label) => ({
  type: ActionTypes.UPDATE_MODEL_LABEL,
  payload: { modelId, label }
});

// Remove model label
export const removeModelLabel = (modelId) => ({
  type: ActionTypes.REMOVE_MODEL_LABEL,
  payload: modelId
});

// Thunk for adding a model with offset to avoid collisions
export const addModelWithOffset = (modelType) => {
  return (dispatch, getState, { sceneManager }) => {
    const position = sceneManager.findEmptyPosition(modelType);
    
    sceneManager.addModel(modelType, position);
    
    dispatch({
      type: ActionTypes.ADD_MODEL,
      payload: { modelType, position }
    });
  };
};

// Thunk for smart duplicate that avoids collisions
export const smartDuplicate = (modelId) => {
  return (dispatch, getState, { sceneManager }) => {
    const model = sceneManager.findModelById(modelId);
    
    if (model) {
      // Find a position without collisions
      const newPosition = sceneManager.findNearbyEmptyPosition(model);
      
      sceneManager.duplicateObjectWithPosition(model, newPosition);
      
      dispatch({
        type: ActionTypes.DUPLICATE_MODEL,
        payload: { modelId, newPosition }
      });
    }
  };
};

// Thunk for checking collisions when moving a model
export const moveModelWithCollisionCheck = (modelId, position) => {
  return (dispatch, getState, { sceneManager }) => {
    const model = sceneManager.findModelById(modelId);
    
    if (model) {
      // Check for collisions at the new position
      const collisions = sceneManager.checkCollisionsAtPosition(model, position);
      
      if (collisions.length > 0) {
        // There are collisions, dispatch a warning action
        dispatch({
          type: ActionTypes.MODEL_MOVE_COLLISION,
          payload: { modelId, position, collisions }
        });
      } else {
        // No collisions, proceed with move
        sceneManager.moveObject(model, position);
        
        dispatch({
          type: ActionTypes.UPDATE_MODEL_POSITION,
          payload: { modelId, position }
        });
      }
    }
  };
};

// Thunk for selecting the next model in sequence (cycling through models)
export const selectNextModel = () => {
  return (dispatch, getState, { sceneManager }) => {
    const nextModel = sceneManager.getNextSelectableModel();
    
    if (nextModel) {
      sceneManager.selectObject(nextModel);
      
      dispatch({
        type: ActionTypes.SELECT_MODEL,
        payload: nextModel.id
      });
    }
  };
};

// Thunk for selecting the previous model in sequence
export const selectPreviousModel = () => {
  return (dispatch, getState, { sceneManager }) => {
    const prevModel = sceneManager.getPreviousSelectableModel();
    
    if (prevModel) {
      sceneManager.selectObject(prevModel);
      
      dispatch({
        type: ActionTypes.SELECT_MODEL,
        payload: prevModel.id
      });
    }
  };
};

// Thunk for selecting all models
export const selectAllModels = () => {
  return (dispatch, getState, { sceneManager }) => {
    const allModels = sceneManager.getAllSelectableModels();
    
    if (allModels.length > 0) {
      dispatch({
        type: ActionTypes.SELECT_MULTIPLE_MODELS,
        payload: allModels.map(model => model.id)
      });
    }
  };
};