// src/three/FloorDimensionEditor.js
import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';

export class FloorDimensionEditor {
  constructor(scene, camera, renderer, orbitControls) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.orbitControls = orbitControls;

    this.points = [];
    this.handles = [];
    this.edgeLabels = [];
    this.floorMesh = null;
    this.dragControls = null;
    this.isActive = false; // Start as inactive
    this.onPointsUpdated = null;
    this.isInitialized = false; // Track initialization state

    this.labelStyle = {
      font: '12px',
      textColor: '#151515',
      backgroundColor: 'rgba(255, 255, 255, 0.75)',
      canvasWidth: 150,
      canvasHeight: 40,
      offsetFromEdge: 0.18,
      yPosition: 0.02,
    };

    // Bind event handlers
    this._onDragStart = this._onDragStart.bind(this);
    this._onDrag = this._onDrag.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);

    // ✅ NEW: Auto-register to window for external access
    this._registerToWindow();

    // ✅ NEW: Listen for activation events
    this._setupEventListeners();

    console.log('FloorDimensionEditor: Constructor completed, ready for activation');
  }

  // ✅ NEW: Register this instance to window object
  _registerToWindow() {
    if (typeof window !== 'undefined') {
      window.floorDimensionEditor = this;
      console.log('✅ FloorDimensionEditor: Registered to window.floorDimensionEditor');
    }
  }

  // ✅ NEW: Setup event listeners for external communication
  _setupEventListeners() {
    if (typeof window !== 'undefined') {
      // Listen for initialization events
      window.addEventListener('initializeFloorEditor', (event) => {
        const { active, source } = event.detail;
        console.log(`FloorDimensionEditor: Received initializeFloorEditor from ${source}, active: ${active}`);
        
        if (active && !this.isActive) {
          this.quickActivate();
        }
      });

      // Listen for toggle events
      window.addEventListener('floorDimensionsToggle', (event) => {
        const { visible, source } = event.detail;
        console.log(`FloorDimensionEditor: Received floorDimensionsToggle from ${source}, visible: ${visible}`);
        
        if (visible && !this.isActive) {
          this.quickActivate();
        } else if (!visible && this.isActive) {
          this.clearEditor();
        }
      });

      // Listen for clear events
      window.addEventListener('clearFloorEditor', (event) => {
        const { active, source } = event.detail;
        console.log(`FloorDimensionEditor: Received clearFloorEditor from ${source}, active: ${active}`);
        
        if (!active && this.isActive) {
          this.clearEditor();
        }
      });
    }
  }

  // ✅ NEW: Quick activation with default points
  quickActivate() {
    console.log('FloorDimensionEditor: Quick activation starting...');
    
    // Use default points if none provided
    const defaultPoints = [
      { x: -2, z: -2 },
      { x: 2, z: -2 },
      { x: 2, z: 2 },
      { x: -2, z: 2 }
    ];

    this.initEditor(defaultPoints, (updatedPoints) => {
      console.log('FloorDimensionEditor: Points updated:', updatedPoints);
      
      // ✅ Notify other components about the update
      window.dispatchEvent(new CustomEvent('floorEditorStateChanged', {
        detail: { 
          active: true, 
          points: updatedPoints,
          source: 'floor-editor' 
        }
      }));
    });

    console.log('✅ FloorDimensionEditor: Quick activation completed');
  }

  // ✅ ENHANCED: Better initialization with error handling
  initEditor(initialPoints, onUpdateCallback) {
    try {
      console.log('FloorDimensionEditor: Starting initEditor...');
      
      // Clear any existing editor first
      this.clearEditor();
      
      if (!initialPoints || initialPoints.length < 3) {
        console.warn("FloorDimensionEditor: Not enough points to initialize, using defaults");
        initialPoints = [
          { x: -2, z: -2 },
          { x: 2, z: -2 },
          { x: 2, z: 2 },
          { x: -2, z: 2 }
        ];
      }

      // Validate scene dependencies
      if (!this.scene || !this.camera || !this.renderer) {
        console.error('FloorDimensionEditor: Missing required dependencies (scene/camera/renderer)');
        return false;
      }

      this.points = initialPoints.map(p => ({ ...p }));
      this.onPointsUpdated = onUpdateCallback;

      console.log('FloorDimensionEditor: Creating components...');
      
      this._createFloorMesh();
      this._createHandles();
      this._createEdgeLabels();
      this._enableDragging();
      
      this.isActive = true;
      this.isInitialized = true;
      
      console.log("✅ FloorDimensionEditor: Successfully activated with points:", JSON.stringify(this.points));
      
      // ✅ Dispatch ready event
      window.dispatchEvent(new CustomEvent('floorEditorReady', {
        detail: { 
          active: true,
          points: this.points,
          source: 'floor-editor'
        }
      }));

      return true;
      
    } catch (error) {
      console.error('FloorDimensionEditor: Error during initialization:', error);
      this.isActive = false;
      this.isInitialized = false;
      return false;
    }
  }

  // ✅ ENHANCED: Better cleanup
  clearEditor() {
    console.log('FloorDimensionEditor: Starting clearEditor...');
    
    try {
      // Cleanup drag controls
      if (this.dragControls) {
        this.dragControls.removeEventListener('dragstart', this._onDragStart);
        this.dragControls.removeEventListener('drag', this._onDrag);
        this.dragControls.removeEventListener('dragend', this._onDragEnd);
        this.dragControls.dispose();
        this.dragControls = null;
      }

      // Cleanup handles
      this.handles.forEach(handle => {
        if (handle.geometry) handle.geometry.dispose();
        if (handle.material) handle.material.dispose();
        if (handle.parent) handle.parent.remove(handle);
      });
      this.handles = [];

      // Cleanup edge labels
      this.edgeLabels.forEach(label => {
        if (label.material.map) label.material.map.dispose();
        if (label.material) label.material.dispose();
        if (label.parent) label.parent.remove(label);
      });
      this.edgeLabels = [];

      // Cleanup floor mesh
      if (this.floorMesh) {
        if (this.floorMesh.geometry) this.floorMesh.geometry.dispose();
        if (this.floorMesh.material) this.floorMesh.material.dispose();
        if (this.floorMesh.parent) this.floorMesh.parent.remove(this.floorMesh);
        this.floorMesh = null;
      }

      // Reset state
      this.points = [];
      this.isActive = false;
      this.isInitialized = false;
      this.onPointsUpdated = null;
      
      console.log("✅ FloorDimensionEditor: Successfully deactivated and cleared");
      
      // ✅ Dispatch cleared event
      window.dispatchEvent(new CustomEvent('floorEditorStateChanged', {
        detail: { 
          active: false,
          source: 'floor-editor'
        }
      }));

    } catch (error) {
      console.error('FloorDimensionEditor: Error during cleanup:', error);
    }
  }

  // ✅ NEW: Status check method
  getStatus() {
    return {
      isActive: this.isActive,
      isInitialized: this.isInitialized,
      hasPoints: this.points.length > 0,
      pointCount: this.points.length,
      hasDependencies: !!(this.scene && this.camera && this.renderer)
    };
  }

  _onDragStart(event) {
    if (this.orbitControls) this.orbitControls.enabled = false;
    if (event.object.material.emissive) {
        event.object.material.emissive.setHex(0x444400);
    } else {
        event.object.material.color.setHex(0x00aa00);
    }
  }

  _onDrag(event) {
    const handle = event.object;
    const index = handle.userData.vertexIndex;

    handle.position.y = this.labelStyle.yPosition;
    
    this.points[index].x = handle.position.x;
    this.points[index].z = handle.position.z;
    
    this._updateFloorGeometry();
    this._updateEdgeLabels();
  }

  _onDragEnd(event) {
    if (this.orbitControls) this.orbitControls.enabled = true;
    if (event.object.material.emissive) {
        event.object.material.emissive.setHex(0x000000);
    } else {
        event.object.material.color.setHex(0x28a745);
    }

    if (this.onPointsUpdated) {
      this.onPointsUpdated(this.points.map(p => ({...p})));
    }
  }

  _enableDragging() {
    if (!this.handles.length || !this.camera || !this.renderer || !this.renderer.domElement) {
        console.warn("FloorDimensionEditor: Cannot enable dragging - missing dependencies");
        return false;
    }
    
    try {
      this.dragControls = new DragControls([...this.handles], this.camera, this.renderer.domElement);
      this.dragControls.addEventListener('dragstart', this._onDragStart);
      this.dragControls.addEventListener('drag', this._onDrag);
      this.dragControls.addEventListener('dragend', this._onDragEnd);
      console.log('FloorDimensionEditor: Dragging enabled successfully');
      return true;
    } catch (error) {
      console.error('FloorDimensionEditor: Error enabling dragging:', error);
      return false;
    }
  }
  
  _createFloorMesh() {
    if (!this.points || this.points.length < 3) return;
    
    try {
      const shape = new THREE.Shape(this.points.map(p => new THREE.Vector2(p.x, p.z)));
      const geometry = new THREE.ShapeGeometry(shape);
      geometry.rotateX(Math.PI / 2);

      const material = new THREE.MeshStandardMaterial({ 
        color: 0x007bff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        polygonOffset: true, 
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        depthWrite: false
      });
      
      this.floorMesh = new THREE.Mesh(geometry, material);
      this.floorMesh.name = "EditableFloorOverlay";
      this.floorMesh.position.y = 0.005;
      this.scene.add(this.floorMesh);
      
      console.log('FloorDimensionEditor: Floor mesh created successfully');
    } catch (error) {
      console.error('FloorDimensionEditor: Error creating floor mesh:', error);
    }
  }

  _createHandles() {
    try {
      const handleGeometry = new THREE.SphereGeometry(0.08, 16, 16); 
      const handleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x28a745, 
        depthTest: false, 
        transparent: true, 
        opacity: 0.8 
      });

      this.handles = [];
      this.points.forEach((p, index) => {
        const handle = new THREE.Mesh(handleGeometry, handleMaterial.clone());
        handle.position.set(p.x, this.labelStyle.yPosition, p.z);
        handle.userData = { vertexIndex: index, isFloorHandle: true };
        handle.renderOrder = 1;
        this.scene.add(handle);
        this.handles.push(handle);
      });
      
      console.log(`FloorDimensionEditor: Created ${this.handles.length} handles`);
    } catch (error) {
      console.error('FloorDimensionEditor: Error creating handles:', error);
    }
  }
  
  _createDimensionSprite(length) {
    const text = `${length.toFixed(2)}m`;
    const pixelRatio = window.devicePixelRatio || 1;
  
    const fontSize = 20;
    const canvasWidth = 200;
    const canvasHeight = 100;
  
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth * pixelRatio;
    canvas.height = canvasHeight * pixelRatio;
  
    const ctx = canvas.getContext('2d');
    ctx.scale(pixelRatio, pixelRatio);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  
    ctx.fillStyle = '#111';
    ctx.fillText(text, canvasWidth /2, canvasHeight / 2);
  
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      sizeAttenuation: false,
    });
  
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.4, 0.12, 1);
    sprite.renderOrder = 2;
  
    return sprite;
  }

  _createEdgeLabels() {
    // Dispose old labels
    this.edgeLabels.forEach(label => {
        if (label.material.map) label.material.map.dispose();
        if (label.material) label.material.dispose();
        if (label.parent) label.parent.remove(label);
    });
    this.edgeLabels = [];

    try {
      for (let i = 0; i < this.points.length; i++) {
        const p1 = this.points[i];
        const p2 = this.points[(i + 1) % this.points.length];

        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const length = Math.sqrt(dx * dx + dz * dz);

        const labelSprite = this._createDimensionSprite(length);
        
        const midX = p1.x + dx / 2;
        const midZ = p1.z + dz / 2;

        const segmentLength = Math.max(0.001, length);
        const perpDx = -dz / segmentLength; 
        const perpDz = dx / segmentLength;  

        const offsetX = perpDx * this.labelStyle.offsetFromEdge;
        const offsetZ = perpDz * this.labelStyle.offsetFromEdge;

        labelSprite.position.set(midX + offsetX, this.labelStyle.yPosition, midZ + offsetZ);
        
        this.scene.add(labelSprite);
        this.edgeLabels.push(labelSprite);
      }
      
      console.log(`FloorDimensionEditor: Created ${this.edgeLabels.length} edge labels`);
    } catch (error) {
      console.error('FloorDimensionEditor: Error creating edge labels:', error);
    }
  }
  
  _updateFloorGeometry() {
    if (!this.floorMesh || !this.points || this.points.length < 3) return;
    
    try {
      if (this.floorMesh.geometry) this.floorMesh.geometry.dispose();
      const shape = new THREE.Shape(this.points.map(p => new THREE.Vector2(p.x, p.z)));
      const newGeometry = new THREE.ShapeGeometry(shape);
      newGeometry.rotateX(Math.PI / 2);
      this.floorMesh.geometry = newGeometry;
    } catch (error) {
      console.error('FloorDimensionEditor: Error updating floor geometry:', error);
    }
  }

  _updateEdgeLabels() {
    this._createEdgeLabels();
  }

  dispose() {
    this.clearEditor();
    
    // ✅ Remove from window
    if (typeof window !== 'undefined' && window.floorDimensionEditor === this) {
      window.floorDimensionEditor = null;
    }
    
    console.log("FloorDimensionEditor: Disposed completely");
  }

  update() {
    // For any per-frame updates if needed
  }
}