// src/three/ModelLoader.js
// Corrected version of your existing ModelLoader

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class ModelLoader {
  constructor() {
    // Create the GLTF loader
    this.gltfLoader = new GLTFLoader();
    
    // Model cache
    this.modelCache = {};
  }
  
  /**
   * Load a model by type and path
   */
  load(modelType, modelPath, onLoad) {
    console.log(`Loading model: ${modelType} from ${modelPath}`);
    
    // Check cache first
    if (this.modelCache[modelType]) {
      console.log(`Using cached model: ${modelType}`);
      const clone = this.modelCache[modelType].clone();
      onLoad(clone);
      return;
    }
    
    // Load the model - this is the critical part that needed fixing
    this.gltfLoader.load(
      modelPath,
      (gltf) => {
        // IMPORTANT: Use gltf.scene, not just a custom object
        const model = gltf.scene;
        
        // Add needed metadata
        model.userData.type = modelType;
        model.userData.isModelRoot = true;
        model.userData.selectable = true;
        
        // Apply shadows to all meshes
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        
        // Cache the model
        this.modelCache[modelType] = model.clone();
        
        // Process the model if needed (adjust position, etc.)
        const box = new THREE.Box3().setFromObject(model);
        const height = box.max.y - box.min.y;
        model.position.y = height / 2;
        
        // Call the callback with the loaded model
        onLoad(model);
      },
      (progress) => {
        // Progress callback if needed
        console.log(`Loading progress: ${Math.round((progress.loaded / progress.total) * 100)}%`);
      },
      (error) => {
        // Error handling
        console.error(`Error loading model ${modelType}:`, error);
        
        // Create a fallback cube instead
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const cube = new THREE.Mesh(geometry, material);
        const group = new THREE.Group();
        group.add(cube);
        group.userData.type = modelType;
        group.userData.isModelRoot = true;
        group.userData.selectable = true;
        group.userData.isFallback = true;
        
        onLoad(group);
      }
    );
  }
  
  /**
   * Duplicate an existing model
   */
  duplicate(originalObject, onComplete) {
    const modelType = originalObject.userData.type;
    
    if (this.modelCache[modelType]) {
      // Clone from cache
      const clone = this.modelCache[modelType].clone();
      
      // Copy transformation
      clone.position.copy(originalObject.position);
      clone.rotation.copy(originalObject.rotation);
      clone.scale.copy(originalObject.scale);
      
      // Call complete callback
      onComplete(clone);
    } else {
      console.warn(`Cannot duplicate model ${modelType}: not in cache`);
      
      // Create a simple fallback
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
      const cube = new THREE.Mesh(geometry, material);
      const group = new THREE.Group();
      group.add(cube);
      
      // Add metadata
      group.userData.type = modelType;
      group.userData.isModelRoot = true;
      group.userData.selectable = true;
      group.userData.isFallback = true;
      
      // Copy transformation
      group.position.copy(originalObject.position);
      group.rotation.copy(originalObject.rotation);
      group.scale.copy(originalObject.scale);
      
      onComplete(group);
    }
  }
}