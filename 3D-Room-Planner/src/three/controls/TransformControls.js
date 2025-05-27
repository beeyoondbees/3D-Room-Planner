// src/three/controls/TransformControlsWrapper.js
import { TransformControls as ThreeTransformControls } from 'three/examples/jsm/controls/TransformControls';
import * as THREE from 'three';

export class TransformControlsWrapper {
  constructor(camera, domElement, scene, options = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;

    this.options = {
      size: 1,
      showX: true,
      showY: true,
      showZ: true,
      snapTranslation: 0.5,
      snapRotation: Math.PI / 12,
      snapScale: 0.1,
      ...options,
    };

    this.mode = 'translate';
    this.selectedObject = null;

    this.state = {
      isActive: true,
      isDragging: false,
      isTransforming: false,
    };

    this.initControls();
    this.configureControls();
    this.addEventListeners();

    if (this.scene) {
      this.scene.add(this.controls);
    }
  }

  initControls() {
    this.controls = new ThreeTransformControls(this.camera, this.domElement);
    this.controls.setSize(this.options.size);
  }

  configureControls() {
    this.controls.showX = this.options.showX;
    this.controls.showY = this.options.showY;
    this.controls.showZ = this.options.showZ;

    this.controls.setTranslationSnap(this.options.snapTranslation);
    this.controls.setRotationSnap(this.options.snapRotation);
    this.controls.setScaleSnap(this.options.snapScale);

    this.controls.setMode(this.mode);
  }

  addEventListeners() {
    let previousState = null;
  
    this.controls.addEventListener('dragging-changed', (event) => {
      const object = this.selectedObject;
  
      if (event.value === true) {
        // 🟢 Drag started — capture the state BEFORE changes
        if (object) {
          previousState = {
            position: object.position.clone(),
            rotation: object.rotation.clone(),
            scale: object.scale.clone(),
            userData: JSON.parse(JSON.stringify(object.userData || {})),
          };
          console.log('[TransformControls] 🔄 Captured previousState:', previousState);
        }
  
      } else {
        // 🔴 Drag ended — capture new state and push action
        if (!object || !previousState) {
          console.warn('[TransformControls] ⚠️ Missing object or previous state.');
          return;
        }
  
        const newState = {
          position: object.position.clone(),
          rotation: object.rotation.clone(),
          scale: object.scale.clone(),
          userData: JSON.parse(JSON.stringify(object.userData || {})),
        };
  
        const changed =
          !previousState.position.equals(newState.position) ||
          !previousState.rotation.equals(newState.rotation) ||
          !previousState.scale.equals(newState.scale);
  
        if (changed) {
          const action = {
            type: 'transform',
            object,
            previousProperties: previousState,
            newProperties: newState,
          };
  
          if (window.sceneManager?.undoStack) {
            window.sceneManager.undoStack.push(action);
            window.sceneManager.redoStack = [];
            console.log('[TransformControls] ✅ Transform pushed to undo stack:', action);
          }
        }
  
        previousState = null;
      }
    });
  }

  attach(object) {
    if (!object) return;

    this.selectedObject = object;
    this.controls.attach(object);

    const attachEvent = new CustomEvent('transform-attach', {
      detail: {
        object: this.selectedObject,
        mode: this.mode,
      },
    });
    this.domElement.dispatchEvent(attachEvent);
  }

  detach() {
    if (this.selectedObject) {
      const detachEvent = new CustomEvent('transform-detach', {
        detail: {
          object: this.selectedObject,
          mode: this.mode,
        },
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

      const modeEvent = new CustomEvent('transform-mode-change', {
        detail: {
          mode: this.mode,
          object: this.selectedObject,
        },
      });
      this.domElement.dispatchEvent(modeEvent);
    }
  }

  toggleMode() {
    const modes = ['translate', 'rotate', 'scale'];
    const currentIndex = modes.indexOf(this.mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setMode(modes[nextIndex]);
  }

  setTranslationSnap(value) {
    this.controls.setTranslationSnap(value ?? null);
    this.options.snapTranslation = value;
  }

  setRotationSnap(value) {
    this.controls.setRotationSnap(value ?? null);
    this.options.snapRotation = value;
  }

  setScaleSnap(value) {
    this.controls.setScaleSnap(value ?? null);
    this.options.snapScale = value;
  }

  toggleSnap() {
    if (this.options.snapTranslation) {
      this.setTranslationSnap(null);
      this.setRotationSnap(null);
      this.setScaleSnap(null);
    } else {
      this.setTranslationSnap(0.5);
      this.setRotationSnap(Math.PI / 12);
      this.setScaleSnap(0.1);
    }

    const snapEvent = new CustomEvent('transform-snap-toggle', {
      detail: {
        translationSnap: this.options.snapTranslation,
        rotationSnap: this.options.snapRotation,
        scaleSnap: this.options.snapScale,
      },
    });
    this.domElement.dispatchEvent(snapEvent);
  }

  enableAllAxes() {
    this.controls.showX = true;
    this.controls.showY = true;
    this.controls.showZ = true;
  }

  disableYAxis() {
    this.controls.showX = true;
    this.controls.showY = false;
    this.controls.showZ = true;
  }

  setSpace(space) {
    if (['local', 'world'].includes(space)) {
      this.controls.setSpace(space);
    }
  }

  toggleSpace() {
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

  saveTransformState() {
    if (!this.selectedObject) return null;

    return {
      position: this.selectedObject.position.clone(),
      rotation: this.selectedObject.rotation.clone(),
      scale: this.selectedObject.scale.clone(),
    };
  }

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
