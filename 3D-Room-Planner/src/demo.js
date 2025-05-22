// Core Three.js scene management with direct manipulation, HDR lighting, and dynamic wall visibility/rotation

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
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
    this.interactionMode = 'translate'; // Default to translate mode
    this.undoStack = [];
    this.redoStack = [];
    this.isLoadingHDR = false; // Track HDR loading state
    this.walls = []; // Array to store walls
    this.watermarkMesh = null; // Reference to the watermark mesh
    this.watermarkLoaded = false; // Track if watermark is loaded
    this.frameCount = 0; // Frame counter for animation optimization
    this.isDisposed = false; // Add a flag to track if the manager has been disposed

    // Add clock for animation timing
    this.clock = new THREE.Clock();

    // Initialize Three.js components
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.initControls();
    this.initRoom();
    this.initGrid();

    // Initialize interaction manager
    this.initInteractionManager();

    // Preload the HDR environment map with minimal delay
    setTimeout(() => {
      if (this.isDisposed) return; // Check if already disposed
      this.initHDREnvironment();
    }, 20);

    // Add watermark after walls are set up
    setTimeout(() => {
      if (this.isDisposed) return; // Check if already disposed
      if (!this.walls || this.walls.length === 0) {
        this.createWalls();
      }
      this.addWatermark('assets/icons/stech_logo.png', {
        opacity: 0.3,
        scale: 0.8,
        offset: 0.5,
        blendMode: 'normal',
        size: 1,
      });
    }, 500);

    // Start animation loop
    this.animate();

    // Handle tab visibility changes to refresh environment maps
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === 'visible' && this.scene && this.scene.environment && !this.isDisposed) {
        console.log('Tab visible again, refreshing environment maps');
        setTimeout(() => this.applyEnvironmentToObjects(true), 100);
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }
  

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
    // this.scene.fog = new THREE.Fog(0xf0f0f0, 10, 50);
    this.environmentApplied = false;
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container ? this.container.clientWidth / this.container.clientHeight : 1,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 10);
    this.camera.lookAt(0, 0, 0);
  }

  initRenderer() {
    if (!this.container) {
      console.warn('Container not available for renderer initialization');
      return;
    }
    
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.logarithmicDepthBuffer = true;
    this.container.appendChild(this.renderer.domElement);
    
    this.resizeHandler = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.resizeHandler);
  }

  initHDREnvironment(hdrPath = '/assets/envlight/white-studio-lighting_4K.hdr') {
    if (!this.renderer || this.isDisposed) {
      console.warn('Cannot load HDR: renderer not initialized or manager disposed');
      return;
    }
    console.log('Loading HDR environment map:', hdrPath);
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    this.isLoadingHDR = true;
    
    if (this.container) {
      const loadStartEvent = new CustomEvent('hdr-loading-start');
      this.container.dispatchEvent(loadStartEvent);
    }
    
    new RGBELoader()
      .setDataType(THREE.FloatType)
      .load(
        hdrPath,
        (texture) => {
          if (!this.scene || this.isDisposed) {
            console.warn('Cannot apply HDR: scene no longer exists or manager disposed');
            texture.dispose();
            pmremGenerator.dispose();
            this.isLoadingHDR = false;
            return;
          }
          try {
            console.log('HDR loaded, processing environment map...');
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            this.scene.environment = envMap;
            console.log('HDR environment processed successfully');
            this.applyEnvironmentToObjects(true);
            if (this.renderer && this.scene && this.camera) {
              this.renderer.render(this.scene, this.camera);
            }
            
            if (this.container) {
              const loadCompleteEvent = new CustomEvent('hdr-loading-complete');
              this.container.dispatchEvent(loadCompleteEvent);
            }
          } catch (error) {
            console.error('Error applying HDR environment:', error);
          } finally {
            texture.dispose();
            pmremGenerator.dispose();
            this.isLoadingHDR = false;
          }
        },
        (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`HDR loading: ${percent}%`);
        },
        (error) => {
          console.error('Error loading HDR environment:', error);
          this.isLoadingHDR = false;
          
          if (this.container) {
            const loadErrorEvent = new CustomEvent('hdr-loading-error', { detail: error });
            this.container.dispatchEvent(loadErrorEvent);
          }
        }
      );
  }

  applyEnvironmentToObjects(forceUpdate = false) {
    if (!this.scene || !this.scene.environment || this.isDisposed) {
      console.warn('Cannot apply environment to objects: scene or environment not available, or manager disposed');
      return;
    }
    console.log(`Applying environment map to objects (forceUpdate: ${forceUpdate})`);
    try {
      let updatedMaterials = 0;
      this.scene.traverse((object) => {
        if (object && object.isMesh && object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            if (material && (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) {
              material.envMap = this.scene.environment;
              material.envMapIntensity = 0.8;
              material.needsUpdate = true;
              if (forceUpdate) {
                material.version++;
                const originalRoughness = material.roughness;
                material.roughness = 0.99;
                material.roughness = originalRoughness;
                if (material.type === 'MeshStandardMaterial') {
                  object.material = new THREE.MeshStandardMaterial().copy(material);
                } else if (material.type === 'MeshPhysicalMaterial') {
                  object.material = new THREE.MeshPhysicalMaterial().copy(material);
                }
              }
              updatedMaterials++;
            }
          });
        }
      });
      console.log(`Updated ${updatedMaterials} materials with environment map`);
    } catch (error) {
      console.error('Error applying environment to objects:', error);
    }
  }

  initLights() {
    if (!this.scene || this.isDisposed) return;
    
    this.lights = new THREE.Group();
    this.scene.add(this.lights);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.lights.add(ambientLight);
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.3);
    hemiLight.position.set(0, 1, 0);
    this.lights.add(hemiLight);
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
    if (!this.camera || !this.renderer || this.isDisposed) return;
    
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.screenSpacePanning = false;
    this.orbitControls.minDistance = 2;
    this.orbitControls.maxDistance = 30;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.1;
    
    this.controlsChangeHandler = () => {
      if (this.isDisposed) return;
      
      if (this.watermarkLoaded && this.watermarkMesh) {
        this.updateWatermarkPosition();
      }
      this.updateWallVisibility();
    };
    
    this.orbitControls.addEventListener('change', this.controlsChangeHandler);
  }

  initRoom() {
    if (!this.scene || this.isDisposed) return;
    
    this.room = new Room(10, 3, 8);
    this.walls = [];
    this.room.group.traverse((object) => {
      if (object && object.isMesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if (material) {
            if (material.transparent) {
              material.depthWrite = false;
            } else {
              material.polygonOffset = true;
              material.polygonOffsetFactor = 1.0;
              material.polygonOffsetUnits = 1.0;
            }
            if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
              material.envMapIntensity = 1.0;
            }
          }
        });
        if (object.userData && object.userData.isWall) {
          console.log("Found a wall in room:", object);
          this.walls.push(object);
        }
      }
    });
    this.scene.add(this.room.group);
    this.floorLevel = 0;
    if (!this.walls || this.walls.length === 0) {
      console.warn("No walls found in Room, creating default walls");
      this.createWalls();
    }
  }

