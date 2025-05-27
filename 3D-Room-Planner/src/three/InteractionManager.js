// src/three/InteractionManager.js
// Enhanced version of your working InteractionManager with fixes and improvements

import * as THREE from 'three';

export class InteractionManager {
  constructor(scene, camera, renderer, orbitControls) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.orbitControls = orbitControls;
    
    // Core interaction state
    this.selectedObject = null;
    this.pinnedObjects = new Set();
    this.isDragging = false;
    this.isRotating = false;
    this.floorLevel = 0;
    this.enabled = true; // Add enabled state for better control
    
    // Interaction modes and positions
    this.interactionMode = 'translate';
    this.dragStartPosition = new THREE.Vector3();
    this.objectStartPosition = new THREE.Vector3();
    this.objectStartRotation = new THREE.Euler();
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();
    
    // Raycasting
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.startPointer = new THREE.Vector2();
    
    // Distance display system
    this.distanceDisplay = null;
    this.distanceLines = null;
    this.distanceOverlay = null; // Add missing property
    this.showDistanceIndicators = true;
    
    // Icon system with safe initialization
    this.modeIcon = null;
    this.baseIconScale = 0.5;
    this.zoomFactor = 0.05;
    
    // Label scaling
    this.baseLabelScale = 1.2;
    this.labelZoomFactor = 0.09;
    this.minLabelScale = 0.5;
    
    // Texture loading with error handling
    this.textureLoader = new THREE.TextureLoader();
    this.moveIconTexture = null;
    this.rotateIconTexture = null;
    this.texturesLoaded = false;
    this.fallbackTexturesCreated = false;
    
    // Callbacks
    this.callbacks = {};
    
    // Initialize everything
    this.loadIcons();
    this.createHelpers();
    this.createDistanceDisplay();
    
    // Bind methods to preserve context
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    
    this.addEventListeners();
    
