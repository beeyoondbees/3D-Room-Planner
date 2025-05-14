// src/three/SceneManager.js
// This is the core class that manages the Three.js scene

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { Room } from './objects/Room';
import { ModelLoader } from './ModelLoader';
import { GridHelper } from './utils/GridHelper';
import { InteractionManager } from './InteractionManager';

export class SceneManager {
 constructor(container) {
  this.container = container;
  this.objects = []; // All objects in the scene
  this.selectedObject = null;
  this.modelLoader = new ModelLoader();
  this.transformMode = 'translate'; // 'translate', 'rotate', 'scale'
  this.undoStack = [];
  this.redoStack = [];
  
  // Add clock for animation timing
  this.clock = new THREE.Clock();
  
  this.initScene();
  this.initCamera();
  this.initRenderer();
  this.initLights();
  this.initControls();
  this.initRoom();
  this.initGrid();
  
  // Initialize interaction manager after the other components
  this.initInteractionManager();
  
  // Start animation loop
  this.animate();
}

initInteractionManager() {
  // Create interaction manager
  this.interactionManager = new InteractionManager(
    this.scene, 
    this.camera, 
    this.renderer, 
    this.orbitControls
  );
  
  // Set up callbacks
  this.interactionManager.setCallbacks({
    onObjectSelected: (object) => {
      this.selectedObject = object;
      // Dispatch event for UI updates
      const event = new CustomEvent('object-selected', { detail: object });
      this.container.dispatchEvent(event);
    },
    
    onObjectDeselected: () => {
      this.selectedObject = null;
      // Dispatch event for UI updates
      const event = new CustomEvent('object-deselected');
      this.container.dispatchEvent(event);
    },
    
    onObjectChanged: (object) => {
      // Add to undo stack when object is transformed
      this.addToUndoStack({
        type: 'transform',
        object: object,
        properties: this.getObjectState(object)
      });
    },
    
    onObjectPinned: (object) => {
      console.log('Object pinned:', object);
      // Dispatch event for UI updates
      const event = new CustomEvent('object-pinned', { detail: object });
      this.container.dispatchEvent(event);
    },
    
    onObjectUnpinned: (object) => {
      console.log('Object unpinned:', object);
      // Dispatch event for UI updates
      const event = new CustomEvent('object-unpinned', { detail: object });
      this.container.dispatchEvent(event);
    },
    
    onObjectDeleted: (object) => {
      // Remove from objects array
      this.objects = this.objects.filter(obj => obj !== object);
      
      // Add to undo stack
      this.addToUndoStack({
        type: 'remove',
        object: object,
        properties: this.getObjectState(object)
      });
      
      // Dispatch event for UI updates
      const event = new CustomEvent('object-deleted', { detail: object });
      this.container.dispatchEvent(event);
    },
    
    onModeChanged: (mode) => {
      this.transformMode = mode;
      // Dispatch event for UI updates
      const event = new CustomEvent('mode-changed', { detail: mode });
      this.container.dispatchEvent(event);
    }
  });
}

// Replace or modify these methods to use the interaction manager

selectObject(object) {
  this.interactionManager.select(object);
}

deselectObject() {
  this.interactionManager.deselect();
}

setTransformMode(mode) {
  this.interactionManager.setMode(mode);
}

removeObject(object) {
  if (!object) return;
  
  // Use the interaction manager's delete logic
  if (this.selectedObject === object) {
    this.interactionManager.deleteSelected();
  } else {
    // For objects that aren't currently selected
    // Add to undo stack before removing
    this.addToUndoStack({
      type: 'remove',
      object: object,
      properties: this.getObjectState(object)
    });
    
    // Remove from scene and objects array
    this.scene.remove(object);
    this.objects = this.objects.filter(obj => obj !== object);
  }
}

// Add these new methods for pin/unpin functionality

pinObject(object) {
  this.interactionManager.pinObject(object);
}

unpinObject(object) {
  this.interactionManager.unpinObject(object);
}

togglePin(object) {
  this.interactionManager.togglePin(object || this.selectedObject);
}

// Add method to rotate object by specific angle
rotateObject(object, angleDegrees) {
  if (!object) object = this.selectedObject;
  if (!object) return;
  
  this.interactionManager.rotateSelected(angleDegrees);
}

// Update your cleanup method
dispose() {
  if (this.interactionManager) {
    this.interactionManager.dispose();
  }
  
  // Cancel animation frame to stop the loop
  if (this.animationFrameId) {
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }
  
  // Clean up other resources
  if (this.orbitControls) {
    this.orbitControls.dispose();
  }
  
  if (this.renderer) {
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
  
  // Clear references to help garbage collection
  this.scene = null;
  this.camera = null;
  this.renderer = null;
  this.orbitControls = null;
  this.objects = null;
}
}



