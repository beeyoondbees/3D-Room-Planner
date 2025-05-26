// src/three/ModelLoader.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.dracoLoader = null;
    this.models = new Map();
    this.animations = new Map(); // Store animations per model type
    this.mixers = new Map(); // Store AnimationMixer per model instance

    // Optional: Set up DRACOLoader for compressed models
    try {
      this.dracoLoader = new DRACOLoader();
      this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
      this.loader.setDRACOLoader(this.dracoLoader);
    } catch (error) {
      console.warn('ModelLoader: DRACOLoader setup failed, proceeding without Draco:', error);
    }
  }

  load(modelType, modelPath, onLoad, onProgress, onError) {
    console.log(`ModelLoader: Loading ${modelType} from ${modelPath}`);
    const loadStartEvent = new CustomEvent('model-loading-start', { detail: { modelType } });
    window.dispatchEvent(loadStartEvent);

    this.loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        model.userData.modelType = modelType;

        // Store animations and create AnimationMixer
        if (gltf.animations && gltf.animations.length > 0) {
          this.animations.set(modelType, gltf.animations);
          model.userData.animations = gltf.animations; // Attach animations to model
          const mixer = new THREE.AnimationMixer(model);
          this.mixers.set(model, mixer); // Associate mixer with model instance
        }

        this.models.set(modelType, model);
        onLoad(model);
        const loadCompleteEvent = new CustomEvent('model-loading-completed', { detail: { modelType } });
        window.dispatchEvent(loadCompleteEvent);
      },
      (progress) => {
        const percent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
        if (onProgress) onProgress(progress);
        console.log(`ModelLoader: ${modelType} loading: ${percent}%`);
      },
      (error) => {
        console.error(`ModelLoader: Error loading ${modelType}:`, error);
        const loadErrorEvent = new CustomEvent('model-loading-error', { detail: { modelType, error } });
        window.dispatchEvent(loadErrorEvent);
        if (onError) onError(error);
      }
    );
  }

  duplicate(originalModel, onDuplicate) {
    const modelType = originalModel.userData.modelType;
    const clonedModel = originalModel.clone(true);
    clonedModel.userData = JSON.parse(JSON.stringify(originalModel.userData));

    // Clone animations and create a new AnimationMixer for the cloned model
    if (this.animations.has(modelType)) {
      clonedModel.userData.animations = this.animations.get(modelType);
      const mixer = new THREE.AnimationMixer(clonedModel);
      this.mixers.set(clonedModel, mixer);
    }

    onDuplicate(clonedModel);
  }

  disposeModel(model) {
    if (!model) return;

    // Dispose of AnimationMixer
    const mixer = this.mixers.get(model);
    if (mixer) {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      this.mixers.delete(model);
    }

    // Dispose geometries, materials, and textures
    model.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            Object.values(mat).forEach(value => {
              if (value && typeof value.dispose === 'function') value.dispose();
            });
            mat.dispose();
          });
        }
      }
    });
  }

  dispose() {
    this.models.forEach((model) => this.disposeModel(model));
    this.models.clear();
    this.animations.clear();
    this.mixers.forEach((mixer, model) => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    });
    this.mixers.clear();
    if (this.dracoLoader) {
      this.dracoLoader.dispose();
      this.dracoLoader = null;
    }
    this.loader = null;
  }
}