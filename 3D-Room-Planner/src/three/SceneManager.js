// src/three/SceneManager.js
// Core Three.js scene management with direct manipulation

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Room } from './objects/Room'; // Assuming Room.js exists and exports Room class
import { ModelLoader } from './ModelLoader'; // Assuming ModelLoader.js exists
import { GridHelper } from './utils/GridHelper'; // Assuming GridHelper.js exists
import { InteractionManager } from './InteractionManager'; // Assuming InteractionManager.js exists

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.objects = []; // All objects in the scene
    this.selectedObject = null;
    this.modelLoader = new ModelLoader();
    this.interactionMode = 'translate'; // Default to translate mode
    this.undoStack = [];
    this.redoStack = [];

    this.debug = true; // Initialize debug flag

    // Add clock for animation timing
    this.clock = new THREE.Clock();

    // Bind methods before adding event listeners
    // These bindings ensure 'this' context is correct when methods are called as callbacks
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.animate = this.animate.bind(this); // Bound here, so internal re-bind in rAF is optional but safe

    // Initialize Three.js components
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.initControls();
    this.initRoom();
    this.initGrid();
    // Initialize interaction manager AFTER other components, especially camera and renderer
    this.initInteractionManager();

    // Add event listeners
    window.addEventListener('resize', this.onWindowResize);
    this.container.addEventListener('pointerdown', this.onPointerDown);

    // Listen for model loading events for debugging
    if (this.debug) {
      window.addEventListener('model-loading-completed', (event) => {
        console.log('Model loaded:', event.detail.modelType);
      });

      window.addEventListener('model-loading-error', (event) => {
        console.error('Model loading error:', event.detail.error);
      });
    }

    // Start animation loop
    this.animate();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
    this.scene.fog = new THREE.Fog(0xf0f0f0, 10, 50);
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45, // FOV
      this.container.clientWidth / this.container.clientHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    this.camera.position.set(5, 5, 10);
    this.camera.lookAt(0, 0, 0);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      precision: "highp",        // high precision
      stencil: false,            // disable stencil buffer if not needed
      depth: true,               // enable depth buffer
      alpha: false               // disable alpha for better performance
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

    // Shadow settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Enable physically correct lighting for better material rendering
    this.renderer.physicallyCorrectLights = true;

    // Set output color space
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Enable logarithmic depth buffer to reduce z-fighting
    this.renderer.logarithmicDepthBuffer = true;

    this.container.appendChild(this.renderer.domElement);

    // Note: window resize listener is already added in the constructor using the bound 'this.onWindowResize'
  }

  initLights() {
    // Create a lighting group to manage all lights
    this.lights = new THREE.Group();
    this.scene.add(this.lights);

    // 1. Ambient light - increased for brighter overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.lights.add(ambientLight);

    // 2. Primary directional light (simulates sunlight from a window)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;

    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 30;

    const d = 15;
    mainLight.shadow.camera.left = -d;
    mainLight.shadow.camera.right = d;
    mainLight.shadow.camera.top = d;
    mainLight.shadow.camera.bottom = -d;
    mainLight.shadow.radius = 3; // Softer shadows
    this.lights.add(mainLight);

    // 3. Secondary fill light (opposite of main light)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-5, 7, -5);
    fillLight.castShadow = false;
    this.lights.add(fillLight);

    // 4. Ceiling lights - brighter and more realistic room lighting
    const createCeilingLight = (x, z) => {
      const pointLight = new THREE.PointLight(0xffffff, 1, 12, 1);
      pointLight.position.set(x, 2.8, z); // Just below ceiling
      pointLight.castShadow = true;
      pointLight.shadow.mapSize.width = 512;
      pointLight.shadow.mapSize.height = 512;
      return pointLight;
    };

    const ceilingLight1 = createCeilingLight(-3, -2);
    const ceilingLight2 = createCeilingLight(-3, 2);
    const ceilingLight3 = createCeilingLight(3, -2);
    const ceilingLight4 = createCeilingLight(3, 2);
    this.lights.add(ceilingLight1, ceilingLight2, ceilingLight3, ceilingLight4);

    // 5. Product spotlight - dedicated light to highlight the product
    const spotLight = new THREE.SpotLight(0xffffff, 2, 10, Math.PI / 4, 0.5, 1);
    spotLight.position.set(0, 5, 3);
    spotLight.target.position.set(0, 0, 0); // Assuming product is at origin
    spotLight.castShadow = true;

    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 0.5;
    spotLight.shadow.camera.far = 20;
    spotLight.shadow.radius = 2;

    this.scene.add(spotLight.target);
    this.lights.add(spotLight);

    // 6. Ground bounce light - slightly stronger for better reflection
    const bounceLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5);
    this.lights.add(bounceLight);
  }

  initControls() {
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.screenSpacePanning = false;
    this.orbitControls.minDistance = 2;
    this.orbitControls.maxDistance = 30;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground
  }

  initRoom() {
    // Initialize room with specific dimensions
    this.room = new Room(10, 3, 8); // width, height, depth

    // Apply material fixes to prevent flickering on room surfaces
    if (this.room.group) {
        this.room.group.traverse((object) => {
            if (object.isMesh && object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                materials.forEach(material => {
                    if (material.transparent) {
                        material.depthWrite = false; // Prevent depth fighting with transparent materials
                    } else {
                        // For opaque surfaces, use polygon offset to prevent z-fighting
                        material.polygonOffset = true;
                        material.polygonOffsetFactor = 1.0;
                        material.polygonOffsetUnits = 1.0;
                    }
                });
            }
        });
        this.scene.add(this.room.group);
    } else {
        console.warn("Room group not found after initialization.");
    }
    
    // Set floor level for interaction manager (to prevent objects going below floor)
    // This should correspond to the Y level of the floor in your room model.
    // If the room's base is at Y=0, then floorLevel = 0 is correct.
    this.floorLevel = 0; 
    
    window.roomInstance = this.room; // Expose the created room instance globally if needed

    // Delay shape loading until the next frame to ensure scene is ready
    requestAnimationFrame(() => {
      if (window.selectedShapeFromPopup && typeof window.loadShapeFromTemplate === 'function') {
        console.log("📦 Triggering loadShapeFromTemplate:", window.selectedShapeFromPopup);
        window.loadShapeFromTemplate(window.selectedShapeFromPopup);
        delete window.selectedShapeFromPopup; // Clear after use
      } else if (window.selectedShapeFromPopup) {
        console.warn("⚠️ loadShapeFromTemplate function not ready, but selectedShapeFromPopup exists.");
      }
    });
  }

  initGrid() {
    this.grid = new GridHelper(30, 30, 0.5); // size, divisions, centerLineColor, gridColor
    if (this.grid.grid) {
        this.scene.add(this.grid.grid);
    }
  }

  initInteractionManager() {
    this.interactionManager = new InteractionManager(
      this.scene,
      this.camera,
      this.renderer, // renderer.domElement is usually passed for events
      this.orbitControls
    );

    this.interactionManager.setFloorLevel(this.floorLevel);

    this.interactionManager.setCallbacks({
      onObjectSelected: (object) => {
        this.selectedObject = object;
        const event = new CustomEvent('object-selected', { detail: object });
        this.container.dispatchEvent(event);
      },
      onObjectDeselected: () => {
        this.selectedObject = null;
        const event = new CustomEvent('object-deselected');
        this.container.dispatchEvent(event);
      },
      onObjectChanged: (object) => {
        this.addToUndoStack({
          type: 'transform',
          object: object,
          properties: this.getObjectState(object) // Capture state *before* change if possible, or after for redo. This captures current state.
        });
      },
      onObjectPinned: (object) => {
        const event = new CustomEvent('object-pinned', { detail: object });
        this.container.dispatchEvent(event);
      },
      onObjectUnpinned: (object) => {
        const event = new CustomEvent('object-unpinned', { detail: object });
        this.container.dispatchEvent(event);
      },
      onObjectDeleted: (object) => {
        this.objects = this.objects.filter(obj => obj !== object); // Already removed from scene by InteractionManager presumably
        this.addToUndoStack({
          type: 'remove',
          object: object,
          properties: this.getObjectState(object) // State before removal
        });
      },
      onModeChanged: (mode) => {
        this.interactionMode = mode;
        const event = new CustomEvent('mode-changed', { detail: mode });
        this.container.dispatchEvent(event);
      }
    });
  }

  onWindowResize() {
    if (this.camera && this.renderer && this.container) {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
  }

  // Merged animate method
  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate); // Relies on this.animate being pre-bound in constructor

    if (this.orbitControls) {
      this.orbitControls.update();
    }

    if (this.clock) {
      this.clock.getDelta(); // Update clock, delta can be used for animations
    }

    // Fix for shader uniform issues
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.isMesh && object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            if (material.type === 'ShaderMaterial' || material.type === 'RawShaderMaterial') {
              if (material.uniforms) {
                Object.keys(material.uniforms).forEach(key => {
                  if (material.uniforms[key] === undefined) {
                    material.uniforms[key] = { value: null };
                  } else if (material.uniforms[key].value === undefined) {
                    // Ensure .value exists if uniform object itself exists
                    material.uniforms[key].value = null;
                  }
                });
              }
            }
          });
        }
      });
    }
    
    // Update visibility of room walls based on camera direction
    if (this.room && typeof this.room.updateWallVisibility === 'function') {
      this.room.updateWallVisibility(this.camera);
    }

    if (this.renderer && this.scene && this.camera) {
      try {
        this.renderer.render(this.scene, this.camera);
      } catch (error) {
        console.warn('Error during rendering:', error);
        // Potentially stop animation loop if error is critical
        // cancelAnimationFrame(this.animationFrameId);
      }
    }
  }
  
  // Merged addModel method
  addModel(modelType, initialPosition = null) {
    console.log(`Adding model: ${modelType}`);
    const modelPath = `/assets/models/${modelType}.glb`;

    this.modelLoader.load(modelType, modelPath, (model) => {
      let targetXZPosition = new THREE.Vector3();

      if (!initialPosition) {
        const roomCenter = new THREE.Vector3();
        if (this.room && this.room.group) {
          // Get world position of the room's origin. If room is centered at (0,0,0), this works.
          this.room.group.getWorldPosition(roomCenter); 
        }
        targetXZPosition.set(roomCenter.x, 0, roomCenter.z); // Y will be adjusted for floor placement
        console.log(`No initial position provided, targeting room center XZ:`, targetXZPosition);
      } else {
        targetXZPosition.set(initialPosition.x, 0, initialPosition.z); // Use provided X, Z; Y will be adjusted
        console.log(`Using provided initial position for XZ:`, targetXZPosition);
      }

      // Position model initially at target XZ on the assumed floor plane (y=this.floorLevel) for bounding box calculation.
      // The original code assumed y=0 for this step.
      model.position.set(targetXZPosition.x, this.floorLevel, targetXZPosition.z);
      model.updateMatrixWorld(true); // Ensure world matrix and children are updated

      const box = new THREE.Box3().setFromObject(model);
      const modelHeight = box.max.y - box.min.y;
      
      // To place the bottom of the model at `this.floorLevel`:
      // The model's local origin might not be at its geometric center or base.
      // `box.min.y` is the world y-coordinate of the model's bottom.
      // We want box.min.y to be at this.floorLevel.
      // The required model.position.y = current model.position.y - (box.min.y - this.floorLevel)
      // Since model.position.y was set to this.floorLevel for bbox calc, this simplifies:
      // model.position.y = this.floorLevel - (box.min.y - this.floorLevel)
      // If model's origin is at its bottom, box.min.y would be model.position.y and it would be correct.
      // A more robust way considering the model's origin can be anywhere:
      // The center of the bounding box is (box.min.y + box.max.y) / 2
      // The model is currently placed such that its origin is at y = this.floorLevel.
      // We want the bottom of the model (box.min.y) to be at this.floorLevel.
      // The offset needed is this.floorLevel - box.min.y from the model's current position's y value.
      // So, model.position.y = model.position.y + (this.floorLevel - box.min.y)
      // Since model.position.y was set to this.floorLevel:
      // model.position.y = this.floorLevel + (this.floorLevel - box.min.y) = 2 * this.floorLevel - box.min.y. This looks wrong.

      // Let's use the original logic which was simpler and assumed floor at Y=0 for initial placement.
      // If this.floorLevel is not 0, this needs careful adjustment.
      // The first addModel's logic: model.position.set(x,0,z) then offsetY = -box.min.y; model.position.y = offsetY.
      // This places the bottom of the model at y=0.
      // If we want the bottom at this.floorLevel:
      // model.position.y = this.floorLevel - box.min.y (if box.min.y was calculated when model origin was at y=0)
      // Let's re-evaluate:
      // 1. Place model origin at (targetXZPosition.x, this.floorLevel, targetXZPosition.z)
      // model.position.set(targetXZPosition.x, this.floorLevel, targetXZPosition.z);
      // model.updateMatrixWorld(true);
      // const box = new THREE.Box3().setFromObject(model);
      // // box.min.y is the world coordinate of the current bottom of the model.
      // // We want this to be this.floorLevel.
      // // The adjustment needed for model.position.y is: this.floorLevel - box.min.y
      // model.position.y += (this.floorLevel - box.min.y);

      // Sticking to the original simpler logic from the first addModel (assumes floor is y=0 for this calculation step then adjusts)
      // Place model's origin temporarily at y=0 for easier offset calculation
      model.position.set(targetXZPosition.x, 0, targetXZPosition.z);
      model.updateMatrixWorld(true);
      const tempBox = new THREE.Box3().setFromObject(model);
      const yOffsetToPlaceBottomAtZero = -tempBox.min.y;
      
      // Now set the final position, placing the bottom at this.floorLevel
      model.position.set(
        targetXZPosition.x,
        this.floorLevel + yOffsetToPlaceBottomAtZero,
        targetXZPosition.z
      );
      
      model.userData.isModelRoot = true;
      model.userData.selectable = true;
      model.userData.type = modelType;
      // userData.floorOffset might be (this.floorLevel + yOffsetToPlaceBottomAtZero) - this.floorLevel = yOffsetToPlaceBottomAtZero
      // Or it could be the absolute Y position of the model's origin: model.position.y
      // The original stored `offsetY` which was just the value to add to 0 to get the model origin's y.
      // Let's store the calculated y position of the model's origin.
      model.userData.finalYPosition = model.position.y; 

      this.scene.add(model);
      this.objects.push(model);

      this.addToUndoStack({
        type: 'add',
        object: model,
        properties: this.getObjectState(model)
      });

      this.selectObject(model);
      console.log(`Model ${modelType} successfully added. Final position:`, model.position);
    });
  }

  // OBJECT INTERACTION METHODS
  selectObject(object) {
    if (this.interactionManager) {
      this.interactionManager.select(object);
    }
  }

  deselectObject() {
    if (this.interactionManager) {
      this.interactionManager.deselect();
    }
  }

  setInteractionMode(mode) {
    this.interactionMode = mode; // Keep local state if needed, InteractionManager also has its mode
    if (this.interactionManager) {
      this.interactionManager.setInteractionMode(mode);
    }
  }

  pinObject(object) {
    if (this.interactionManager) {
      this.interactionManager.pinObject(object || this.selectedObject);
    }
  }

  unpinObject(object) {
    if (this.interactionManager) {
      this.interactionManager.unpinObject(object || this.selectedObject);
    }
  }

  togglePin(object) {
    object = object || this.selectedObject;
    if (object && this.interactionManager) {
      this.interactionManager.togglePin(object);
    }
  }

  rotateObject(object, angleDegrees) {
    object = object || this.selectedObject;
    if (object && this.interactionManager) {
      this.interactionManager.rotateObject(object, angleDegrees);
    }
  }

  // This method might be for a separate TransformControls instance if not handled by InteractionManager
  // If this.transformControls is used, it needs to be initialized.
  setTransformMode(mode) {
    this.transformMode = mode; // This is a different property from this.interactionMode
    if (this.selectedObject && this.transformControls) { // this.transformControls is not initialized in this file
      this.transformControls.setMode(mode);
    } else if (!this.transformControls) {
      console.warn("setTransformMode called, but this.transformControls is not initialized.");
    }
  }

  duplicateObject(objectToDuplicate) {
    objectToDuplicate = objectToDuplicate || this.selectedObject;
    if (!objectToDuplicate) return;

    // Assuming ModelLoader has a duplicate method that handles cloning and loading if necessary
    this.modelLoader.duplicate(objectToDuplicate, (clone) => {
      clone.position.copy(objectToDuplicate.position);
      clone.rotation.copy(objectToDuplicate.rotation);
      clone.scale.copy(objectToDuplicate.scale);
      
      // Offset position slightly for visibility
      clone.position.x += 0.5;
      clone.position.z += 0.5;
      // Ensure it's on the floor - the duplication might need to re-evaluate floor placement
      // For simplicity here, just copying Y. A more robust duplication might re-run floor logic.

      // UserData might need deep copy or specific handling
      clone.userData = JSON.parse(JSON.stringify(objectToDuplicate.userData)); // Simple deep copy for plain data
      clone.userData.isModelRoot = true; // Ensure it's recognized as a root
      clone.userData.selectable = true;


      this.objects.push(clone);
      this.scene.add(clone);

      this.addToUndoStack({
        type: 'add',
        object: clone,
        properties: this.getObjectState(clone)
      });
      this.selectObject(clone);
      console.log("Object duplicated:", clone);
    });
  }

  removeObject(objectToRemove) {
    objectToRemove = objectToRemove || this.selectedObject;
    if (!objectToRemove) return;

    // Add to undo stack before actual removal
    this.addToUndoStack({
      type: 'remove',
      object: objectToRemove,
      properties: this.getObjectState(objectToRemove) // Capture state before removal
    });

    if (this.selectedObject === objectToRemove) {
      this.deselectObject();
    }

    this.scene.remove(objectToRemove);
    this.objects = this.objects.filter(obj => obj !== objectToRemove);

    // If InteractionManager is tracking objects or has a transform control attached, detach/remove.
    if (this.interactionManager) {
        // InteractionManager might have its own cleanup for deleted objects.
        // e.g., this.interactionManager.handleObjectRemoval(objectToRemove);
    }
    console.log("Object removed:", objectToRemove);
  }

  // UNDO/REDO FUNCTIONALITY
  getObjectState(object) {
    return {
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone(),
      // Potentially other properties like visibility, material changes, parent, etc.
      // For transform, these are key. For add/remove, the object reference is key.
      // userData might also be important to save/restore.
      userData: JSON.parse(JSON.stringify(object.userData)) // Deep copy of userData
    };
  }
  
  applyObjectState(object, state) {
    object.position.copy(state.position);
    object.rotation.copy(state.rotation);
    object.scale.copy(state.scale);
    object.userData = JSON.parse(JSON.stringify(state.userData)); // Restore userData
    object.updateMatrixWorld(true); // Ensure changes are reflected
  }

  addToUndoStack(action) {
    // It's often useful to store the state *before* the action for transforms for undo
    // For 'transform', the `onObjectChanged` callback provides the object *after* change.
    // So `getObjectState(object)` there captures the *new* state.
    // For undo, we need to revert to the *previous* state.
    // This implies `onObjectChanged` should perhaps provide `previousState` or
    // `addToUndoStack` should be called *before* the change is fully committed by InteractionManager.
    // Current setup: 'transform' stores the state *after* transformation.
    // This means for undo('transform'), action.properties is the state to go *back* to (which is the previous state).
    // Let's assume `onObjectChanged` is called after a drag, so `getObjectState` gets the *new* state.
    // Then the undo stack needs to store { object, PREVIOUS_properties }.
    // The current code adds 'object' and its 'current' properties to undo stack upon change.
    // If this is for UNDOING a drag, then the `onObjectChanged` callback should ideally provide the 'before' state.
    // Or, `InteractionManager` should handle state capture for undo.
    // For now, assuming the current logic means `action.properties` is the state to restore.

    this.undoStack.push(action);
    this.redoStack = []; // Clear redo stack on new action
    console.log("Action added to undo stack:", action.type, this.undoStack.length);
  }

  undo() {
    if (this.undoStack.length === 0) {
        console.log("Undo stack empty.");
        return;
    }

    const action = this.undoStack.pop();
    console.log("Undoing action:", action.type);

    // For redo, we need to be able to re-apply the action.
    // If action.type is 'transform', action.properties contains the state *before* the transform.
    // We need to store the state *after* the transform for redo.
    // Let's refine: an action should store { type, object, oldState, newState } for transforms.
    // Or, simpler: when undoing, capture the current state before reverting, for redo.

    let redoAction = { ...action }; // shallow copy

    switch (action.type) {
      case 'add': // Undo 'add' means remove
        // For redo, we need to add it back with its original properties.
        redoAction.properties = this.getObjectState(action.object); // Current state before removal
        this.scene.remove(action.object);
        this.objects = this.objects.filter(obj => obj !== action.object);
        if (this.selectedObject === action.object) this.deselectObject();
        break;

      case 'remove': // Undo 'remove' means add back
        // action.properties contains the state of the object when it was removed.
        this.scene.add(action.object);
        this.objects.push(action.object);
        this.applyObjectState(action.object, action.properties); // Restore its state
        // For redo, it's simply a 'remove' action again, with current state if needed.
        // redoAction.properties remains the same (state when it was originally removed).
        break;

      case 'transform':
        // action.properties holds the state *before* the transformation that was undone.
        // (Assuming onObjectChanged correctly supplied the 'before' state for the original undo entry)
        // If onObjectChanged supplied the 'after' state, then action.properties is the 'target' state for undo.
        // The original code's `onObjectChanged` adds current (i.e., *after*) state to undo.
        // This means for undo, we need the state *before* that. This part of the logic is tricky.

        // Let's assume `action.properties` IS the state to restore (i.e., the previous state).
        const currentStateForRedo = this.getObjectState(action.object); // State before undoing transform
        this.applyObjectState(action.object, action.properties);
        redoAction.properties = currentStateForRedo; // For redo, we want to go back to this state
        if(this.interactionManager) this.interactionManager.updateControlsForObject(action.object); // Refresh gizmos
        break;
      default:
        console.warn('Unknown action type for undo:', action.type);
        this.redoStack.push(redoAction); // Push back if not handled, or just return
        return; // Don't push to redo if unknown
    }
    this.redoStack.push(redoAction);
    console.log("Redo stack:", this.redoStack.length);
  }

  redo() {
    if (this.redoStack.length === 0) {
        console.log("Redo stack empty.");
        return;
    }
    const action = this.redoStack.pop();
    console.log("Redoing action:", action.type);

    let undoAction = { ...action };

    switch (action.type) {
      case 'add': // Redo 'add' means add it back
        // action.properties here should be the state of the object when it was originally added/re-added.
        this.scene.add(action.object);
        this.objects.push(action.object);
        this.applyObjectState(action.object, action.properties);
        // For undo, we'd remove it. Capture its state if needed.
        undoAction.properties = this.getObjectState(action.object);
        break;

      case 'remove': // Redo 'remove' means remove it again
        // action.properties is state when it was removed.
        undoAction.properties = this.getObjectState(action.object); // State before re-removal
        this.scene.remove(action.object);
        this.objects = this.objects.filter(obj => obj !== action.object);
        if (this.selectedObject === action.object) this.deselectObject();
        break;

      case 'transform':
        // action.properties is the state to transform *to* (the state after the original transformation).
        const currentStateForUndo = this.getObjectState(action.object); // State before redoing transform
        this.applyObjectState(action.object, action.properties);
        undoAction.properties = currentStateForUndo; // For undo, go back to this state
        if(this.interactionManager) this.interactionManager.updateControlsForObject(action.object); // Refresh gizmos
        break;
      default:
        console.warn('Unknown action type for redo:', action.type);
        this.undoStack.push(undoAction); // Push back if not handled or return
        return; // Don't push to undo if unknown
    }
    this.undoStack.push(undoAction);
    console.log("Undo stack:", this.undoStack.length);
  }


  // VIEW CONTROLS
  setView2D() {
    this.camera.position.set(0, 15, 0); // Top-down view
    this.camera.lookAt(0, 0, 0);
    this.camera.rotation.set(-Math.PI / 2, 0, 0); // Ensure camera is looking straight down

    if (this.orbitControls) {
        this.orbitControls.target.set(0, 0, 0);
        // For a true 2D view, you might want to switch to an OrthographicCamera
        // or severely restrict OrbitControls.
        this.orbitControls.maxPolarAngle = Math.PI / 2; // Look straight down
        this.orbitControls.minPolarAngle = Math.PI / 2; // Look straight down
        this.orbitControls.enableRotate = false; // Disable rotation for a fixed top view
        // Re-enable panning if it was restricted
        this.orbitControls.screenSpacePanning = true; 
        this.orbitControls.update();
    }
    console.log("Switched to 2D View");
  }

  setView3D() {
    this.camera.position.set(5, 5, 10); // Reset to default 3D perspective
    this.camera.lookAt(0, 0, 0);
    // this.camera.rotation.set(0,0,0); // Not strictly necessary if lookAt is used.

    if (this.orbitControls) {
        this.orbitControls.target.set(0, 0, 0);
        this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground
        this.orbitControls.minPolarAngle = 0; // Allow looking up
        this.orbitControls.enableRotate = true; // Re-enable rotation
        this.orbitControls.screenSpacePanning = false; // Default panning
        this.orbitControls.update();
    }
    console.log("Switched to 3D View");
  }

  // Pointer down listener (example, might be handled by InteractionManager)
  onPointerDown(event) {
    // This is a generic pointer down on the container.
    // InteractionManager likely handles more specific raycasting for object selection.
    // console.log('Pointer down on container', event);
  }

  dispose() {
    console.log("Disposing SceneManager...");
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('resize', this.onWindowResize);
    if (this.container) {
        this.container.removeEventListener('pointerdown', this.onPointerDown);
    }
    
    // Remove model loading debug listeners
    if (this.debug) {
        // Consider storing references to listeners to remove them correctly if they were anonymous
    }


    if (this.interactionManager) {
      this.interactionManager.dispose();
      this.interactionManager = null;
    }

    if (this.orbitControls) {
      this.orbitControls.dispose();
      this.orbitControls = null;
    }
    
    // Dispose models and other objects
    this.objects.forEach(obj => {
        if (obj.parent) {
            obj.parent.remove(obj);
        }
        // If objects have geometry, material, textures, dispose them
        if (obj.traverse) {
            obj.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            Object.values(mat).forEach(value => {
                                if (value && typeof value.dispose === 'function') {
                                    value.dispose();
                                }
                            });
                            mat.dispose();
                        });
                    }
                }
            });
        }
    });
    this.objects = [];


    if (this.room && this.room.group && typeof this.room.dispose === 'function') {
        this.room.dispose(); // Assuming Room class has a dispose method
    }
    this.room = null;

    if (this.grid && this.grid.grid && typeof this.grid.dispose === 'function') {
        this.grid.dispose(); // Assuming GridHelper has a dispose method
    } else if (this.grid && this.grid.grid) {
        if(this.grid.grid.parent) this.grid.grid.parent.remove(this.grid.grid);
        if(this.grid.grid.geometry) this.grid.grid.geometry.dispose();
        if(this.grid.grid.material) this.grid.grid.material.dispose();
    }
    this.grid = null;
    
    if (this.lights) {
        // Dispose lights if they have specific resources
        this.lights.traverse(light => {
            if (light.dispose) light.dispose(); // e.g. shadow map textures
        });
        if(this.lights.parent) this.lights.parent.remove(this.lights);
    }
    this.lights = null;


    if (this.scene) {
        // Remove all children from scene
        while(this.scene.children.length > 0){
            this.scene.remove(this.scene.children[0]);
        }
        if (this.scene.fog) this.scene.fog = null;
        if (this.scene.background) this.scene.background = null;
        // Note: Scene itself does not have a .dispose() method in Three.js r150+
    }
    this.scene = null;


    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }

    this.camera = null;
    this.container = null;
    this.undoStack = [];
    this.redoStack = [];

    console.log("SceneManager disposed.");
  }
}