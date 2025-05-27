// src/three/ModelLoader.js
// Enhanced Three.js model loader with fixed duplicate function and backward compatibility

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export class ModelLoader {
  constructor(options = {}) {
    // Configuration
    this.config = {
      enableCache: true,
      enableDraco: true,
      enableKTX2: true,
      enableMeshopt: true,
      maxConcurrentLoads: 3,
      enablePreprocessing: true,
      enableInstancing: true,
      cacheSizeLimit: 100,
      enableProgressTracking: true,
      enableMemoryTracking: true,
      autoOptimizeMaterials: true,
      enableLOD: false,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    };

    // Core loaders - maintain original structure for compatibility
    this.loader = new GLTFLoader();
    this.gltfLoader = this.loader; // Alias for enhanced features
    this.dracoLoader = null;
    this.ktx2Loader = null;
    this.loadingManager = new THREE.LoadingManager();

    // Storage maps - maintain original structure
    this.models = new Map(); // Cached models
    this.animations = new Map(); // Animations per model type (original structure)
    this.mixers = new Map(); // AnimationMixer per model instance (original structure)
    
    // Enhanced storage
    this.instances = new Map(); // Track model instances
    this.loadingQueue = new Map(); // Active loading operations
    this.preprocessors = new Map(); // Model preprocessors
    
    // Performance tracking
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0,
      loadTimes: [],
      averageLoadTime: 0
    };

    // Loading state
    this.activeLoads = 0;
    this.loadQueue = [];

    // Event listeners
    this.eventListeners = new Map();

    // Initialize
    this.init();
  }

  async init() {
    console.log('ModelLoader: Initializing enhanced model loader...');

    try {
      // Setup loading manager
      this.setupLoadingManager();
      
      // Initialize loaders
      await this.initializeLoaders();
      
      // Setup default preprocessors
      this.setupDefaultPreprocessors();
      
      console.log('ModelLoader: Initialization complete');
      this.dispatchEvent('loader-initialized');
      
    } catch (error) {
      console.error('ModelLoader: Initialization failed:', error);
      this.dispatchEvent('loader-initialization-error', { error });
    }
  }

  setupLoadingManager() {
    this.loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
      this.dispatchEvent('loading-start', { url, itemsLoaded, itemsTotal });
    };

    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = itemsTotal > 0 ? (itemsLoaded / itemsTotal) * 100 : 0;
      this.dispatchEvent('loading-progress', { url, itemsLoaded, itemsTotal, progress });
    };

    this.loadingManager.onLoad = () => {
      this.dispatchEvent('loading-complete');
    };

    this.loadingManager.onError = (url) => {
      console.error('ModelLoader: Loading manager error:', url);
      this.dispatchEvent('loading-error', { url });
    };
  }

  async initializeLoaders() {
    // Setup DRACO loader
    if (this.config.enableDraco) {
      try {
        this.dracoLoader = new DRACOLoader(this.loadingManager);
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        this.dracoLoader.preload();
        this.loader.setDRACOLoader(this.dracoLoader);
        console.log('ModelLoader: DRACO loader initialized');
      } catch (error) {
        console.warn('ModelLoader: DRACO loader setup failed:', error);
        this.config.enableDraco = false;
      }
    }

    // Setup KTX2 loader
    if (this.config.enableKTX2) {
      try {
        this.ktx2Loader = new KTX2Loader(this.loadingManager);
        this.ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/');
        this.loader.setKTX2Loader(this.ktx2Loader);
        console.log('ModelLoader: KTX2 loader initialized');
      } catch (error) {
        console.warn('ModelLoader: KTX2 loader setup failed:', error);
        this.config.enableKTX2 = false;
      }
    }

    // Setup Meshopt decoder
    if (this.config.enableMeshopt) {
      try {
        this.loader.setMeshoptDecoder(MeshoptDecoder);
        console.log('ModelLoader: Meshopt decoder initialized');
      } catch (error) {
        console.warn('ModelLoader: Meshopt decoder setup failed:', error);
        this.config.enableMeshopt = false;
      }
    }
  }

  setupDefaultPreprocessors() {
    // Material optimization preprocessor
    this.addPreprocessor('optimizeMaterials', (model, options) => {
      if (!this.config.autoOptimizeMaterials) return model;
      
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(material => {
            if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
              // Optimize material settings
              if (material.normalMap && material.normalScale) {
                material.normalScale.setScalar(0.5);
              }
              
              // Enable frustum culling
              material.frustumCulled = true;
              
              // Optimize shadow settings
              if (options.castShadow !== undefined) child.castShadow = options.castShadow;
              if (options.receiveShadow !== undefined) child.receiveShadow = options.receiveShadow;
            }
          });
        }
      });
      
      return model;
    });

    // Geometry optimization preprocessor
    this.addPreprocessor('optimizeGeometry', (model, options) => {
      model.traverse((child) => {
        if (child.isMesh && child.geometry) {
          // Compute vertex normals if missing
          if (!child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals();
          }
          
          // Compute bounding sphere for frustum culling
          child.geometry.computeBoundingSphere();
          child.geometry.computeBoundingBox();
        }
      });
      
      return model;
    });

    // Animation setup preprocessor
    this.addPreprocessor('setupAnimations', (model, options, gltf) => {
      if (gltf.animations && gltf.animations.length > 0) {
        model.userData.animations = gltf.animations;
        model.userData.hasAnimations = true;
        
        // Store animations in the original format for compatibility
        const modelType = model.userData.modelType;
        if (modelType) {
          this.animations.set(modelType, gltf.animations);
        }
      }
      
      return model;
    });
  }

  // ORIGINAL LOAD METHOD - Callback-based for backward compatibility
  load(modelType, modelPath, onLoad, onProgress, onError) {
    console.log(`ModelLoader: Loading ${modelType} from ${modelPath}`);
    const loadStartEvent = new CustomEvent('model-loading-start', { detail: { modelType } });
    window.dispatchEvent(loadStartEvent);

    this.loader.load(
      modelPath,
      (gltf) => {
        try {
          const model = gltf.scene;
          model.userData.modelType = modelType;

          // Store animations and create AnimationMixer - ORIGINAL LOGIC
          if (gltf.animations && gltf.animations.length > 0) {
            this.animations.set(modelType, gltf.animations);
            model.userData.animations = gltf.animations; // Attach animations to model
            const mixer = new THREE.AnimationMixer(model);
            this.mixers.set(model, mixer); // Associate mixer with model instance
          }

          // Apply preprocessors if enabled
          if (this.config.enablePreprocessing) {
            this.applyPreprocessorsSync(model, {}, gltf);
          }

          // Cache the model
          if (this.config.enableCache) {
            this.models.set(modelType, model);
            model.userData.cached = true;
            model.userData.cachedAt = Date.now();
          }

          // Track statistics
          this.stats.totalLoaded++;

          onLoad(model);
          const loadCompleteEvent = new CustomEvent('model-loading-completed', { detail: { modelType } });
          window.dispatchEvent(loadCompleteEvent);
        } catch (error) {
          console.error(`ModelLoader: Error processing ${modelType}:`, error);
          this.stats.totalFailed++;
          const loadErrorEvent = new CustomEvent('model-loading-error', { detail: { modelType, error } });
          window.dispatchEvent(loadErrorEvent);
          if (onError) onError(error);
        }
      },
      (progress) => {
        const percent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
        if (onProgress) onProgress(progress);
        console.log(`ModelLoader: ${modelType} loading: ${percent}%`);
      },
      (error) => {
        console.error(`ModelLoader: Error loading ${modelType}:`, error);
        this.stats.totalFailed++;
        const loadErrorEvent = new CustomEvent('model-loading-error', { detail: { modelType, error } });
        window.dispatchEvent(loadErrorEvent);
        if (onError) onError(error);
      }
    );
  }

  // ENHANCED ASYNC LOAD METHOD
  async loadAsync(modelType, modelPath, options = {}) {
    const startTime = performance.now();
    
    try {
      console.log(`ModelLoader: Loading ${modelType} from ${modelPath} (async)`);
      
      // Check cache first
      if (this.config.enableCache && this.models.has(modelType)) {
        this.stats.cacheHits++;
        const cachedModel = this.models.get(modelType);
        const instance = this.createInstance(cachedModel, options);
        
        this.dispatchEvent('model-loaded-from-cache', { modelType, instance });
        return instance;
      }

      this.stats.cacheMisses++;

      // Check if already loading
      if (this.loadingQueue.has(modelType)) {
        console.log(`ModelLoader: ${modelType} already loading, waiting...`);
        return await this.loadingQueue.get(modelType);
      }

      // Create loading promise
      const loadingPromise = this.performLoad(modelType, modelPath, options);
      this.loadingQueue.set(modelType, loadingPromise);

      const result = await loadingPromise;
      
      // Record performance
      const loadTime = performance.now() - startTime;
      this.recordLoadTime(loadTime);
      
      // Clean up loading queue
      this.loadingQueue.delete(modelType);
      
      this.stats.totalLoaded++;
      this.dispatchEvent('model-loaded', { modelType, model: result, loadTime });
      
      return result;
      
    } catch (error) {
      this.stats.totalFailed++;
      this.loadingQueue.delete(modelType);
      
      console.error(`ModelLoader: Failed to load ${modelType}:`, error);
      this.dispatchEvent('model-load-error', { modelType, error });
      
      throw error;
    }
  }

  async performLoad(modelType, modelPath, options) {
    // Wait for loading slot if needed
    await this.waitForLoadingSlot();
    
    this.activeLoads++;
    this.dispatchEvent('model-loading-start', { modelType, path: modelPath });

    try {
      const gltf = await this.loadGLTF(modelPath, options);
      const model = await this.processLoadedModel(gltf, modelType, options);
      
      // Cache the model
      if (this.config.enableCache) {
        this.cacheModel(modelType, model);
      }
      
      return this.createInstance(model, options);
      
    } finally {
      this.activeLoads--;
      this.processQueue();
    }
  }

  async waitForLoadingSlot() {
    while (this.activeLoads >= this.config.maxConcurrentLoads) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  loadGLTF(modelPath, options) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const attemptLoad = () => {
        this.loader.load(
          modelPath,
          resolve,
          (progress) => {
            if (this.config.enableProgressTracking) {
              const percent = progress.total > 0 ? 
                Math.round((progress.loaded / progress.total) * 100) : 0;
              
              this.dispatchEvent('model-loading-progress', {
                path: modelPath,
                loaded: progress.loaded,
                total: progress.total,
                percent
              });
            }
          },
          (error) => {
            attempts++;
            if (attempts < this.config.retryAttempts) {
              console.warn(`ModelLoader: Load attempt ${attempts} failed, retrying...`, error);
              setTimeout(attemptLoad, this.config.retryDelay * attempts);
            } else {
              reject(error);
            }
          }
        );
      };
      
      attemptLoad();
    });
  }

  async processLoadedModel(gltf, modelType, options) {
    let model = gltf.scene;
    
    // Set basic properties
    model.userData.modelType = modelType;
    model.userData.loadedAt = Date.now();
    model.userData.originalGLTF = gltf;

    // Apply preprocessors
    if (this.config.enablePreprocessing) {
      model = await this.applyPreprocessors(model, options, gltf);
    }

    // Update memory tracking
    if (this.config.enableMemoryTracking) {
      this.updateMemoryUsage(model);
    }

    return model;
  }

  applyPreprocessorsSync(model, options, gltf) {
    for (const [name, preprocessor] of this.preprocessors) {
      try {
        const result = preprocessor(model, options, gltf);
        if (result) model = result;
      } catch (error) {
        console.warn(`ModelLoader: Preprocessor ${name} failed:`, error);
      }
    }
    return model;
  }

  async applyPreprocessors(model, options, gltf) {
    for (const [name, preprocessor] of this.preprocessors) {
      try {
        const result = await preprocessor(model, options, gltf);
        if (result) model = result;
      } catch (error) {
        console.warn(`ModelLoader: Preprocessor ${name} failed:`, error);
      }
    }
    return model;
  }

  createInstance(baseModel, options = {}) {
    // Create instance based on options
    if (options.useReference && !options.deepClone) {
      // Use reference (shared geometry/materials)
      const instance = baseModel.clone(false);
      instance.userData = { ...baseModel.userData };
      this.trackInstance(instance, baseModel);
      return instance;
    } else {
      // Deep clone (independent geometry/materials)
      const instance = this.deepCloneModel(baseModel, options);
      this.trackInstance(instance, baseModel);
      return instance;
    }
  }

  deepCloneModel(model, options = {}) {
    const clone = model.clone(true);
    
    // Clone user data
    clone.userData = JSON.parse(JSON.stringify(model.userData));
    clone.userData.isClone = true;
    clone.userData.clonedAt = Date.now();
    
    // Clone animations if needed
    if (options.cloneAnimations && model.userData.animations) {
      clone.userData.animations = [...model.userData.animations];
      
      if (options.createMixer) {
        const mixer = new THREE.AnimationMixer(clone);
        this.mixers.set(clone, mixer);
        clone.userData.mixer = mixer;
      }
    }
    
    return clone;
  }

  trackInstance(instance, baseModel) {
    if (!this.instances.has(baseModel)) {
      this.instances.set(baseModel, new Set());
    }
    this.instances.get(baseModel).add(instance);
    
    instance.userData.baseModel = baseModel;
    instance.userData.instanceId = this.generateInstanceId();
  }

  generateInstanceId() {
    return 'instance_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // FIXED DUPLICATE METHOD - Maintains original callback-based API
  duplicate(originalModel, onDuplicate) {
    try {
      console.log('ModelLoader: Duplicating model:', originalModel.userData.modelType);
      
      const modelType = originalModel.userData.modelType;
      
      // Create a deep clone using Three.js clone method
      const clonedModel = originalModel.clone(true);
      
      // Deep clone user data
      clonedModel.userData = JSON.parse(JSON.stringify(originalModel.userData));
      clonedModel.userData.isClone = true;
      clonedModel.userData.clonedAt = Date.now();
      clonedModel.userData.instanceId = this.generateInstanceId();

      // Clone animations and create a new AnimationMixer for the cloned model
      if (this.animations.has(modelType)) {
        const animations = this.animations.get(modelType);
        clonedModel.userData.animations = animations;
        const mixer = new THREE.AnimationMixer(clonedModel);
        this.mixers.set(clonedModel, mixer);
        
        console.log(`ModelLoader: Cloned animations for ${modelType}, mixer created`);
      }

      // Track the instance
      this.trackInstance(clonedModel, originalModel.userData.baseModel || originalModel);

      // Apply materials and shadows to cloned model
      this.applyCloneProperties(clonedModel, originalModel);

      console.log('ModelLoader: Model duplicated successfully');
      this.dispatchEvent('model-duplicated', { original: originalModel, clone: clonedModel });

      // Call the callback with the cloned model
      if (onDuplicate && typeof onDuplicate === 'function') {
        onDuplicate(clonedModel);
      }

      return clonedModel;
      
    } catch (error) {
      console.error('ModelLoader: Duplication failed:', error);
      this.dispatchEvent('model-duplicate-error', { original: originalModel, error });
      
      // Still call callback with null to indicate failure
      if (onDuplicate && typeof onDuplicate === 'function') {
        onDuplicate(null);
      }
      
      throw error;
    }
  }

  // ENHANCED DUPLICATE METHOD - Promise-based for new code
  async duplicateAsync(originalModel, options = {}) {
    const {
      deepClone = true,
      cloneAnimations = true,
      generateNewId = true,
      position = null,
      rotation = null,
      scale = null
    } = options;

    try {
      const clone = deepClone ? this.deepCloneModel(originalModel, options) : originalModel.clone(false);
      
      // Apply transformations
      if (position) clone.position.copy(position);
      if (rotation) clone.rotation.copy(rotation);
      if (scale) clone.scale.copy(scale);
      
      // Generate new ID if requested
      if (generateNewId) {
        clone.userData.instanceId = this.generateInstanceId();
      }
      
      // Setup animations
      if (cloneAnimations && originalModel.userData.animations) {
        this.setupCloneAnimations(clone, originalModel);
      }
      
      // Track the duplicate
      this.trackInstance(clone, originalModel.userData.baseModel || originalModel);
      
      this.dispatchEvent('model-duplicated', { original: originalModel, clone });
      
      return clone;
      
    } catch (error) {
      console.error('ModelLoader: Duplication failed:', error);
      this.dispatchEvent('model-duplicate-error', { original: originalModel, error });
      throw error;
    }
  }

  applyCloneProperties(clonedModel, originalModel) {
    // Ensure cloned model has same material properties and shadow settings
    clonedModel.traverse((clonedChild) => {
      if (clonedChild.isMesh) {
        // Find corresponding child in original model
        const originalChild = this.findCorrespondingChild(originalModel, clonedChild);
        if (originalChild && originalChild.isMesh) {
          // Copy shadow properties
          clonedChild.castShadow = originalChild.castShadow;
          clonedChild.receiveShadow = originalChild.receiveShadow;
          
          // Ensure materials are properly cloned
          if (originalChild.material && clonedChild.material) {
            const originalMaterials = Array.isArray(originalChild.material) ? 
              originalChild.material : [originalChild.material];
            const clonedMaterials = Array.isArray(clonedChild.material) ? 
              clonedChild.material : [clonedChild.material];
            
            // Copy material properties that might not clone properly
            for (let i = 0; i < Math.min(originalMaterials.length, clonedMaterials.length); i++) {
              const origMat = originalMaterials[i];
              const cloneMat = clonedMaterials[i];
              
              if (origMat && cloneMat) {
                cloneMat.envMapIntensity = origMat.envMapIntensity;
                cloneMat.needsUpdate = true;
              }
            }
          }
        }
      }
    });
  }

  findCorrespondingChild(originalModel, clonedChild) {
    // Find the corresponding child in the original model by name or index
    let result = null;
    originalModel.traverse((originalChild) => {
      if (originalChild.name === clonedChild.name && 
          originalChild.type === clonedChild.type &&
          !result) {
        result = originalChild;
      }
    });
    return result;
  }

  setupCloneAnimations(clone, original) {
    if (!original.userData.animations) return;
    
    clone.userData.animations = [...original.userData.animations];
    clone.userData.hasAnimations = true;
    
    const mixer = new THREE.AnimationMixer(clone);
    this.mixers.set(clone, mixer);
    clone.userData.mixer = mixer;
    
    // Create action map
    const actions = new Map();
    clone.userData.animations.forEach((clip, index) => {
      const name = clip.name || `animation_${index}`;
      const action = mixer.clipAction(clip);
      actions.set(name, action);
    });
    clone.userData.animationActions = actions;
  }

  // Cache management
  cacheModel(modelType, model) {
    // Check cache size limit
    if (this.models.size >= this.config.cacheSizeLimit) {
      this.cleanupCache();
    }
    
    this.models.set(modelType, model);
    model.userData.cached = true;
    model.userData.cachedAt = Date.now();
    
    this.dispatchEvent('model-cached', { modelType, model });
  }

  cleanupCache() {
    // Remove oldest cached models
    const entries = Array.from(this.models.entries());
    entries.sort((a, b) => {
      const timeA = a[1].userData.cachedAt || 0;
      const timeB = b[1].userData.cachedAt || 0;
      return timeA - timeB;
    });
    
    // Remove oldest 25%
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const [modelType, model] = entries[i];
      this.uncacheModel(modelType);
    }
    
    console.log(`ModelLoader: Cleaned up ${toRemove} cached models`);
  }

  uncacheModel(modelType) {
    const model = this.models.get(modelType);
    if (model) {
      this.models.delete(modelType);
      
      // Don't dispose if there are active instances
      const instances = this.instances.get(model);
      if (!instances || instances.size === 0) {
        this.disposeModel(model);
      }
      
      this.dispatchEvent('model-uncached', { modelType });
    }
  }

  clearCache() {
    const modelTypes = Array.from(this.models.keys());
    modelTypes.forEach(modelType => this.uncacheModel(modelType));
    console.log('ModelLoader: Cache cleared');
    this.dispatchEvent('cache-cleared');
  }

  // Animation management
  createAnimationMixer(model) {
    if (this.mixers.has(model)) {
      return this.mixers.get(model);
    }
    
    const mixer = new THREE.AnimationMixer(model);
    this.mixers.set(model, mixer);
    model.userData.mixer = mixer;
    
    return mixer;
  }

  getAnimationMixer(model) {
    return this.mixers.get(model) || null;
  }

  playAnimation(model, animationName, options = {}) {
    const mixer = this.getAnimationMixer(model);
    if (!mixer || !model.userData.animations) {
      console.warn('ModelLoader: No mixer or animations available');
      return null;
    }
    
    const animations = model.userData.animations;
    let clip = null;
    
    if (animationName) {
      clip = animations.find(anim => anim.name === animationName);
    } else if (animations.length > 0) {
      clip = animations[0];
    }
    
    if (!clip) {
      console.warn(`ModelLoader: Animation "${animationName}" not found`);
      return null;
    }
    
    const action = mixer.clipAction(clip);
    
    // Apply options
    const {
      loop = THREE.LoopRepeat,
      timeScale = 1,
      weight = 1,
      fadeIn = 0,
      fadeOut = 0
    } = options;
    
    action.setLoop(loop);
    action.setTimeScale(timeScale);
    action.setWeight(weight);
    
    if (fadeIn > 0) {
      action.fadeIn(fadeIn);
    }
    
    action.play();
    
    this.dispatchEvent('animation-started', { model, animationName, action });
    
    return action;
  }

  stopAnimation(model, animationName = null) {
    const mixer = this.getAnimationMixer(model);
    if (!mixer) return;
    
    if (animationName) {
      const animations = model.userData.animations || [];
      const clip = animations.find(anim => anim.name === animationName);
      if (clip) {
        const action = mixer.existingAction(clip);
        if (action) {
          action.stop();
          this.dispatchEvent('animation-stopped', { model, animationName });
        }
      }
    } else {
      mixer.stopAllAction();
      this.dispatchEvent('animation-stopped', { model, animationName: 'all' });
    }
  }

  // Update method for animation mixers
  update(delta) {
    this.mixers.forEach((mixer) => {
      mixer.update(delta);
    });
  }

  // Preprocessor management
  addPreprocessor(name, processor) {
    this.preprocessors.set(name, processor);
    console.log(`ModelLoader: Added preprocessor: ${name}`);
  }

  removePreprocessor(name) {
    if (this.preprocessors.delete(name)) {
      console.log(`ModelLoader: Removed preprocessor: ${name}`);
      return true;
    }
    return false;
  }

  // Queue management
  processQueue() {
    if (this.loadQueue.length > 0 && this.activeLoads < this.config.maxConcurrentLoads) {
      const nextLoad = this.loadQueue.shift();
      if (nextLoad) {
        nextLoad();
      }
    }
  }

  // Performance tracking
  recordLoadTime(time) {
    this.stats.loadTimes.push(time);
    if (this.stats.loadTimes.length > 100) {
      this.stats.loadTimes.shift(); // Keep only last 100 measurements
    }
    
    this.stats.averageLoadTime = this.stats.loadTimes.reduce((a, b) => a + b, 0) / this.stats.loadTimes.length;
  }

  updateMemoryUsage(model) {
    let memoryUsage = 0;
    
    model.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) {
          // Estimate geometry memory usage
          const attributes = child.geometry.attributes;
          for (const key in attributes) {
            const attribute = attributes[key];
            memoryUsage += attribute.array.byteLength;
          }
        }
        
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(material => {
            // Estimate material memory usage (textures)
            Object.values(material).forEach(value => {
              if (value && value.isTexture && value.image) {
                // Rough estimate: width * height * 4 bytes per pixel
                const image = value.image;
                if (image.width && image.height) {
                  memoryUsage += image.width * image.height * 4;
                }
              }
            });
          });
        }
      }
    });
    
    this.stats.memoryUsage += memoryUsage;
    model.userData.memoryUsage = memoryUsage;
  }

  // Enhanced disposal
  disposeModel(model, options = {}) {
    if (!model) return;
    
    const { 
      disposeGeometry = true, 
      disposeMaterials = true, 
      disposeTextures = true,
      removeFromCache = true 
    } = options;

    console.log('ModelLoader: Disposing model:', model.userData.modelType);

    // Stop and dispose animations
    const mixer = this.mixers.get(model);
    if (mixer) {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      this.mixers.delete(model);
    }

    // Update memory tracking
    if (this.config.enableMemoryTracking && model.userData.memoryUsage) {
      this.stats.memoryUsage -= model.userData.memoryUsage;
    }

    // Dispose instances tracking
    if (this.instances.has(model)) {
      this.instances.delete(model);
    }

    // Traverse and dispose resources
    model.traverse((child) => {
      if (child.isMesh) {
        // Dispose geometry
        if (disposeGeometry && child.geometry) {
          child.geometry.dispose();
        }

        // Dispose materials
        if (disposeMaterials && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(material => {
            // Dispose textures
            if (disposeTextures) {
              Object.values(material).forEach(value => {
                if (value && typeof value.dispose === 'function') {
                  value.dispose();
                }
              });
            }
            material.dispose();
          });
        }
      }
    });

    // Remove from cache if requested
    if (removeFromCache && model.userData.modelType) {
      this.models.delete(model.userData.modelType);
    }

    this.dispatchEvent('model-disposed', { model });
  }

  // Statistics and debugging
  getStats() {
    return {
      ...this.stats,
      cached: this.models.size,
      activeLoads: this.activeLoads,
      queueLength: this.loadQueue.length,
      mixers: this.mixers.size,
      instances: Array.from(this.instances.values()).reduce((total, set) => total + set.size, 0)
    };
  }

  getLoadedModels() {
    return Array.from(this.models.keys());
  }

  getCacheInfo() {
    const cacheInfo = [];
    
    this.models.forEach((model, modelType) => {
      const instances = this.instances.get(model);
      cacheInfo.push({
        modelType,
        cachedAt: model.userData.cachedAt,
        memoryUsage: model.userData.memoryUsage || 0,
        instanceCount: instances ? instances.size : 0,
        hasAnimations: model.userData.hasAnimations || false
      });
    });
    
    return cacheInfo;
  }

  logDebugInfo() {
    console.group('ModelLoader Debug Info');
    console.log('Statistics:', this.getStats());
    console.log('Cached Models:', this.getLoadedModels());
    console.log('Cache Info:', this.getCacheInfo());
    console.log('Active Loads:', this.activeLoads);
    console.log('Queue Length:', this.loadQueue.length);
    console.groupEnd();
  }

  // Event system
  addEventListener(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType).add(callback);
  }

  removeEventListener(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).delete(callback);
    }
  }

  dispatchEvent(eventType, detail = {}) {
    // Dispatch to local listeners
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).forEach(callback => {
        try {
          callback({ type: eventType, detail });
        } catch (error) {
          console.error(`ModelLoader: Event listener error for ${eventType}:`, error);
        }
      });
    }

    // Dispatch global event (backward compatibility)
    const globalEvent = new CustomEvent(`modelloader-${eventType}`, { detail });
    window.dispatchEvent(globalEvent);
  }

  // Configuration updates
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('ModelLoader: Configuration updated:', newConfig);
    this.dispatchEvent('config-updated', { config: this.config });
  }

  // Main disposal method
  dispose() {
    console.log('ModelLoader: Starting disposal...');

    // Clear loading queue
    this.loadQueue = [];
    this.loadingQueue.clear();

    // Dispose all cached models
    this.models.forEach((model, modelType) => {
      this.disposeModel(model, { removeFromCache: false });
    });
    this.models.clear();

    // Clear animations and mixers
    this.animations.clear();
    this.mixers.forEach((mixer) => {
      mixer.stopAllAction();
    });
    this.mixers.clear();

    // Clear instances
    this.instances.clear();

    // Clear preprocessors
    this.preprocessors.clear();

    // Clear event listeners
    this.eventListeners.clear();

    // Dispose loaders
    if (this.dracoLoader) {
      this.dracoLoader.dispose();
      this.dracoLoader = null;
    }

    if (this.ktx2Loader) {
      this.ktx2Loader.dispose();
      this.ktx2Loader = null;
    }

    // Clear references
    this.loader = null;
    this.gltfLoader = null;
    this.loadingManager = null;

    // Reset stats
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0,
      loadTimes: [],
      averageLoadTime: 0
    };

    console.log('ModelLoader: Disposal complete');
    this.dispatchEvent('loader-disposed');
  }

  // Static utility methods
  static async loadSingle(modelPath, options = {}) {
    const loader = new ModelLoader(options);
    try {
      const model = await loader.loadAsync('temp', modelPath, options);
      return model;
    } finally {
      loader.dispose();
    }
  }

  static validateGLTF(gltf) {
    const validation = {
      valid: true,
      warnings: [],
      errors: []
    };

    try {
      if (!gltf.scene) {
        validation.errors.push('No scene found in GLTF');
        validation.valid = false;
      }

      if (gltf.animations && gltf.animations.length > 10) {
        validation.warnings.push(`Large number of animations: ${gltf.animations.length}`);
      }

      // Check for common issues
      gltf.scene?.traverse((child) => {
        if (child.isMesh) {
          if (!child.geometry) {
            validation.errors.push(`Mesh without geometry: ${child.name}`);
            validation.valid = false;
          }
          
          if (!child.material) {
            validation.warnings.push(`Mesh without material: ${child.name}`);
          }
        }
      });

    } catch (error) {
      validation.errors.push(`Validation error: ${error.message}`);
      validation.valid = false;
    }

    return validation;
  }
}