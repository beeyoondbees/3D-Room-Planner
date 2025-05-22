// src/store/reducers/modelReducer.js
// Reducer for model-related state

import * as ActionTypes from '../actionTypes';
import { v4 as uuidv4 } from 'uuid';

// Initial state for models
const initialState = {
  models: {}, // Map of model ID to model data
  selectedModelIds: [], // Currently selected model IDs
  hoveredModelId: null, // Currently hovered model ID
  nextModelId: 1, // Counter for generating sequential IDs (if not using UUID)
  groups: {}, // Model groups
  layers: {
    default: {
      name: 'Default',
      visible: true,
      locked: false,
      color: '#cccccc',
      models: [] // Array of model IDs in this layer
    }
  },
  activeLayer: 'default',
  visibleLayers: ['default'], // Array of visible layer IDs
  clipboard: null // For copy/paste operations
};

// Helper function to generate a unique ID
const generateModelId = () => {
  return uuidv4();
};

// Helper functions for immutable state updates
const updateModelProperty = (state, modelId, property, value) => {
  if (!state.models[modelId]) return state;
  
  return {
    ...state,
    models: {
      ...state.models,
      [modelId]: {
        ...state.models[modelId],
        [property]: value
      }
    }
  };
};

const updateModelTransform = (state, modelId, transformType, value) => {
  if (!state.models[modelId]) return state;
  
  return {
    ...state,
    models: {
      ...state.models,
      [modelId]: {
        ...state.models[modelId],
        transform: {
          ...state.models[modelId].transform,
          [transformType]: value
        }
      }
    }
  };
};

