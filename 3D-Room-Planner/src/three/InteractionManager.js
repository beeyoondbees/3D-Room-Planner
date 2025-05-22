// Direct model manipulation (click and drag)

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
    
    // Visual helpers
    this.createHelpers();
    
    // Bind methods to instance
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    
    // Add event listeners
    this.addEventListeners();
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
    window.addEventListener('keydown', this.onKeyDown);
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
}

// Remove highlight from object
removeHighlight(object) {
  // Remove the bounding box
  this.removeBoundingBox(object);
}

// Create an orange wireframe bounding box around the object
createBoundingBox(object) {
  // Remove any existing bounding box
  this.removeBoundingBox(object);
  
  // Create a BoxHelper (not Box3Helper)
  // BoxHelper directly attaches to the object and will follow it automatically
  const boxHelper = new THREE.BoxHelper(object, 0xe4002b); // Red color
  // boxHelper.material.linewidth = 2; // Note: This may not work on all platforms due to WebGL limitations
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

// Update bounding boxes - called from animation loop
updateBoundingBoxes() {
  // Update the bounding box if there's a selected object
  if (this.selectedObject && this.selectedObject.userData.boundingBoxHelper) {
    // BoxHelper has an update method to recalculate the box
    this.selectedObject.userData.boundingBoxHelper.update();
  }
}
  
  // Set interaction mode (translate or rotate)
  setInteractionMode(mode) {
    this.interactionMode = mode;
    
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
  
// Update pin visual with a small, subtle pin icon
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
    
    // Position the pin above the object (closer to the surface)
    pinGroup.position.y = height / 2 + 0.1;
    
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
    
    // Remove helpers from scene
    if (this.dragPlaneHelper) {
      this.scene.remove(this.dragPlaneHelper);
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


// Function to create a custom pin shape
function createPinShape() {
  const group = new THREE.Group();
  
  // Pin head (a flattened sphere)
  const headGeometry = new THREE.SphereGeometry(0.12, 16, 8);
  const headMaterial = new THREE.MeshBasicMaterial({ color: 0xff3333 });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.scale.y = 0.6; // Flatten it
  head.position.y = 0.15;
  group.add(head);
  
  // Pin shaft (cylinder)
  const shaftGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8);
  const shaftMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
  const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
  shaft.position.y = -0.05;
  group.add(shaft);
  
  // Pin point (cone)
  const pointGeometry = new THREE.ConeGeometry(0.025, 0.05, 8);
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
  const point = new THREE.Mesh(pointGeometry, pointMaterial);
  point.position.y = -0.2;
  point.rotation.x = Math.PI; // Point downward
  group.add(point);
  
  // Add subtle shadow under the pin head
  const shadowGeometry = new THREE.CircleGeometry(0.12, 16);
  const shadowMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x000000, 
    transparent: true, 
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.position.y = 0.11;
  shadow.rotation.x = Math.PI / 2; // Horizontal
  group.add(shadow);
  
  return group;
}