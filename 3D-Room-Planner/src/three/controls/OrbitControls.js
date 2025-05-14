// src/three/controls/OrbitControls.js
// Enhanced wrapper for Three.js OrbitControls

import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as THREE from 'three';

export class OrbitControlsWrapper {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.domElement = domElement;
    
    // Default options
    this.options = {
      enableDamping: true,
      dampingFactor: 0.1,
      enableZoom: true,
      zoomSpeed: 1.0,
      minDistance: 2,
      maxDistance: 30,
      enableRotate: true,
      rotateSpeed: 1.0,
      enablePan: true,
      panSpeed: 1.0,
      minPolarAngle: 0,
      maxPolarAngle: Math.PI / 2 - 0.1, // Prevent camera from going below ground
      minAzimuthAngle: -Infinity,
      maxAzimuthAngle: Infinity,
      screenSpacePanning: false,
      ...options
    };
    
    this.initControls();
    this.configureControls();
    
    // Save initial camera position for reset
    this.initialPosition = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone()
    };
    
    // State tracking
    this.state = {
      isActive: true,
      isDragging: false,
      isRotating: false,
      isPanning: false,
      isZooming: false
    };
    
    // Add event listeners
    this.addEventListeners();
  }
  
  initControls() {
    this.controls = new ThreeOrbitControls(this.camera, this.domElement);
  }
  
  configureControls() {
    // Apply options to controls
    Object.keys(this.options).forEach(key => {
      if (this.controls[key] !== undefined) {
        this.controls[key] = this.options[key];
      }
    });
  }
  
  addEventListeners() {
    // Track state with event listeners
    this.controls.addEventListener('start', () => {
      this.state.isDragging = true;
    });
    
    this.controls.addEventListener('end', () => {
      this.state.isDragging = false;
      this.state.isRotating = false;
      this.state.isPanning = false;
      this.state.isZooming = false;
    });
    
    this.controls.addEventListener('change', () => {
      // Custom change event if needed
    });
    
    // Add custom listeners for detecting specific operations
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this));
    
    // Prevent context menu on right-click (often used for panning)
    this.domElement.addEventListener('contextmenu', (event) => {
      if (this.options.preventContextMenu) {
        event.preventDefault();
      }
    });
  }
  
  onMouseDown(event) {
    if (!this.state.isActive) return;
    
    // Detect operation type based on mouse button
    if (event.button === 0) { // Left button
      this.state.isRotating = true;
    } else if (event.button === 2) { // Right button
      this.state.isPanning = true;
    }
  }
  
  onWheel() {
    if (!this.state.isActive) return;
    this.state.isZooming = true;
  }
  
  update() {
    if (this.controls && this.options.enableDamping) {
      this.controls.update();
    }
  }
  
  reset() {
    // Reset to initial position
    this.camera.position.copy(this.initialPosition.position);
    this.controls.target.copy(this.initialPosition.target);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }
  
  setPosition(position, target) {
    // Set camera position and look target
    if (position) {
      this.camera.position.copy(position);
    }
    
    if (target) {
      this.controls.target.copy(target);
    }
    
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }
  
  savePosition(name) {
    // Save a named camera position for later use
    if (!this.savedPositions) {
      this.savedPositions = {};
    }
    
    this.savedPositions[name] = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone()
    };
  }
  
  loadPosition(name) {
    // Load a named camera position
    if (this.savedPositions && this.savedPositions[name]) {
      const saved = this.savedPositions[name];
      this.setPosition(saved.position, saved.target);
    }
  }
  
  set2DView() {
    // Set camera to top-down view
    const roomHeight = 15; // Height above room
    this.camera.position.set(0, roomHeight, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.maxPolarAngle = Math.PI / 4; // Limit rotation in 2D mode
    this.controls.minPolarAngle = 0;
    this.controls.update();
  }
  
  set3DView() {
    // Set camera to perspective 3D view
    this.camera.position.set(5, 5, 10);
    this.controls.target.set(0, 0, 0);
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground
    this.controls.minPolarAngle = 0;
    this.controls.update();
  }
  
  setEnabled(enabled) {
    this.controls.enabled = enabled;
    this.state.isActive = enabled;
  }
  
  zoomToFit(object, offset = 1.25) {
    if (!object) return;
    
    // Create bounding box for the object
    const boundingBox = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    
    boundingBox.getCenter(center);
    boundingBox.getSize(size);
    
    // Calculate distance based on object size and camera FOV
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let distance = Math.abs(maxDim / Math.sin(fov / 2));
    
    // Apply offset multiplier
    distance *= offset;
    
    // Calculate new camera position
    const direction = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target)
      .normalize()
      .multiplyScalar(distance);
    
    // Set new position and target
    this.controls.target.copy(center);
    this.camera.position.copy(center).add(direction);
    this.camera.lookAt(center);
    this.controls.update();
  }
  
  dispose() {
    this.controls.dispose();
    
    // Remove event listeners
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.removeEventListener('wheel', this.onWheel.bind(this));
    this.domElement.removeEventListener('contextmenu', (event) => {
      if (this.options.preventContextMenu) {
        event.preventDefault();
      }
    });
  }
}

export default OrbitControlsWrapper;