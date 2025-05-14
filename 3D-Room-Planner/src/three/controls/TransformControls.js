// src/three/controls/TransformControls.js
// Enhanced wrapper for Three.js TransformControls

import { TransformControls as ThreeTransformControls } from 'three/examples/jsm/controls/TransformControls';
import * as THREE from 'three';

export class TransformControlsWrapper {
  constructor(camera, domElement, scene, options = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    
    // Default options
    this.options = {
      size: 1,
      showX: true,
      showY: true,
      showZ: true,
      snapTranslation: 0.5, // Grid size for snapping translation
      snapRotation: Math.PI / 12, // 15 degrees for rotation snapping
      snapScale: 0.1, // 0.1 units for scale snapping
      ...options
    };
    
    // Current mode (translate, rotate, scale)
    this.mode = 'translate';
    
    // Currently selected object
    this.selectedObject = null;
    
    // State tracking
    this.state = {
      isActive: true,
      isDragging: false,
      isTransforming: false
    };
    
    // Initialize transform controls
    this.initControls();
    this.configureControls();
    this.addEventListeners();
    
    // Add to scene
    if (this.scene) {
      this.scene.add(this.controls);
    }
  }
  
  initControls() {
    this.controls = new ThreeTransformControls(this.camera, this.domElement);
    this.controls.setSize(this.options.size);
  }
  
  configureControls() {
    // Set visibility of axes
    this.controls.showX = this.options.showX;
    this.controls.showY = this.options.showY;
    this.controls.showZ = this.options.showZ;
    
    // Set snapping values
    this.controls.setTranslationSnap(this.options.snapTranslation);
    this.controls.setRotationSnap(this.options.snapRotation);
    this.controls.setScaleSnap(this.options.snapScale);
    
    // Apply initial mode
    this.controls.setMode(this.mode);
  }
  
  addEventListeners() {
    // Track state with event listeners
    this.controls.addEventListener('dragging-changed', (event) => {
      this.state.isDragging = event.value;
      this.state.isTransforming = event.value;
      
      // Dispatch custom event for disabling other controls
      const dragEvent = new CustomEvent('transform-drag', { 
        detail: { 
          dragging: event.value,
          object: this.selectedObject,
          mode: this.mode
        } 
      });
      this.domElement.dispatchEvent(dragEvent);
    });
    
    this.controls.addEventListener('objectChange', () => {
      // Dispatch custom event when object is changed
      if (this.selectedObject) {
        const changeEvent = new CustomEvent('transform-change', { 
          detail: { 
            object: this.selectedObject,
            mode: this.mode,
            position: this.selectedObject.position.clone(),
            rotation: this.selectedObject.rotation.clone(),
            scale: this.selectedObject.scale.clone()
          } 
        });
        this.domElement.dispatchEvent(changeEvent);
      }
    });
    
    this.controls.addEventListener('mouseDown', () => {
      this.state.isTransforming = true;
    });
    
    this.controls.addEventListener('mouseUp', () => {
      this.state.isTransforming = false;
    });
  }
  
  attach(object) {
    if (!object) return;
    
    this.selectedObject = object;
    this.controls.attach(object);
    
    // Dispatch custom event
    const attachEvent = new CustomEvent('transform-attach', { 
      detail: { 
        object: this.selectedObject,
        mode: this.mode
      } 
    });
    this.domElement.dispatchEvent(attachEvent);
  }
  
  detach() {
    if (this.selectedObject) {
      // Dispatch custom event
      const detachEvent = new CustomEvent('transform-detach', { 
        detail: { 
          object: this.selectedObject,
          mode: this.mode
        } 
      });
      this.domElement.dispatchEvent(detachEvent);
    }
    
    this.selectedObject = null;
    this.controls.detach();
  }
  
  setMode(mode) {
    if (['translate', 'rotate', 'scale'].includes(mode)) {
      this.mode = mode;
      this.controls.setMode(mode);
      
      // Dispatch custom event
      const modeEvent = new CustomEvent('transform-mode-change', { 
        detail: { 
          mode: this.mode,
          object: this.selectedObject
        } 
      });
      this.domElement.dispatchEvent(modeEvent);
    }
  }
  
  toggleMode() {
    // Cycle through modes: translate -> rotate -> scale -> translate
    const modes = ['translate', 'rotate', 'scale'];
    const currentIndex = modes.indexOf(this.mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setMode(modes[nextIndex]);
  }
  
  setTranslationSnap(value) {
    if (value === null || value === undefined) {
      this.controls.setTranslationSnap(null);
    } else {
      this.controls.setTranslationSnap(value);
    }
    this.options.snapTranslation = value;
  }
  
  setRotationSnap(value) {
    if (value === null || value === undefined) {
      this.controls.setRotationSnap(null);
    } else {
      this.controls.setRotationSnap(value);
    }
    this.options.snapRotation = value;
  }
  
  setScaleSnap(value) {
    if (value === null || value === undefined) {
      this.controls.setScaleSnap(null);
    } else {
      this.controls.setScaleSnap(value);
    }
    this.options.snapScale = value;
  }
  
  toggleSnap() {
    // Toggle snapping on/off
    if (this.options.snapTranslation) {
      this.setTranslationSnap(null);
      this.setRotationSnap(null);
      this.setScaleSnap(null);
    } else {
      this.setTranslationSnap(0.5);
      this.setRotationSnap(Math.PI / 12);
      this.setScaleSnap(0.1);
    }
    
    // Dispatch custom event
    const snapEvent = new CustomEvent('transform-snap-toggle', { 
      detail: { 
        translationSnap: this.options.snapTranslation,
        rotationSnap: this.options.snapRotation,
        scaleSnap: this.options.snapScale
      } 
    });
    this.domElement.dispatchEvent(snapEvent);
  }
  
  enableAllAxes() {
    this.controls.showX = true;
    this.controls.showY = true;
    this.controls.showZ = true;
  }
  
  disableYAxis() {
    // Often useful to prevent moving objects vertically
    this.controls.showX = true;
    this.controls.showY = false;
    this.controls.showZ = true;
  }
  
  setSpace(space) {
    // Toggle between local and world space
    if (['local', 'world'].includes(space)) {
      this.controls.setSpace(space);
    }
  }
  
  toggleSpace() {
    // Toggle between local and world space
    this.controls.setSpace(this.controls.space === 'local' ? 'world' : 'local');
  }
  
  setEnabled(enabled) {
    this.controls.enabled = enabled;
    this.state.isActive = enabled;
    
    if (!enabled && this.selectedObject) {
      this.detach();
    }
  }
  
  isTransforming() {
    return this.state.isTransforming;
  }
  
  getMode() {
    return this.mode;
  }
  
  getSelectedObject() {
    return this.selectedObject;
  }
  
  // Save the current transform state of the selected object
  saveTransformState() {
    if (!this.selectedObject) return null;
    
    return {
      position: this.selectedObject.position.clone(),
      rotation: this.selectedObject.rotation.clone(),
      scale: this.selectedObject.scale.clone()
    };
  }
  
  // Restore a saved transform state to the selected object
  restoreTransformState(state) {
    if (!this.selectedObject || !state) return;
    
    if (state.position) this.selectedObject.position.copy(state.position);
    if (state.rotation) this.selectedObject.rotation.copy(state.rotation);
    if (state.scale) this.selectedObject.scale.copy(state.scale);
  }
  
  dispose() {
    if (this.controls) {
      this.controls.dispose();
      
      if (this.scene) {
        this.scene.remove(this.controls);
      }
    }
  }
}

export default TransformControlsWrapper;