// Main reducer function
const modelReducer = (state = initialState, action) => {
  switch (action.type) {
    case ActionTypes.ADD_MODEL: {
      // Generate a unique ID for the new model
      const modelId = generateModelId();
      const { modelType, position } = action.payload;
      
      // Get the activeLayer
      const layerId = state.activeLayer;
      
      // Create new model
      const newModel = {
        id: modelId,
        type: modelType,
        name: `${modelType.charAt(0).toUpperCase() + modelType.slice(1)} ${state.nextModelId}`,
        transform: {
          position: position || { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        visible: true,
        locked: false,
        layer: layerId,
        properties: {},
        animation: {
          enabled: false,
          speed: 1.0
        },
        collisions: true // Whether this model participates in collision detection
      };
      
      // Update layer models
      const updatedLayers = {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          models: [...state.layers[layerId].models, modelId]
        }
      };
      
      return {
        ...state,
        models: {
          ...state.models,
          [modelId]: newModel
        },
        nextModelId: state.nextModelId + 1,
        selectedModelIds: [modelId], // Select the newly added model
        layers: updatedLayers
      };
    }
    
    case ActionTypes.REMOVE_MODEL: {
      const modelId = action.payload;
      
      if (!state.models[modelId]) return state;
      
      // Get the layer this model belongs to
      const layerId = state.models[modelId].layer;
      
      // Create a copy of the models object without the removed model
      const { [modelId]: removedModel, ...remainingModels } = state.models;
      
      // Remove the model from its layer
      const updatedLayers = {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          models: state.layers[layerId].models.filter(id => id !== modelId)
        }
      };
      
      // If the model was selected, remove it from selection
      const updatedSelection = state.selectedModelIds.filter(id => id !== modelId);
      
      // If the model was hovered, clear hover state
      const updatedHover = state.hoveredModelId === modelId ? null : state.hoveredModelId;
      
      return {
        ...state,
        models: remainingModels,
        selectedModelIds: updatedSelection,
        hoveredModelId: updatedHover,
        layers: updatedLayers
      };
    }
    
    case ActionTypes.UPDATE_MODEL_POSITION: {
      const { modelId, position } = action.payload;
      return updateModelTransform(state, modelId, 'position', position);
    }
    
    case ActionTypes.UPDATE_MODEL_ROTATION: {
      const { modelId, rotation } = action.payload;
      return updateModelTransform(state, modelId, 'rotation', rotation);
    }
    
    case ActionTypes.UPDATE_MODEL_SCALE: {
      const { modelId, scale } = action.payload;
      return updateModelTransform(state, modelId, 'scale', scale);
    }
    
    case ActionTypes.DUPLICATE_MODEL: {
      // This might be a model ID or an object with modelId and position
      const modelId = typeof action.payload === 'string' ? 
        action.payload : action.payload.modelId;
      
      const newPosition = typeof action.payload === 'object' ? 
        action.payload.newPosition : null;
      
      // If the model doesn't exist, return unchanged state
      if (!state.models[modelId]) return state;
      
      // Generate a unique ID for the duplicate
      const duplicateId = generateModelId();
      
      // Create a copy of the model with new ID
      const sourceModel = state.models[modelId];
      const duplicatedModel = {
        ...JSON.parse(JSON.stringify(sourceModel)), // Deep clone
        id: duplicateId,
        name: `${sourceModel.name} (Copy)`,
      };
      
      // Update position if provided
      if (newPosition) {
        duplicatedModel.transform.position = newPosition;
      } else {
        // Add a small offset to avoid exact overlap
        duplicatedModel.transform.position = {
          x: sourceModel.transform.position.x + 0.5,
          y: sourceModel.transform.position.y,
          z: sourceModel.transform.position.z + 0.5
        };
      }
      
      // Get the layer this model belongs to
      const layerId = sourceModel.layer;
      
      // Add the model to its layer
      const updatedLayers = {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          models: [...state.layers[layerId].models, duplicateId]
        }
      };
      
      return {
        ...state,
        models: {
          ...state.models,
          [duplicateId]: duplicatedModel
        },
        selectedModelIds: [duplicateId], // Select the newly duplicated model
        layers: updatedLayers
      };
    }
    
    case ActionTypes.SELECT_MODEL: {
      const modelId = action.payload;
      
      // If the model doesn't exist, return unchanged state
      if (!state.models[modelId]) return state;
      
      return {
        ...state,
        selectedModelIds: [modelId],
        hoveredModelId: null // Clear hover state when selecting
      };
    }
    
    case ActionTypes.SELECT_MULTIPLE_MODELS: {
      const modelIds = action.payload;
      
      // Filter out any IDs that don't correspond to actual models
      const validModelIds = modelIds.filter(id => state.models[id]);
      
      return {
        ...state,
        selectedModelIds: validModelIds,
        hoveredModelId: null // Clear hover state when selecting
      };
    }
    
    case ActionTypes.DESELECT_MODEL: {
      return {
        ...state,
        selectedModelIds: []
      };
    }
    
    case ActionTypes.SET_MODEL_ANIMATION: {
      const { modelId, animate } = action.payload;
      
      if (!state.models[modelId]) return state;
      
      return {
        ...state,
        models: {
          ...state.models,
          [modelId]: {
            ...state.models[modelId],
            animation: {
              ...state.models[modelId].animation,
              enabled: animate
            }
          }
        }
      };
    }
    
    case ActionTypes.UPDATE_MODEL_PROPERTIES: {
      const { modelId, properties } = action.payload;
      
      if (!state.models[modelId]) return state;
      
      return {
        ...state,
        models: {
          ...state.models,
          [modelId]: {
            ...state.models[modelId],
            properties: {
              ...state.models[modelId].properties,
              ...properties
            }
          }
        }
      };
    }
    
    case ActionTypes.GROUP_MODELS: {
      const modelIds = action.payload;
      
      // Generate a unique ID for the group
      const groupId = `group-${uuidv4()}`;
      
      // Create the group
      const newGroup = {
        id: groupId,
        name: `Group ${Object.keys(state.groups).length + 1}`,
        modelIds: modelIds,
        visible: true,
        locked: false
      };
      
      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: newGroup
        },
        selectedModelIds: [groupId] // Select the new group
      };
    }
    
    case ActionTypes.UNGROUP_MODELS: {
      const groupId = action.payload;
      
      if (!state.groups[groupId]) return state;
      
      // Get the model IDs in the group
      const modelIds = state.groups[groupId].modelIds;
      
      // Create a copy of the groups object without the removed group
      const { [groupId]: removedGroup, ...remainingGroups } = state.groups;
      
      return {
        ...state,
        groups: remainingGroups,
        selectedModelIds: modelIds // Select all models that were in the group
      };
    }
    
    case ActionTypes.LOCK_MODEL: {
      const modelId = action.payload;
      return updateModelProperty(state, modelId, 'locked', true);
    }
    
    case ActionTypes.UNLOCK_MODEL: {
      const modelId = action.payload;
      return updateModelProperty(state, modelId, 'locked', false);
    }
    
    case ActionTypes.HIDE_MODEL: {
      const modelId = action.payload;
      return updateModelProperty(state, modelId, 'visible', false);
    }
    
    case ActionTypes.SHOW_MODEL: {
      const modelId = action.payload;
      return updateModelProperty(state, modelId, 'visible', true);
    }
    
    case ActionTypes.SET_MODEL_LAYER: {
      const { modelId, layer } = action.payload;
      
      if (!state.models[modelId] || !state.layers[layer]) return state;
      
      // Get the current layer of the model
      const currentLayer = state.models[modelId].layer;
      
      // Remove the model from its current layer
      const updatedLayers = {
        ...state.layers,
        [currentLayer]: {
          ...state.layers[currentLayer],
          models: state.layers[currentLayer].models.filter(id => id !== modelId)
        },
        [layer]: {
          ...state.layers[layer],
          models: [...state.layers[layer].models, modelId]
        }
      };
      
      return {
        ...state,
        models: {
          ...state.models,
          [modelId]: {
            ...state.models[modelId],
            layer
          }
        },
        layers: updatedLayers
      };
    }
    
    case ActionTypes.SET_MODEL_MATERIAL: {
      const { modelId, material } = action.payload;
      return updateModelProperty(state, modelId, 'material', material);
    }
    
    case ActionTypes.RESET_MODEL_TRANSFORM: {
      const modelId = action.payload;
      
      if (!state.models[modelId]) return state;
      
      return {
        ...state,
        models: {
          ...state.models,
          [modelId]: {
            ...state.models[modelId],
            transform: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 }
            }
          }
        }
      };
    }
    
    case ActionTypes.APPLY_MODEL_PRESET: {
      const { modelId, presetName } = action.payload;
      
      if (!state.models[modelId]) return state;
      
      // Get the preset configuration
      const preset = getModelPreset(presetName, state.models[modelId].type);
      
      return {
        ...state,
        models: {
          ...state.models,
          [modelId]: {
            ...state.models[modelId],
            ...preset
          }
        }
      };
    }
    
    case ActionTypes.ALIGN_MODELS: {
      const { modelIds, alignment } = action.payload;
      
      if (modelIds.length <= 1) return state; // Need at least 2 models to align
      
      // Filter to valid model IDs
      const validModelIds = modelIds.filter(id => state.models[id]);
      if (validModelIds.length <= 1) return state;
      
      // Calculate alignment position
      let alignPosition;
      const models = validModelIds.map(id => state.models[id]);
      
      switch (alignment) {
        case 'left': {
          // Find the leftmost X position (minimum X)
          const minX = Math.min(...models.map(model => model.transform.position.x));
          alignPosition = position => ({ ...position, x: minX });
          break;
        }
        case 'right': {
          // Find the rightmost X position (maximum X)
          const maxX = Math.max(...models.map(model => model.transform.position.x));
          alignPosition = position => ({ ...position, x: maxX });
          break;
        }
        case 'top': {
          // Find the topmost Z position (minimum Z)
          const minZ = Math.min(...models.map(model => model.transform.position.z));
          alignPosition = position => ({ ...position, z: minZ });
          break;
        }
        case 'bottom': {
          // Find the bottommost Z position (maximum Z)
          const maxZ = Math.max(...models.map(model => model.transform.position.z));
          alignPosition = position => ({ ...position, z: maxZ });
          break;
        }
        case 'center-x': {
          // Find the average X position
          const avgX = models.reduce((sum, model) => sum + model.transform.position.x, 0) / models.length;
          alignPosition = position => ({ ...position, x: avgX });
          break;
        }
        case 'center-z': {
          // Find the average Z position
          const avgZ = models.reduce((sum, model) => sum + model.transform.position.z, 0) / models.length;
          alignPosition = position => ({ ...position, z: avgZ });
          break;
        }
        default:
          return state;
      }
      
      // Update positions for all models
      const updatedModels = {};
      validModelIds.forEach(id => {
        updatedModels[id] = {
          ...state.models[id],
          transform: {
            ...state.models[id].transform,
            position: alignPosition(state.models[id].transform.position)
          }
        };
      });
      
      return {
        ...state,
        models: {
          ...state.models,
          ...updatedModels
        }
      };
    }
    
    case ActionTypes.DISTRIBUTE_MODELS: {
      const { modelIds, axis } = action.payload;
      
      if (modelIds.length <= 2) return state; // Need at least 3 models to distribute
      
      // Filter to valid model IDs
      const validModelIds = modelIds.filter(id => state.models[id]);
      if (validModelIds.length <= 2) return state;
      
      // Get models
      const models = validModelIds.map(id => ({
        id,
        ...state.models[id]
      }));
      
      // Sort models by position on the specified axis
      let sortedModels;
      if (axis === 'x') {
        sortedModels = [...models].sort((a, b) => 
          a.transform.position.x - b.transform.position.x
        );
      } else if (axis === 'z') {
        sortedModels = [...models].sort((a, b) => 
          a.transform.position.z - b.transform.position.z
        );
      } else {
        return state;
      }
      
      // Get the first and last model positions
      const firstPos = axis === 'x' 
        ? sortedModels[0].transform.position.x 
        : sortedModels[0].transform.position.z;
      
      const lastPos = axis === 'x' 
        ? sortedModels[sortedModels.length - 1].transform.position.x 
        : sortedModels[sortedModels.length - 1].transform.position.z;
      
      // Calculate the step between each model
      const step = (lastPos - firstPos) / (sortedModels.length - 1);
      
      // Update positions for all models except first and last
      const updatedModels = {};
      for (let i = 1; i < sortedModels.length - 1; i++) {
        const id = sortedModels[i].id;
        const newPos = firstPos + (step * i);
        
        updatedModels[id] = {
          ...state.models[id],
          transform: {
            ...state.models[id].transform,
            position: axis === 'x'
              ? { ...state.models[id].transform.position, x: newPos }
              : { ...state.models[id].transform.position, z: newPos }
          }
        };
      }
      
      return {
        ...state,
        models: {
          ...state.models,
          ...updatedModels
        }
      };
    }
    
    case ActionTypes.ADD_MODEL_LABEL: {
      const { modelId, label } = action.payload;
      
      if (!state.models[modelId]) return state;
      
      return {
        ...state,
        models: {
          ...state.models,
          [modelId]: {
            ...state.models[modelId],
            label
          }
        }
      };
    }
    
    case ActionTypes.UPDATE_MODEL_LABEL: {
      const { modelId, label } = action.payload;
      
      if (!state.models[modelId]) return state;
      
      return {
        ...state,
        models: {
          ...state.models,
          [modelId]: {
            ...state.models[modelId],
            label
          }
        }
      };
    }
    
    case ActionTypes.REMOVE_MODEL_LABEL: {
      const modelId = action.payload;
      
      if (!state.models[modelId]) return state;
      
      // Create a copy of the model without the label property
      const { label, ...modelWithoutLabel } = state.models[modelId];
      
      return {
        ...state,
        models: {
          ...state.models,
          [modelId]: modelWithoutLabel
        }
      };
    }
    
    case ActionTypes.RESET_SCENE: {
      // Reset models but keep layers and groups structure
      return {
        ...initialState,
        layers: state.layers,
        groups: {}
      };
    }
    
    default:
      return state;
  }
};

// Helper function to get model presets based on model type
const getModelPreset = (presetName, modelType) => {
  // This would contain predefined configurations for different model types
  const presets = {
    treadmill: {
      standard: {
        properties: {
          maxSpeed: 12,
          incline: 10,
          programs: 12
        },
        animation: {
          enabled: true,
          speed: 1.0
        }
      },
      professional: {
        properties: {
          maxSpeed: 20,
          incline: 15,
          programs: 20
        },
        animation: {
          enabled: true,
          speed: 1.5
        }
      }
    },
    bench: {
      flat: {
        properties: {
          adjustable: false,
          maxWeight: 300
        }
      },
      adjustable: {
        properties: {
          adjustable: true,
          positions: 7,
          maxWeight: 400
        }
      }
    }
    // Add more presets for other model types
  };
  
  // Return the preset if it exists for the model type
  if (presets[modelType] && presets[modelType][presetName]) {
    return presets[modelType][presetName];
  }
  
  // Return empty object if preset not found
  return {};
};

export default modelReducer;