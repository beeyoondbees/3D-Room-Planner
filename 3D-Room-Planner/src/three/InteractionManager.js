import * as THREE from 'three';

export class InteractionManager {
  constructor(scene, camera, renderer, orbitControls) {
    // Store references
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.orbitControls = orbitControls;
    
    // Properties
    this.selectedObject = null;
    this.pinnedObjects = new Set();
    this.isDragging = false;
    this.isRotating = false;
    this.floorLevel = 0; // Default floor level
    
    // Interaction state
    this.interactionMode = 'translate'; // 'translate', 'rotate'
    this.dragStartPosition = new THREE.Vector3();
    this.objectStartPosition = new THREE.Vector3();
    this.objectStartRotation = new THREE.Euler();
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();
    
    // Mouse/pointer state
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.startPointer = new THREE.Vector2();
    
    // Distance measurement properties
    this.distanceDisplay = null;
    this.distanceLines = null;
    this.showDistanceIndicators = true;
    
    // Mode icon properties
    this.modeIcon = null;
    this.baseIconScale = 0.5; // Base scale for the icon
    this.zoomFactor = 0.05; // Controls how much the icon scales with distance
    
    // Texture loader for SVG icons
    this.textureLoader = new THREE.TextureLoader();
    
    // Load SVG textures (replace with your SVG file paths)
    this.moveIconTexture = null;
    this.rotateIconTexture = null;
    this.loadIcons();
    
    // Visual helpers
    this.createHelpers();
    this.createDistanceDisplay();
    
    // Bind methods to instance
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    
    // Add event listeners
    this.addEventListeners();
  }

  // Load SVG icons as textures
  loadIcons() {
    // Replace these paths with the actual paths to your SVG files
    const moveIconPath = 'assets/icons/move-icon.svg'; // Path to your drag (translate) SVG
    const rotateIconPath = '/assets/icons/rotate-icon.svg'; // Path to your rotate SVG

    // Load move icon texture
    this.textureLoader.load(
      moveIconPath,
      (texture) => {
        this.moveIconTexture = texture;
        console.log('Move icon texture loaded successfully');
      },
      undefined,
      (error) => {
        console.error('Error loading move icon texture:', error);
      }
    );

    // Load rotate icon texture
    this.textureLoader.load(
      rotateIconPath,
      (texture) => {
        this.rotateIconTexture = texture;
        console.log('Rotate icon texture loaded successfully');
      },
      undefined,
      (error) => {
        console.error('Error loading rotate icon texture:', error);
      }
    );
  }

  // Create distance measurement display elements
  createDistanceDisplay() {
    // Create HTML overlay for distance text
    this.createDistanceOverlay();
    
    // Create 3D line helpers for visual distance indication
    this.createDistanceLines();
  }

  createDistanceOverlay() {
    // Create overlay div for distance display
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
    
    // Find the canvas container and add overlay
    const container = this.renderer.domElement.parentElement;
    if (container) {
      // Make sure container has relative positioning
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(this.distanceOverlay);
    }
  }

