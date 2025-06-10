// src/three/SceneManager.js
// Complete Three.js scene management with working duplication and error handling
// Replace your existing SceneManager.js with this complete version

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { Room } from './objects/Room.js';
import { ModelLoader } from './ModelLoader.js';
import { GridHelper } from './utils/GridHelper.js';
import { InteractionManager } from './InteractionManager.js';
import { FloorDimensionEditor } from './FloorDimensionEditor';

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
    this.room = null;
    this.floorDimensionEditorInstance = null;
    this.grid = null;
    this.orbitControls = null;
    this.mixers = new Map(); // Store AnimationMixers for animated models
    this.isInitialized = false;
    this.initializationPromise = null;

    // Bind methods
    this.onWindowResize = this.onWindowResize.bind(this);
    this.animate = this.animate.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);

    // Start initialization
    this.initializationPromise = this.initialize();

    // Make globally accessible for debugging (development only)
    if (typeof window !== 'undefined' && this.debug) {
      window.sceneManager = this;
    }
  }

  async initialize() {
    try {
      console.log('SceneManager: Starting initialization...');

      // Initialize Three.js components in order
      this.initScene();
      this.initCamera();
      this.initRenderer();
      this.initLights();
      this.initControls();
      this.initGrid();
      this.initRoom();
      this.initInteractionManager();

      // Initialize floor dimension editor
      if (this.scene && this.camera && this.renderer && this.orbitControls) {
        try {
          this.floorDimensionEditorInstance = new FloorDimensionEditor(
            this.scene, this.camera, this.renderer, this.orbitControls
          );
        } catch (error) {
          console.warn("SceneManager: FloorDimensionEditor initialization failed:", error);
        }
      } else {
        console.error("SceneManager: Could not initialize FloorDimensionEditor due to missing dependencies.");
      }

      // Add event listeners
      this.addEventListeners();

      // Load HDR environment asynchronously
      try {
        await this.initHDREnvironment();
      } catch (error) {
        console.warn('SceneManager: HDR loading failed, continuing without HDR:', error);
      }

      // Start animation loop
      this.animate();

      this.isInitialized = true;
      console.log('SceneManager: Initialization complete');

      // Dispatch ready event
      if (this.container) {
        this.container.dispatchEvent(new CustomEvent('scene-ready'));
      }

    } catch (error) {
      console.error('SceneManager: Initialization failed:', error);
      throw error;
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
    this.environmentApplied = false;
  }

  initCamera() {
    if (!this.container) {
      console.error('SceneManager: Container not available for camera initialization');
      return;
    }

    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 10);
    this.camera.lookAt(0, 0, 0);
  }

  initRenderer() {
    if (!this.container) {
      console.error('SceneManager: Container not available for renderer initialization');
      return;
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      precision: "highp",
      stencil: false,
      depth: true,
      alpha: false,
      preserveDrawingBuffer: true 
    });
    
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

    // Shadow settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Physically correct lighting
    this.renderer.physicallyCorrectLights = true;

    // Color space and Tone Mapping for HDR
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Logarithmic depth buffer to reduce z-fighting
    this.renderer.logarithmicDepthBuffer = true;

    this.container.appendChild(this.renderer.domElement);
  }

  async initHDREnvironment(hdrPath = '/assets/envlight/white-studio-lighting_4K.hdr') {
    return new Promise((resolve, reject) => {
      if (!this.renderer) {
        reject(new Error('Renderer not initialized'));
        return;
      }

      if (this.isLoadingHDR) {
        console.warn('SceneManager: HDR loading already in progress.');
        resolve();
        return;
      }

      console.log('SceneManager: Loading HDR environment map:', hdrPath);
      this.isLoadingHDR = true;

      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      pmremGenerator.compileEquirectangularShader();

      const loadStartEvent = new CustomEvent('hdr-loading-start');
      if (this.container) this.container.dispatchEvent(loadStartEvent);

      new RGBELoader()
        .setDataType(THREE.FloatType)
        .load(
          hdrPath,
          (texture) => {
            try {
              if (!this.scene) {
                throw new Error('Scene disposed during HDR loading');
              }

              console.log('SceneManager: HDR loaded, processing environment map...');
              const envMap = pmremGenerator.fromEquirectangular(texture).texture;
              this.scene.environment = envMap;
              
              this.applyEnvironmentToObjects(true);
              this.environmentApplied = true;

              if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
              }

              const loadCompleteEvent = new CustomEvent('hdr-loading-complete');
              if (this.container) this.container.dispatchEvent(loadCompleteEvent);

              console.log('SceneManager: HDR environment loaded successfully');
              resolve(envMap);

            } catch (error) {
              console.error('SceneManager: Error processing HDR:', error);
              reject(error);
            } finally {
              texture.dispose();
              pmremGenerator.dispose();
              this.isLoadingHDR = false;
            }
          },
          (progress) => {
            const percent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
            if (this.debug) console.log(`SceneManager: HDR loading: ${percent}%`);
          },
          (error) => {
            console.error('SceneManager: Error loading HDR environment:', error);
            pmremGenerator.dispose();
            this.isLoadingHDR = false;
            
            const loadErrorEvent = new CustomEvent('hdr-loading-error', { detail: error });
            if (this.container) this.container.dispatchEvent(loadErrorEvent);
            
            reject(error);
          }
        );
    });
  }

  applyEnvironmentToObjects(forceUpdate = false) {
    if (!this.scene || !this.scene.environment) {
      console.warn('SceneManager: Cannot apply environment to objects - scene or environment not available.');
      return;
    }
    if (this.environmentApplied && !forceUpdate) {
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
            material.envMapIntensity = 0.8;
            material.needsUpdate = true;
            updatedMaterials++;
          }
        });
      }
    });
    console.log(`SceneManager: Updated ${updatedMaterials} materials with environment map.`);
    this.environmentApplied = true;
  }

  initLights() {
    this.lights = new THREE.Group();
    this.scene.add(this.lights);

    // Ambient light - moderate for base fill with HDR
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.lights.add(ambientLight);

    // Hemisphere light for subtle up/down color variation
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.3);
    hemiLight.position.set(0, 1, 0);
    this.lights.add(hemiLight);
    
    // Directional light primarily for casting shadows
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.5);
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
    mainLight.shadow.radius = 3;
    this.lights.add(mainLight);
  }

  initControls() {
    if (this.camera && this.renderer && this.renderer.domElement) {
      this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
      this.orbitControls.enableDamping = true;
      this.orbitControls.dampingFactor = 0.1;
      this.orbitControls.screenSpacePanning = false;
      this.orbitControls.minDistance = 1;
      this.orbitControls.maxDistance = 50;
      this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
    } else {
      console.error("SceneManager: Camera or renderer not ready for OrbitControls.");
    }
  }

  initRoom() {
    const defaultRoomPoints = [
      { x: -5, z: -3 }, { x: 5, z: -3 },
      { x: 5, z: 3 },  { x: -5, z: 3 }
    ];
    
    try {
      this.room = new Room(2.5);
      this.room.buildFromPolygon(defaultRoomPoints, false);

      if (this.room.group) {
        this.room.group.traverse((object) => {
          // Setup room materials if needed
        });
        this.scene.add(this.room.group);
      } else {
        console.warn("SceneManager: Room group not found after initialization.");
      }
    } catch (error) {
      console.error("SceneManager: Failed to initialize room:", error);
    }
    
    this.floorLevel = 0; 
    
    // Make room globally accessible if needed
    if (typeof window !== 'undefined') {
      window.roomInstance = this.room;
    }

    // Handle popup selection
    requestAnimationFrame(() => {
      if (typeof window !== 'undefined' && window.selectedShapeFromPopup && typeof window.loadShapeFromTemplate === 'function') {
        console.log("SceneManager: Triggering loadShapeFromTemplate:", window.selectedShapeFromPopup);
        window.loadShapeFromTemplate(window.selectedShapeFromPopup);
        delete window.selectedShapeFromPopup;
      }
    });
  }

  initGrid() {
    if (!this.scene) return;
    
    try {
      this.grid = new GridHelper(30, 30, 0.5);
      if (this.grid.grid) {
        this.grid.grid.visible = true;
        this.scene.add(this.grid.grid);
      }
    } catch (error) {
      console.error("SceneManager: Failed to initialize grid:", error);
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
      try {
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
          onObjectChanged: (object, previousState) => {
            this.addToUndoStack({
              type: 'transform',
              object: object,
              previousProperties: previousState,
              newProperties: this.getObjectState(object)
            });
          },
          onObjectPinned: (object) => {
            if (this.container) this.container.dispatchEvent(new CustomEvent('object-pinned', { detail: object }));
          },
          onObjectUnpinned: (object) => {
            if (this.container) this.container.dispatchEvent(new CustomEvent('object-unpinned', { detail: object }));
          },
          onObjectDeleted: (object) => {
            const originalState = this.getObjectState(object);
            this.objects = this.objects.filter(obj => obj !== object);
            this.addToUndoStack({ type: 'remove', object: object, properties: originalState });
          },
          onModeChanged: (mode) => {
            this.interactionMode = mode;
            if (this.container) this.container.dispatchEvent(new CustomEvent('mode-changed', { detail: mode }));
          }
        });
      } catch (error) {
        console.error("SceneManager: Failed to initialize InteractionManager:", error);
      }
    } else {
      console.error("SceneManager: Dependencies for InteractionManager not ready.");
    }
  }

  addEventListeners() {
    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    
    if (this.container) {
      this.container.addEventListener('pointerdown', this.onPointerDown);
    }

    // Listen for model loading events for debugging
    if (this.debug && typeof window !== 'undefined') {
      window.addEventListener('model-loading-completed', (event) => {
        console.log('SceneManager: Model loaded:', event.detail.modelType);
      });
      window.addEventListener('model-loading-error', (event) => {
        console.error('SceneManager: Model loading error:', event.detail.error);
      });
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
    // Placeholder for scene-wide interactions
  }

  onVisibilityChange() {
    if (document.visibilityState === 'visible' && this.scene && this.scene.environment) {
      console.log('SceneManager: Tab visible again, refreshing environment maps.');
      setTimeout(() => this.applyEnvironmentToObjects(true), 100);
    }
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    if (!this.isInitialized) return;

    try {
      const delta = this.clock.getDelta();

      // Update animation mixers
      this.mixers.forEach((mixer) => {
        mixer.update(delta);
      });

      if (this.orbitControls) {
        this.orbitControls.update();
      }

      // Apply environment map to newly added objects if not yet applied
      if (this.scene && this.scene.environment && !this.environmentApplied && !this.isLoadingHDR) {
        this.applyEnvironmentToObjects();
      }
      
      // Update interaction manager safely
      if (this.interactionManager) {
        try {
          if (typeof this.interactionManager.update === 'function') {
            this.interactionManager.update(delta);
          }
          if (typeof this.interactionManager.updateBoundingBoxes === 'function') {
            this.interactionManager.updateBoundingBoxes();
          }
        } catch (error) {
          console.warn('SceneManager: Error updating interaction manager:', error);
        }
      }

      if (this.room && typeof this.room.updateWallVisibility === 'function') {
        this.room.updateWallVisibility(this.camera);
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

    } catch (error) {
      console.warn('SceneManager: Error in animation loop:', error);
    }
  }

  async addModel(modelType, initialPosition = null) {
    try {
      if (!this.isInitialized) {
        await this.initializationPromise;
      }

      console.log(`SceneManager: Adding model: ${modelType}`);
      const modelPath = `/assets/models/${modelType}.glb`;

      return new Promise((resolve, reject) => {
        this.modelLoader.load(modelType, modelPath, 
          (model) => {
            try {
              this.processLoadedModel(model, modelType, initialPosition);
              resolve(model);
            } catch (error) {
              console.error(`Error processing model ${modelType}:`, error);
              reject(error);
            }
          },
          undefined, // onProgress
          (error) => {
            console.error(`Failed to load model ${modelType}:`, error);
            reject(error);
          }
        );
      });

    } catch (error) {
      console.error(`SceneManager: Error in addModel for ${modelType}:`, error);
      throw error;
    }
  }

  processLoadedModel(model, modelType, initialPosition) {
    // Calculate position
    let targetXZPosition = new THREE.Vector3();
    if (!initialPosition) {
      const roomCenter = new THREE.Vector3();
      if (this.room?.group) {
        this.room.group.getWorldPosition(roomCenter);
      }
      targetXZPosition.set(roomCenter.x, 0, roomCenter.z);
    } else {
      targetXZPosition.set(initialPosition.x, 0, initialPosition.z);
    }

    // Position model properly on floor
    this.positionModelOnFloor(model, targetXZPosition);

    // Setup model properties
    model.userData = {
      isModelRoot: true,
      selectable: true,
      type: modelType,
      finalYPosition: model.position.y,
      ...model.userData // Preserve any existing userData
    };

    // Handle animations
    this.setupModelAnimations(model);

    // Apply HDR lighting
    this.applyHDRToModel(model);

    // Add to scene
    this.scene.add(model);
    this.objects.push(model);
    
    // Add to undo stack
    this.addToUndoStack({ 
      type: 'add', 
      object: model, 
      properties: this.getObjectState(model) 
    });
    
    // Select the new model
    this.selectObject(model);
    
    console.log(`SceneManager: Model ${modelType} added successfully`);
  }

  positionModelOnFloor(model, targetPosition) {
    model.position.set(targetPosition.x, 0, targetPosition.z);
    model.updateMatrixWorld(true);
    
    const tempBox = new THREE.Box3().setFromObject(model);
    const yOffsetToPlaceBottomAtZero = -tempBox.min.y;
    
    model.position.set(
      targetPosition.x,
      this.floorLevel + yOffsetToPlaceBottomAtZero,
      targetPosition.z
    );
  }

  setupModelAnimations(model) {
    if (model.userData.animations?.length > 0) {
      const mixer = new THREE.AnimationMixer(model);
      this.mixers.set(model, mixer);
      console.log(`Animations setup for ${model.userData.type}:`, model.userData.animations.length);
    }
  }

  applyHDRToModel(model) {
    if (!this.scene?.environment) {
      this.environmentApplied = false;
      return;
    }

    model.traverse((object) => {
      if (object.isMesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            material.envMap = this.scene.environment;
            material.envMapIntensity = 1.0;
            material.needsUpdate = true;
          }
        });
      }
    });
  }

  // ===== DUPLICATION SYSTEM =====
  duplicateObject(objectToDuplicate) {
    objectToDuplicate = objectToDuplicate || this.selectedObject;
    if (!objectToDuplicate) {
      console.warn('SceneManager: No object to duplicate');
      return;
    }

    console.log('SceneManager: Starting object duplication for:', objectToDuplicate.userData?.type);

    try {
      // Method 1: Use ModelLoader's duplicate method if available
      if (this.modelLoader && typeof this.modelLoader.duplicate === 'function') {
        this.modelLoader.duplicate(objectToDuplicate, (clone) => {
          this.finalizeClone(clone, objectToDuplicate);
        });
      } else {
        // Method 2: Fallback cloning
        console.warn('SceneManager: ModelLoader.duplicate not available, using fallback cloning');
        this.fallbackDuplicate(objectToDuplicate);
      }

    } catch (error) {
      console.error('SceneManager: Duplication failed:', error);
      
      // Method 3: Emergency fallback
      console.log('SceneManager: Attempting emergency duplication...');
      this.emergencyDuplicate(objectToDuplicate);
    }
  }

  fallbackDuplicate(sourceObject) {
    try {
      const clone = sourceObject.clone(true);
      this.cloneMaterials(clone);
      this.finalizeClone(clone, sourceObject);
      console.log('SceneManager: Fallback duplication successful');
    } catch (error) {
      console.error('SceneManager: Fallback duplication failed:', error);
      this.emergencyDuplicate(sourceObject);
    }
  }

  emergencyDuplicate(sourceObject) {
    try {
      console.log('SceneManager: Using emergency duplication method');
      
      const clone = sourceObject.clone(true);
      
      // Position offset
      clone.position.copy(sourceObject.position);
      clone.position.x += 1.0;
      clone.position.z += 1.0;

      // Clone materials manually
      clone.traverse((child) => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(mat => mat.clone());
          } else {
            child.material = child.material.clone();
          }
        }
      });

      // Copy userData
      clone.userData = {
        ...JSON.parse(JSON.stringify(sourceObject.userData)),
        isModelRoot: true,
        selectable: true,
        isClone: true,
        cloneId: THREE.MathUtils.generateUUID()
      };

      // Remove any mode icon from the clone (assumes InteractionManager manages icons)
      this.removeModeIcon(clone);

      // Handle animations
      if (sourceObject.userData.animations && sourceObject.userData.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(clone);
        this.mixers.set(clone, mixer);
      }

      // Apply HDR environment
      this.applyHDRToClone(clone);

      // Add to scene
      this.scene.add(clone);
      this.objects.push(clone);
      
      this.addToUndoStack({ 
        type: 'add', 
        object: clone, 
        properties: this.getObjectState(clone) 
      });
      
      // Deselect the original and select the clone to ensure icon visibility
      this.deselectObject();
      this.selectObject(clone);
      
      console.log('SceneManager: Emergency duplication completed');
      return clone;

    } catch (error) {
      console.error('SceneManager: Emergency duplication failed:', error);
      
      if (this.container) {
        this.container.dispatchEvent(new CustomEvent('duplication-error', {
          detail: {
            message: 'Failed to duplicate object. Please try selecting the object again.',
            error: error.message
          }
        }));
      }
    }
  }

  finalizeClone(clone, sourceObject) {
    // Position the clone with offset
    clone.position.copy(sourceObject.position);
    clone.rotation.copy(sourceObject.rotation);
    clone.scale.copy(sourceObject.scale);
    
    // Offset position so clone doesn't overlap original
    clone.position.x += 1.0;
    clone.position.z += 1.0;

    // Ensure clone is properly positioned on floor
    this.positionModelOnFloor(clone, clone.position);

    // Set up userData
    clone.userData = {
      ...JSON.parse(JSON.stringify(sourceObject.userData)),
      isModelRoot: true,
      selectable: true,
      isPinned: false,
      isClone: true,
      cloneId: THREE.MathUtils.generateUUID(),
      parentId: sourceObject.userData.cloneId || sourceObject.uuid
    };

    // Remove any mode icon from the clone (assumes InteractionManager manages icons)
    this.removeModeIcon(clone);

    // Handle animations for cloned object
    if (clone.userData.animations && clone.userData.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(clone);
      this.mixers.set(clone, mixer);
    }

    // Apply HDR environment to the cloned object
    this.applyHDRToClone(clone);

    // Add to scene and tracking
    this.scene.add(clone);
    this.objects.push(clone);
    
    this.addToUndoStack({ 
      type: 'add', 
      object: clone, 
      properties: this.getObjectState(clone) 
    });
    
    // Deselect the original and select the clone to ensure icon visibility
    this.deselectObject();
    this.selectObject(clone);
    
    console.log("SceneManager: Object duplicated successfully:", clone.userData.type);
  }

  // Helper method to remove mode icons from an object
  removeModeIcon(object) {
    if (!object) return;

    // Since InteractionManager manages the icons, we traverse the object to find and remove any sprite that represents a mode icon
    object.traverse((child) => {
      if (child.userData && child.userData.isModeIcon) {
        console.log('SceneManager: Removing mode icon from object:', object.userData?.type || object.uuid);
        child.parent.remove(child);
        if (child.material && child.material.map) {
          child.material.map.dispose();
        }
        if (child.material) {
          child.material.dispose();
        }
      }
    });

    // Clean up userData reference if used by InteractionManager
    if (object.userData && object.userData.modeIcon) {
      delete object.userData.modeIcon;
    }
  }

  cloneMaterials(object) {
    const materialMap = new Map();

    object.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(material => {
            return this.getClonedMaterial(material, materialMap);
          });
        } else {
          child.material = this.getClonedMaterial(child.material, materialMap);
        }
      }
    });
  }

  getClonedMaterial(material, materialMap) {
    if (materialMap.has(material.uuid)) {
      return materialMap.get(material.uuid);
    }

    const clonedMaterial = material.clone();
    materialMap.set(material.uuid, clonedMaterial);
    return clonedMaterial;
  }

  applyHDRToClone(model) {
    if (!this.scene?.environment) {
      this.environmentApplied = false;
      return;
    }

    model.traverse((object) => {
      if (object.isMesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            material.envMap = this.scene.environment;
            material.envMapIntensity = 1.0;
            material.needsUpdate = true;
          }
        });
      }
    });
  }

  // ===== OBJECT MANIPULATION =====
  selectObject(object) {
    if (this.interactionManager) {
      // Remove mode icons from all other objects before selecting the new one
      this.objects.forEach(obj => {
        if (obj !== object) {
          this.removeModeIcon(obj);
        }
      });
      this.interactionManager.select(object);
    }
  }

  deselectObject() {
    if (this.interactionManager) {
      // Remove mode icons from the currently selected object
      if (this.selectedObject) {
        this.removeModeIcon(this.selectedObject);
      }
      this.interactionManager.deselect();
    }
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

  setTransformMode(mode) {
    this.transformMode = mode;
    if (this.interactionManager && typeof this.interactionManager.setTransformMode === 'function') {
      this.interactionManager.setTransformMode(mode);
    } else if (this.selectedObject && this.transformControls) {
      this.transformControls.setMode(mode);
    } else {
      console.warn("SceneManager: setTransformMode called, but no transform controls found.");
    }
  }

  removeObject(objectToRemove) {
    objectToRemove = objectToRemove || this.selectedObject;
    if (!objectToRemove) return;
    
    const state = this.getObjectState(objectToRemove);
    this.addToUndoStack({ type: 'remove', object: objectToRemove, properties: state });
    
    if (this.selectedObject === objectToRemove) this.deselectObject();

    // Stop and remove animation mixer
    if (this.mixers.has(objectToRemove)) {
      const mixer = this.mixers.get(objectToRemove);
      mixer.stopAllAction();
      mixer.uncacheRoot(objectToRemove);
      this.mixers.delete(objectToRemove);
    }

    this.scene.remove(objectToRemove);
    this.objects = this.objects.filter(obj => obj !== objectToRemove);
    console.log("SceneManager: Object removed:", objectToRemove);
  }

  toggleAnimation(object) {
    object = object || this.selectedObject;
    if (!object || !this.mixers.has(object)) {
      console.warn('SceneManager: No animations available for this object.');
      return;
    }

    const mixer = this.mixers.get(object);
    const animations = object.userData.animations;

    if (!mixer || !animations || animations.length === 0) {
      console.warn('SceneManager: Mixer or animations not found.');
      return;
    }

    // Check if an animation is currently playing
    const currentAction = mixer._actions.find(action => action.isRunning());
    if (currentAction) {
      currentAction.stop();
      console.log('SceneManager: Animation stopped for object:', object.userData.type);
    } else {
      // Play the first animation
      const clip = animations[0];
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat);
      action.clampWhenFinished = false;
      action.play();
      console.log('SceneManager: Animation started for object:', object.userData.type, clip.name);
    }
  }

  // ============= UNDO/REDO SYSTEM - IMPROVED =============

  // Helper method to capture complete object state
  captureObjectState(obj) {
    if (!obj) return null;
    
    return {
      position: obj.position.clone(),
      rotation: obj.rotation.clone(),
      scale: obj.scale.clone(),
      visible: obj.visible,
      userData: JSON.parse(JSON.stringify(obj.userData || {}))
    };
  }

  // Improved object state application with error handling
  applyObjectState(object, state) {
    if (!object) {
      console.warn("SceneManager: Cannot apply state - object is null or undefined");
      return false;
    }
    
    if (!state) {
      console.warn("SceneManager: Cannot apply state - state is null or undefined");
      return false;
    }

    try {
      // Validate that object has required properties before accessing them
      if (state.position && object.position && typeof object.position.copy === 'function') {
        object.position.copy(state.position);
      }
      if (state.rotation && object.rotation && typeof object.rotation.copy === 'function') {
        object.rotation.copy(state.rotation);
      }
      if (state.scale && object.scale && typeof object.scale.copy === 'function') {
        object.scale.copy(state.scale);
      }
      if (state.visible !== undefined && object.hasOwnProperty('visible')) {
        object.visible = state.visible;
      }
      if (state.userData && object.userData !== undefined) {
        object.userData = { ...object.userData, ...state.userData };
      }
      
      // Update matrix to reflect changes - with safety checks
      if (typeof object.updateMatrix === 'function') {
        object.updateMatrix();
      }
      if (typeof object.updateMatrixWorld === 'function') {
        object.updateMatrixWorld(true);
      }
      
      return true;
    } catch (error) {
      console.error("SceneManager: Error applying object state:", error, { object, state });
      return false;
    }
  }

  // Improved addToUndoStack with validation and size limits
  addToUndoStack(action) {
    if (!action || !action.type) {
      console.warn("SceneManager: Invalid action - missing type");
      return;
    }

    // Validate object exists and is valid
    if (!action.object || action.object.userData === undefined || typeof action.object.uuid !== 'string') {
      console.warn("SceneManager: Invalid action - object is null, undefined, or disposed");
      return;
    }

    // Validate action properties based on type
    if (action.type === 'transform') {
      if (!action.previousProperties || !action.newProperties) {
        console.warn("SceneManager: Invalid transform action - missing properties");
        return;
      }
    } else if (action.type === 'remove' || action.type === 'add') {
      if (!action.properties) {
        console.warn("SceneManager: Invalid add/remove action - missing properties");
        return;
      }
    }

    // Check for duplicate recent actions (prevent spam)
    if (this.undoStack.length > 0) {
      const lastAction = this.undoStack[this.undoStack.length - 1];
      if (lastAction.type === action.type && 
          lastAction.object === action.object &&
          Date.now() - (lastAction.timestamp || 0) < 100) { // Within 100ms
        console.log("SceneManager: Ignoring duplicate action within 100ms");
        return;
      }
    }

    // Add timestamp to action
    action.timestamp = Date.now();

    // Limit undo stack size
    if (this.undoStack.length >= this.maxUndoSteps) {
      this.undoStack.shift();
    }

    this.undoStack.push(action);
    this.redoStack = []; // Clear redo stack when new action is added
    
    console.log("SceneManager: Action added to undo stack:", action.type, this.undoStack.length);
    
    // Immediate cleanup if we detect issues
    if (this.undoStack.length > 5) {
      this.cleanupInvalidActions();
    }
  }

  // Record object addition for undo
  recordAddObject(obj) {
    const action = {
      type: 'add',
      object: obj,
      properties: this.captureObjectState(obj)
    };
    this.addToUndoStack(action);
  }

  // Record object removal for undo
  recordRemoveObject(obj) {
    const action = {
      type: 'remove',
      object: obj,
      properties: this.captureObjectState(obj)
    };
    this.addToUndoStack(action);
  }

  // Record object transformation for undo
  recordTransform(obj, previousState) {
    const action = {
      type: 'transform',
      object: obj,
      previousProperties: previousState,
      newProperties: this.captureObjectState(obj)
    };
    this.addToUndoStack(action);
  }

  // Call this before starting a transform
  beginTransform(obj) {
    if (obj && obj.userData !== undefined) {
      this.transformStartState = this.captureObjectState(obj);
      this.transformStartTime = Date.now();
      console.log("SceneManager: Transform started for:", obj.userData.type || obj.uuid);
    }
  }

  // Call this after completing a transform
  endTransform(obj) {
    if (this.transformStartState && obj && obj.userData !== undefined) {
      // Only record if enough time has passed (prevent micro-movements)
      const timeDiff = Date.now() - (this.transformStartTime || 0);
      if (timeDiff < 50) { // Less than 50ms - likely not a real user action
        console.log("SceneManager: Transform too quick, ignoring");
        this.transformStartState = null;
        return;
      }

      const newState = this.captureObjectState(obj);
      
      // Check if anything actually changed
      const hasChanged = this.hasStateChanged(this.transformStartState, newState);
      if (!hasChanged) {
        console.log("SceneManager: No actual changes detected, ignoring transform");
        this.transformStartState = null;
        return;
      }

      this.recordTransform(obj, this.transformStartState);
      this.transformStartState = null;
      console.log("SceneManager: Transform completed for:", obj.userData.type || obj.uuid);
    }
  }

  // Helper method to check if state actually changed
  hasStateChanged(oldState, newState) {
    if (!oldState || !newState) return false;
    
    const threshold = 0.001; // Small threshold for floating point comparison
    
    // Check position
    if (oldState.position && newState.position) {
      if (Math.abs(oldState.position.x - newState.position.x) > threshold ||
          Math.abs(oldState.position.y - newState.position.y) > threshold ||
          Math.abs(oldState.position.z - newState.position.z) > threshold) {
        return true;
      }
    }
    
    // Check rotation
    if (oldState.rotation && newState.rotation) {
      if (Math.abs(oldState.rotation.x - newState.rotation.x) > threshold ||
          Math.abs(oldState.rotation.y - newState.rotation.y) > threshold ||
          Math.abs(oldState.rotation.z - newState.rotation.z) > threshold) {
        return true;
      }
    }
    
    // Check scale
    if (oldState.scale && newState.scale) {
      if (Math.abs(oldState.scale.x - newState.scale.x) > threshold ||
          Math.abs(oldState.scale.y - newState.scale.y) > threshold ||
          Math.abs(oldState.scale.z - newState.scale.z) > threshold) {
        return true;
      }
    }
    
    return false;
  }

  // Improved undo with automatic skipping of invalid actions
  undo() {
    this.deselectObject();
    
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loops
    
    while (this.undoStack.length > 0 && attempts < maxAttempts) {
      attempts++;
      
      const action = this.undoStack.pop();
      console.log(`SceneManager: Undo attempt ${attempts}, action:`, action.type);

      const obj = action.object;
      
      // Validate object exists and hasn't been disposed
      if (!obj || obj.userData === undefined || typeof obj.uuid !== 'string') {
        console.warn(`SceneManager: Skipping invalid undo action ${attempts} - object disposed`);
        continue; // Skip this action and try the next one
      }

      let success = true;

      try {
        switch (action.type) {
          case 'add':
            // Remove the object that was added
            if (obj.parent) {
              obj.parent.remove(obj);
            }
            this.objects = this.objects.filter(o => o !== obj);
            if (this.selectedObject === obj) {
              this.deselectObject();
            }
            break;

          case 'remove':
            // Add back the object that was removed
            this.scene.add(obj);
            if (!this.objects.includes(obj)) {
              this.objects.push(obj);
            }
            if (action.properties) {
              success = this.applyObjectState(obj, action.properties);
            }
            break;

          case 'transform':
            // Restore previous state
            if (action.previousProperties) {
              success = this.applyObjectState(obj, action.previousProperties);
              if (success) {
                this.updateInteractionControls(obj);
              }
            } else {
              console.warn("SceneManager: Missing previousProperties for undo 'transform'.");
              success = false;
            }
            break;

          default:
            console.warn("SceneManager: Unknown action type for undo:", action.type);
            success = false;
        }

        if (success) {
          this.redoStack.push(action);
          console.log(`SceneManager: Undo successful after ${attempts} attempts`);
          return true;
        } else {
          console.warn(`SceneManager: Undo action ${attempts} failed, trying next`);
          // Don't put failed action back, just continue to next
        }

      } catch (error) {
        console.error(`SceneManager: Error during undo attempt ${attempts}:`, error);
        // Don't put errored action back, just continue to next
      }
    }

    if (attempts >= maxAttempts) {
      console.warn("SceneManager: Reached maximum undo attempts, giving up");
    } else {
      console.log("SceneManager: Undo stack empty.");
    }
    
    return false;
  }

  // Improved redo with better error handling
  redo() {
    this.deselectObject();

    if (this.redoStack.length === 0) {
      console.log("SceneManager: Redo stack empty.");
      return false;
    }

    const action = this.redoStack.pop();
    console.log("SceneManager: Redoing action:", action.type);

    const obj = action.object;
    
    // Validate object exists and hasn't been disposed
    if (!obj) {
      console.warn("SceneManager: Redo failed — action.object is undefined.");
      return false;
    }

    // Additional validation - check if object still exists in memory
    if (obj.userData === undefined || typeof obj.uuid !== 'string') {
      console.warn("SceneManager: Redo failed — object appears to be disposed.");
      return false;
    }

    let success = true;

    try {
      switch (action.type) {
        case 'add':
          // Re-add the object
          this.scene.add(obj);
          if (!this.objects.includes(obj)) {
            this.objects.push(obj);
          }
          if (action.properties) {
            success = this.applyObjectState(obj, action.properties);
          }
          break;

        case 'remove':
          // Re-remove the object
          if (obj.parent) {
            obj.parent.remove(obj);
          }
          this.objects = this.objects.filter(o => o !== obj);
          if (this.selectedObject === obj) {
            this.deselectObject();
          }
          break;

        case 'transform':
          // Apply new state
          if (action.newProperties) {
            success = this.applyObjectState(obj, action.newProperties);
            if (success) {
              this.updateInteractionControls(obj);
            }
          } else {
            console.warn("SceneManager: Missing newProperties for redo 'transform'.");
            success = false;
          }
          break;

        default:
          console.warn("SceneManager: Unknown action type for redo:", action.type);
          success = false;
      }

      if (success) {
        this.undoStack.push(action);
      } else {
        console.warn("SceneManager: Redo operation failed, not adding to undo stack");
      }

    } catch (error) {
      console.error("SceneManager: Error during redo:", error, action);
      success = false;
    }

    return success;
  }

  // Helper method to update interaction controls
  updateInteractionControls(obj) {
    if (this.interactionManager) {
      if (this.interactionManager.attach && this.selectedObject === obj) {
        this.interactionManager.attach(obj);
      }
      if (this.interactionManager.updateControlsForObject) {
        this.interactionManager.updateControlsForObject(obj);
      }
    }
  }

  // Get undo/redo status for UI
  getUndoRedoStatus() {
    // Clean up invalid actions before reporting status
    this.cleanupInvalidActions();
    
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length
    };
  }

  // Clear all undo/redo history
  clearHistory() {
    this.undoStack = [];
    this.redoStack = [];
    console.log("SceneManager: Undo/Redo history cleared");
  }

  // Debug method to inspect undo/redo stacks
  debugUndoStack() {
    console.log("=== UNDO STACK DEBUG ===");
    console.log(`Undo stack length: ${this.undoStack.length}`);
    console.log(`Redo stack length: ${this.redoStack.length}`);
    
    this.undoStack.forEach((action, index) => {
      const obj = action.object;
      const isValid = obj && obj.userData !== undefined && typeof obj.uuid === 'string';
      console.log(`${index}: ${action.type} - ${isValid ? 'VALID' : 'INVALID'} - ${obj?.userData?.type || 'unknown'}`);
    });
    
    return {
      undoStack: this.undoStack.length,
      redoStack: this.redoStack.length,
      validActions: this.undoStack.filter(a => a.object && a.object.userData !== undefined).length
    };
  }

  // Clean up invalid actions from undo/redo stacks
  cleanupInvalidActions() {
    const isValidObject = (obj) => {
      return obj && obj.userData !== undefined && typeof obj.uuid === 'string';
    };

    const isValidAction = (action) => {
      if (!action || !action.type || !isValidObject(action.object)) {
        return false;
      }
      
      // Additional validation based on action type
      if (action.type === 'transform') {
        return action.previousProperties && action.newProperties;
      } else if (action.type === 'add' || action.type === 'remove') {
        return action.properties;
      }
      
      return true;
    };

    const initialUndoCount = this.undoStack.length;
    const initialRedoCount = this.redoStack.length;

    this.undoStack = this.undoStack.filter(isValidAction);
    this.redoStack = this.redoStack.filter(isValidAction);

    const removedUndo = initialUndoCount - this.undoStack.length;
    const removedRedo = initialRedoCount - this.redoStack.length;

    if (removedUndo > 0 || removedRedo > 0) {
      console.log(`SceneManager: Cleaned up ${removedUndo} invalid undo actions and ${removedRedo} invalid redo actions`);
    }
    
    return { removedUndo, removedRedo };
  }

  // Force cleanup of all invalid actions immediately
  forceCleanup() {
    console.log("SceneManager: Force cleaning undo/redo stacks...");
    const result = this.cleanupInvalidActions();
    console.log(`SceneManager: Force cleanup complete. Removed ${result.removedUndo + result.removedRedo} invalid actions.`);
    return result;
  }

  // Legacy method for backward compatibility
  getObjectState(obj) {
    return this.captureObjectState(obj);
  }

  // ============= END UNDO/REDO SYSTEM =============

  // =====Screenshot function =====
  takeScreenshot() {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.renderer.render(this.scene, this.camera);

    const dataURL = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;

    // Get current date and time
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-'); // Format: YYYY-MM-DDTHH-mm-ss
    link.download = `room-screenshot-${timestamp}.png`;

    link.click();

    console.log("SceneManager: Screenshot saved.");
  }

  setView2D() {
    this.camera.position.set(0, 15, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.rotation.set(-Math.PI / 2, 0, 0);
    if (this.orbitControls) {
      this.orbitControls.target.set(0, 0, 0);
      this.orbitControls.maxPolarAngle = 0.01;
      this.orbitControls.minPolarAngle = 0;
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
    this.environmentApplied = false;
    this.initHDREnvironment(hdrPath);
  }

  refreshEnvironmentMaps() {
    if (this.scene && this.scene.environment) {
      this.applyEnvironmentToObjects(true);
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
      const localRoomPoints = this.room.getCurrentPoints();

      if (localRoomPoints && localRoomPoints.length >= 3) {
        const roomGroupWorldPosition = new THREE.Vector3();
        this.room.group.getWorldPosition(roomGroupWorldPosition);

        const initialPointsForEditor = localRoomPoints.map(localPoint => {
          const worldPoint = new THREE.Vector3(localPoint.x, 0, localPoint.z);
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
            
            const inverseRoomGroupMatrix = new THREE.Matrix4();
            inverseRoomGroupMatrix.copy(this.room.group.matrixWorld).invert();

            const newLocalPoints = updatedWorldPoints.map(worldPoint => {
              const localP = new THREE.Vector3(worldPoint.x, 0, worldPoint.z);
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

  // ===== UTILITY METHODS =====
  async waitForInitialization() {
    if (this.isInitialized) return;
    return this.initializationPromise;
  }

  async loadModelSafely(modelType, position) {
    try {
      await this.waitForInitialization();
      return await this.addModel(modelType, position);
    } catch (error) {
      console.error(`Failed to load model ${modelType}:`, error);
      throw error;
    }
  }

  testDuplication() {
    if (!this.selectedObject) {
      console.log('SceneManager: No object selected for duplication test');
      return false;
    }

    console.group('🔍 Duplication Test');
    
    console.log('Selected object:', this.selectedObject.userData?.type);
    console.log('ModelLoader available:', !!this.modelLoader);
    console.log('ModelLoader.duplicate method:', typeof this.modelLoader?.duplicate);
    
    try {
      this.duplicateObject();
      console.log('✅ Duplication test completed');
      console.groupEnd();
      return true;
    } catch (error) {
      console.error('❌ Duplication test failed:', error);
      console.groupEnd();
      return false;
    }
  }

  // Add keyboard shortcut support
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
      
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        this.duplicateObject();
      }
      
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        this.undo();
      }
      
      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault();
        this.redo();
      }
      
      if (event.key === 'Delete' && this.selectedObject) {
        event.preventDefault();
        this.removeObject();
      }
    });
  }

  // ===== DISPOSAL =====
  async dispose() {
    console.log("Disposing SceneManager...");
    
    try {
      // Stop animation loop
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      // Remove event listeners
      window.removeEventListener('resize', this.onWindowResize);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      
      if (this.container) {
        this.container.removeEventListener('pointerdown', this.onPointerDown);
      }

      // Wait for any ongoing HDR loading to complete
      if (this.isLoadingHDR) {
        console.log("Waiting for HDR loading to complete before disposal...");
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (!this.isLoadingHDR) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      }

      // Dispose animation mixers
      this.mixers.forEach((mixer, model) => {
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
      });
      this.mixers.clear();

      // Dispose managers
      if (this.interactionManager) {
        this.interactionManager.dispose();
        this.interactionManager = null;
      }

      if (this.floorDimensionEditorInstance) {
        if (typeof this.floorDimensionEditorInstance.dispose === 'function') {
          this.floorDimensionEditorInstance.dispose();
        }
        this.floorDimensionEditorInstance = null;
      }

      // Dispose controls
      if (this.orbitControls) {
        this.orbitControls.dispose();
        this.orbitControls = null;
      }

      // Dispose objects
      this.objects.forEach(obj => {
        this.disposeObject(obj);
      });
      this.objects = [];

      // Dispose scene components
      this.disposeRoom();
      this.disposeGrid();
      this.disposeLights();
      this.disposeScene();
      this.disposeRenderer();

      // Clear references
      this.camera = null;
      this.container = null;
      this.undoStack = [];
      this.redoStack = [];
      
      if (this.modelLoader) {
        this.modelLoader.dispose();
        this.modelLoader = null;
      }

      this.isInitialized = false;
      console.log("SceneManager disposed successfully");

    } catch (error) {
      console.error("Error during SceneManager disposal:", error);
    }
  }

  disposeObject(obj) {
    if (obj.parent) {
      obj.parent.remove(obj);
    }
    
    obj.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  disposeRoom() {
    if (this.room) {
      if (typeof this.room.dispose === 'function') {
        this.room.dispose();
      } else if (this.room.group) {
        this.disposeObject(this.room.group);
      }
      this.room = null;
    }
  }

  disposeGrid() {
    if (this.grid) {
      if (typeof this.grid.dispose === 'function') {
        this.grid.dispose();
      } else if (this.grid.grid) {
        this.disposeObject(this.grid.grid);
      }
      this.grid = null;
    }
  }

  disposeLights() {
    if (this.lights) {
      this.lights.traverse(light => {
        if (light.dispose) light.dispose();
      });
      if (this.lights.parent) {
        this.lights.parent.remove(this.lights);
      }
      this.lights = null;
    }
  }

  disposeScene() {
    if (this.scene) {
      while (this.scene.children.length > 0) {
        const child = this.scene.children[0];
        this.scene.remove(child);
        this.disposeObject(child);
      }
      
      if (this.scene.environment) {
        this.scene.environment.dispose();
        this.scene.environment = null;
      }
      
      this.scene.background = null;
      this.scene.fog = null;
      this.scene = null;
    }
  }

  disposeRenderer() {
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
  }
}

// Export for global access in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.SceneManager = SceneManager;
}