    console.log('InteractionManager: Initialized successfully');
  }

  loadIcons() {
    // FIXED: Use single consistent path (no duplicate loading)
    const moveIconPath = '/assets/icons/move-icon.svg';
    const rotateIconPath = '/assets/icons/rotate-icon.svg';

    // Load move icon only once
    this.textureLoader.load(
      moveIconPath,
      (texture) => {
        this.moveIconTexture = texture;
        console.log('Move icon texture loaded successfully');
        this.checkTexturesLoaded();
      },
      undefined,
      (error) => {
        console.warn('Error loading move icon texture, using fallback');
        this.createFallbackMoveTexture();
        this.checkTexturesLoaded();
      }
    );

    // Load rotate icon only once
    this.textureLoader.load(
      rotateIconPath,
      (texture) => {
        this.rotateIconTexture = texture;
        console.log('Rotate icon texture loaded successfully');
        this.checkTexturesLoaded();
      },
      undefined,
      (error) => {
        console.warn('Error loading rotate icon texture, using fallback');
        this.createFallbackRotateTexture();
        this.checkTexturesLoaded();
      }
    );

    // Timeout fallback (reduced to 2 seconds)
    setTimeout(() => {
      if (!this.texturesLoaded && !this.fallbackTexturesCreated) {
        console.log('Creating fallback textures due to timeout');
        this.createFallbackTextures();
      }
    }, 2000);
  }

  checkTexturesLoaded() {
    if ((this.moveIconTexture || this.fallbackTexturesCreated) && 
        (this.rotateIconTexture || this.fallbackTexturesCreated)) {
      this.texturesLoaded = true;
      this.updateModeIcon();
    }
  }

  createFallbackMoveTexture() {
    this.moveIconTexture = this.createIconTexture('move');
    this.fallbackTexturesCreated = true;
  }

  createFallbackRotateTexture() {
    this.rotateIconTexture = this.createIconTexture('rotate');
    this.fallbackTexturesCreated = true;
  }

  createFallbackTextures() {
    if (!this.moveIconTexture) {
      this.createFallbackMoveTexture();
    }
    if (!this.rotateIconTexture) {
      this.createFallbackRotateTexture();
    }
    this.fallbackTexturesCreated = true;
    this.texturesLoaded = true;
    this.updateModeIcon();
  }

  createIconTexture(type) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 128;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up styling
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.strokeStyle = '#007acc';
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Draw background circle
    context.beginPath();
    context.arc(64, 64, 50, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    // Draw icon based on type
    context.strokeStyle = '#007acc';
    context.lineWidth = 6;
    
    if (type === 'move') {
      // Draw move arrows (cross pattern)
      // Horizontal arrow
      context.beginPath();
      context.moveTo(24, 64);
      context.lineTo(104, 64);
      context.moveTo(94, 54);
      context.lineTo(104, 64);
      context.lineTo(94, 74);
      // Vertical arrow
      context.moveTo(64, 24);
      context.lineTo(64, 104);
      context.moveTo(54, 34);
      context.lineTo(64, 24);
      context.lineTo(74, 34);
      context.stroke();
    } else {
      // Draw rotate arrows (circular)
      context.beginPath();
      context.arc(64, 64, 30, 0, Math.PI * 1.5);
      context.stroke();
      
      // Add arrow head
      context.beginPath();
      context.moveTo(64, 34);
      context.lineTo(74, 44);
      context.moveTo(64, 34);
      context.lineTo(54, 44);
      context.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  createDistanceDisplay() {
    this.createDistanceOverlay();
    this.createDistanceLines();
  }

  createDistanceOverlay() {
    // Safely create distance overlay
    if (!this.renderer || !this.renderer.domElement) {
      console.warn('InteractionManager: Cannot create distance overlay - renderer not available');
      return;
    }

    this.distanceOverlay = document.createElement('div');
    this.distanceOverlay.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 15px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 32px;
      line-height: 1.4;
      pointer-events: none;
      z-index: 1000;
      display: none;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    const container = this.renderer.domElement.parentElement;
    if (container) {
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(this.distanceOverlay);
    } else {
      console.warn('InteractionManager: No container found for distance overlay');
    }
  }

  createDistanceLines() {
    if (!this.scene) {
      console.warn('InteractionManager: Cannot create distance lines - scene not available');
      return;
    }

    this.distanceLines = new THREE.Group();
    this.distanceLines.userData.isDistanceIndicator = true;
    this.scene.add(this.distanceLines);
    
    // Create materials with safe disposal tracking
    this.xAxisMaterial = new THREE.LineBasicMaterial({ 
      color: 0xff6b6b, 
      transparent: true, 
      opacity: 0.7,
      linewidth: 2 
    });
    this.zAxisMaterial = new THREE.LineBasicMaterial({ 
      color: 0x77aaff, 
      transparent: true, 
      opacity: 0.7,
      linewidth: 2 
    });
    this.totalDistanceMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.5,
      linewidth: 1 
    });
  }

  updateDistanceDisplay() {
    if (!this.isDragging || !this.selectedObject || !this.showDistanceIndicators) {
      this.hideDistanceDisplay();
      return;
    }

    const currentPos = this.selectedObject.position;
    const deltaX = currentPos.x - this.objectStartPosition.x;
    const deltaZ = currentPos.z - this.objectStartPosition.z;
    const totalDistance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);

    this.updateDistanceLines(deltaX, deltaZ);
  }

  updateDistanceLines(deltaX, deltaZ) {
    this.clearDistanceLines();

    if (!this.selectedObject || !this.distanceLines) return;

    const startPos = this.objectStartPosition;
    const currentPos = this.selectedObject.position;

    // X-axis line
    if (Math.abs(deltaX) > 0.01) {
      const xLineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(startPos.x, startPos.y + 0.1, startPos.z),
        new THREE.Vector3(currentPos.x, startPos.y + 0.1, startPos.z)
      ]);
      const xLine = new THREE.Line(xLineGeometry, this.xAxisMaterial);
      this.distanceLines.add(xLine);

      this.addDistanceLabel(
        new THREE.Vector3(
          (startPos.x + currentPos.x) / 2,
          startPos.y + 0.2,
          startPos.z
        ),
        `${Math.abs(deltaX).toFixed(2)}m`,
        0xff6b6b
      );
    }

    // Z-axis line
    if (Math.abs(deltaZ) > 0.01) {
      const zLineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(currentPos.x, startPos.y + 0.1, startPos.z),
        new THREE.Vector3(currentPos.x, startPos.y + 0.1, currentPos.z)
      ]);
      const zLine = new THREE.Line(zLineGeometry, this.zAxisMaterial);
      this.distanceLines.add(zLine);

      this.addDistanceLabel(
        new THREE.Vector3(
          currentPos.x,
          startPos.y + 0.2,
          (startPos.z + currentPos.z) / 2
        ),
        `${Math.abs(deltaZ).toFixed(2)}m`,
        0x77aaff
      );
    }

    // Total distance line
    const totalDistance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    if (totalDistance > 0.01) {
      const totalLineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(startPos.x, startPos.y + 0.05, startPos.z),
        new THREE.Vector3(currentPos.x, startPos.y + 0.05, currentPos.z)
      ]);
      
      const dashedMaterial = new THREE.LineDashedMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.6,
        dashSize: 0.1,
        gapSize: 0.05
      });
      
      const totalLine = new THREE.Line(totalLineGeometry, dashedMaterial);
      totalLine.computeLineDistances();
      this.distanceLines.add(totalLine);
    }

    // Position markers
    this.addPositionMarker(startPos, 0x888888, 'start');
    this.addPositionMarker(currentPos, 0x00ff00, 'current');
  }

  addDistanceLabel(position, text, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 192;

    // Set font size to 50px with correct syntax
    context.font = "54px Helvetica, Arial, sans-serif";
    const textMetrics = context.measureText(text);
    const textWidth = textMetrics.width;

    // Define a standard box size (in canvas pixels)
    const standardBoxWidth = 280;
    const standardBoxHeight = 95;
    const cornerRadius = 10;

    // Calculate the position to center the box on the canvas
    const boxX = (canvas.width - standardBoxWidth) / 2;
    const boxY = (canvas.height - standardBoxHeight) / 2;

    // Draw background box with standard size
    const backgroundColor = `#${color.toString(16).padStart(6, '0')}`;
    context.fillStyle = backgroundColor;
    context.globalAlpha = 0.8;
    context.beginPath();
    
    // Use a fallback if roundRect is not available
    if (context.roundRect) {
      context.roundRect(boxX, boxY, standardBoxWidth, standardBoxHeight, cornerRadius);
    } else {
      // Fallback for older browsers
      context.rect(boxX, boxY, standardBoxWidth, standardBoxHeight);
    }
    context.fill();
    context.globalAlpha = 1.0;

    // Draw text, centered in the standard box
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create sprite
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);

    sprite.position.copy(position);
    sprite.scale.set(this.baseLabelScale, this.baseLabelScale * (canvas.height / canvas.width), 1);
    sprite.userData.isDistanceLabel = true;

    this.distanceLines.add(sprite);
  }

  updateLabelScales() {
    if (!this.camera || !this.distanceLines) return;

    this.distanceLines.traverse((child) => {
      if (child.userData.isDistanceLabel) {
        const distance = this.camera.position.distanceTo(child.position);
        let scale = this.baseLabelScale * distance * this.labelZoomFactor;
        scale = Math.max(scale, this.minLabelScale);
        const aspectRatio = child.scale.y / child.scale.x;
        child.scale.set(scale, scale * aspectRatio, 1);
      }
    });
  }

  addPositionMarker(position, color, type) {
    const markerGeometry = new THREE.SphereGeometry(0.03, 8, 6);
    const markerMaterial = new THREE.MeshBasicMaterial({ 
      color: color,
      transparent: true,
      opacity: type === 'start' ? 0.6 : 0.9
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    
    marker.position.set(position.x, position.y + 0.1, position.z);
    this.distanceLines.add(marker);
  }

  clearDistanceLines() {
    if (!this.distanceLines) return;

    // Safely dispose of all children
    const children = [...this.distanceLines.children]; // Create a copy to avoid mutation issues
    children.forEach(child => {
      this.distanceLines.remove(child);
      
      // Dispose geometry
      if (child.geometry) {
        child.geometry.dispose();
      }
      
      // Dispose materials and textures
      if (child.material) {
        if (child.material.map) {
          child.material.map.dispose();
        }
        child.material.dispose();
      }
    });
  }

  hideDistanceDisplay() {
    if (this.distanceOverlay) {
      this.distanceOverlay.style.display = 'none';
    }
    this.clearDistanceLines();
  }

  toggleDistanceIndicators() {
    this.showDistanceIndicators = !this.showDistanceIndicators;
    if (!this.showDistanceIndicators) {
      this.hideDistanceDisplay();
    }
    console.log(`Distance indicators: ${this.showDistanceIndicators ? 'ON' : 'OFF'}`);
  }

  createHelpers() {
    if (!this.scene) {
      console.warn('InteractionManager: Cannot create helpers - scene not available');
      return;
    }

    this.outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x00a2ff,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.3
    });
    
    this.dragPlaneHelper = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({
        color: 0xffff00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
        visible: false
      })
    );
    this.scene.add(this.dragPlaneHelper);
    
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.floorLevel);
  }
  
  addEventListeners() {
    if (!this.renderer || !this.renderer.domElement) {
      console.warn('InteractionManager: Cannot add event listeners - renderer not available');
      return;
    }

    const domElement = this.renderer.domElement;
    domElement.addEventListener('pointerdown', this.onPointerDown);
    domElement.addEventListener('pointermove', this.onPointerMove);
    domElement.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
  }
  
  removeEventListeners() {
    if (this.renderer && this.renderer.domElement) {
      const domElement = this.renderer.domElement;
      domElement.removeEventListener('pointerdown', this.onPointerDown);
      domElement.removeEventListener('pointermove', this.onPointerMove);
      domElement.removeEventListener('pointerup', this.onPointerUp);
    }
    window.removeEventListener('keydown', this.onKeyDown);
  }
  
  setCallbacks(callbacks) {
    this.callbacks = callbacks || {};
    
    // FIXED: Support for duplication callbacks
    if (callbacks?.onObjectDuplicated) {
      console.log('InteractionManager: Duplication callback registered');
    }
    if (callbacks?.onDuplicationFailed) {
      console.log('InteractionManager: Duplication failed callback registered');
    }
  }

  // Add method for updating from outside (like SceneManager)
  update(delta) {
    // Update any time-based interactions
    // Called from SceneManager animation loop
    
    // Update animation mixers for all objects if needed
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.userData.mixer) {
          object.userData.mixer.update(delta);
        }
      });
    }
  }
  
  setFloorLevel(level) {
    this.floorLevel = level;
    if (this.groundPlane) {
      this.groundPlane.constant = -this.floorLevel;
    }
  }

  // Add enable/disable methods for better control
  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    this.deselect();
  }
  
  onPointerDown(event) {
    if (!this.enabled || event.button !== 0 || event.ctrlKey || event.metaKey) return;
    
    try {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      this.startPointer.copy(this.pointer);
      
      this.raycaster.setFromCamera(this.pointer, this.camera);
      
      const selectableObjects = this.getSelectableObjects();
      const intersects = this.raycaster.intersectObjects(selectableObjects, true);
      
      if (intersects.length > 0) {
        let selected = intersects[0].object;
        while (selected.parent && !selected.userData.isModelRoot) {
          selected = selected.parent;
        }
        
        if (this.selectedObject === selected) {
          if (!this.isPinned(selected)) {
            this.startDrag(selected, intersects[0].point);
          }
        } else {
          this.select(selected);
        }
        
        if (this.orbitControls) {
          this.orbitControls.enabled = false;
        }
      } else {
        this.deselect();
        if (this.orbitControls) {
          this.orbitControls.enabled = true;
        }
      }
    } catch (error) {
      console.error('InteractionManager: Error in onPointerDown:', error);
    }
  }
  
  startDrag(object, hitPoint) {
    if (!object || this.isPinned(object)) return;
    
    try {
      this.isDragging = true;
      this.isRotating = this.interactionMode === 'rotate';
      
      this.dragStartPosition.copy(hitPoint);
      this.objectStartPosition.copy(object.position);
      this.objectStartRotation.copy(object.rotation);
      
      if (!this.isRotating) {
        const planeNormal = new THREE.Vector3(0, 1, 0);
        const floorPoint = new THREE.Vector3(0, 0, 0);
        
        this.dragPlane.setFromNormalAndCoplanarPoint(planeNormal, floorPoint);
        
        this.dragOffset = new THREE.Vector3(
          hitPoint.x - object.position.x,
          0,
          hitPoint.z - object.position.z
        );
        
        if (this.dragPlaneHelper) {
          this.dragPlaneHelper.rotation.x = Math.PI / 2;
          this.dragPlaneHelper.position.y = 0;
        }
      }

      this.updateDistanceDisplay();
    } catch (error) {
      console.error('InteractionManager: Error in startDrag:', error);
    }
  }
  
  onPointerMove(event) {
    if (!this.enabled) return;

    try {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      if (this.isDragging && this.selectedObject && !this.isPinned(this.selectedObject)) {
        if (this.isRotating) {
          this.handleRotation();
        } else {
          this.handleTranslation();
        }
        
        this.updateDistanceDisplay();
        
        if (this.callbacks?.onObjectChanged) {
          this.callbacks.onObjectChanged(this.selectedObject);
        }
      }
    } catch (error) {
      console.error('InteractionManager: Error in onPointerMove:', error);
    }
  }
  
  handleTranslation() {
    try {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      
      const intersection = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
        const currentY = this.selectedObject.position.y;
        
        const newPosition = new THREE.Vector3(
          intersection.x - this.dragOffset.x,
          currentY,
          intersection.z - this.dragOffset.z
        );
        
        this.selectedObject.position.copy(newPosition);
      }
    } catch (error) {
      console.error('InteractionManager: Error in handleTranslation:', error);
    }
  }
  
  handleRotation() {
    try {
      const deltaX = this.pointer.x - this.startPointer.x;
      const rotationSensitivity = 5.0;
      const rotationAngle = deltaX * rotationSensitivity;
      
      this.selectedObject.rotation.y = this.objectStartRotation.y + rotationAngle;
    } catch (error) {
      console.error('InteractionManager: Error in handleRotation:', error);
    }
  }
  
  onPointerUp() {
    if (!this.enabled) return;

    try {
      if (this.isDragging && this.selectedObject) {
        this.isDragging = false;
        this.isRotating = false;
        
        this.hideDistanceDisplay();
        
        if (this.orbitControls) {
          this.orbitControls.enabled = true;
        }
      }
    } catch (error) {
      console.error('InteractionManager: Error in onPointerUp:', error);
    }
  }
  
  onKeyDown(event) {
    if (!this.enabled) return;
    
    try {
      switch (event.key.toLowerCase()) {
        case 't':
          if (this.selectedObject) this.setInteractionMode('translate');
          break;
        case 'r':
          if (this.selectedObject) this.setInteractionMode('rotate');
          break;
        case 'p':
          if (this.selectedObject) this.togglePin(this.selectedObject);
          break;
        case 'delete':
        case 'backspace':
          if (this.selectedObject) this.deleteSelected();
          break;
        case 'escape':
          this.deselect();
          break;
        case 'd':
          // FIXED: Handle both duplicate (for models only) and distance indicators
          if ((event.ctrlKey || event.metaKey) && this.selectedObject) {
            event.preventDefault();
            if (this.isModel(this.selectedObject)) {
              this.duplicateSelected();
            } else {
              console.log('InteractionManager: Cannot duplicate - selected object is not a model');
              // Optional: Show user feedback
              if (this.callbacks?.onDuplicationFailed) {
                this.callbacks.onDuplicationFailed(this.selectedObject, 'Not a model');
              }
            }
          } else {
            this.toggleDistanceIndicators();
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('InteractionManager: Error in onKeyDown:', error);
    }
  }    
  
  getSelectableObjects() {
    if (!this.scene) return [];

    const selectableObjects = [];
    
    this.scene.traverse((object) => {
      if (object.userData && object.userData.selectable) {
        selectableObjects.push(object);
      }
    });
    
    return selectableObjects;
  }
  
  select(object) {
    if (this.selectedObject === object) return;
    
    try {
      this.deselect();
      
      this.selectedObject = object;
      
      this.addHighlight(object);
      
      if (this.callbacks?.onObjectSelected) {
        this.callbacks.onObjectSelected(object);
      }
    } catch (error) {
      console.error('InteractionManager: Error in select:', error);
    }
  }
  
  deselect() {
    if (!this.selectedObject) return;
    
    try {
      this.hideDistanceDisplay();
      
      this.removeHighlight(this.selectedObject);
      
      const previouslySelected = this.selectedObject;
      this.selectedObject = null;
      
      this.isDragging = false;
      
      if (this.callbacks?.onObjectDeselected) {
        this.callbacks.onObjectDeselected(previouslySelected);
      }
    } catch (error) {
      console.error('InteractionManager: Error in deselect:', error);
    }
  }
  
  addHighlight(object) {
    try {
      this.createBoundingBox(object);
      this.createModeIcon(object);
    } catch (error) {
      console.error('InteractionManager: Error in addHighlight:', error);
    }
  }

  removeHighlight(object) {
    try {
      this.removeBoundingBox(object);
      this.removeModeIcon(object);
    } catch (error) {
      console.error('InteractionManager: Error in removeHighlight:', error);
    }
  }

  createBoundingBox(object) {
    if (!object || !this.scene) return;

    try {
      this.removeBoundingBox(object);
      
      const boxHelper = new THREE.BoxHelper(object, 0xe4002b);
      boxHelper.material = new THREE.LineDashedMaterial({
        color: 0xe4002b,
        linewidth: 2,
        dashSize: 0.1,
        gapSize: 0.1
      });
      boxHelper.material.transparent = true;
      boxHelper.material.opacity = 0.5;
      boxHelper.userData.isBoundingBox = true;
      
      object.userData.boundingBoxHelper = boxHelper;
      
      this.scene.add(boxHelper);
    } catch (error) {
      console.error('InteractionManager: Error creating bounding box:', error);
    }
  }

  removeBoundingBox(object) {
    if (!object) return;

    try {
      if (object.userData.boundingBoxHelper) {
        if (this.scene) {
          this.scene.remove(object.userData.boundingBoxHelper);
        }
        
        // Dispose of materials
        if (object.userData.boundingBoxHelper.material) {
          object.userData.boundingBoxHelper.material.dispose();
        }
        
        delete object.userData.boundingBoxHelper;
      }
    } catch (error) {
      console.error('InteractionManager: Error removing bounding box:', error);
    }
  }

  updateBoundingBoxes() {
    try {
      if (this.selectedObject && this.selectedObject.userData.boundingBoxHelper) {
        this.selectedObject.userData.boundingBoxHelper.update();
      }
      this.updateModeIconScale();
      this.updateLabelScales();
    } catch (error) {
      console.error('InteractionManager: Error updating bounding boxes:', error);
    }
  }

  updateModeIconScale() {
    if (!this.selectedObject || !this.selectedObject.userData.modeIcon || !this.camera) return;

    try {
      const iconSprite = this.selectedObject.userData.modeIcon;
      const distance = this.camera.position.distanceTo(this.selectedObject.position);
      const scale = this.baseIconScale * distance * this.zoomFactor;
      iconSprite.scale.set(scale, scale, 1);
    } catch (error) {
      console.error('InteractionManager: Error updating mode icon scale:', error);
    }
  }
  
  setInteractionMode(mode) {
    try {
      this.interactionMode = mode;
      this.updateModeIcon();
      if (this.callbacks?.onModeChanged) {
        this.callbacks.onModeChanged(mode);
      }
    } catch (error) {
      console.error('InteractionManager: Error setting interaction mode:', error);
    }
  }
  
  getObjectHeight(object) {
    if (!object) return 0;
    
    try {
      const box = new THREE.Box3().setFromObject(object);
      return box.max.y - box.min.y;
    } catch (error) {
      console.error('InteractionManager: Error getting object height:', error);
      return 0;
    }
  }
  
  isPinned(object) {
    if (!object) return false;
    return this.pinnedObjects.has(object.uuid);
  }
  
  pinObject(object) {
    if (!object) return;
    
    try {
      this.pinnedObjects.add(object.uuid);
      object.userData.isPinned = true;
      this.updatePinVisual(object, true);
      if (this.callbacks?.onObjectPinned) {
        this.callbacks.onObjectPinned(object);
      }
    } catch (error) {
      console.error('InteractionManager: Error pinning object:', error);
    }
  }
  
  unpinObject(object) {
    if (!object) return;
    
    try {
      this.pinnedObjects.delete(object.uuid);
      object.userData.isPinned = false;
      this.updatePinVisual(object, false);
      if (this.callbacks?.onObjectUnpinned) {
        this.callbacks.onObjectUnpinned(object);
      }
    } catch (error) {
      console.error('InteractionManager: Error unpinning object:', error);
    }
  }
  
  togglePin(object) {
    if (!object) return;
    
    if (this.isPinned(object)) {
      this.unpinObject(object);
    } else {
      this.pinObject(object);
    }
  }
  
  createModeIcon(object) {
    if (!object) return;

    try {
      this.removeModeIcon(object);
      
      const box = new THREE.Box3().setFromObject(object);
      const height = box.max.y - box.min.y;
      const iconY = height / 2;
      
      let iconSprite;
      if (this.interactionMode === 'translate') {
        iconSprite = this.createMoveIcon();
      } else if (this.interactionMode === 'rotate') {
        iconSprite = this.createRotateIcon();
      }
      
      if (iconSprite) {
        iconSprite.position.set(0, iconY, 0);
        iconSprite.userData.isModeIcon = true;
        object.add(iconSprite);
        object.userData.modeIcon = iconSprite;
      }
    } catch (error) {
      console.error('InteractionManager: Error creating mode icon:', error);
    }
  }

  createMoveIcon() {
    if (!this.moveIconTexture) {
      console.warn('Move icon texture not loaded yet, using fallback');
      return this.createFallbackSprite('move');
    }
    
    try {
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: this.moveIconTexture, 
        transparent: true,
        depthTest: false
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(this.baseIconScale, this.baseIconScale, 1);
      return sprite;
    } catch (error) {
      console.error('InteractionManager: Error creating move icon:', error);
      return this.createFallbackSprite('move');
    }
  }

  createRotateIcon() {
    if (!this.rotateIconTexture) {
      console.warn('Rotate icon texture not loaded yet, using fallback');
      return this.createFallbackSprite('rotate');
    }
    
    try {
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: this.rotateIconTexture, 
        transparent: true,
        depthTest: false
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(this.baseIconScale, this.baseIconScale, 1);
      return sprite;
    } catch (error) {
      console.error('InteractionManager: Error creating rotate icon:', error);
      return this.createFallbackSprite('rotate');
    }
  }

  createFallbackSprite(type = 'move') {
    try {
      const texture = this.createIconTexture(type);
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true,
        depthTest: false
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(this.baseIconScale, this.baseIconScale, 1);
      return sprite;
    } catch (error) {
      console.error('InteractionManager: Error creating fallback sprite:', error);
      return null;
    }
  }

  // FIXED: This was the source of the original error
  removeModeIcon(object) {
    if (!object) return;

    try {
      if (object.userData && object.userData.modeIcon) {
        // Safe removal with proper checks
        object.remove(object.userData.modeIcon);
        
        // FIXED: Safe material and texture disposal
        if (object.userData.modeIcon.material) {
          if (object.userData.modeIcon.material.map) {
            object.userData.modeIcon.material.map.dispose();
          }
          object.userData.modeIcon.material.dispose();
        }
        
        delete object.userData.modeIcon;
      }
    } catch (error) {
      console.error('InteractionManager: Error removing mode icon:', error);
    }
  }

  updateModeIcon() {
    if (this.selectedObject) {
      this.createModeIcon(this.selectedObject);
    }
  }

  updatePinVisual(object, isPinned) {
    if (!object) return;

    try {
      const existingPin = object.children.find(child => child.userData.isPinIndicator);
      if (existingPin) {
        object.remove(existingPin);
        
        // Dispose of pin geometry and materials
        existingPin.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }
      
      if (isPinned) {
        const pinGroup = new THREE.Group();
        pinGroup.userData.isPinIndicator = true;
        
        const headGeometry = new THREE.SphereGeometry(0.05, 12, 8);
        const headMaterial = new THREE.MeshBasicMaterial({ color: 0xff3333 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.08;
        pinGroup.add(head);
        
        const shaftGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.15, 6);
        const shaftMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.position.y = 0;
        pinGroup.add(shaft);
        
        const box = new THREE.Box3().setFromObject(object);
        const height = box.max.y - box.min.y;
        
        pinGroup.position.y = height / 2 + 0.2;
        pinGroup.rotation.x = -Math.PI / 8;
        
        object.add(pinGroup);
      }
    } catch (error) {
      console.error('InteractionManager: Error updating pin visual:', error);
    }
  }
  
  deleteSelected() {
    if (!this.selectedObject) return;
    
    try {
      const objectToDelete = this.selectedObject;
      this.deselect();
      this.pinnedObjects.delete(objectToDelete.uuid);
      
      if (this.scene) {
        this.scene.remove(objectToDelete);
      }
      
      if (this.callbacks?.onObjectDeleted) {
        this.callbacks.onObjectDeleted(objectToDelete);
      }
    } catch (error) {
      console.error('InteractionManager: Error deleting selected object:', error);
    }
  }
  
  rotateObject(object, angleDegrees) {
    if (!object || this.isPinned(object)) return;
    
    try {
      const angleRadians = THREE.MathUtils.degToRad(angleDegrees);
      object.rotation.y += angleRadians;
      
      if (this.callbacks?.onObjectChanged) {
        this.callbacks.onObjectChanged(object);
      }
    } catch (error) {
      console.error('InteractionManager: Error rotating object:', error);
    }
  }

  duplicateSelected() {
    if (!this.selectedObject) return;
    
    // FIXED: Only allow duplication of models, not other objects
    if (!this.isModel(this.selectedObject)) {
      console.log('InteractionManager: Selected object is not a model, skipping duplication');
      return;
    }
    
    try {
      console.log('InteractionManager: Duplicating selected model...');
      
      // FIXED: Proper model duplication with animation preservation
      const originalObject = this.selectedObject;
      
      // Clone the object (this clones geometry, materials, etc.)
      const duplicatedObject = originalObject.clone(true);
      
      // Generate new UUID to avoid conflicts
      duplicatedObject.uuid = THREE.MathUtils.generateUUID();
      
      // FIXED: Ensure materials are properly cloned to avoid sharing
      this.cloneMaterials(duplicatedObject);
      
      // Preserve important userData
      duplicatedObject.userData = {
        ...originalObject.userData,
        isModelRoot: originalObject.userData.isModelRoot,
        selectable: originalObject.userData.selectable,
        type: originalObject.userData.type,
        originalName: originalObject.userData.originalName,
        // Don't copy pinned state - new object should be unpinned
        isPinned: false
      };
      
      // FIXED: Handle animation preservation with proper track rebinding
      if (originalObject.userData.mixer && originalObject.userData.animations) {
        console.log('InteractionManager: Preserving animations for duplicated object');
        
        // Create new mixer for the duplicated object
        const newMixer = new THREE.AnimationMixer(duplicatedObject);
        duplicatedObject.userData.mixer = newMixer;
        
        // FIXED: Properly clone and rebind animation clips
        if (originalObject.userData.animations && originalObject.userData.animations.length > 0) {
          const newAnimations = [];
          const newActions = {};
          
          originalObject.userData.animations.forEach((originalClip) => {
            try {
              // FIXED: Clone the animation clip with proper track rebinding
              const clonedClip = this.cloneAnimationClip(originalClip, originalObject, duplicatedObject);
              
              if (clonedClip && clonedClip.tracks && clonedClip.tracks.length > 0) {
                newAnimations.push(clonedClip);
                
                // Create action for the cloned clip
                const action = newMixer.clipAction(clonedClip);
                newActions[clonedClip.name] = action;
                
                // Copy the current state from the original action
                const originalAction = originalObject.userData.actions[originalClip.name];
                if (originalAction) {
                  action.enabled = originalAction.enabled;
                  action.paused = originalAction.paused;
                  action.loop = originalAction.loop;
                  action.clampWhenFinished = originalAction.clampWhenFinished;
                  
                  // If the original was playing, start the new one too
                  if (originalAction.isRunning()) {
                    action.play();
                    action.time = originalAction.time; // Sync timing
                  }
                }
                
                console.log(`InteractionManager: Successfully cloned animation: ${clonedClip.name}`);
              } else {
                console.warn(`InteractionManager: Failed to clone animation: ${originalClip.name}`);
              }
            } catch (error) {
              console.error(`InteractionManager: Error cloning animation ${originalClip.name}:`, error);
            }
          });
          
          duplicatedObject.userData.animations = newAnimations;
          duplicatedObject.userData.actions = newActions;
          
          console.log(`InteractionManager: Successfully copied ${newAnimations.length}/${originalObject.userData.animations.length} animations to duplicate`);
        }
      }
      
      // Position the duplicate slightly offset from the original
      const offset = 2.0; // 2 units offset
      duplicatedObject.position.copy(originalObject.position);
      duplicatedObject.position.x += offset;
      
      // Keep the same rotation and scale
      duplicatedObject.rotation.copy(originalObject.rotation);
      duplicatedObject.scale.copy(originalObject.scale);
      
      // Add to scene
      if (this.scene) {
        this.scene.add(duplicatedObject);
      }
      
      // Select the new duplicate
      this.select(duplicatedObject);
      
      // Notify callbacks
      if (this.callbacks?.onObjectDuplicated) {
        this.callbacks.onObjectDuplicated(duplicatedObject, originalObject);
      } else if (this.callbacks?.onObjectChanged) {
        // Fallback to general change callback
        this.callbacks.onObjectChanged(duplicatedObject);
      }
      
      console.log('InteractionManager: Model duplicated successfully with preserved animations');
      
    } catch (error) {
      console.error('InteractionManager: Error duplicating model:', error);
      
      // Notify callback of failure
      if (this.callbacks?.onDuplicationFailed) {
        this.callbacks.onDuplicationFailed(this.selectedObject, error.message);
      }
    }
  }

  // FIXED: Helper method to check if object is a duplicatable model
  isModel(object) {
    if (!object || !object.userData) return false;
    
    // Check if object has model-specific properties
    const hasModelRoot = object.userData.isModelRoot === true;
    const hasModelType = object.userData.type === 'model' || object.userData.type === 'gltf';
    const hasOriginalName = object.userData.originalName && object.userData.originalName.length > 0;
    const isSelectable = object.userData.selectable === true;
    
    // Must be a selectable model root with proper identification
    return hasModelRoot && isSelectable && (hasModelType || hasOriginalName);
  }

  // Helper method to get information about what can be duplicated
  getDuplicatableObjects() {
    const duplicatableObjects = [];
    
    if (this.scene) {
      this.scene.traverse((object) => {
        if (this.isModel(object)) {
          duplicatableObjects.push({
            object: object,
            name: object.userData.originalName || object.name || 'Unnamed Model',
            type: object.userData.type || 'model'
          });
        }
      });
    }
    
    return duplicatableObjects;
  }

  // Check if currently selected object can be duplicated
  canDuplicateSelected() {
    return this.selectedObject && this.isModel(this.selectedObject);
  }

  // FIXED: Helper method to properly clone materials
  cloneMaterials(object) {
    try {
      object.traverse((child) => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            // Handle multiple materials
            child.material = child.material.map(material => material.clone());
          } else {
            // Handle single material
            child.material = child.material.clone();
          }
        }
      });
    } catch (error) {
      console.error('InteractionManager: Error cloning materials:', error);
    }
  }

  // FIXED: Helper method to properly clone animation clips with track rebinding
  cloneAnimationClip(originalClip, originalObject, duplicatedObject) {
    try {
      if (!originalClip || !originalClip.tracks || originalClip.tracks.length === 0) {
        console.warn('InteractionManager: Invalid animation clip:', originalClip);
        return null;
      }

      // Create a mapping from original object hierarchy to duplicated object hierarchy
      const objectMap = new Map();
      
      // Build the mapping by traversing both hierarchies
      const originalObjects = [];
      const duplicatedObjects = [];
      
      originalObject.traverse((child) => {
        originalObjects.push(child);
      });
      
      duplicatedObject.traverse((child) => {
        duplicatedObjects.push(child);
      });
      
      // Map corresponding objects (assuming same hierarchy structure)
      for (let i = 0; i < Math.min(originalObjects.length, duplicatedObjects.length); i++) {
        objectMap.set(originalObjects[i], duplicatedObjects[i]);
      }

      // Clone the tracks with proper object references
      const newTracks = [];
      
      for (const originalTrack of originalClip.tracks) {
        try {
          // FIXED: Rebuild track name to reference the duplicated object
          let newTrackName = originalTrack.name;
          
          // Parse the track name to find the object reference
          const trackParts = originalTrack.name.split('.');
          if (trackParts.length >= 2) {
            const objectName = trackParts[0];
            const propertyName = trackParts.slice(1).join('.');
            
            // Find the corresponding object in the duplicated hierarchy
            let targetObject = null;
            duplicatedObject.traverse((child) => {
              if (child.name === objectName || child.uuid === objectName) {
                targetObject = child;
              }
            });
            
            if (targetObject) {
              // Rebuild the track name with the new object reference
              newTrackName = `${targetObject.name}.${propertyName}`;
            }
          }
          
          // Create a new track with the same type and data
          let newTrack;
          
          if (originalTrack.constructor === THREE.VectorKeyframeTrack) {
            newTrack = new THREE.VectorKeyframeTrack(
              newTrackName,
              originalTrack.times.slice(), // Clone times array
              originalTrack.values.slice(), // Clone values array
              originalTrack.interpolation
            );
          } else if (originalTrack.constructor === THREE.QuaternionKeyframeTrack) {
            newTrack = new THREE.QuaternionKeyframeTrack(
              newTrackName,
              originalTrack.times.slice(),
              originalTrack.values.slice(),
              originalTrack.interpolation
            );
          } else if (originalTrack.constructor === THREE.NumberKeyframeTrack) {
            newTrack = new THREE.NumberKeyframeTrack(
              newTrackName,
              originalTrack.times.slice(),
              originalTrack.values.slice(),
              originalTrack.interpolation
            );
          } else if (originalTrack.constructor === THREE.ColorKeyframeTrack) {
            newTrack = new THREE.ColorKeyframeTrack(
              newTrackName,
              originalTrack.times.slice(),
              originalTrack.values.slice(),
              originalTrack.interpolation
            );
          } else if (originalTrack.constructor === THREE.BooleanKeyframeTrack) {
            newTrack = new THREE.BooleanKeyframeTrack(
              newTrackName,
              originalTrack.times.slice(),
              originalTrack.values.slice()
            );
          } else if (originalTrack.constructor === THREE.StringKeyframeTrack) {
            newTrack = new THREE.StringKeyframeTrack(
              newTrackName,
              originalTrack.times.slice(),
              originalTrack.values.slice(),
              originalTrack.interpolation
            );
          } else {
            // Fallback: try to clone using the track's constructor
            console.warn('InteractionManager: Unknown track type, attempting generic clone:', originalTrack.constructor.name);
            newTrack = new originalTrack.constructor(
              newTrackName,
              originalTrack.times.slice(),
              originalTrack.values.slice(),
              originalTrack.interpolation
            );
          }
          
          if (newTrack) {
            newTracks.push(newTrack);
          }
          
        } catch (trackError) {
          console.error('InteractionManager: Error cloning track:', originalTrack.name, trackError);
        }
      }
      
      if (newTracks.length === 0) {
        console.warn('InteractionManager: No valid tracks created for animation clip');
        return null;
      }
      
      // Create the new animation clip
      const newClip = new THREE.AnimationClip(
        originalClip.name + '_clone_' + duplicatedObject.uuid.substring(0, 8),
        originalClip.duration,
        newTracks,
        originalClip.blendMode
      );
      
      return newClip;
      
    } catch (error) {
      console.error('InteractionManager: Error cloning animation clip:', error);
      return null;
    }
  }
  
  dispose() {
    try {
      console.log('InteractionManager: Starting disposal...');
      
      this.removeEventListeners();
      this.hideDistanceDisplay();
      
      // Remove distance overlay from DOM
      if (this.distanceOverlay && this.distanceOverlay.parentElement) {
        this.distanceOverlay.parentElement.removeChild(this.distanceOverlay);
      }
      
      // Clean up Three.js objects
      if (this.dragPlaneHelper && this.scene) {
        this.scene.remove(this.dragPlaneHelper);
        if (this.dragPlaneHelper.geometry) this.dragPlaneHelper.geometry.dispose();
        if (this.dragPlaneHelper.material) this.dragPlaneHelper.material.dispose();
      }
      
      if (this.distanceLines && this.scene) {
        this.clearDistanceLines();
        this.scene.remove(this.distanceLines);
      }
      
      // Dispose materials
      if (this.xAxisMaterial) this.xAxisMaterial.dispose();
      if (this.zAxisMaterial) this.zAxisMaterial.dispose();
      if (this.totalDistanceMaterial) this.totalDistanceMaterial.dispose();
      if (this.outlineMaterial) this.outlineMaterial.dispose();
      
      // Dispose textures
      if (this.moveIconTexture) this.moveIconTexture.dispose();
      if (this.rotateIconTexture) this.rotateIconTexture.dispose();
      
      // Clear references
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.orbitControls = null;
      this.selectedObject = null;
      this.callbacks = null;
      this.pinnedObjects.clear();
      
      console.log('InteractionManager: Disposal complete');
    } catch (error) {
      console.error('InteractionManager: Error during disposal:', error);
    }
  }
}