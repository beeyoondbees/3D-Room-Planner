// src/three/FloorDimensionEditor.js
import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';

export class FloorDimensionEditor {
  constructor(scene, camera, renderer, orbitControls) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.orbitControls = orbitControls; // Store orbitControls to disable/enable during drag

    this.points = []; // Array of {x, z} points
    this.handles = []; // Array of THREE.Mesh (draggable spheres)
    this.edgeLabels = []; // Array of THREE.Sprite (dimension labels)
    this.floorMesh = null; // THREE.Mesh for the editable floor representation
    this.dragControls = null;
    this.isActive = true;
    this.onPointsUpdated = null; // Callback: (updatedPoints) => void

    this.labelStyle = {
      font: '12px', // Increased font size (e.g., from 14px or 18px)
      textColor: '#151515', // Darker color for better contrast
      backgroundColor: 'rgba(255, 255, 255, 0.75)', // Optional: Slight background for readability
      canvasWidth: 150,    // Base width, will adjust to text. Increased for larger font.
      canvasHeight: 40,   // Increased height for larger font.
      offsetFromEdge: 0.18, // May need slight adjustment with larger labels
      yPosition: 0.02,   
    
    };

    // Bind event handlers
    this._onDragStart = this._onDragStart.bind(this);
    this._onDrag = this._onDrag.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);
  }

  initEditor(initialPoints, onUpdateCallback) {
    this.clearEditor();
    if (!initialPoints || initialPoints.length < 3) {
      console.warn("FloorDimensionEditor: Not enough points to initialize.");
      this.isActive = false;
      return;
    }
    this.points = initialPoints.map(p => ({ ...p })); // Store a copy
    this.onPointsUpdated = onUpdateCallback;

    this._createFloorMesh();
    this._createHandles();
    this._createEdgeLabels();
    this._enableDragging();
    this.isActive = true;
    console.log("FloorDimensionEditor activated with points:", JSON.stringify(this.points));
  }

  clearEditor() {
    if (this.dragControls) {
      this.dragControls.removeEventListener('dragstart', this._onDragStart);
      this.dragControls.removeEventListener('drag', this._onDrag);
      this.dragControls.removeEventListener('dragend', this._onDragEnd);
      this.dragControls.dispose();
      this.dragControls = null;
    }

    this.handles.forEach(handle => {
      if (handle.geometry) handle.geometry.dispose();
      if (handle.material) handle.material.dispose();
      if (handle.parent) handle.parent.remove(handle);
    });
    this.handles = [];

    this.edgeLabels.forEach(label => {
      if (label.material.map) label.material.map.dispose();
      if (label.material) label.material.dispose();
      if (label.parent) label.parent.remove(label);
    });
    this.edgeLabels = [];

    if (this.floorMesh) {
      if (this.floorMesh.geometry) this.floorMesh.geometry.dispose();
      if (this.floorMesh.material) this.floorMesh.material.dispose();
      if (this.floorMesh.parent) this.floorMesh.parent.remove(this.floorMesh);
      this.floorMesh = null;
    }
    this.points = [];
    this.isActive = false;
    this.onPointsUpdated = null; // Clear callback
    console.log("FloorDimensionEditor deactivated and cleared.");
  }

  _onDragStart(event) {
    if (this.orbitControls) this.orbitControls.enabled = false;
    // Highlight dragged handle (make sure material supports emissive or change color)
    if (event.object.material.emissive) {
        event.object.material.emissive.setHex(0x444400); // Dark yellow emissive
    } else {
        event.object.material.color.setHex(0x00aa00); // Fallback highlight
    }
  }

  _onDrag(event) {
    const handle = event.object;
    const index = handle.userData.vertexIndex;

    // Keep handle on the XZ plane at the defined yPosition
    handle.position.y = this.labelStyle.yPosition;
    
    this.points[index].x = handle.position.x;
    this.points[index].z = handle.position.z;
    
    this._updateFloorGeometry();
    this._updateEdgeLabels(); // Update positions and text of existing labels
  }

  _onDragEnd(event) {
    if (this.orbitControls) this.orbitControls.enabled = true;
    if (event.object.material.emissive) {
        event.object.material.emissive.setHex(0x000000); // Reset emissive
    } else {
        event.object.material.color.setHex(0x28a745); // Reset to original handle color
    }

    if (this.onPointsUpdated) {
      this.onPointsUpdated(this.points.map(p => ({...p}))); // Send a copy of updated points
    }
  }

  _enableDragging() {
    if (!this.handles.length || !this.camera || !this.renderer || !this.renderer.domElement) {
        console.warn("FloorDimensionEditor: Cannot enable dragging - missing dependencies.");
        return;
    }
    this.dragControls = new DragControls([...this.handles], this.camera, this.renderer.domElement);
    this.dragControls.addEventListener('dragstart', this._onDragStart);
    this.dragControls.addEventListener('drag', this._onDrag);
    this.dragControls.addEventListener('dragend', this._onDragEnd);
  }
  
  _createFloorMesh() {
    if (!this.points || this.points.length < 3) return;
    const shape = new THREE.Shape(this.points.map(p => new THREE.Vector2(p.x, p.z)));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(Math.PI / 2);// Rotate to lay flat on XZ plane

    const material = new THREE.MeshStandardMaterial({ 
      color: 0x007bff, // A distinct color for the editor floor
      transparent: true,
      opacity: 0.3, // Semi-transparent
      side: THREE.DoubleSide,
      polygonOffset: true, 
      polygonOffsetFactor: 1, // Ensure it's drawn on top of the main room floor
      polygonOffsetUnits: 1,
      depthWrite: false // Often good for transparent overlays
    });
    this.floorMesh = new THREE.Mesh(geometry, material);
    this.floorMesh.name = "EditableFloorOverlay";
    this.floorMesh.position.y = 0.005; // Slightly above the main floor (if main floor is at Y=0)
    this.scene.add(this.floorMesh);
  }

  _createHandles() {
    const handleGeometry = new THREE.SphereGeometry(0.08, 16, 16); 
    const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x28a745, depthTest: false, transparent: true, opacity: 0.8 });

    this.handles = []; // Clear before recreating
    this.points.forEach((p, index) => {
      const handle = new THREE.Mesh(handleGeometry, handleMaterial.clone());
      handle.position.set(p.x, this.labelStyle.yPosition, p.z);
      handle.userData = { vertexIndex: index, isFloorHandle: true };
      handle.renderOrder = 1; // Render on top of floor overlay
      this.scene.add(handle);
      this.handles.push(handle);
    });
  }
  
  _createDimensionSprite(length) {
    const text = `${length.toFixed(2)}m`;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const font = this.labelStyle.font;
    context.font = font;
    const textMetrics = context.measureText(text);
    
    const canvasPadding = 10; // Padding around text
    canvas.width = Math.max(this.labelStyle.canvasWidth, textMetrics.width + canvasPadding); // Ensure min width
    canvas.height = this.labelStyle.canvasHeight;

    context.font = font; // Re-apply font after resize
    context.fillStyle = this.labelStyle.textColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true,
      depthTest: false,
      sizeAttenuation: false // Makes sprite size fixed in screen pixels
    });

    const sprite = new THREE.Sprite(material);
    // Scale for sizeAttenuation: false. Value depends on desired screen size.
    // (canvas.width * pixel_scale_factor)
    sprite.scale.set(canvas.width * 0.006, canvas.height * 0.006, 1.0); 
    sprite.renderOrder = 2; // Render labels on top of handles
    return sprite;
  }

  _createEdgeLabels() {
    // Dispose and remove old labels
    this.edgeLabels.forEach(label => {
        if (label.material.map) label.material.map.dispose();
        if (label.material) label.material.dispose();
        if (label.parent) label.parent.remove(label); // Remove from scene
    });
    this.edgeLabels = [];

    for (let i = 0; i < this.points.length; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const length = Math.sqrt(dx * dx + dz * dz);

      const labelSprite = this._createDimensionSprite(length);
      
      const midX = p1.x + dx / 2;
      const midZ = p1.z + dz / 2;

      // Calculate normalized perpendicular vector for offsetting the label
      const segmentLength = Math.max(0.001, length); // Avoid division by zero
      const perpDx = -dz / segmentLength; 
      const perpDz = dx / segmentLength;  

      const offsetX = perpDx * this.labelStyle.offsetFromEdge;
      const offsetZ = perpDz * this.labelStyle.offsetFromEdge;

      labelSprite.position.set(midX + offsetX, this.labelStyle.yPosition, midZ + offsetZ);
      
      this.scene.add(labelSprite);
      this.edgeLabels.push(labelSprite);
    }
  }
  
  _updateFloorGeometry() {
    if (!this.floorMesh || !this.points || this.points.length < 3) return;
    if (this.floorMesh.geometry) this.floorMesh.geometry.dispose();
    const shape = new THREE.Shape(this.points.map(p => new THREE.Vector2(p.x, p.z)));
    const newGeometry = new THREE.ShapeGeometry(shape);
    newGeometry.rotateX(Math.PI / 2);
    this.floorMesh.geometry = newGeometry;
  }

  _updateEdgeLabels() {
    // More efficient would be to update existing sprite textures and positions,
    // but recreating is simpler for now and often fine for a few points.
    this._createEdgeLabels();
  }

  dispose() {
    this.clearEditor(); // clearEditor now handles dragControls and other disposals
    console.log("FloorDimensionEditor disposed.");
  }

  update() { /* For any per-frame updates if needed */ }
}