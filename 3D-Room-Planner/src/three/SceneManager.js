// src/three/SceneManager.js
// Core Three.js scene management with direct manipulation and HDR lighting

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Ensure .js extension for modules
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';    // For HDR environment maps
import { Room } from './objects/Room.js';         // Assuming Room.js exists and exports Room class
import { ModelLoader } from './ModelLoader.js';   // Assuming ModelLoader.js exists
import { GridHelper } from './utils/GridHelper.js'; // Assuming GridHelper.js exists
import { InteractionManager } from './InteractionManager.js'; // Assuming InteractionManager.js exists
import { FloorDimensionEditor } from './FloorDimensionEditor';
import React, { useState, useRef, useEffect } from 'react';
import Toolbar from '../components/UI/Toolbar';

function RoomEditor() {
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [renderer, setRenderer] = useState(null);
  const floorEditorRef = useRef(null);

  useEffect(() => {
    // After initializing scene/camera/renderer
    floorEditorRef.current = new FloorDimensionEditor(scene, camera, renderer);
  }, [scene, camera, renderer]);

  const handleViewAction = (action) => {
    if (action === 'toggle-floor-dimensions') {
      floorEditorRef.current.initRoom([
        { x: -5, z: -3 },
        { x: 5, z: -3 },
        { x: 5, z: 3 },
        { x: -5, z: 3 }
      ]);
    }
  };

  return <Toolbar onViewAction={handleViewAction} />;
}

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.objects = [];
    this.selectedObject = null;
    this.modelLoader = new ModelLoader();
    this.interactionMode = 'translate';
    this.undoStack = [];
    this.redoStack = [];
    this.isLoadingHDR = false;
    this.debug = true;
    this.clock = new THREE.Clock();
    this.room = null; // Initialize room property
    this.floorDimensionEditorInstance = null;
    this.grid = null;
    this.orbitControls = null; // Initialize orbitControls
    // this.grid = null;

    this.onWindowResize = this.onWindowResize.bind(this);
    this.animate = this.animate.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);

    // Initialize Three.js components
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initGrid();
    this.initLights(); // Lights are initialized before HDR, HDR might adjust/replace some
    this.initControls();
    if (this.scene && this.camera && this.renderer && this.orbitControls) {
      this.floorDimensionEditorInstance = new FloorDimensionEditor(
          this.scene, this.camera, this.renderer, this.orbitControls
      );
  } else {
      console.error("SceneManager: Could not initialize FloorDimensionEditor due to missing dependencies (scene, camera, renderer, or orbitControls).");
  }
    this.initRoom();
    // this.initGrid();
    this.initInteractionManager();

    // Preload the HDR environment map
    // Delay slightly to ensure the renderer and scene are fully set up.
    setTimeout(() => {
      this.initHDREnvironment();
    }, 50); // Small delay

    // Add event listeners
    window.addEventListener('resize', this.onWindowResize);
    if (this.container) { // Ensure container exists before adding listener
        this.container.addEventListener('pointerdown', this.onPointerDown);
    }


    // Listen for model loading events for debugging
    if (this.debug) {
      window.addEventListener('model-loading-completed', (event) => {
        console.log('SceneManager: Model loaded:', event.detail.modelType);
      });
      window.addEventListener('model-loading-error', (event) => {
        console.error('SceneManager: Model loading error:', event.detail.error);
      });
    }

    

    // Start animation loop
    this.animate();

    // Add an event listener to detect if we need to re-apply HDR when tab regains focus
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.scene && this.scene.environment) {
        console.log('SceneManager: Tab visible again, refreshing environment maps.');
        // A timeout can help ensure the rendering context is fully restored
        setTimeout(() => this.applyEnvironmentToObjects(true), 100);
      }
    });
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0); // Default background
    // this.scene.fog = new THREE.Fog(0xf0f0f0, 10, 50);   // Default fog
    this.environmentApplied = false; // Flag for tracking if environment has been applied
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
      precision: "highp",
      stencil: false,
      depth: true,
      alpha: false
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

    // Shadow settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Physically correct lighting
    this.renderer.physicallyCorrectLights = true; // Deprecated in newer Three.js, but might be needed for older versions.
                                                 // Modern physically based rendering is inherent.

    // Color space and Tone Mapping for HDR
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct way to set output encoding
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Good general-purpose tone mapping
    this.renderer.toneMappingExposure = 1.0; // Adjust exposure for HDR (0.5-1.5 is a common range)

    // Logarithmic depth buffer to reduce z-fighting
    this.renderer.logarithmicDepthBuffer = true;

    if (this.container) {
        this.container.appendChild(this.renderer.domElement);
    } else {
        console.error("SceneManager: Container not found for renderer.");
    }
  }

  initHDREnvironment(hdrPath = '/assets/envlight/white-studio-lighting_4K.hdr') {
    if (!this.renderer) {
      console.warn('SceneManager: Cannot load HDR - renderer not initialized.');
      return;
    }
    if (this.isLoadingHDR) {
        console.warn('SceneManager: HDR loading already in progress.');
        return;
    }

    console.log('SceneManager: Loading HDR environment map:', hdrPath);
    this.isLoadingHDR = true;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    const loadStartEvent = new CustomEvent('hdr-loading-start');
    if (this.container) this.container.dispatchEvent(loadStartEvent);

    new RGBELoader()
      .setDataType(THREE.FloatType) // or THREE.HalfFloatType
      .load(hdrPath, (texture) => {
        if (!this.scene) { // Scene might have been disposed
          console.warn('SceneManager: Cannot apply HDR - scene no longer exists.');
          texture.dispose();
          pmremGenerator.dispose();
          this.isLoadingHDR = false;
          return;
        }
        try {
          console.log('SceneManager: HDR loaded, processing environment map...');
          const envMap = pmremGenerator.fromEquirectangular(texture).texture;
          this.scene.environment = envMap;
          // this.scene.background = envMap; // Optional: set HDR as background
          console.log('SceneManager: HDR environment processed and applied to scene.');

          this.applyEnvironmentToObjects(true); // Force update to all materials
          this.environmentApplied = true;


          if (this.renderer && this.scene && this.camera) { // Force a render
            this.renderer.render(this.scene, this.camera);
          }

          const loadCompleteEvent = new CustomEvent('hdr-loading-complete');
          if (this.container) this.container.dispatchEvent(loadCompleteEvent);

        } catch (error) {
          console.error('SceneManager: Error applying HDR environment:', error);
        } finally {
          texture.dispose();
          pmremGenerator.dispose();
          this.isLoadingHDR = false;
        }
      },
      (progress) => {
        const percent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
        console.log(`SceneManager: HDR loading: ${percent}%`);
      },
      (error) => {
        console.error('SceneManager: Error loading HDR environment:', error);
        this.isLoadingHDR = false;
        const loadErrorEvent = new CustomEvent('hdr-loading-error', { detail: error });
        if (this.container) this.container.dispatchEvent(loadErrorEvent);
      });
  }

  applyEnvironmentToObjects(forceUpdate = false) {
    if (!this.scene || !this.scene.environment) {
      console.warn('SceneManager: Cannot apply environment to objects - scene or environment not available.');
      return;
    }
    if (this.environmentApplied && !forceUpdate) {
        // console.log('SceneManager: Environment already applied, skipping unless forced.');
        return;
    }

    console.log(`SceneManager: Applying environment map to objects (forceUpdate: ${forceUpdate})`);
    let updatedMaterials = 0;
    this.scene.traverse((object) => {
      if (object.isMesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            material.envMap = this.scene.environment;
            material.envMapIntensity = 0.8; // Default intensity, can be adjusted
            material.needsUpdate = true;
            updatedMaterials++;
          }
        });
      }
    });
    console.log(`SceneManager: Updated ${updatedMaterials} materials with environment map.`);
    this.environmentApplied = true; // Mark as applied
  }

  initLights() {
    this.lights = new THREE.Group();
    this.scene.add(this.lights);

    // With HDR, traditional lights are often for fill, specific highlights, or shadows.
    // 1. Ambient light - moderate for base fill with HDR
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Lower intensity with HDR
    this.lights.add(ambientLight);

    // 2. Hemisphere light for subtle up/down color variation and soft fill
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.3); // Sky, Ground, Intensity
    hemiLight.position.set(0, 1, 0); // Optional: position it
    this.lights.add(hemiLight);
    
    // 3. Single directional light primarily for casting shadows if needed.
    // HDR provides the main illumination and reflections.
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.5); // Lower intensity
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
  }

  initControls() {
    if (this.camera && this.renderer && this.renderer.domElement) {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.1;
        this.orbitControls.screenSpacePanning = false;
        this.orbitControls.minDistance = 1; // Adjusted minDistance
        this.orbitControls.maxDistance = 50; // Adjusted maxDistance
        this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent going too far below horizon
    } else {
        console.error("SceneManager: Camera or renderer not ready for OrbitControls.");
    }
  }

  initRoom() {
    const defaultRoomPoints = [
        { x: -5, z: -3 }, { x: 5, z: -3 },
        { x: 5, z: 3 },  { x: -5, z: 3 }
    ];
    
    // Assuming your Room constructor takes height, or you call buildFromPolygon
    // Your original Room constructor was: new Room(10, 2.5, 8) which seems like dimensions not just height.
    // The provided Room.js takes height. Let's use that.
    this.room = new Room(2.5); // Pass default height
    this.room.buildFromPolygon(defaultRoomPoints, false);

    if (this.room.group) {
      this.room.group.traverse((object) => { /* ... your material setup ... */ });
      this.scene.add(this.room.group);
    } else {
      console.warn("SceneManager: Room group not found after initialization.");
    }
    this.floorLevel = 0; 
    window.roomInstance = this.room; // Make globally accessible IF NEEDED, but prefer direct calls

    // Your existing logic for window.selectedShapeFromPopup
    requestAnimationFrame(() => {
      if (window.selectedShapeFromPopup && typeof window.loadShapeFromTemplate === 'function') {
        console.log("SceneManager: Triggering loadShapeFromTemplate:", window.selectedShapeFromPopup);
        window.loadShapeFromTemplate(window.selectedShapeFromPopup); // This function needs to be defined globally or accessible
        delete window.selectedShapeFromPopup;
      } else if (window.selectedShapeFromPopup) { /* ... warning ... */ }
    });
  }

  initGrid() {
    if (!this.scene ) return;
    this.grid = new GridHelper(30, 30, 0.5); // size, divisions, centerLineColor, gridColor
    if (this.grid.grid) {
      this.grid.grid.visible = true; // show by default
      this.scene.add(this.grid.grid);
    }
  }

 
  
  toggleGridVisibility() {
    if (this.grid && this.grid.grid) {
      this.grid.grid.visible = !this.grid.grid.visible;
      console.log(`SceneManager: Grid is now ${this.grid.grid.visible ? 'visible' : 'hidden'}`);
    }
  }
  

  initInteractionManager() {
    if (this.scene && this.camera && this.renderer && this.orbitControls) {
        this.interactionManager = new InteractionManager(
          this.scene,
          this.camera,
          this.renderer,
          this.orbitControls
        );
        this.interactionManager.setFloorLevel(this.floorLevel);
        this.interactionManager.setCallbacks({
          onObjectSelected: (object) => {
            this.selectedObject = object;
            if (this.container) this.container.dispatchEvent(new CustomEvent('object-selected', { detail: object }));
          },
          onObjectDeselected: () => {
            this.selectedObject = null;
            if (this.container) this.container.dispatchEvent(new CustomEvent('object-deselected'));
          },
          onObjectChanged: (object, previousState) => { // Assuming InteractionManager can provide previousState
            this.addToUndoStack({
              type: 'transform',
              object: object,
              previousProperties: previousState, // State BEFORE the change
              newProperties: this.getObjectState(object) // State AFTER the change
            });
          },
          onObjectPinned: (object) => {
            if (this.container) this.container.dispatchEvent(new CustomEvent('object-pinned', { detail: object }));
          },
          onObjectUnpinned: (object) => {
            if (this.container) this.container.dispatchEvent(new CustomEvent('object-unpinned', { detail: object }));
          },
          onObjectDeleted: (object) => {
            const originalState = this.getObjectState(object); // Get state before filtering
            this.objects = this.objects.filter(obj => obj !== object);
            this.addToUndoStack({ type: 'remove', object: object, properties: originalState });
          },
          onModeChanged: (mode) => {
            this.interactionMode = mode;
            if (this.container) this.container.dispatchEvent(new CustomEvent('mode-changed', { detail: mode }));
          }
        });
    } else {
        console.error("SceneManager: Dependencies for InteractionManager not ready.");
    }
  }

  onWindowResize() {
    if (this.camera && this.renderer && this.container) {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
  }
  
  onPointerDown(event) {
    // This can be a placeholder or used for scene-wide interactions
    // if not handled entirely by InteractionManager.
    // console.log('SceneManager: Pointer down on container', event);
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    if (this.orbitControls) {
      this.orbitControls.update(delta); // Pass delta if damping or other time-dependent features are used
    }

    // Apply environment map to newly added objects if not yet applied
    if (this.scene && this.scene.environment && !this.environmentApplied && !this.isLoadingHDR) {
        this.applyEnvironmentToObjects();
    }
    
    if (this.interactionManager && typeof this.interactionManager.update === 'function') {
        this.interactionManager.update(delta); // If InteractionManager has an update loop
    }
    if (this.interactionManager && typeof this.interactionManager.updateBoundingBoxes === 'function') {
        this.interactionManager.updateBoundingBoxes();
    }


    if (this.room && typeof this.room.updateWallVisibility === 'function') {
      this.room.updateWallVisibility(this.camera);
    }

    if (this.renderer && this.scene && this.camera) {
      try {
        this.renderer.render(this.scene, this.camera);
      } catch (error) {
        console.warn('SceneManager: Error during rendering:', error);
      }
    }
  }

  addModel(modelType, initialPosition = null) {
    console.log(`SceneManager: Adding model: ${modelType}`);
    const modelPath = `/assets/models/${modelType}.glb`;

    this.modelLoader.load(modelType, modelPath, (model) => {
      let targetXZPosition = new THREE.Vector3();
      if (!initialPosition) {
        const roomCenter = new THREE.Vector3();
        if (this.room && this.room.group) {
          this.room.group.getWorldPosition(roomCenter);
        }
        targetXZPosition.set(roomCenter.x, 0, roomCenter.z);
      } else {
        targetXZPosition.set(initialPosition.x, 0, initialPosition.z);
      }

      model.position.set(targetXZPosition.x, 0, targetXZPosition.z); // Temp Y for bbox
      model.updateMatrixWorld(true);
      const tempBox = new THREE.Box3().setFromObject(model);
      const yOffsetToPlaceBottomAtZero = -tempBox.min.y;
      model.position.set(
        targetXZPosition.x,
        this.floorLevel + yOffsetToPlaceBottomAtZero,
        targetXZPosition.z
      );

      model.userData.isModelRoot = true;
      model.userData.selectable = true;
      model.userData.type = modelType;
      model.userData.finalYPosition = model.position.y;

      // Configure materials for HDR lighting
      if (this.scene && this.scene.environment) {
        model.traverse((object) => {
          if (object.isMesh && object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(material => {
              if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                material.envMap = this.scene.environment;
                material.envMapIntensity = 1.0; // Consistent with applyEnvironmentToObjects
                material.needsUpdate = true;
              }
            });
          }
        });
      } else if (!this.isLoadingHDR) { // If HDR is not loading and not set, mark environment as not applied
          this.environmentApplied = false;
      }


      this.scene.add(model);
      this.objects.push(model);
      this.addToUndoStack({ type: 'add', object: model, properties: this.getObjectState(model) });
      this.selectObject(model);
      console.log(`SceneManager: Model ${modelType} added. Position:`, model.position);
    });
  }

  selectObject(object) {
    if (this.interactionManager) this.interactionManager.select(object);
  }
  deselectObject() {
    if (this.interactionManager) this.interactionManager.deselect();
  }
  setInteractionMode(mode) {
    this.interactionMode = mode;
    if (this.interactionManager) this.interactionManager.setInteractionMode(mode);
  }
  pinObject(object) {
    if (this.interactionManager) this.interactionManager.pinObject(object || this.selectedObject);
  }
  unpinObject(object) {
    if (this.interactionManager) this.interactionManager.unpinObject(object || this.selectedObject);
  }
  togglePin(object) {
    object = object || this.selectedObject;
    if (object && this.interactionManager) this.interactionManager.togglePin(object);
  }
  rotateObject(object, angleDegrees) {
    object = object || this.selectedObject;
    if (object && this.interactionManager) this.interactionManager.rotateObject(object, angleDegrees);
  }
  setTransformMode(mode) { // Assumes this.transformControls is part of InteractionManager or separate
    this.transformMode = mode;
    if (this.interactionManager && typeof this.interactionManager.setTransformMode === 'function') {
        this.interactionManager.setTransformMode(mode);
    } else if (this.selectedObject && this.transformControls) {
      this.transformControls.setMode(mode);
    } else {
      console.warn("SceneManager: setTransformMode called, but no transform controls found.");
    }
  }

  duplicateObject(objectToDuplicate) {
    objectToDuplicate = objectToDuplicate || this.selectedObject;
    if (!objectToDuplicate) return;

    this.modelLoader.duplicate(objectToDuplicate, (clone) => {
      clone.position.copy(objectToDuplicate.position);
      clone.rotation.copy(objectToDuplicate.rotation);
      clone.scale.copy(objectToDuplicate.scale);
      clone.position.x += 0.5;
      clone.position.z += 0.5;

      clone.userData = JSON.parse(JSON.stringify(objectToDuplicate.userData));
      clone.userData.isModelRoot = true;
      clone.userData.selectable = true;

      // Apply HDR environment to the cloned object's materials
      if (this.scene && this.scene.environment) {
        clone.traverse((child) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(material => {
              if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                material.envMap = this.scene.environment;
                material.envMapIntensity = 1.0;
                material.needsUpdate = true;
              }
            });
          }
        });
      } else if (!this.isLoadingHDR) {
          this.environmentApplied = false;
      }


      this.objects.push(clone);
      this.scene.add(clone);
      this.addToUndoStack({ type: 'add', object: clone, properties: this.getObjectState(clone) });
      this.selectObject(clone);
      console.log("SceneManager: Object duplicated:", clone);
    });
  }

  removeObject(objectToRemove) {
    objectToRemove = objectToRemove || this.selectedObject;
    if (!objectToRemove) return;
    const state = this.getObjectState(objectToRemove); // Get state before removal
    this.addToUndoStack({ type: 'remove', object: objectToRemove, properties: state });
    if (this.selectedObject === objectToRemove) this.deselectObject();
    this.scene.remove(objectToRemove);
    this.objects = this.objects.filter(obj => obj !== objectToRemove);
    console.log("SceneManager: Object removed:", objectToRemove);
  }

  getObjectState(object) {
    return {
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone(),
      userData: JSON.parse(JSON.stringify(object.userData))
    };
  }
  applyObjectState(object, state) {
    object.position.copy(state.position);
    object.rotation.copy(state.rotation);
    object.scale.copy(state.scale);
    object.userData = JSON.parse(JSON.stringify(state.userData));
    object.updateMatrixWorld(true);
  }

  addToUndoStack(action) {
    // For 'transform', action should contain { type, object, previousProperties, newProperties }
    this.undoStack.push(action);
    this.redoStack = [];
    console.log("SceneManager: Action added to undo stack:", action.type, this.undoStack.length);
  }

  undo() {
    if (this.undoStack.length === 0) { console.log("SceneManager: Undo stack empty."); return; }
    const action = this.undoStack.pop();
    console.log("SceneManager: Undoing action:", action.type);

    switch (action.type) {
      case 'add':
        this.scene.remove(action.object);
        this.objects = this.objects.filter(obj => obj !== action.object);
        if (this.selectedObject === action.object) this.deselectObject();
        break;
      case 'remove':
        this.scene.add(action.object);
        this.objects.push(action.object);
        this.applyObjectState(action.object, action.properties);
        break;
      case 'transform':
        this.applyObjectState(action.object, action.previousProperties); // Revert to previous state
        if(this.interactionManager) this.interactionManager.updateControlsForObject(action.object);
        break;
      default:
        console.warn('SceneManager: Unknown action type for undo:', action.type);
        this.redoStack.push(action); // Push back if not handled correctly for redo
        return;
    }
    this.redoStack.push(action); // Original action (with its new/old states) goes to redo
  }

  redo() {
    if (this.redoStack.length === 0) { console.log("SceneManager: Redo stack empty."); return; }
    const action = this.redoStack.pop();
    console.log("SceneManager: Redoing action:", action.type);

    switch (action.type) {
      case 'add':
        this.scene.add(action.object);
        this.objects.push(action.object);
        this.applyObjectState(action.object, action.properties); // Restore state when added
        break;
      case 'remove':
        this.scene.remove(action.object);
        this.objects = this.objects.filter(obj => obj !== action.object);
        if (this.selectedObject === action.object) this.deselectObject();
        break;
      case 'transform':
        this.applyObjectState(action.object, action.newProperties); // Apply the new state
        if(this.interactionManager) this.interactionManager.updateControlsForObject(action.object);
        break;
      default:
        console.warn('SceneManager: Unknown action type for redo:', action.type);
        this.undoStack.push(action); // Push back if not handled correctly for undo
        return;
    }
    this.undoStack.push(action);
  }

  setView2D() {
    this.camera.position.set(0, 15, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.rotation.set(-Math.PI / 2, 0, 0);
    if (this.orbitControls) {
      this.orbitControls.target.set(0, 0, 0);
      this.orbitControls.maxPolarAngle = 0.01; // Almost straight down
      this.orbitControls.minPolarAngle = 0; // Almost straight down
      this.orbitControls.enableRotate = false;
      this.orbitControls.screenSpacePanning = true;
      this.orbitControls.update();
    }
    console.log("SceneManager: Switched to 2D View");
  }

  setView3D() {
    this.camera.position.set(5, 5, 10);
    this.camera.lookAt(0, 0, 0);
    if (this.orbitControls) {
      this.orbitControls.target.set(0, 0, 0);
      this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
      this.orbitControls.minPolarAngle = 0;
      this.orbitControls.enableRotate = true;
      this.orbitControls.screenSpacePanning = false;
      this.orbitControls.update();
    }
    console.log("SceneManager: Switched to 3D View");
  }

  setHDRExposure(value) {
    if (this.renderer) {
      this.renderer.toneMappingExposure = Number(value);
      if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
    }
  }
  setEnvironmentIntensity(value) {
    if (!this.scene) return;
    const intensity = Number(value);
    let updatedCount = 0;
    this.scene.traverse((object) => {
      if (object.isMesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            material.envMapIntensity = intensity;
            material.needsUpdate = true;
            updatedCount++;
          }
        });
      }
    });
    console.log(`SceneManager: Updated envMapIntensity to ${intensity} on ${updatedCount} materials`);
    if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }
  loadHDREnvironment(hdrPath) {
    this.environmentApplied = false; // Reset flag so new env is applied
    this.initHDREnvironment(hdrPath);
  }
  refreshEnvironmentMaps() {
    if (this.scene && this.scene.environment) {
      this.applyEnvironmentToObjects(true); // Force update
      if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
    }
  }
  toggleFloorEditor() {
    if (!this.floorDimensionEditorInstance) {
        console.error("SceneManager: FloorDimensionEditor instance not available.");
        return;
    }
    if (!this.room || typeof this.room.getCurrentPoints !== 'function' || !this.room.group) {
        console.error("SceneManager: Room instance, getCurrentPoints method, or room.group not available.");
        return;
    }

    if (this.floorDimensionEditorInstance.isActive) {
        this.floorDimensionEditorInstance.clearEditor();
        if (this.interactionManager && typeof this.interactionManager.enable === 'function') {
            this.interactionManager.enable();
        } else if (this.interactionManager) { 
            this.interactionManager.enabled = true; 
        }
        if (this.orbitControls) this.orbitControls.enabled = true;
    } else {
        const localRoomPoints = this.room.getCurrentPoints(); // These are local to room.group's origin

        if (localRoomPoints && localRoomPoints.length >= 3) {
            // --- Convert local room points to world space ---
            const roomGroupWorldPosition = new THREE.Vector3();
            this.room.group.getWorldPosition(roomGroupWorldPosition); // Get world position of the room group

            // Note: If room.group has rotation/scale, a simple addition is not enough.
            // We need to apply the group's full world matrix to each point.
            // However, your Room.js only sets group.position, not rotation or scale.
            // So, direct addition of the group's world position should work for now.
            // If room.group could be rotated/scaled, you'd do:
            // const worldPoint = new THREE.Vector3(localPoint.x, 0, localPoint.z).applyMatrix4(this.room.group.matrixWorld);
            // initialPointsForEditor.push({ x: worldPoint.x, z: worldPoint.z });

            const initialPointsForEditor = localRoomPoints.map(localPoint => {
                // Assuming points are in XZ plane locally at Y=0 within the group
                const worldPoint = new THREE.Vector3(localPoint.x, 0, localPoint.z);
                // Transform point from room.group's local space to world space
                worldPoint.applyMatrix4(this.room.group.matrixWorld); 
                return { x: worldPoint.x, z: worldPoint.z };
            });
            
            console.log("SceneManager: Local room points:", JSON.parse(JSON.stringify(localRoomPoints)));
            console.log("SceneManager: Room group world position:", roomGroupWorldPosition);
            console.log("SceneManager: Passing these WORLD points to FloorDimensionEditor:", JSON.parse(JSON.stringify(initialPointsForEditor)));

            if (this.interactionManager && typeof this.interactionManager.disable === 'function') {
                this.interactionManager.disable();
                if(typeof this.interactionManager.deselect === 'function') this.interactionManager.deselect();
            } else if (this.interactionManager) {
                 this.interactionManager.enabled = false;
                 if(typeof this.interactionManager.deselect === 'function') this.interactionManager.deselect();
            }
            
            this.floorDimensionEditorInstance.initEditor(initialPointsForEditor, (updatedWorldPoints) => {
                console.log("SceneManager: Floor points updated by editor (these are WORLD points):", updatedWorldPoints);
                if (this.room && typeof this.room.buildFromPolygon === 'function' && this.room.group) {
                    
                    // --- Convert updated world points back to room.group's local space ---
                    const inverseRoomGroupMatrix = new THREE.Matrix4();
                    inverseRoomGroupMatrix.copy(this.room.group.matrixWorld).invert();

                    const newLocalPoints = updatedWorldPoints.map(worldPoint => {
                        const localP = new THREE.Vector3(worldPoint.x, 0, worldPoint.z); // Assuming Y is 0 for floor points
                        localP.applyMatrix4(inverseRoomGroupMatrix);
                        return { x: localP.x, z: localP.z };
                    });
                    
                    console.log("SceneManager: Converted back to LOCAL points for buildFromPolygon:", newLocalPoints);
                    this.room.buildFromPolygon(newLocalPoints, false); 
                    
                    if (this.container) {
                        this.container.dispatchEvent(new CustomEvent('room-shape-updated', { 
                            detail: { points: updatedWorldPoints.map(p => ({...p})) } 
                        }));
                    }
                }
            });
        } else {
            console.warn("SceneManager: Current room has insufficient points to activate floor editor.", localRoomPoints);
        }
    }
  }

  // 


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