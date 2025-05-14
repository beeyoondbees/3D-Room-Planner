// src/utils/GLBModelTest.js
// Direct debugger to analyze GLB model loading issues

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class GLBModelTest {
  constructor(containerElement, modelPath) {
    // Store references
    this.container = containerElement;
    this.modelPath = modelPath;
    
    // Create a debug output element
    this.createDebugOutput();
    
    // Initialize Three.js components
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initLights();
    
    // Add grid and axes helpers
    this.addHelpers();
    
    // Start animation loop
    this.animate();
    
    // Load the model
    this.loadModel();
  }
  
  createDebugOutput() {
    // Create debug panel
    this.debugPanel = document.createElement('div');
    this.debugPanel.style.position = 'absolute';
    this.debugPanel.style.bottom = '10px';
    this.debugPanel.style.left = '10px';
    this.debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.debugPanel.style.color = 'white';
    this.debugPanel.style.padding = '10px';
    this.debugPanel.style.borderRadius = '5px';
    this.debugPanel.style.fontFamily = 'monospace';
    this.debugPanel.style.fontSize = '12px';
    this.debugPanel.style.maxWidth = '80%';
    this.debugPanel.style.maxHeight = '30%';
    this.debugPanel.style.overflow = 'auto';
    this.debugPanel.style.zIndex = '1000';
    this.container.appendChild(this.debugPanel);
    
    // Add log function
    this.log = (message, type = 'info') => {
      const entry = document.createElement('div');
      entry.style.marginBottom = '5px';
      
      switch(type) {
        case 'error':
          entry.style.color = '#ff5555';
          break;
        case 'warning':
          entry.style.color = '#ffaa55';
          break;
        case 'success':
          entry.style.color = '#55ff55';
          break;
        default:
          entry.style.color = 'white';
      }
      
      entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      this.debugPanel.appendChild(entry);
      this.debugPanel.scrollTop = this.debugPanel.scrollHeight;
      
      // Also log to console
      if (type === 'error') console.error(message);
      else if (type === 'warning') console.warn(message);
      else if (type === 'success') console.log('%c' + message, 'color: green');
      else console.log(message);
    };
  }
  
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x333333);
  }
  
  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45, 
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);
  }
  
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.container.appendChild(this.renderer.domElement);
    
    // Add resize handler
    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }
  
  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
  }
  
  initLights() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    
    // Directional light (sun)
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 10, 5);
    directional.castShadow = true;
    this.scene.add(directional);
    
    // Add helper to see light position
    const helper = new THREE.DirectionalLightHelper(directional, 1);
    this.scene.add(helper);
    
    // Point light
    const point = new THREE.PointLight(0xffffff, 1);
    point.position.set(-3, 5, -3);
    this.scene.add(point);
  }
  
  addHelpers() {
    // Grid helper
    const grid = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    this.scene.add(grid);
    
    // Axes helper
    const axes = new THREE.AxesHelper(5);
    this.scene.add(axes);
  }
  
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  
  async loadModel() {
    this.log(`Attempting to load model from: ${this.modelPath}`);
    
    // First, check if the file exists
    try {
      this.log('Checking if file exists...');
      const response = await fetch(this.modelPath, { method: 'HEAD' });
      
      if (!response.ok) {
        this.log(`File not found or not accessible: ${this.modelPath} (Status: ${response.status})`, 'error');
        this.createFallbackCube(true);
        return;
      }
      
      this.log('File exists and is accessible!', 'success');
    } catch (error) {
      this.log(`Error checking file: ${error.message}`, 'error');
      this.createFallbackCube(true);
      return;
    }
    
    // Now try to load the model
    const loader = new GLTFLoader();
    
    try {
      this.log('Loading model...');
      
      loader.load(
        this.modelPath,
        (gltf) => {
          this.log('Model loaded successfully!', 'success');
          
          const model = gltf.scene;
          
          // Check for empty model
          if (!model || model.children.length === 0) {
            this.log('Warning: Model appears to be empty!', 'warning');
            this.createFallbackCube();
            return;
          }
          
          // Analyze model
          let meshCount = 0;
          let materialCount = 0;
          
          model.traverse((node) => {
            if (node.isMesh) {
              meshCount++;
              
              // Check geometry
              if (!node.geometry) {
                this.log(`Warning: Mesh has no geometry!`, 'warning');
              } else {
                const attributes = node.geometry.attributes;
                if (!attributes || !attributes.position) {
                  this.log(`Warning: Mesh geometry has no position attribute!`, 'warning');
                } else {
                  this.log(`Mesh has ${attributes.position.count} vertices`);
                }
              }
              
              // Check material
              if (!node.material) {
                this.log(`Warning: Mesh has no material!`, 'warning');
              } else {
                const materials = Array.isArray(node.material) ? node.material : [node.material];
                materialCount += materials.length;
                
                materials.forEach((material) => {
                  this.log(`Material type: ${material.type}`);
                  
                  // Fix common material issues
                  material.side = THREE.DoubleSide; // Show both sides
                  material.needsUpdate = true;
                });
                
                // Fix for visibility
                node.castShadow = true;
                node.receiveShadow = true;
              }
            }
          });
          
          this.log(`Model contains ${meshCount} meshes and ${materialCount} materials`);
          
          // Position model at the center and proper scale
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3()).length();
          const center = box.getCenter(new THREE.Vector3());
          
          // Reset position to center at origin
          model.position.x = -center.x;
          model.position.y = -center.y;
          model.position.z = -center.z;
          
          // Scale model to reasonable size
          const scale = 5 / size;
          model.scale.set(scale, scale, scale);
          
          // Add to scene
          this.scene.add(model);
          
          // Store reference
          this.model = model;
          
          // Position camera to view the model
          this.fitCameraToModel();
        },
        (progress) => {
          // Progress callback
          const percentComplete = (progress.loaded / progress.total) * 100;
          this.log(`Loading progress: ${Math.round(percentComplete)}%`);
        },
        (error) => {
          // Error callback
          this.log(`Error loading model: ${error.message}`, 'error');
          this.createFallbackCube();
        }
      );
    } catch (error) {
      this.log(`Exception during model loading: ${error.message}`, 'error');
      this.createFallbackCube();
    }
  }
  
  createFallbackCube(isFileError = false) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Use a distinct material color based on error type to distinguish it
    const material = new THREE.MeshStandardMaterial({
      color: isFileError ? 0xff0000 : 0xff00ff, // Red for file error, magenta for parsing error
      transparent: true,
      opacity: 0.7,
      wireframe: true
    });
    
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
    
    this.log(`Created fallback cube (${isFileError ? 'file not found' : 'model error'})`, 'warning');
  }
  
  fitCameraToModel() {
    if (!this.model) return;
    
    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Get max side of the box
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
    
    // Set camera position
    this.camera.position.set(center.x, center.y, center.z + cameraZ);
    
    // Look at center of the model
    this.camera.lookAt(center);
    
    // Update controls target
    this.controls.target = center.clone();
    this.controls.update();
    
    this.log('Camera positioned to view model', 'success');
  }
  
  // Provide a utility to test different models
  loadNewModel(modelPath) {
    // Remove existing model if any
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
    }
    
    // Update model path
    this.modelPath = modelPath;
    this.log(`Switching to new model: ${modelPath}`);
    
    // Load the new model
    this.loadModel();
  }
}

// Create a global debug function to use from the console
window.testGLBModel = function(modelPath) {
  // Create container if doesn't exist
  let container = document.getElementById('glb-tester');
  if (!container) {
    container = document.createElement('div');
    container.id = 'glb-tester';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.backgroundColor = '#222';
    container.style.zIndex = '9999';
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close Tester';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.style.zIndex = '10000';
    closeBtn.style.padding = '5px 10px';
    closeBtn.onclick = () => {
      document.body.removeChild(container);
      window.glbTester = null;
    };
    
    container.appendChild(closeBtn);
    document.body.appendChild(container);
  }
  
  // Create and store the tester instance
  window.glbTester = new GLBModelTest(container, modelPath);
  
  return window.glbTester;
};