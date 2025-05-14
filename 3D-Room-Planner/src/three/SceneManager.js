// src/three/SceneManager.js
// This is the core class that manages the Three.js scene

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { Room } from './objects/Room';
import { ModelLoader } from './ModelLoader';
import { GridHelper } from './utils/GridHelper';

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
    
    // Set debug mode for development
    this.debug = true;
    
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.initControls();
    this.initRoom();
    this.initGrid();
    this.initRaycaster();
    
    // Listen for model loading events for debugging
    if (this.debug) {
      window.addEventListener('model-loading-completed', (event) => {
        console.log('Model loaded:', event.detail.modelType);
        // We could integrate the ModelDebugger here if needed
      });
      
      window.addEventListener('model-loading-error', (event) => {
        console.error('Model loading error:', event.detail.error);
      });
    }
    
    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.container.addEventListener('pointerdown', this.onPointerDown.bind(this));
    
    // Start animation loop
    this.animate();
  }
  
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
    this.scene.fog = new THREE.Fog(0xf0f0f0, 10, 50);
  }
  
  initCamera() {
    // Use a single camera initialization (fixed duplicate camera creation)
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
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Enable physically correct lighting for better material rendering
    this.renderer.physicallyCorrectLights = true;
    
    // Use sRGB encoding for better color accuracy
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    
    this.container.appendChild(this.renderer.domElement);
  }
  
  initLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    
    // Set up shadow area
    const d = 15;
    directionalLight.shadow.camera.left = -d;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.camera.bottom = -d;
    directionalLight.shadow.camera.far = 50;
    
    this.scene.add(directionalLight);
    
    // Additional rim light for better depth perception
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(-5, 5, -5);
    this.scene.add(rimLight);
    
    // Add an additional point light to better illuminate models
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(0, 5, 0);
    pointLight.castShadow = true;
    this.scene.add(pointLight);
  }
  
  initControls() {
    // Orbit controls for camera movement
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.screenSpacePanning = false;
    this.orbitControls.minDistance = 2;
    this.orbitControls.maxDistance = 30;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent camera from going below ground
    
    // Transform controls for object manipulation
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.addEventListener('dragging-changed', (event) => {
      // Disable orbit controls when transforming an object
      this.orbitControls.enabled = !event.value;
    });
    
    this.transformControls.addEventListener('objectChange', () => {
      // Save state for undo/redo when object is transformed
      if (this.selectedObject) {
        this.updateObjectState(this.selectedObject);
      }
    });
    
    this.scene.add(this.transformControls);
  }
  
  initRoom() {
    this.room = new Room(10, 3, 8); // width, height, depth
    this.scene.add(this.room.group);
  }
  
  initGrid() {
    this.grid = new GridHelper(30, 30, 0.5);
    this.scene.add(this.grid.grid);
  }
  
  initRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
  }
  
  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
  
  onPointerDown(event) {
    // Convert mouse position to normalized device coordinates
    this.pointer.x = (event.clientX / this.container.clientWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / this.container.clientHeight) * 2 + 1;

    // Add this check at the beginning of the method
    if (!this.camera) {
        console.warn("Camera is not initialized");
        return; // Exit early if camera is null
    }
    
    // Check if we're clicking on an object
    this.raycaster.setFromCamera(this.pointer, this.camera);
    
    // Filter out non-selectable objects (like walls, floor)
    const selectableObjects = this.objects.filter(obj => obj.userData.selectable !== false);
    const intersects = this.raycaster.intersectObjects(selectableObjects, true);
    
    if (intersects.length > 0) {
      // Find the actual parent object (the model root)
      let selectedObject = intersects[0].object;
      while (selectedObject.parent && !selectedObject.userData.isModelRoot) {
        selectedObject = selectedObject.parent;
      }
      
      this.selectObject(selectedObject);
    } else {
      // Clicked on empty space
      this.deselectObject();
    }
  }
  
  selectObject(object) {
    this.deselectObject();
    this.selectedObject = object;
    
    // Highlight selected object
    if (this.selectedObject) {
      // Add highlight effect (can be a custom shader, outline, etc.)
      this.addHighlight(this.selectedObject);
      
      // Attach transform controls
      this.transformControls.attach(this.selectedObject);
      this.transformControls.setMode(this.transformMode);
      
      // Dispatch selected event for UI updates
      const event = new CustomEvent('object-selected', { detail: this.selectedObject });
      this.container.dispatchEvent(event);
    }
  }
  
  deselectObject() {
    if (this.selectedObject) {
      // Remove highlight
      this.removeHighlight(this.selectedObject);
      
      // Detach transform controls
      this.transformControls.detach();
      this.selectedObject = null;
      
      // Dispatch deselected event
      const event = new CustomEvent('object-deselected');
      this.container.dispatchEvent(event);
    }
  }
  
  addHighlight(object) {
    // Implement highlight effect (example: simple outline)
    // In a real implementation, you might use an outline shader or other visual feedback
    object.userData.originalMaterials = [];
    
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        // Store original material
        object.userData.originalMaterials.push({
          mesh: child,
          material: child.material.clone()
        });
        
        // Apply highlight material (example: brighten materials)
        if (Array.isArray(child.material)) {
          child.material = child.material.map(mat => {
            const highlightMat = mat.clone();
            highlightMat.emissive = new THREE.Color(0x333333);
            return highlightMat;
          });
        } else {
          const highlightMat = child.material.clone();
          highlightMat.emissive = new THREE.Color(0x333333);
          child.material = highlightMat;
        }
      }
    });
  }
  
  removeHighlight(object) {
    // Restore original materials
    if (object.userData.originalMaterials) {
      object.userData.originalMaterials.forEach(({ mesh, material }) => {
        mesh.material = material;
      });
      delete object.userData.originalMaterials;
    }
  }
  
  setTransformMode(mode) {
    this.transformMode = mode;
    if (this.selectedObject) {
      this.transformControls.setMode(mode);
    }
  }

  // Method to add a new model to the scene
 addModel(modelType, position = new THREE.Vector3(0, 0, 0)) {
  console.log(`Adding model: ${modelType} at position:`, position);
  
  // Generate model path
  const modelPath = `/assets/models/${modelType}.glb`;
  
  // Load the model
  this.modelLoader.load(modelType, modelPath, (model) => {
    // Position the model - starting with the passed position
    model.position.copy(position);
    
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
    
    console.log(`Model ${modelType} successfully added to scene`);
  });
}
  
  duplicateObject(object) {
    if (!object) return;
    
    // Clone the object using the model loader
    this.modelLoader.duplicate(object, (clone) => {
      // Offset position slightly
      clone.position.x += 0.5;
      clone.position.z += 0.5;
      
      clone.userData = { ...object.userData };
      clone.userData.isModelRoot = true;
      clone.userData.selectable = true;
      
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
    
    // Deselect if this is the selected object
    if (this.selectedObject === object) {
      this.deselectObject();
    }
    
    // Remove from scene and objects array
    this.scene.remove(object);
    this.objects = this.objects.filter(obj => obj !== object);
  }
  
  getObjectState(object) {
    return {
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone()
    };
  }
  
  updateObjectState(object) {
    // Add state to undo stack
    this.addToUndoStack({
      type: 'transform',
      object: object,
      properties: this.getObjectState(object)
    });
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
  
  setView2D() {
    // Switch to top-down orthographic view
    this.camera.position.set(0, 15, 0);
    this.camera.lookAt(0, 0, 0);
    this.orbitControls.maxPolarAngle = Math.PI / 4; // Limit rotation in 2D mode
    this.orbitControls.minPolarAngle = 0;
    
    // Update controls to use the camera
    if (this.orbitControls) {
      this.orbitControls.object = this.camera;
      this.orbitControls.update();
    }
  }
  
  setView3D() {
    // Switch to perspective 3D view
    this.camera.position.set(5, 5, 10);
    this.camera.lookAt(0, 0, 0);
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.1;
    this.orbitControls.minPolarAngle = 0;
    
    // Update controls to use the camera
    if (this.orbitControls) {
      this.orbitControls.object = this.camera;
      this.orbitControls.update();
    }
  }
  
  animate() {
    // Use requestAnimationFrame with proper binding
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    // Update orbit controls if available
    if (this.orbitControls) {
      this.orbitControls.update();
    }
    
    // Update clock (we need to call getDelta() even if we don't use the result)
    if (this.clock) {
      this.clock.getDelta();
    }
    
    // Fix for "Cannot read properties of undefined (reading 'value')" error
    // Pre-process all materials in the scene to ensure they have valid uniforms
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.isMesh && object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          
          materials.forEach(material => {
            // Ensure material is fully initialized
            if (material.needsUpdate) {
              material.needsUpdate = true;
            }
            
            // Fix known issues with specific material types
            if (material.type === 'ShaderMaterial' || material.type === 'RawShaderMaterial') {
              if (material.uniforms) {
                // Ensure all uniforms have a value property
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
    
    // Render scene if all components are available
    if (this.renderer && this.scene && this.camera) {
      try {
        this.renderer.render(this.scene, this.camera);
      } catch (error) {
        console.warn('Error during rendering:', error);
        // Don't let a single render error crash the entire animation loop
      }
    }
  }
  
  // Method to safely dispose resources when component unmounts
  dispose() {
    // Cancel animation frame to stop the loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Clean up other resources
    if (this.orbitControls) {
      this.orbitControls.dispose();
    }
    
    if (this.transformControls) {
      this.transformControls.dispose();
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
    this.transformControls = null;
    this.equipment = null;
    this.objects = null;
  }


  debugModel(model) {
  console.group('Model Debug Info');
  console.log('Model object:', model);
  
  if (!model) {
    console.error('Model is null or undefined!');
    console.groupEnd();
    return;
  }
  
  console.log('Type:', model.type);
  console.log('Is visible:', model.visible);
  console.log('User data:', model.userData);
  
  // Count meshes
  let meshCount = 0;
  let materialCount = 0;
  let emptyMaterialCount = 0;
  
  model.traverse((node) => {
    if (node.isMesh) {
      meshCount++;
      
      // Debug geometry
      if (!node.geometry) {
        console.error('Mesh has no geometry!', node);
      }
      
      // Debug materials
      if (!node.material) {
        emptyMaterialCount++;
        console.error('Mesh has no material!', node);
      } else {
        // Count materials
        if (Array.isArray(node.material)) {
          materialCount += node.material.length;
        } else {
          materialCount++;
        }
      }
    }
  });
  
  console.log(`Found ${meshCount} meshes, ${materialCount} materials`);
  
  if (emptyMaterialCount > 0) {
    console.warn(`${emptyMaterialCount} meshes have no material!`);
  }
  
  // Check if it's a GLB model
  if (model.isGroup && model.children.length === 0) {
    console.warn('Model is a group with no children! Something is wrong with the GLB import.');
  }
  
  console.groupEnd();
}
}