createWalls() {
  if (!this.scene || this.isDisposed) return;
  
  console.log("Creating walls for watermark placement and visibility management");
  if (this.walls && this.walls.length > 0) {
    this.walls.forEach(wall => {
      if (wall && this.scene) this.scene.remove(wall);
    });
  }
  this.walls = [];
  const roomWidth = 10;
  const roomHeight = 3;
  const roomDepth = 8;
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.0,
    side: THREE.FrontSide
  });
  
  // North wall (back wall, at -z)
  const northWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomHeight),
    wallMaterial.clone()
  );
  northWall.position.set(0, roomHeight / 2, -roomDepth / 2);
  northWall.receiveShadow = true;
  northWall.userData = { 
    isWall: true, 
    wallType: 'north', 
    normal: new THREE.Vector3(0, 0, 1), // Facing inside (+z)
    center: new THREE.Vector3(0, roomHeight / 2, -roomDepth / 2) 
  };
  this.scene.add(northWall);
  this.walls.push(northWall);
  
  // South wall (front wall, at +z)
  const southWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomHeight),
    wallMaterial.clone()
  );
  southWall.position.set(0, roomHeight / 2, roomDepth / 2);
  southWall.rotation.y = Math.PI; // Rotate to face inward
  southWall.receiveShadow = true;
  southWall.userData = { 
    isWall: true, 
    wallType: 'south', 
    normal: new THREE.Vector3(0, 0, -1), // Facing inside (-z)
    center: new THREE.Vector3(0, roomHeight / 2, roomDepth / 2)
  };
  this.scene.add(southWall);
  this.walls.push(southWall);
  
  // East wall (right wall, at +x)
  const eastWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomDepth, roomHeight),
    wallMaterial.clone()
  );
  eastWall.position.set(roomWidth / 2, roomHeight / 2, 0);
  eastWall.rotation.y = -Math.PI / 2; // Facing inside (-x)
  eastWall.receiveShadow = true;
  eastWall.userData = { 
    isWall: true, 
    wallType: 'east', 
    normal: new THREE.Vector3(-1, 0, 0), // Facing inside (-x)
    center: new THREE.Vector3(roomWidth / 2, roomHeight / 2, 0)
  };
  this.scene.add(eastWall);
  this.walls.push(eastWall);
  
  // West wall (left wall, at -x)
  const westWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomDepth, roomHeight),
    wallMaterial.clone()
  );
  westWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
  westWall.rotation.y = Math.PI / 2; // Facing inside (+x)
  westWall.receiveShadow = true;
  westWall.userData = { 
    isWall: true, 
    wallType: 'west', 
    normal: new THREE.Vector3(1, 0, 0), // Facing inside (+x)
    center: new THREE.Vector3(-roomWidth / 2, roomHeight / 2, 0)
  };
  this.scene.add(westWall);
  this.walls.push(westWall);
  
  // Initialize world normals for all walls
  this.updateWallWorldNormals();
  
  console.log("Created walls:", this.walls);
}
  initGrid() {
    if (!this.scene || this.isDisposed) return;
    
    this.grid = new GridHelper(30, 30, 0.5);
    this.scene.add(this.grid.grid);
  }

  initInteractionManager() {
    if (!this.scene || !this.camera || !this.renderer || !this.orbitControls || this.isDisposed) return;
    
    this.interactionManager = new InteractionManager(
      this.scene,
      this.camera,
      this.renderer,
      this.orbitControls
    );
    this.interactionManager.setFloorLevel(this.floorLevel);
    this.interactionManager.setCallbacks({
      onObjectSelected: (object) => {
        if (this.isDisposed) return;
        
        this.selectedObject = object;
        if (this.container) {
          const event = new CustomEvent('object-selected', { detail: object });
          this.container.dispatchEvent(event);
        }
      },
      onObjectDeselected: () => {
        if (this.isDisposed) return;
        
        this.selectedObject = null;
        if (this.container) {
          const event = new CustomEvent('object-deselected');
          this.container.dispatchEvent(event);
        }
      },
      onObjectChanged: (object) => {
        if (this.isDisposed) return;
        
        this.addToUndoStack({
          type: 'transform',
          object: object,
          properties: this.getObjectState(object)
        });
      },
      onObjectPinned: (object) => {
        if (this.isDisposed) return;
        
        if (this.container) {
          const event = new CustomEvent('object-pinned', { detail: object });
          this.container.dispatchEvent(event);
        }
      },
      onObjectUnpinned: (object) => {
        if (this.isDisposed) return;
        
        if (this.container) {
          const event = new CustomEvent('object-unpinned', { detail: object });
          this.container.dispatchEvent(event);
        }
      },
      onObjectDeleted: (object) => {
        if (this.isDisposed) return;
        
        if (this.objects) {
          this.objects = this.objects.filter(obj => obj !== object);
        }
        this.addToUndoStack({
          type: 'remove',
          object: object,
          properties: this.getObjectState(object)
        });
      },
      onModeChanged: (mode) => {
        if (this.isDisposed) return;
        
        this.interactionMode = mode;
        if (this.container) {
          const event = new CustomEvent('mode-changed', { detail: mode });
          this.container.dispatchEvent(event);
        }
      }
    });
  }

  onWindowResize() {
    if (!this.camera || !this.renderer || !this.container || this.isDisposed) return;
    
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    if (this.watermarkLoaded && this.watermarkMesh) {
      this.updateWatermarkPosition();
    }
    this.updateWallVisibility();
  }

  animate() {
    if (this.isDisposed) return;
    
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    // Safely update orbit controls if available
    if (this.orbitControls) {
      this.orbitControls.update();
    }
    
    // Update clock if available
    if (this.clock) {
      this.clock.getDelta();
    }
    
    this.updateWallVisibility();
    
    // Update watermark only every 10 frames
  if (this.watermarkLoaded && this.watermarkMesh && this.frameCount % 10 === 0) {
    try {
      this.updateWatermarkPosition();
    } catch (error) {
      console.warn('Error updating watermark position:', error);
    }
  }
    
    // Safely traverse scene to check for shader materials
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object && object.isMesh && object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            if (material && (material.type === 'ShaderMaterial' || material.type === 'RawShaderMaterial')) {
              if (material.uniforms) {
                Object.keys(material.uniforms).forEach(key => {
                  if (material.uniforms[key] === undefined) {
                    material.uniforms[key] = { value: null };
                  } else if (material.uniforms[key].value === undefined) {
                    material.uniforms[key].value = null;
                  }
                });
              }
            }
          });
        }
      });
    }
    
    // Update interaction manager bounding boxes
    if (this.interactionManager) {
      this.interactionManager.updateBoundingBoxes();
    }
    
    this.frameCount = (this.frameCount || 0) + 1;
    
    // Render scene if all components are available
    if (this.renderer && this.scene && this.camera) {
      try {
        this.renderer.render(this.scene, this.camera);
      } catch (error) {
        console.warn('Error during rendering:', error);
      }
    }
  }

  addModel(modelType, position = new THREE.Vector3(0, 0, 0)) {
    if (!this.scene || !this.modelLoader || this.isDisposed) return;
    
    console.log(`Adding model: ${modelType} at position:`, position);
    const modelPath = `/assets/models/${modelType}.glb`;
    this.modelLoader.load(modelType, modelPath, (model) => {
      if (this.isDisposed) {
        // Clean up model if we've been disposed during loading
        if (model.geometry) model.geometry.dispose();
        if (model.material) {
          const materials = Array.isArray(model.material) ? model.material : [model.material];
          materials.forEach(m => m && m.dispose());
        }
        return;
      }
      
      model.position.set(position.x, 0, position.z);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const bottomY = box.min.y;
      const offsetY = -bottomY;
      model.position.y = offsetY;
      model.userData.isModelRoot = true;
      model.userData.selectable = true;
      model.userData.type = modelType;
      model.userData.floorOffset = offsetY;
      if (this.scene && this.scene.environment) {
        model.traverse((object) => {
          if (object && object.isMesh && object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(material => {
              if (material && (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) {
                material.envMap = this.scene.environment;
                material.envMapIntensity = 1.0;
                material.needsUpdate = true;
              }
            });
          }
        });
      }
      if (this.scene) this.scene.add(model);
      if (this.objects) this.objects.push(model);
      this.addToUndoStack({
        type: 'add',
        object: model,
        properties: this.getObjectState(model)
      });
      this.selectObject(model);
      console.log(`Model ${modelType} successfully added to scene at floor level`);
    });
  }

  addWatermark(imageUrl, options = {}) {
    if (!imageUrl || !this.scene || this.isDisposed) {
      console.warn('Cannot add watermark: no image URL, scene unavailable, or manager disposed');
      return;
    }
    this.removeWatermark();
    if (!this.room || !this.room.group) {
      console.warn('Room not initialized for watermark placement');
      return;
    }
    const settings = {
      opacity: options.opacity !== undefined ? options.opacity : 0.8,
      scale: options.scale !== undefined ? options.scale : 0.8,
      offset: options.offset !== undefined ? options.offset : 0.5,
      blendMode: options.blendMode || 'normal',
      size: options.size !== undefined ? options.size : 1
    };
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    console.log(`Loading watermark image from: ${imageUrl}`);
    loader.load(
      imageUrl,
      (texture) => {
        try {
          if (!this.room || !this.room.group || !this.scene || this.isDisposed) {
            console.warn('Room or scene not available for watermark placement, or manager disposed');
            if (texture) texture.dispose();
            return;
          }
          const imageWidth = texture.image.width;
          const imageHeight = texture.image.height;
          const aspect = imageWidth / imageHeight;
          console.log(`Watermark image loaded: ${imageWidth}x${imageHeight}, aspect: ${aspect}`);
          const initialWall = this.findVisibleWall();
          if (!initialWall) {
            console.warn('No suitable wall found for watermark');
            if (texture) texture.dispose();
            return;
          }
          if (!initialWall.geometry || !initialWall.geometry.parameters) {
            console.warn('Wall geometry not available for watermark scaling');
            if (texture) texture.dispose();
            return;
          }
          const wallWidth = initialWall.geometry.parameters.width || 5;
          const wallHeight = initialWall.geometry.parameters.height || 3;
          const maxSize = Math.min(wallWidth, wallHeight) * settings.size;
          let width, height;
          if (aspect > 1) {
            width = maxSize;
            height = maxSize / aspect;
          } else {
            height = maxSize;
            width = maxSize * aspect;
          }
          const geometry = new THREE.PlaneGeometry(width, height);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: settings.opacity,
            blending: settings.blendMode === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending,
            depthWrite: false,
            side: THREE.FrontSide
          });
          this.watermarkMesh = new THREE.Mesh(geometry, material);
          this.watermarkMesh.userData = {
            offsetFactor: settings.offset,
            originalWidth: width,
            originalHeight: height,
            aspectRatio: aspect,
            size: settings.size
          };
          if (this.scene) this.scene.add(this.watermarkMesh);
          this.watermarkLoaded = true;
          this.updateWatermarkPosition();
          console.log('Watermark added to scene');
          if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
          }
        } catch (error) {
          console.error("Error creating watermark:", error);
          if (texture) texture.dispose();
        }
      },
      (xhr) => {
        console.log(`Watermark loading: ${(xhr.loaded / xhr.total * 100)}% loaded`);
      },
      (error) => {
        console.error('Error loading watermark texture:', error);
      }
    );
  }

  findVisibleWall() {
    if (!this.room || !this.room.group || !this.camera || this.isDisposed) {
      console.warn('Missing required objects for findVisibleWall');
      return null;
    }
    try {
      const cameraPos = new THREE.Vector3();
      this.camera.getWorldPosition(cameraPos);
      const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      let walls = [];
      if (this.room.group && this.room.group.traverse) {
        this.room.group.traverse((child) => {
          if (child && child.isMesh && child.name && child.name.includes('wall')) {
            walls.push(child);
          }
        });
      }
      if (!walls || walls.length === 0) {
        // console.log('No named walls found, checking for large vertical planes');
        if (this.room.group && this.room.group.traverse) {
          this.room.group.traverse((child) => {
            if (child && child.isMesh) {
              try {
                const box = new THREE.Box3().setFromObject(child);
                const size = new THREE.Vector3();
                box.getSize(size);
                if (size.y > 2 && (size.x > 2 || size.z > 2)) {
                  walls.push(child);
                }
              } catch (e) {
                console.warn('Error checking object size:', e);
              }
            }
          });
        }
      }
      if (!walls || walls.length === 0) {
        console.log('No walls found, using created walls');
        walls = this.walls || [];
      }
      if (!walls || walls.length === 0) {
        console.warn('No walls found, creating default wall');
        const defaultWallGeometry = new THREE.PlaneGeometry(5, 3);
        const defaultWallMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.01
        });
        const defaultWall = new THREE.Mesh(defaultWallGeometry, defaultWallMaterial);
        defaultWall.position.set(0, 1.5, -3);
        if (this.scene) this.scene.add(defaultWall);
        return defaultWall;
      }
      
      let bestWall = null;
      let bestScore = -Infinity;
      for (let i = 0; i < walls.length; i++) {
        const wall = walls[i];
        if (!wall || !wall.matrixWorld) continue;
        try {
          const wallPos = new THREE.Vector3();
          wall.getWorldPosition(wallPos);
          let wallNormal;
          try {
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(wall.matrixWorld);
            wallNormal = new THREE.Vector3(0, 0, 1).applyMatrix3(normalMatrix).normalize();
          } catch (e) {
            wallNormal = wallPos.clone().sub(cameraPos).normalize().multiplyScalar(-1);
          }
          const toWall = wallPos.clone().sub(cameraPos);
          const distanceToWall = toWall.length();
          toWall.normalize();
          const alignmentFactor = cameraDirection.dot(toWall);
          const facingFactor = -wallNormal.dot(toWall);
          if (alignmentFactor > -0.5 && facingFactor > -0.5) {
            const score = (alignmentFactor * facingFactor) / (1 + distanceToWall * 0.1);
            if (score > bestScore) {
              bestScore = score;
              bestWall = wall;
            }
          }
        } catch (e) {
          console.warn('Error evaluating wall:', e);
          continue;
        }
      }
      
      if (!bestWall && walls && walls.length > 0) {
        bestWall = walls[0];
      }
      return bestWall;
    } catch (error) {
      console.error("Error finding visible wall:", error);
      return null;
    }
  }

  updateWatermarkPosition() {
    
    if (!this.watermarkMesh || !this.watermarkLoaded || this.isDisposed) return;
    try {
      const targetWall = this.findVisibleWall();
      if (!targetWall) {
        console.warn("No visible wall found for watermark");
        if (this.watermarkMesh) this.watermarkMesh.visible = false;
        return;
      }
      this.watermarkMesh.visible = true;
      const wallWorldPosition = new THREE.Vector3();
      targetWall.getWorldPosition(wallWorldPosition);
      let wallNormal;
      try {
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(targetWall.matrixWorld);
        wallNormal = new THREE.Vector3(0, 0, 1).applyMatrix3(normalMatrix).normalize();
      } catch (e) {
        const cameraPos = new THREE.Vector3();
        this.camera.getWorldPosition(cameraPos);
        wallNormal = wallWorldPosition.clone().sub(cameraPos).normalize().multiplyScalar(-1);
      }
      const offsetFactor = this.watermarkMesh.userData?.offsetFactor || 0.5;
      const wallOffset = 0.02;
      const watermarkPosition = wallWorldPosition.clone();
      watermarkPosition.add(wallNormal.clone().multiplyScalar(wallOffset));
      let verticalOffset = 0;
      if (targetWall.geometry && targetWall.geometry.parameters) {
        const wallHeight = targetWall.geometry.parameters.height || 3;
        verticalOffset = (wallHeight * offsetFactor) - (wallHeight / 2);
      } else {
        verticalOffset = offsetFactor - 0.5;
      }
      const upVector = new THREE.Vector3(0, 1, 0);
      if (targetWall.quaternion) {
        upVector.applyQuaternion(targetWall.quaternion);
      }
      watermarkPosition.add(upVector.multiplyScalar(verticalOffset));
      this.watermarkMesh.position.copy(watermarkPosition);
      if (targetWall.quaternion) {
        this.watermarkMesh.quaternion.copy(targetWall.quaternion);
      } else {
        const cameraPos = new THREE.Vector3();
        this.camera.getWorldPosition(cameraPos);
        this.watermarkMesh.lookAt(cameraPos);
      }
      const sizeValue = this.watermarkMesh.userData?.size || 0.8;
      let wallWidth = 5;
      let wallHeight = 3;
      if (targetWall.geometry && targetWall.geometry.parameters) {
        wallWidth = targetWall.geometry.parameters.width || 5;
        wallHeight = targetWall.geometry.parameters.height || 3;
      }
      const maxSize = Math.min(wallWidth, wallHeight) * sizeValue;
      const originalWidth = this.watermarkMesh.userData?.originalWidth;
      const originalHeight = this.watermarkMesh.userData?.originalHeight;
      const aspectRatio = this.watermarkMesh.userData?.aspectRatio;
      if (originalWidth && originalHeight && aspectRatio) {
        let newWidth, newHeight;
        if (aspectRatio > 1) {
          newWidth = maxSize;
          newHeight = maxSize / aspectRatio;
        } else {
          newHeight = maxSize;
          newWidth = maxSize * aspectRatio;
        }
        this.watermarkMesh.scale.set(
          newWidth / originalWidth,
          newHeight / originalHeight,
          1
        );
      }
    } catch (error) {
      console.error("Error updating watermark position:", error);
    }
  }

  removeWatermark() {
    if (!this.watermarkMesh) return;
    
    try {
      if (this.scene) {
        this.scene.remove(this.watermarkMesh);
      }
      if (this.watermarkMesh.geometry) {
        this.watermarkMesh.geometry.dispose();
      }
      if (this.watermarkMesh.material) {
        if (this.watermarkMesh.material.map) {
          this.watermarkMesh.material.map.dispose();
        }
        this.watermarkMesh.material.dispose();
      }
      this.watermarkMesh = null;
      this.watermarkLoaded = false;
      console.log('Watermark removed');
    } catch (error) {
      console.error("Error removing watermark:", error);
    }
  }

 updateWallVisibility(forceUpdate = false) {
  if (!this.camera || !this.walls || !Array.isArray(this.walls) || this.walls.length === 0 || this.isDisposed) return;
  
  try {
    // Get camera position in world space
    const cameraPos = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPos);
    
    // Get camera direction in world space
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(this.camera.quaternion);
    cameraDirection.normalize();
    
    // Process each wall
    this.walls.forEach(wall => {
      if (!wall || !wall.userData) {
        if (wall) wall.visible = true; // Default to visible if no data
        return;
      }
      
      // Get wall position in world space
      const wallPos = new THREE.Vector3();
      wall.getWorldPosition(wallPos);
      
      // Get wall normal in world space
      let wallNormal;
      
      if (wall.userData.worldNormal) {
        // Use cached world normal if available
        wallNormal = wall.userData.worldNormal.clone();
      } else if (wall.userData.normal) {
        // Calculate and store world normal if not available
        wallNormal = wall.userData.normal.clone().applyQuaternion(wall.quaternion).normalize();
        wall.userData.worldNormal = wallNormal.clone();
      } else {
        // Fallback to approximate normal if no normal data
        wallNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(wall.quaternion).normalize();
      }
      
      // For inward-facing walls, reverse the comparison logic
      // We need to hide walls when the camera is on the same side as the normal
      // Calculate vector from wall to camera instead of camera to wall
      const toCamera = cameraPos.clone().sub(wallPos);
      toCamera.normalize();
      
      // Calculate dot product between wall normal and direction to camera
      // If positive, camera is on the same side as normal (inside room) - show wall
      // If negative, camera is on opposite side as normal (outside room) - hide wall
      const dot = wallNormal.dot(toCamera);
      
      // Since we're using FrontSide rendering and walls face inward,
      // Show walls when dot product is positive (camera inside room, viewing wall front)
      // Hide walls when dot product is negative (camera viewing wall back)
      wall.visible = dot > 0;
      
      // Apply transparency for transition effects
      if (wall.material) {
        const materials = Array.isArray(wall.material) ? wall.material : [wall.material];
        materials.forEach(material => {
          if (material) {
            if (dot > 0) {
              if (dot < 0.3) {
                // Transitional zone - make semi-transparent
                material.transparent = true;
                material.opacity = Math.min(1.0, dot * 3);
              } else {
                // Solid visibility
                material.transparent = false;
                material.opacity = 1.0;
              }
              material.needsUpdate = true;
            }
          }
        });
      }
    });
    
    // Force a render update if requested
    if (forceUpdate && this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  } catch (error) {
    console.error("Error updating wall visibility:", error);
  }
}