  createDistanceLines() {
    // Create group for distance visualization lines
    this.distanceLines = new THREE.Group();
    this.distanceLines.userData.isDistanceIndicator = true;
    this.scene.add(this.distanceLines);
    
    // Create materials for different axes
    this.xAxisMaterial = new THREE.LineBasicMaterial({ 
      color: 0xff0000, 
      transparent: true, 
      opacity: 0.7,
      linewidth: 2 
    });
    this.zAxisMaterial = new THREE.LineBasicMaterial({ 
      color: 0x0000ff, 
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

    // // Update HTML overlay
    // if (this.distanceOverlay) {
    //   this.distanceOverlay.style.display = 'block';
    //   this.distanceOverlay.innerHTML = `
    //     <div style="color: #ff6b6b; margin-bottom: 4px; font-size: 16px;">
    //       <strong>X:</strong> ${deltaX.toFixed(3)}m
    //     </div>
    //     <div style="color: #4dabf7; margin-bottom: 4px; font-size: 16px;">
    //       <strong>Z:</strong> ${deltaZ.toFixed(3)}m  
    //     </div>
    //     <div style="color: #51cf66; font-weight: bold; font-size: 18px;">
    //       <strong>Total:</strong> ${totalDistance.toFixed(3)}m
    //     </div>
    //   `;
    // }

    // Update 3D visual indicators
    this.updateDistanceLines(deltaX, deltaZ);
  }

  updateDistanceLines(deltaX, deltaZ) {
    // Clear existing lines
    this.clearDistanceLines();

    const startPos = this.objectStartPosition;
    const currentPos = this.selectedObject.position;

    // X-axis line (red)
    if (Math.abs(deltaX) > 0.01) {
      const xLineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(startPos.x, startPos.y + 0.1, startPos.z),
        new THREE.Vector3(currentPos.x, startPos.y + 0.1, startPos.z)
      ]);
      const xLine = new THREE.Line(xLineGeometry, this.xAxisMaterial);
      this.distanceLines.add(xLine);

      // Add X-axis distance label
      this.addDistanceLabel(
        new THREE.Vector3(
          (startPos.x + currentPos.x) / 2,
          startPos.y + 0.2,
          startPos.z
        ),
        `${Math.abs(deltaX).toFixed(2)}m`,
        0xff0000
      );
    }

    // Z-axis line (blue)
    if (Math.abs(deltaZ) > 0.01) {
      const zLineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(currentPos.x, startPos.y + 0.1, startPos.z),
        new THREE.Vector3(currentPos.x, startPos.y + 0.1, currentPos.z)
      ]);
      const zLine = new THREE.Line(zLineGeometry, this.zAxisMaterial);
      this.distanceLines.add(zLine);

