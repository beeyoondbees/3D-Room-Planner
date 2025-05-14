// src/hooks/useModelLoader.js
// Custom hook for loading and managing 3D models in a React component

import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

/**
 * Custom hook for loading 3D models
 * @param {Object} options - Configuration options
 * @param {boolean} options.useDraco - Whether to use Draco compression
 * @param {string} options.dracoPath - Path to Draco decoder
 * @param {boolean} options.useCache - Whether to cache loaded models
 * @returns {Object} - Model loading methods and state
 */
const useModelLoader = (options = {}) => {
  // Default options
  const {
    useDraco = true,
    dracoPath = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
    useCache = true
  } = options;
  
  // State
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  // Refs
  const loaderRef = useRef(null);
  const dracoLoaderRef = useRef(null);
  const modelCacheRef = useRef(new Map());
  const abortControllersRef = useRef(new Map());
  
  // Initialize loaders
  useEffect(() => {
    // Create GLTF loader
    const loader = new GLTFLoader();
    
    // Configure loading manager for progress tracking
    const manager = new THREE.LoadingManager();
    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const percentage = Math.round((itemsLoaded / itemsTotal) * 100);
      setProgress(percentage);
    };
    
    loader.manager = manager;
    
    // Set up Draco decoder if needed
    if (useDraco) {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(dracoPath);
      loader.setDRACOLoader(dracoLoader);
      dracoLoaderRef.current = dracoLoader;
    }
    
    loaderRef.current = loader;
    
    // Cleanup function
    return () => {
      if (dracoLoaderRef.current) {
        dracoLoaderRef.current.dispose();
      }
      
      // Abort any pending loads
      abortControllersRef.current.forEach(controller => {
        controller.abort();
      });
      
      // Clear abort controllers
      abortControllersRef.current.clear();
    };
  }, [useDraco, dracoPath]);
  
  /**
   * Load a model from a URL
   * @param {string} url - URL of the model to load
   * @param {Object} loadOptions - Additional loading options
   * @returns {Promise<THREE.Group>} - The loaded model
   */
  const loadModel = useCallback(async (url, loadOptions = {}) => {
    if (!loaderRef.current) {
      throw new Error('Loader not initialized');
    }
    
    const {
      onProgress = null,
      transformModel = true,
      modelType = null,
      abortSignal = null
    } = loadOptions;
    
    // Check cache first if enabled
    if (useCache && modelCacheRef.current.has(url)) {
      const cachedModel = modelCacheRef.current.get(url);
      return cachedModel.clone();
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Create abort controller if not provided
      let signal = abortSignal;
      if (!signal) {
        const controller = new AbortController();
        signal = controller.signal;
        abortControllersRef.current.set(url, controller);
      }
      
      // Load the model
      return new Promise((resolve, reject) => {
        // Set up abort handling
        const abortHandler = () => {
          reject(new Error('Model loading aborted'));
        };
        
        signal.addEventListener('abort', abortHandler);
        
        loaderRef.current.load(
          url,
          (gltf) => {
            try {
              const model = gltf.scene;
              
              // Post-processing
              if (transformModel) {
                // Add shadow casting to all meshes
                model.traverse((node) => {
                  if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                  }
                });
                
                // Center model if requested
                centerModel(model);
              }
              
              // Store model type if provided
              if (modelType) {
                model.userData.type = modelType;
                model.userData.isModelRoot = true;
              }
              
              // Cache the model if caching is enabled
              if (useCache) {
                modelCacheRef.current.set(url, model.clone());
              }
              
              // Clean up
              signal.removeEventListener('abort', abortHandler);
              if (abortControllersRef.current.has(url)) {
                abortControllersRef.current.delete(url);
              }
              
              setLoading(false);
              resolve(model);
            } catch (err) {
              reject(err);
            }
          },
          // Progress callback
          (progressEvent) => {
            if (onProgress) {
              onProgress(progressEvent);
            }
          },
          // Error callback
          (error) => {
            signal.removeEventListener('abort', abortHandler);
            if (abortControllersRef.current.has(url)) {
              abortControllersRef.current.delete(url);
            }
            
            setError(error);
            setLoading(false);
            reject(error);
          }
        );
      });
    } catch (error) {
      setError(error);
      setLoading(false);
      throw error;
    }
  }, [useCache]);
  
  /**
   * Create a placeholder model for development or when loading fails
   * @param {string} modelType - Type of model
   * @param {Object} dimensions - Model dimensions
   * @returns {THREE.Group} - Placeholder model
   */
  const createPlaceholderModel = useCallback((modelType, dimensions = { width: 1, height: 0.5, depth: 1 }) => {
    // Create a simple box geometry
    const geometry = new THREE.BoxGeometry(
      dimensions.width,
      dimensions.height,
      dimensions.depth
    );
    
    // Create a material with a random color
    const material = new THREE.MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      roughness: 0.7,
      metalness: 0.2
    });
    
    // Create the mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Create a group to hold the mesh (to mimic GLTF structure)
    const group = new THREE.Group();
    group.add(mesh);
    
    // Position it so bottom is at y=0
    mesh.position.y = dimensions.height / 2;
    
    // Add model type to userData
    group.userData.type = modelType;
    group.userData.isModelRoot = true;
    group.userData.isPlaceholder = true;
    group.userData.dimensions = dimensions;
    
    // Add a label with the model type
    addPlaceholderLabel(group, modelType);
    
    return group;
  }, []);
  
  /**
   * Preload multiple models
   * @param {Array<string>} urls - Array of URLs to preload
   * @returns {Promise<Map<string, THREE.Group>>} - Map of loaded models
   */
  const preloadModels = useCallback(async (urls) => {
    if (!urls || urls.length === 0) {
      return new Map();
    }
    
    const loadPromises = urls.map(url => loadModel(url));
    const models = await Promise.all(loadPromises);
    
    // Create a map of URL to model
    const modelMap = new Map();
    urls.forEach((url, index) => {
      modelMap.set(url, models[index]);
    });
    
    return modelMap;
  }, [loadModel]);
  
  /**
   * Clear the model cache
   */
  const clearCache = useCallback(() => {
    modelCacheRef.current.clear();
  }, []);
  
  /**
   * Abort loading of a specific model
   * @param {string} url - URL of the model to abort
   */
  const abortLoading = useCallback((url) => {
    if (abortControllersRef.current.has(url)) {
      abortControllersRef.current.get(url).abort();
      abortControllersRef.current.delete(url);
    }
  }, []);
  
  /**
   * Clone a loaded model
   * @param {THREE.Object3D} model - Model to clone
   * @returns {THREE.Object3D} - Cloned model
   */
  const cloneModel = useCallback((model) => {
    if (!model) return null;
    
    const clone = model.clone();
    
    // Clone materials to avoid shared materials
    clone.traverse((node) => {
      if (node.isMesh && node.material) {
        if (Array.isArray(node.material)) {
          node.material = node.material.map(mat => mat.clone());
        } else {
          node.material = node.material.clone();
        }
      }
    });
    
    // Clone userData
    clone.userData = JSON.parse(JSON.stringify(model.userData));
    
    return clone;
  }, []);
  
  // Helper functions
  
  /**
   * Center a model on its base
   * @param {THREE.Object3D} model - Model to center
   */
  const centerModel = (model) => {
    // Calculate bounding box
    const bbox = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    
    // Get dimensions
    bbox.getCenter(center);
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y;
    const depth = bbox.max.z - bbox.min.z;
    
    // Center horizontally, place bottom at y=0
    model.position.x = -center.x;
    model.position.y = -bbox.min.y;
    model.position.z = -center.z;
    
    // Store actual dimensions in userData
    model.userData.actualDimensions = { width, height, depth };
  };
  
  /**
   * Add a text label to placeholder models
   * @param {THREE.Group} group - Group to add label to
   * @param {string} text - Label text
   */
  const addPlaceholderLabel = (group, text) => {
    // Create a canvas for the texture
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.font = 'bold 24px Arial';
    context.fillStyle = '#000000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create a plane geometry for the label
    const labelGeometry = new THREE.PlaneGeometry(1, 0.25);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true
    });
    
    // Create the label mesh
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    
    // Position the label above the model
    const dimensions = group.userData.dimensions || { height: 0.5 };
    label.position.y = dimensions.height + 0.3;
    label.rotation.x = -Math.PI / 4;
    
    // Add to the group
    group.add(label);
  };
  
  return {
    loadModel,
    preloadModels,
    createPlaceholderModel,
    cloneModel,
    clearCache,
    abortLoading,
    loading,
    progress,
    error
  };
};

export default useModelLoader;