updateWallWorldNormals() {
  if (!this.walls || !Array.isArray(this.walls)) return;
  
  this.walls.forEach(wall => {
    if (wall && wall.userData && wall.userData.normal) {
      // Create a world normal by transforming the original normal with the wall's quaternion
      const worldNormal = wall.userData.normal.clone();
      worldNormal.applyQuaternion(wall.quaternion);
      worldNormal.normalize();
      wall.userData.worldNormal = worldNormal;
    }
  });
}

 rotateWall(wallType, angleDegrees, axis = 'y') {
  if (!this.walls || !Array.isArray(this.walls) || this.walls.length === 0 || this.isDisposed) {
    console.warn("No walls available to rotate");
    return;
  }
  
  const angleRad = THREE.MathUtils.degToRad(angleDegrees);
  const axisVector = new THREE.Vector3(
    axis === 'x' ? 1 : 0,
    axis === 'y' ? 1 : 0,
    axis === 'z' ? 1 : 0
  );
  
  const wallsToRotate = wallType === 'all'
    ? this.walls
    : this.walls.filter(wall => wall && wall.userData && wall.userData.wallType === wallType);
  
  if (wallsToRotate.length === 0) {
    console.warn(`No walls found for type: ${wallType}`);
    return;
  }
  
  wallsToRotate.forEach(wall => {
    if (!wall) return;
    
    this.addToUndoStack({
      type: 'transform',
      object: wall,
      properties: this.getObjectState(wall)
    });
    
    // Rotate the wall
    wall.rotateOnWorldAxis(axisVector, angleRad);
    
    // Update the wall's normal after rotation
    if (wall.userData && wall.userData.normal) {
      // Rotate the local normal using the same axis and angle
      const normalRotation = new THREE.Quaternion().setFromAxisAngle(axisVector, angleRad);
      wall.userData.normal.applyQuaternion(normalRotation);
      wall.userData.normal.normalize();
      
      // Update the world normal
      const worldNormal = wall.userData.normal.clone().applyQuaternion(wall.quaternion);
      wall.userData.worldNormal = worldNormal;
    }
  });
  
  // Update wall visibility after rotation
  this.updateWallVisibility(true);
  
  // Update watermark position
  if (this.watermarkLoaded && this.watermarkMesh) {
    this.updateWatermarkPosition();
  }
  
  // Force a render
  if (this.renderer && this.scene && this.camera) {
    this.renderer.render(this.scene, this.camera);
  }
}

  selectObject(object) {
    if (!object || !this.interactionManager || this.isDisposed) return;
    this.interactionManager.select(object);
  }

  deselectObject() {
    if (!this.interactionManager || this.isDisposed) return;
    this.interactionManager.deselect();
  }

  setInteractionMode(mode) {
    if (!this.interactionManager || this.isDisposed) return;
    this.interactionManager.setInteractionMode(mode);
  }

  pinObject(object) {
    if (!object || !this.interactionManager || this.isDisposed) return;
    this.interactionManager.pinObject(object);
  }

  unpinObject(object) {
    if (!object || !this.interactionManager || this.isDisposed) return;
    this.interactionManager.unpinObject(object);
  }

  togglePin(object) {
    if (this.isDisposed) return;
    
    object = object || this.selectedObject;
    if (object && this.interactionManager) {
      this.interactionManager.togglePin(object);
    }
  }

  rotateObject(object, angleDegrees) {
    if (this.isDisposed) return;
    
    object = object || this.selectedObject;
    if (object && this.interactionManager) {
      this.interactionManager.rotateObject(object, angleDegrees);
    }
  }

  duplicateObject(object) {
    if (!object || !this.modelLoader || this.isDisposed) return;
    
    this.modelLoader.duplicate(object, (clone) => {
      if (this.isDisposed) {
        // Clean up if disposed during cloning
        if (clone) {
          if (clone.geometry) clone.geometry.dispose();
          if (clone.material) {
            const materials = Array.isArray(clone.material) ? clone.material : [clone.material];
            materials.forEach(m => m && m.dispose());
          }
        }
        return;
      }
      
      clone.position.x += 0.5;
      clone.position.z += 0.5;
      
      if (this.scene && this.scene.environment) {
        clone.traverse((child) => {
          if (child && child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(material => {
              if (material && (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) {
                material.envMap = this.scene.environment;
                material.envMapIntensity = 1.0;
                material.needsUpdate = true;
              }
            });
          }
        });
      }
      
      if (this.objects) this.objects.push(clone);
      if (this.scene) this.scene.add(clone);
      
      this.addToUndoStack({
        type: 'add',
        object: clone,
        properties: this.getObjectState(clone)
      });
      
      this.selectObject(clone);
    });
  }

  removeObject(object) {
    if (!object || this.isDisposed) return;
    
    this.addToUndoStack({
      type: 'remove',
      object: object,
      properties: this.getObjectState(object)
    });
    
    if (this.selectedObject === object) {
      this.deselectObject();
    }
    
    if (this.scene) this.scene.remove(object);
    if (this.objects) this.objects = this.objects.filter(obj => obj !== object);
  }

  getObjectState(object) {
    if (!object) return {};
    
    return {
      position: object.position ? object.position.clone() : new THREE.Vector3(),
      rotation: object.rotation ? object.rotation.clone() : new THREE.Euler(),
      scale: object.scale ? object.scale.clone() : new THREE.Vector3(1, 1, 1)
    };
  }

  addToUndoStack(action) {
    if (!action || this.isDisposed) return;
    
    if (this.undoStack) this.undoStack.push(action);
    if (this.redoStack) this.redoStack = [];
  }

  undo() {
    if (!this.undoStack || this.undoStack.length === 0 || this.isDisposed) return;
    
    const action = this.undoStack.pop();
    if (this.redoStack) this.redoStack.push(action);
    
    switch (action.type) {
      case 'add':
        if (this.scene) this.scene.remove(action.object);
        if (this.objects) this.objects = this.objects.filter(obj => obj !== action.object);
        if (this.selectedObject === action.object) {
          this.deselectObject();
        }
        break;
      case 'remove':
        if (this.scene) this.scene.add(action.object);
        if (this.objects) this.objects.push(action.object);
        break;
      case 'transform':
        if (action.object && action.properties) {
          if (action.properties.position) action.object.position.copy(action.properties.position);
          if (action.properties.rotation) action.object.rotation.copy(action.properties.rotation);
          if (action.properties.scale) action.object.scale.copy(action.properties.scale);
        }
        break;
      default:
        console.warn('Unknown action type for undo:', action.type);
        break;
    }
  }

  redo() {
    if (!this.redoStack || this.redoStack.length === 0 || this.isDisposed) return;
    
    const action = this.redoStack.pop();
    if (this.undoStack) this.undoStack.push(action);
    
    switch (action.type) {
      case 'add':
        if (this.scene) this.scene.add(action.object);
        if (this.objects) this.objects.push(action.object);
        break;
      case 'remove':
        if (this.scene) this.scene.remove(action.object);
        if (this.objects) this.objects = this.objects.filter(obj => obj !== action.object);
        if (this.selectedObject === action.object) {
          this.deselectObject();
        }
        break;
      case 'transform':
        // The current state is already the "redo" state
        break;
      default:
        console.warn('Unknown action type for redo:', action.type);
        break;
    }
  }

  setView2D() {
    if (!this.camera || !this.orbitControls || this.isDisposed) return;
    
    this.camera.position.set(0, 15, 0);
    this.camera.lookAt(0, 0, 0);
    this.orbitControls.maxPolarAngle = Math.PI / 4;
    this.orbitControls.minPolarAngle = 0;
    
    if (this.orbitControls) {
      this.orbitControls.update();
    }
    
    this.updateWallVisibility();
    
    if (this.watermarkLoaded && this.watermarkMesh) {
      this.updateWatermarkPosition();
    }
  }

  setView3D() {
    if (!this.camera || !this.orbitControls || this.isDisposed) return;
    
    this.camera.position.set(5, 5, 10);
    this.camera.lookAt(0, 0, 0);
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.1;
    this.orbitControls.minPolarAngle = 0;
    
    if (this.orbitControls) {
      this.orbitControls.update();
    }
    
    this.updateWallVisibility();
    
    if (this.watermarkLoaded && this.watermarkMesh) {
      this.updateWatermarkPosition();
    }
  }

  setHDRExposure(value) {
    if (!this.renderer || this.isDisposed) return;
    
    this.renderer.toneMappingExposure = value;
    
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  setEnvironmentIntensity(value) {
    if (!this.scene || this.isDisposed) {
      console.warn('Cannot set environment intensity: scene not available or manager disposed');
      return;
    }
    
    try {
      let updatedCount = 0;
      this.scene.traverse((object) => {
        if (object && object.isMesh && object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            if (material && (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) {
              material.envMapIntensity = value;
              material.needsUpdate = true;
              updatedCount++;
            }
          });
        }
      });
      
      console.log(`Updated environment intensity to ${value} on ${updatedCount} materials`);
      
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    } catch (error) {
      console.error('Error setting environment intensity:', error);
    }
  }

  loadHDREnvironment(hdrPath) {
    if (this.isDisposed) return;
    
    this.environmentApplied = false;
    this.initHDREnvironment(hdrPath);
  }

  refreshEnvironmentMaps() {
    if (!this.scene || !this.scene.environment || this.isDisposed) return;
    
    this.environmentApplied = false;
    this.applyEnvironmentToObjects(true);
    this.environmentApplied = true;
    
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    console.log('Disposing SceneManager...');
    
    // Set the disposed flag first to stop animations and ongoing operations
    this.isDisposed = true;
    
    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    window.removeEventListener('resize', this.resizeHandler);
    
    // Clean up controls
    if (this.orbitControls) {
      this.orbitControls.removeEventListener('change', this.controlsChangeHandler);
      this.orbitControls.dispose();
      this.orbitControls = null;
    }
    
    // Clean up watermark
    this.removeWatermark();
    
    // Clean up walls
    if (this.walls && Array.isArray(this.walls)) {
      this.walls.forEach(wall => {
        if (!wall) return;
        
        if (wall.geometry) wall.geometry.dispose();
        if (wall.material) {
          const materials = Array.isArray(wall.material) ? wall.material : [wall.material];
          materials.forEach(material => material && material.dispose());
        }
        if (this.scene) this.scene.remove(wall);
      });
      this.walls = [];
    }
    
    // Dispose interaction manager
    if (this.interactionManager) {
      this.interactionManager.dispose();
      this.interactionManager = null;
    }
    
    // Clean up renderer and DOM elements
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement) {
        this.container.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    
    // Clean up objects list
    if (this.objects) {
      // Note: We don't dispose geometries/materials here as they might be shared
      this.objects = null;
    }
    
    // Clear all major references
    this.scene = null;
    this.camera = null;
    this.lights = null;
    this.grid = null;
    this.room = null;
    this.container = null;
    this.undoStack = null;
    this.redoStack = null;
    this.modelLoader = null;
    this.clock = null;
    
    console.log('SceneManager disposed');
  }
}