      // Add Z-axis distance label
      this.addDistanceLabel(
        new THREE.Vector3(
          currentPos.x,
          startPos.y + 0.2,
          (startPos.z + currentPos.z) / 2
        ),
        `${Math.abs(deltaZ).toFixed(2)}m`,
        0x0000ff
      );
    }

    // Total distance line (green, dashed)
    const totalDistance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    if (totalDistance > 0.01) {
      const totalLineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(startPos.x, startPos.y + 0.05, startPos.z),
        new THREE.Vector3(currentPos.x, startPos.y + 0.05, currentPos.z)
      ]);
      
      // Create dashed line material for total distance
      const dashedMaterial = new THREE.LineDashedMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.6,
        dashSize: 0.1,
        gapSize: 0.05
      });
      
      const totalLine = new THREE.Line(totalLineGeometry, dashedMaterial);
      totalLine.computeLineDistances(); // Required for dashed lines
      this.distanceLines.add(totalLine);
    }

    // Add markers at start and end positions
    this.addPositionMarker(startPos, 0x888888, 'start');
    this.addPositionMarker(currentPos, 0x00ff00, 'current');
  }

  addDistanceLabel(position, text, color) {
    // Create a simple text sprite (or you could use CSS2DRenderer for better text)
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 32;
    
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.font = 'Bold 16px Arial';
    context.textAlign = 'center';
    context.fillText(text, 64, 20);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    sprite.position.copy(position);
    sprite.scale.set(0.5, 0.125, 1);
    
    this.distanceLines.add(sprite);
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
    // Remove all children from distance lines group
    while (this.distanceLines.children.length > 0) {
      const child = this.distanceLines.children[0];
      this.distanceLines.remove(child);
      
      // Dispose of geometries and materials
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    }
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

  // When initializing
  createHelpers() {
    // Selection outline material
    this.outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x00a2ff,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.3
    });
    
    // Helper for showing dragging plane (invisible during normal operation)
    this.dragPlaneHelper = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({
        color: 0xffff00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0, // Invisible by default
        visible: false
      })
    );
    this.scene.add(this.dragPlaneHelper);
    
    // Ground plane for ensuring objects don't go below floor
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.floorLevel);
  }
  
  addEventListeners() {
    // Add DOM event listeners
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
  }
  
  // Clean up event listeners
  removeEventListeners() {
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
  }
  
  setCallbacks(callbacks) {
    this.callbacks = callbacks;
  }
  
  setFloorLevel(level) {
    this.floorLevel = level;
    this.groundPlane.constant = -this.floorLevel;
  }
  
  // Handle pointer down event
  onPointerDown(event) {
    // Skip if not left click or if modifier keys are pressed
    if (event.button !== 0 || event.ctrlKey || event.metaKey) return;
    
    // Calculate normalized device coordinates
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Store starting position
    this.startPointer.copy(this.pointer);
    
    // Set up raycasting
    this.raycaster.setFromCamera(this.pointer, this.camera);
    
    // Check for intersections with selectable objects
    const selectableObjects = this.getSelectableObjects();
    const intersects = this.raycaster.intersectObjects(selectableObjects, true);
    
    if (intersects.length > 0) {
      // Find the root model
      let selected = intersects[0].object;
      while (selected.parent && !selected.userData.isModelRoot) {
        selected = selected.parent;
      }
      
      // If clicked on same object, start dragging
      if (this.selectedObject === selected) {
        // Only allow dragging if not pinned
        if (!this.isPinned(selected)) {
          this.startDrag(selected, intersects[0].point);
        }
      } else {
        // Otherwise select new object
        this.select(selected);
      }
      
      // Disable orbit controls during interaction
      this.orbitControls.enabled = false;
    } else {
      // Clicked on empty space - deselect
      this.deselect();

      // Ensure orbit controls are enabled for empty space clicks
      this.orbitControls.enabled = true;
    }
  }
  
  // Start dragging an object
  startDrag(object, hitPoint) {
    if (!object || this.isPinned(object)) return;
    
    // Set up dragging state
    this.isDragging = true;
    this.isRotating = this.interactionMode === 'rotate';
    
    // Store starting positions
    this.dragStartPosition.copy(hitPoint);
    this.objectStartPosition.copy(object.position);
    this.objectStartRotation.copy(object.rotation);
    
    // For translation: Set up drag plane based on camera view
    if (!this.isRotating) {
      // Always use a horizontal (floor) plane for dragging - exactly at y=0
      const planeNormal = new THREE.Vector3(0, 1, 0); // Y-up plane (floor)
      const floorPoint = new THREE.Vector3(0, 0, 0); // Point on the floor
      
      // Set up the drag plane
      this.dragPlane.setFromNormalAndCoplanarPoint(planeNormal, floorPoint);
      
      // Calculate offset from hit point to object position (XZ plane only)
      this.dragOffset = new THREE.Vector3(
        hitPoint.x - object.position.x,
        0, // No vertical offset
        hitPoint.z - object.position.z
      );
      
      // For debugging - visualize the drag plane
      this.dragPlaneHelper.rotation.x = Math.PI / 2; // Make it horizontal
      this.dragPlaneHelper.position.y = 0; // Position at floor level
    }

    // Show initial distance display
    this.updateDistanceDisplay();
  }
  
  // Handle pointer move
  onPointerMove(event) {
    // Update pointer position
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Handle dragging
    if (this.isDragging && this.selectedObject && !this.isPinned(this.selectedObject)) {
      if (this.isRotating) {
        this.handleRotation();
      } else {
        this.handleTranslation();
      }
      
      // Update distance display
      this.updateDistanceDisplay();
      
      // Trigger change callback
      if (this.callbacks?.onObjectChanged) {
        this.callbacks.onObjectChanged(this.selectedObject);
      }
    }
  }
  
  // Handle translation (position) dragging
  handleTranslation() {
    // Create ray from camera through mouse
    this.raycaster.setFromCamera(this.pointer, this.camera);
    
    // Find intersection with the floor plane
    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
      // Get the current Y position (height) - we want to maintain this
      const currentY = this.selectedObject.position.y;
      
      // Calculate new position with offset (only in XZ plane)
      const newPosition = new THREE.Vector3(
        intersection.x - this.dragOffset.x,
        currentY, // Keep current height
        intersection.z - this.dragOffset.z
      );
      
      // Update object position (sliding along the floor)
      this.selectedObject.position.copy(newPosition);
    }
  }
  
  // Handle rotation dragging
  handleRotation() {
    // Calculate rotation based on X movement
    const deltaX = this.pointer.x - this.startPointer.x;
    
    // Apply a rotation sensitivity factor
    const rotationSensitivity = 5.0;
    const rotationAngle = deltaX * rotationSensitivity;
    
    // Apply rotation around Y axis (up/down)
    this.selectedObject.rotation.y = this.objectStartRotation.y + rotationAngle;
  }
  
  // End dragging on pointer up
  onPointerUp() {
    if (this.isDragging && this.selectedObject) {
      // End dragging state
      this.isDragging = false;
      this.isRotating = false;
      
      // Hide distance display
      this.hideDistanceDisplay();
      
      // Re-enable orbit controls
      this.orbitControls.enabled = true;
    }
  }
  
  // Handle keyboard shortcuts
  onKeyDown(event) {
    // Skip if no object selected
    if (!this.selectedObject) return;
    
    switch (event.key.toLowerCase()) {
      case 't': // Translation mode
        this.setInteractionMode('translate');
        break;
      case 'r': // Rotation mode
        this.setInteractionMode('rotate');
        break;
      case 'p': // Toggle pin
        this.togglePin(this.selectedObject);
        break;
      case 'delete': // Delete
      case 'backspace':
        this.deleteSelected();
        break;
      case 'escape': // Deselect
        this.deselect();
        break;
      case 'd': // Toggle distance indicators
        this.toggleDistanceIndicators();
        break;
      default:
        // Do nothing or optionally handle unexpected keys
        break;
    }
  }    
  
  // Get all selectable objects
  getSelectableObjects() {
    const selectableObjects = [];
    
    this.scene.traverse((object) => {
      if (object.userData && object.userData.selectable) {
        selectableObjects.push(object);
      }
    });
    
    return selectableObjects;
  }
  
  // Select an object
  select(object) {
    if (this.selectedObject === object) return;
    
    // Deselect previous
    this.deselect();
    
    // Set as selected
    this.selectedObject = object;
    
    // Add highlight
    this.addHighlight(object);
    
    // Trigger callback
    if (this.callbacks?.onObjectSelected) {
      this.callbacks.onObjectSelected(object);
    }
  }
  
  // Deselect current object
  deselect() {
    if (!this.selectedObject) return;
    
    // Hide distance display
    this.hideDistanceDisplay();
    
    // Remove highlight
    this.removeHighlight(this.selectedObject);
    
    // Store reference before clearing
    const previouslySelected = this.selectedObject;
    this.selectedObject = null;
    
    // End any dragging
    this.isDragging = false;
    
    // Trigger callback
    if (this.callbacks?.onObjectDeselected) {
      this.callbacks.onObjectDeselected(previouslySelected);
    }
  }
  
  // Add visual highlight to selected object
  addHighlight(object) {
    // Create orange wireframe bounding box
    this.createBoundingBox(object);
    // Create mode icon
    this.createModeIcon(object);
  }

  // Remove highlight from object
  removeHighlight(object) {
    // Remove the bounding box
    this.removeBoundingBox(object);
    // Remove mode icon
    this.removeModeIcon(object);
  }

  // Create an orange wireframe bounding box around the object
  createBoundingBox(object) {
    // Remove any existing bounding box
    this.removeBoundingBox(object);
    
    // Create a BoxHelper (not Box3Helper)
    // BoxHelper directly attaches to the object and will follow it automatically
    const boxHelper = new THREE.BoxHelper(object, 0xe4002b); // Red color
    boxHelper.material = new THREE.LineDashedMaterial({
      color: 0xe4002b, // Line color
      linewidth: 2, // Line thickness
      dashSize: 0.1, // Very short dash for dot effect
      gapSize: 0.1 // Equal gap for dot spacing
    });
    boxHelper.material.transparent = true;
    boxHelper.material.opacity = 0.5;
    boxHelper.userData.isBoundingBox = true;
    
    // Store the box helper for later reference
    object.userData.boundingBoxHelper = boxHelper;
    
    // Add the box helper to the scene
    this.scene.add(boxHelper);
  }

  // Remove bounding box
  removeBoundingBox(object) {
    if (object.userData.boundingBoxHelper) {
      // Remove from scene
      this.scene.remove(object.userData.boundingBoxHelper);
      
      // Clean up references
      delete object.userData.boundingBoxHelper;
    }
  }

  // Update bounding boxes and mode icons - called from animation loop
  updateBoundingBoxes() {
    // Update the bounding box if there's a selected object
    if (this.selectedObject && this.selectedObject.userData.boundingBoxHelper) {
      // BoxHelper has an update method to recalculate the box
      this.selectedObject.userData.boundingBoxHelper.update();
    }
    // Update the mode icon scale based on camera distance
    this.updateModeIconScale();
  }

  // Update the scale of the mode icon based on camera distance
  updateModeIconScale() {
    if (!this.selectedObject || !this.selectedObject.userData.modeIcon || !this.camera) return;

    const iconSprite = this.selectedObject.userData.modeIcon;
    const distance = this.camera.position.distanceTo(this.selectedObject.position);

    // Calculate new scale based on distance
    const scale = this.baseIconScale * distance * this.zoomFactor;

    // Apply the new scale (maintaining aspect ratio)
    iconSprite.scale.set(scale, scale, 1);
  }
  
  // Set interaction mode (translate or rotate)
  setInteractionMode(mode) {
    this.interactionMode = mode;
    
    // Update mode icon if object is selected
    this.updateModeIcon();
    
    // Trigger callback
    if (this.callbacks?.onModeChanged) {
      this.callbacks.onModeChanged(mode);
    }
  }
  
  // Get the height of an object (for floor constraints)
  getObjectHeight(object) {
    const box = new THREE.Box3().setFromObject(object);
    return box.max.y - box.min.y;
  }
  
  // Check if object is pinned
  isPinned(object) {
    return this.pinnedObjects.has(object.uuid);
  }
  
  // Pin an object
  pinObject(object) {
    if (!object) return;
    
    // Add to pinned set
    this.pinnedObjects.add(object.uuid);
    
    // Update object state
    object.userData.isPinned = true;
    
    // Add visual indicator
    this.updatePinVisual(object, true);
    
    // Trigger callback
    if (this.callbacks?.onObjectPinned) {
      this.callbacks.onObjectPinned(object);
    }
  }
  
  // Unpin an object
  unpinObject(object) {
    if (!object) return;
    
    // Remove from pinned set
    this.pinnedObjects.delete(object.uuid);
    
    // Update object state
    object.userData.isPinned = false;
    
    // Remove visual indicator
    this.updatePinVisual(object, false);
    
    // Trigger callback
    if (this.callbacks?.onObjectUnpinned) {
      this.callbacks.onObjectUnpinned(object);
    }
  }
  
  // Toggle pin state
  togglePin(object) {
    if (!object) return;
    
    if (this.isPinned(object)) {
      this.unpinObject(object);
    } else {
      this.pinObject(object);
    }
  }
  
  // Create mode icon based on current interaction mode
  createModeIcon(object) {
    this.removeModeIcon(object);
    
    if (!object) return;
    
    // Calculate position at the top of the bounding box
    const box = new THREE.Box3().setFromObject(object);
    const height = box.max.y - box.min.y;
    const iconY = height / 2; // Position exactly on top of the bounding box
    
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
      // Initial scale will be updated in updateModeIconScale
    }
  }

  // Create move icon using SVG texture
  createMoveIcon() {
    // Check if the texture is loaded
    if (!this.moveIconTexture) {
      console.warn('Move icon texture not loaded yet, falling back to default');
      return this.createFallbackSprite();
    }

    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: this.moveIconTexture, 
      transparent: true,
      depthTest: false // Ensure icon renders on top of bounding box lines
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    // Initial scale (will be adjusted dynamically)
    sprite.scale.set(this.baseIconScale, this.baseIconScale, 1);

    return sprite;
  }

  // Create rotate icon using SVG texture
  createRotateIcon() {
    // Check if the texture is loaded
    if (!this.rotateIconTexture) {
      console.warn('Rotate icon texture not loaded yet, falling back to default');
      return this.createFallbackSprite();
    }

    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: this.rotateIconTexture, 
      transparent: true,
      depthTest: false // Ensure icon renders on top of bounding box lines
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    // Initial scale (will be adjusted dynamically)
    sprite.scale.set(this.baseIconScale, this.baseIconScale, 1);

    return sprite;
  }

  // Fallback sprite in case SVG fails to load
  createFallbackSprite() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 64;

    // Draw a simple placeholder (e.g., a red X)
    context.strokeStyle = '#ff0000';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(10, 10);
    context.lineTo(54, 54);
    context.moveTo(54, 10);
    context.lineTo(10, 54);
    context.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(this.baseIconScale, this.baseIconScale, 1);

    return sprite;
  }

  // Remove mode icon from object
  removeModeIcon(object) {
    if (object && object.userData.modeIcon) {
      object.remove(object.userData.modeIcon);
      if (object.userData.modeIcon.material.map) {
        // Note: Don't dispose the shared texture here, dispose it in the class dispose method
      }
      object.userData.modeIcon.material.dispose();
      delete object.userData.modeIcon;
    }
  }

  // Update mode icon when interaction mode changes
  updateModeIcon() {
    if (this.selectedObject) {
      this.createModeIcon(this.selectedObject);
    }
  }

  updatePinVisual(object, isPinned) {
    // Remove existing pin indicator
    const existingPin = object.children.find(child => child.userData.isPinIndicator);
    if (existingPin) {
      object.remove(existingPin);
    }
    
    if (isPinned) {
      // Create a pin group
      const pinGroup = new THREE.Group();
      pinGroup.userData.isPinIndicator = true;
      
      // Pin head (small red sphere)
      const headGeometry = new THREE.SphereGeometry(0.05, 12, 8);
      const headMaterial = new THREE.MeshBasicMaterial({ color: 0xff3333 });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 0.08;
      pinGroup.add(head);
      
      // Pin shaft (thin cylinder)
      const shaftGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.15, 6);
      const shaftMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
      const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
      shaft.position.y = 0;
      pinGroup.add(shaft);
      
      // Calculate position above object
      const box = new THREE.Box3().setFromObject(object);
      const height = box.max.y - box.min.y;
      
      // Position the pin above the object (above the icon)
      pinGroup.position.y = height / 2 + 0.2; // Adjusted to be above the icon
      
      // Rotate slightly to make it more visible from common viewing angles
      pinGroup.rotation.x = -Math.PI / 8; // Slight tilt forward
      
      // Add to object
      object.add(pinGroup);
    }
  }
  
  // Delete selected object
  deleteSelected() {
    if (!this.selectedObject) return;
    
    const objectToDelete = this.selectedObject;
    
    // Deselect first
    this.deselect();
    
    // Remove from pinned objects if needed
    this.pinnedObjects.delete(objectToDelete.uuid);
    
    // Remove from scene
    this.scene.remove(objectToDelete);
    
    // Trigger callback
    if (this.callbacks?.onObjectDeleted) {
      this.callbacks.onObjectDeleted(objectToDelete);
    }
  }
  
  // Rotate object by specific angle (for UI buttons)
  rotateObject(object, angleDegrees) {
    if (!object || this.isPinned(object)) return;
    
    // Convert to radians
    const angleRadians = THREE.MathUtils.degToRad(angleDegrees);
    
    // Rotate around Y axis
    object.rotation.y += angleRadians;
    
    // Trigger callback
    if (this.callbacks?.onObjectChanged) {
      this.callbacks.onObjectChanged(object);
    }
  }
  
  // Dispose resources
  dispose() {
    // Remove event listeners
    this.removeEventListeners();
    
    // Remove distance display
    this.hideDistanceDisplay();
    if (this.distanceOverlay && this.distanceOverlay.parentElement) {
      this.distanceOverlay.parentElement.removeChild(this.distanceOverlay);
    }
    
    // Remove helpers from scene
    if (this.dragPlaneHelper) {
      this.scene.remove(this.dragPlaneHelper);
    }
    if (this.distanceLines) {
      this.clearDistanceLines();
      this.scene.remove(this.distanceLines);
    }
    
    // Dispose of textures
    if (this.moveIconTexture) {
      this.moveIconTexture.dispose();
    }
    if (this.rotateIconTexture) {
      this.rotateIconTexture.dispose();
    }
    
    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.orbitControls = null;
    this.selectedObject = null;
    this.callbacks = null;
    this.pinnedObjects.clear();
  }
}