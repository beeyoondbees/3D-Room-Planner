// src/three/SceneManager.js
// Core Three.js scene management with direct manipulation

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
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
    
    // Initialize interaction manager AFTER other components
    this.initInteractionManager();
    
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
      precision: "highp", // Use high precision to reduce flickering
      stencil: false, // Disable stencil buffer if not needed for better performance
      depth: true, // Ensure depth buffer is enabled
      alpha: false // Disable alpha for better performance
    });
    
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    
    // Shadow settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Enable physically correct lighting for better material rendering
    this.renderer.physicallyCorrectLights = true;
    
    // Use sRGB encoding for better color accuracy
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    
    // Enable logarithmic depth buffer to significantly reduce z-fighting issues
    this.renderer.logarithmicDepthBuffer = true;
    
    this.container.appendChild(this.renderer.domElement);
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
initLights() {
    // Create a lighting group to manage all lights
    this.lights = new THREE.Group();
    this.scene.add(this.lights);

    // 1. Ambient light - increased for brighter overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Increased from 0.2 to 0.4
    this.lights.add(ambientLight);

    // 2. Primary directional light (simulates sunlight from a window)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity from 1 to 1.5
    mainLight.position.set(5, 8, 5); // Unchanged, good position
    mainLight.castShadow = true;

    // Improve shadow quality
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 30;

    // Set up shadow area
    const d = 15;
    mainLight.shadow.camera.left = -d;
    mainLight.shadow.camera.right = d;
    mainLight.shadow.camera.top = d;
    mainLight.shadow.camera.bottom = -d;

    // Softer shadows for a polished look
    mainLight.shadow.radius = 3; // Increased from 2 for softer edges
    this.lights.add(mainLight);

    // 3. Secondary fill light (opposite of main light)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6); // Increased from 0.4 to 0.6
    fillLight.position.set(-5, 7, -5);
    fillLight.castShadow = false; // No shadow from fill light
    this.lights.add(fillLight);

    // 4. Ceiling lights - brighter and more realistic room lighting
    const createCeilingLight = (x, z) => {
        const pointLight = new THREE.PointLight(0xffffff, 1, 12, 1); // Increased intensity from 0.6 to 1, distance from 10 to 12
        pointLight.position.set(x, 2.8, z); // Just below ceiling
        pointLight.castShadow = true;

        // Smaller shadow map for performance
        pointLight.shadow.mapSize.width = 512;
        pointLight.shadow.mapSize.height = 512;

        // Add a small sphere to represent the light fixture
        // const bulb = new THREE.Mesh(
        //     new THREE.SphereGeometry(0.05, 8, 8),
        //     new THREE.MeshBasicMaterial({ color: 0xffffee })
        // );
        // bulb.position.copy(pointLight.position);
        // this.scene.add(bulb);

        return pointLight;
    };

    // Add 4 ceiling lights in a grid pattern
    const ceilingLight1 = createCeilingLight(-3, -2);
    const ceilingLight2 = createCeilingLight(-3, 2);
    const ceilingLight3 = createCeilingLight(3, -2);
    const ceilingLight4 = createCeilingLight(3, 2);
    this.lights.add(ceilingLight1, ceilingLight2, ceilingLight3, ceilingLight4);

    // 5. Product spotlight - dedicated light to highlight the product
    const spotLight = new THREE.SpotLight(0xffffff, 2, 10, Math.PI / 4, 0.5, 1); // Intense, focused light
    spotLight.position.set(0, 5, 3); // Position above and slightly in front of the product
    spotLight.target.position.set(0, 0, 0); // Assuming product is at origin; adjust as needed
    spotLight.castShadow = true;

    // Shadow settings for spotlight
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 0.5;
    spotLight.shadow.camera.far = 20;
    spotLight.shadow.radius = 2;

    this.scene.add(spotLight.target); // Add target to scene
    this.lights.add(spotLight);

    // 6. Ground bounce light - slightly stronger for better reflection
    const bounceLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5); // Increased from 0.3 to 0.5
    this.lights.add(bounceLight);
}
  
  initControls() {
    // Orbit controls for camera movement
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.screenSpacePanning = false;
    this.orbitControls.minDistance = 2;
    this.orbitControls.maxDistance = 30;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground
  }
  
  initRoom() {
    this.room = new Room(10, 3, 8); // width, height, depth
    
    // Apply material fixes to prevent flickering on room surfaces
    this.room.group.traverse((object) => {
      if (object.isMesh && object.material) {
        // Adjust material to prevent z-fighting
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        
        materials.forEach(material => {
          // Fix transparent surfaces
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
    
    // Set floor level for interaction manager (to prevent objects going below floor)
    this.floorLevel = 0; // Adjust based on your room's floor position
  }
  
  initGrid() {
    this.grid = new GridHelper(30, 30, 0.5);
    this.scene.add(this.grid.grid);
  }
  
  initInteractionManager() {
    // Create the interaction manager
    this.interactionManager = new InteractionManager(
      this.scene, 
      this.camera, 
      this.renderer, 
      this.orbitControls
    );
    
    // Set floor level
    this.interactionManager.setFloorLevel(this.floorLevel);
    
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
        // Dispatch event for UI updates
        const event = new CustomEvent('object-pinned', { detail: object });
        this.container.dispatchEvent(event);
      },
      
      onObjectUnpinned: (object) => {
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
      },
      
      onModeChanged: (mode) => {
        this.interactionMode = mode;
        
        // Dispatch event for UI updates
        const event = new CustomEvent('mode-changed', { detail: mode });
        this.container.dispatchEvent(event);
      }
    });
  }
  
  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
  
  animate() {
    // Use requestAnimationFrame with proper binding
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    // Update orbit controls
    if (this.orbitControls) {
      this.orbitControls.update();
    }
    
    // Update clock
    if (this.clock) {
      this.clock.getDelta();
    }
    
    // Fix for shader uniform issues
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.isMesh && object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          
          materials.forEach(material => {
            // Fix shader uniform issues
            if (material.type === 'ShaderMaterial' || material.type === 'RawShaderMaterial') {
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
    
    // Render scene
    if (this.renderer && this.scene && this.camera) {
      try {
        this.renderer.render(this.scene, this.camera);
      } catch (error) {
        console.warn('Error during rendering:', error);
      }
    }
  }
  
  // Method to add a model to the scene
  addModel(modelType, position = new THREE.Vector3(0, 0, 0)) {
    console.log(`Adding model: ${modelType} at position:`, position);
    
    // Generate model path
    const modelPath = `/assets/models/${modelType}.glb`;
    
    // Load the model
    this.modelLoader.load(modelType, modelPath, (model) => {
      // First position the model at the requested XZ coordinates (with Y=0)
      model.position.set(position.x, 0, position.z);
      
      // Update the world matrix to ensure accurate bounding box calculation
      model.updateMatrixWorld(true);
      
      // Calculate bounding box in world space
      const box = new THREE.Box3().setFromObject(model);
      
      // Calculate the Y position required to place the bottom of the model exactly on the floor
      const bottomY = box.min.y;
      const offsetY = -bottomY; // Offset needed to move bottom to y=0 (floor level)
      
      // Apply the Y offset to position the model with its bottom on the floor
      model.position.y = offsetY;
      
      // Make sure model is selectable
      model.userData.isModelRoot = true;
      model.userData.selectable = true;
      model.userData.type = modelType;
      model.userData.floorOffset = offsetY; // Store the floor offset for future reference
      
      // Add to scene and objects array
      this.scene.add(model);
      this.objects.push(model);
      
      // Add to undo stack
      this.addToUndoStack({
        type: 'add',
        object: model,
        properties: this.getObjectState(model)
      });
      
      // Select the newly added model
      this.selectObject(model);
      
      console.log(`Model ${modelType} successfully added to scene at floor level`);
    });
  }
  
  // OBJECT INTERACTION METHODS
  
  selectObject(object) {
    this.interactionManager.select(object);
  }
  
  deselectObject() {
    this.interactionManager.deselect();
  }
  
  setInteractionMode(mode) {
    this.interactionManager.setInteractionMode(mode);
  }
  
  pinObject(object) {
    this.interactionManager.pinObject(object);
  }
  
  unpinObject(object) {
    this.interactionManager.unpinObject(object);
  }
  
  togglePin(object) {
    object = object || this.selectedObject;
    if (object) {
      this.interactionManager.togglePin(object);
    }
  }
  
  rotateObject(object, angleDegrees) {
    object = object || this.selectedObject;
    if (object) {
      this.interactionManager.rotateObject(object, angleDegrees);
    }
  }
  
  duplicateObject(object) {
    if (!object) return;
    
    // Clone the object using the model loader
    this.modelLoader.duplicate(object, (clone) => {
      // Offset position slightly
      clone.position.x += 0.5;
      clone.position.z += 0.5;
      
      // Add to objects array and scene
      this.objects.push(clone);
      this.scene.add(clone);
      
      // Add to undo stack
      this.addToUndoStack({
        type: 'add',
        object: clone,
        properties: this.getObjectState(clone)
      });
      
      // Select the duplicated object
      this.selectObject(clone);
    });
  }
  
  removeObject(object) {
    if (!object) return;
    
    // Add to undo stack before removing
    this.addToUndoStack({
      type: 'remove',
      object: object,
      properties: this.getObjectState(object)
    });
    
    // If this is the selected object, deselect it first
    if (this.selectedObject === object) {
      this.deselectObject();
    }
    
    // Remove from scene and objects array
    this.scene.remove(object);
    this.objects = this.objects.filter(obj => obj !== object);
  }
  
  // UNDO/REDO FUNCTIONALITY
  
  getObjectState(object) {
    return {
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone()
    };
  }
  
  addToUndoStack(action) {
    this.undoStack.push(action);
    // Clear redo stack when a new action is performed
    this.redoStack = [];
  }
  
  undo() {
    if (this.undoStack.length === 0) return;
    
    const action = this.undoStack.pop();
    this.redoStack.push(action);
    
    switch (action.type) {
      case 'add':
        // For an add action, undo means remove
        this.scene.remove(action.object);
        this.objects = this.objects.filter(obj => obj !== action.object);
        if (this.selectedObject === action.object) {
          this.deselectObject();
        }
        break;
        
      case 'remove':
        // For a remove action, undo means add back
        this.scene.add(action.object);
        this.objects.push(action.object);
        break;
        
      case 'transform':
        // For a transform action, restore previous state
        action.object.position.copy(action.properties.position);
        action.object.rotation.copy(action.properties.rotation);
        action.object.scale.copy(action.properties.scale);
        break;
        
      default:
        console.warn('Unknown action type for undo:', action.type);
        break;
    }
  }
  
  redo() {
    if (this.redoStack.length === 0) return;
    
    const action = this.redoStack.pop();
    this.undoStack.push(action);
    
    switch (action.type) {
      case 'add':
        // For an add action, redo means add again
        this.scene.add(action.object);
        this.objects.push(action.object);
        break;
        
      case 'remove':
        // For a remove action, redo means remove again
        this.scene.remove(action.object);
        this.objects = this.objects.filter(obj => obj !== action.object);
        if (this.selectedObject === action.object) {
          this.deselectObject();
        }
        break;
        
      case 'transform':
        // For a transform, this is tricky as we need the state after the transformation
        // We would need to store both before/after states for proper redo
        break;
        
      default:
        console.warn('Unknown action type for redo:', action.type);
        break;
    }
  }
  
  // VIEW CONTROLS
  
  setView2D() {
    // Switch to top-down view
    this.camera.position.set(0, 15, 0);
    this.camera.lookAt(0, 0, 0);
    this.orbitControls.maxPolarAngle = Math.PI / 4; // Limit rotation in 2D mode
    this.orbitControls.minPolarAngle = 0;
    
    // Update controls
    if (this.orbitControls) {
      this.orbitControls.update();
    }
  }
  
  setView3D() {
    // Switch to perspective 3D view
    this.camera.position.set(5, 5, 10);
    this.camera.lookAt(0, 0, 0);
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.1;
    this.orbitControls.minPolarAngle = 0;
    
    // Update controls
    if (this.orbitControls) {
      this.orbitControls.update();
    }
  }
  
  // Clean up resources
  dispose() {
    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Dispose interaction manager
    if (this.interactionManager) {
      this.interactionManager.dispose();
    }
    
    // Dispose orbit controls
    if (this.orbitControls) {
      this.orbitControls.dispose();
    }
    
    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize);
    
    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.orbitControls = null;
    this.interactionManager = null;
    this.objects = null;
  }
}