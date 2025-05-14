// src/three/objects/Equipment.js
// Base class for all gym equipment

import * as THREE from 'three';
import equipmentConfig from '../../config/equipment';

export class Equipment {
  constructor(type, modelLoader) {
    this.type = type;
    this.modelLoader = modelLoader;
    this.object = null;
    this.isLoaded = false;
    this.callbacks = [];
    
    // Get dimensions from configuration
    this.dimensions = equipmentConfig.dimensions[type] || { 
      width: 1, 
      height: 0.5, 
      depth: 1 
    };
    
    // Track original and current transformation
    this.originalTransform = {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1)
    };
    
    this.currentTransform = {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1)
    };
    
    // Animation properties
    this.animatedParts = [];
    this.isAnimating = false;
    
    // Load the model
    this.load();
  }
  
  /**
   * Load the equipment model
   */
  load() {
    this.modelLoader.load(this.type, (object) => {
      this.object = object;
      this.object.userData.equipment = this;
      this.object.userData.type = this.type;
      this.object.userData.isModelRoot = true;
      this.object.userData.selectable = true;
      
      // Store original transform
      this.saveOriginalTransform();
      
      // Set model as loaded
      this.isLoaded = true;
      
      // Find animated parts if any
      this.findAnimatedParts();
      
      // Call any callbacks that were waiting for the model to load
      this.callbacks.forEach(callback => callback(this));
      this.callbacks = [];
    });
  }
  
  /**
   * Save the original transform of the model for reset
   */
  saveOriginalTransform() {
    if (!this.object) return;
    
    this.originalTransform.position.copy(this.object.position);
    this.originalTransform.rotation.copy(this.object.rotation);
    this.originalTransform.scale.copy(this.object.scale);
    
    this.currentTransform.position.copy(this.object.position);
    this.currentTransform.rotation.copy(this.object.rotation);
    this.currentTransform.scale.copy(this.object.scale);
  }
  
  /**
   * Find parts of the model that can be animated
   */
  findAnimatedParts() {
    if (!this.object) return;
    
    this.animatedParts = [];
    
    this.object.traverse(node => {
      if (node.userData && node.userData.animatable) {
        this.animatedParts.push({
          node: node,
          speed: node.userData.animationSpeed || 0.01,
          axis: node.userData.rotationAxis || 'y'
        });
      }
    });
  }
  
  /**
   * Set the position of the equipment
   * @param {THREE.Vector3} position - New position
   */
  setPosition(position) {
    if (!this.object) {
      this.onceLoaded(() => this.setPosition(position));
      return;
    }
    
    this.object.position.copy(position);
    this.currentTransform.position.copy(position);
  }
  
  /**
   * Set the rotation of the equipment
   * @param {THREE.Euler} rotation - New rotation
   */
  setRotation(rotation) {
    if (!this.object) {
      this.onceLoaded(() => this.setRotation(rotation));
      return;
    }
    
    this.object.rotation.copy(rotation);
    this.currentTransform.rotation.copy(rotation);
  }
  
  /**
   * Set the scale of the equipment
   * @param {THREE.Vector3} scale - New scale
   */
  setScale(scale) {
    if (!this.object) {
      this.onceLoaded(() => this.setScale(scale));
      return;
    }
    
    this.object.scale.copy(scale);
    this.currentTransform.scale.copy(scale);
  }
  
  /**
   * Reset the equipment to its original transform
   */
  resetTransform() {
    if (!this.object) return;
    
    this.object.position.copy(this.originalTransform.position);
    this.object.rotation.copy(this.originalTransform.rotation);
    this.object.scale.copy(this.originalTransform.scale);
    
    this.currentTransform.position.copy(this.originalTransform.position);
    this.currentTransform.rotation.copy(this.originalTransform.rotation);
    this.currentTransform.scale.copy(this.originalTransform.scale);
  }
  
  /**
   * Register a callback for when the model is loaded
   * @param {Function} callback - Function to call when loaded
   */
  onceLoaded(callback) {
    if (this.isLoaded) {
      callback(this);
    } else {
      this.callbacks.push(callback);
    }
  }
  
  /**
   * Start animation of moving parts
   */
  startAnimation() {
    this.isAnimating = true;
  }
  
  /**
   * Stop animation of moving parts
   */
  stopAnimation() {
    this.isAnimating = false;
  }
  
  /**
   * Update animation on each frame
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    if (!this.isAnimating || this.animatedParts.length === 0) return;
    
    this.animatedParts.forEach(part => {
      switch (part.axis) {
        case 'x':
          part.node.rotation.x += part.speed * deltaTime;
          break;
        case 'y':
          part.node.rotation.y += part.speed * deltaTime;
          break;
        case 'z':
          part.node.rotation.z += part.speed * deltaTime;
          break;
      }
    });
  }
  
  /**
   * Get the bounding box of the equipment
   * @returns {THREE.Box3} - The bounding box
   */
  getBoundingBox() {
    if (!this.object) return null;
    
    return new THREE.Box3().setFromObject(this.object);
  }
  
  /**
   * Get the center position of the equipment
   * @returns {THREE.Vector3} - The center position
   */
  getCenterPosition() {
    if (!this.object) return null;
    
    const box = this.getBoundingBox();
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    return center;
  }
  
  /**
   * Check if this equipment intersects with another equipment
   * @param {Equipment} other - Other equipment to check against
   * @returns {boolean} - Whether they intersect
   */
  intersectsWith(other) {
    if (!this.object || !other.object) return false;
    
    const thisBox = this.getBoundingBox();
    const otherBox = other.getBoundingBox();
    
    return thisBox.intersectsBox(otherBox);
  }
  
  /**
   * Create a duplicate of this equipment
   * @param {Function} callback - Callback with the new equipment instance
   */
  duplicate(callback) {
    const duplicate = new Equipment(this.type, this.modelLoader);
    
    duplicate.onceLoaded(() => {
      // Copy current transform
      duplicate.setPosition(this.currentTransform.position.clone().add(new THREE.Vector3(0.5, 0, 0.5)));
      duplicate.setRotation(this.currentTransform.rotation.clone());
      duplicate.setScale(this.currentTransform.scale.clone());
      
      if (callback) callback(duplicate);
    });
    
    return duplicate;
  }
  
  /**
   * Apply a highlight effect to the equipment
   * @param {boolean} highlighted - Whether to highlight or unhighlight
   */
  setHighlight(highlighted) {
    if (!this.object) return;
    
    this.object.traverse(node => {
      if (node.isMesh && node.material) {
        if (highlighted) {
          // Store original materials if not already stored
          if (!node.userData.originalMaterial) {
            if (Array.isArray(node.material)) {
              node.userData.originalMaterial = node.material.map(m => m.clone());
            } else {
              node.userData.originalMaterial = node.material.clone();
            }
            
            // Apply highlight material
            if (Array.isArray(node.material)) {
              node.material = node.material.map(m => {
                const highlightMat = m.clone();
                highlightMat.emissive = new THREE.Color(0x333333);
                return highlightMat;
              });
            } else {
              const highlightMat = node.material.clone();
              highlightMat.emissive = new THREE.Color(0x333333);
              node.material = highlightMat;
            }
          }
        } else {
          // Restore original materials if stored
          if (node.userData.originalMaterial) {
            node.material = node.userData.originalMaterial;
            delete node.userData.originalMaterial;
          }
        }
      }
    });
  }
  
  /**
   * Apply a hover effect to the equipment
   * @param {boolean} hovered - Whether to show hover effect or not
   */
  setHovered(hovered) {
    if (!this.object) return;
    
    this.object.traverse(node => {
      if (node.isMesh && node.material) {
        if (hovered) {
          // Store original materials if not already stored
          if (!node.userData.originalMaterialHover) {
            if (Array.isArray(node.material)) {
              node.userData.originalMaterialHover = node.material.map(m => m.clone());
            } else {
              node.userData.originalMaterialHover = node.material.clone();
            }
            
            // Apply hover material (subtle glow)
            if (Array.isArray(node.material)) {
              node.material = node.material.map(m => {
                const hoverMat = m.clone();
                hoverMat.emissive = new THREE.Color(0x222222);
                return hoverMat;
              });
            } else {
              const hoverMat = node.material.clone();
              hoverMat.emissive = new THREE.Color(0x222222);
              node.material = hoverMat;
            }
          }
        } else {
          // Restore original materials if stored
          if (node.userData.originalMaterialHover) {
            node.material = node.userData.originalMaterialHover;
            delete node.userData.originalMaterialHover;
          }
        }
      }
    });
  }
  
  /**
   * Get dimensions of the equipment
   * @returns {Object} - Object with width, height, depth properties
   */
  getDimensions() {
    return this.dimensions;
  }
  
  /**
   * Get actual dimensions from the loaded model's bounding box
   * @returns {Object} - Object with width, height, depth properties
   */
  getActualDimensions() {
    if (!this.object) return this.dimensions;
    
    const box = this.getBoundingBox();
    return {
      width: box.max.x - box.min.x,
      height: box.max.y - box.min.y,
      depth: box.max.z - box.min.z
    };
  }
  
  /**
   * Get the equipment type
   * @returns {string} - The equipment type
   */
  getType() {
    return this.type;
  }
  
  /**
   * Get the equipment model
   * @returns {THREE.Object3D} - The 3D model
   */
  getObject() {
    return this.object;
  }
  
  /**
   * Set a custom property on the equipment
   * @param {string} key - Property name
   * @param {any} value - Property value
   */
  setProperty(key, value) {
    if (!this.object) return;
    
    this.object.userData[key] = value;
  }
  
  /**
   * Get a custom property from the equipment
   * @param {string} key - Property name
   * @returns {any} - Property value
   */
  getProperty(key) {
    if (!this.object) return undefined;
    
    return this.object.userData[key];
  }
  
  /**
   * Dispose of the equipment and free resources
   */
  dispose() {
    if (!this.object) return;
    
    // Remove from parent if it has one
    if (this.object.parent) {
      this.object.parent.remove(this.object);
    }
    
    // Dispose of geometries and materials
    this.object.traverse(node => {
      if (node.isMesh) {
        if (node.geometry) node.geometry.dispose();
        
        if (node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach(material => this.disposeMaterial(material));
          } else {
            this.disposeMaterial(node.material);
          }
        }
      }
    });
    
    this.object = null;
    this.isLoaded = false;
  }
  
  /**
   * Helper method to dispose of a material and its textures
   * @param {THREE.Material} material - Material to dispose
   */
  disposeMaterial(material) {
    if (!material) return;
    
    // Dispose of textures
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.displacementMap) material.displacementMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();
    if (material.alphaMap) material.alphaMap.dispose();
    if (material.aoMap) material.aoMap.dispose();
    if (material.metalnessMap) material.metalnessMap.dispose();
    if (material.roughnessMap) material.roughnessMap.dispose();
    if (material.emissiveMap) material.emissiveMap.dispose();
    
    // Dispose of material itself
    material.dispose();
  }
}