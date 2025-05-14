// src/three/InteractionManager.js
// Manages interactions with models (select, move, pin, rotate)

import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';

export class InteractionManager {
  constructor(scene, camera, renderer, orbitControls) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.orbitControls = orbitControls;
    
    // Track selected object
    this.selectedObject = null;
    
    // Track pinned objects
    this.pinnedObjects = new Set();
    
    // Create raycaster for object selection
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    
    // Create transform controls for moving/rotating objects
    this.transformControls = new TransformControls(camera, renderer.domElement);
    this.transformControls.addEventListener('dragging-changed', (event) => {
      // Disable orbit controls when using transform controls to prevent conflicts
      this.orbitControls.enabled = !event.value;
    });
    
    // When object is transformed, update its state
    this.transformControls.addEventListener('objectChange', () => {
      if (this.selectedObject && this.onObjectChanged) {
        this.onObjectChanged(this.selectedObject);
      }
    });
    
    scene.add(this.transformControls);
    
    // Current interaction mode
    this.mode = 'translate'; // 'translate', 'rotate', 'scale'
    
    // Bind event handlers
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    
    // Add event listeners
    renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('keydown', this.onKeyDown);
  }
  
  // Handles pointer down events for object selection
  onPointerDown(event) {
    // Get mouse position in normalized device coordinates (-1 to +1)
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Check if camera exists - important to prevent errors
    if (!this.camera) {
      console.warn("Camera is not initialized");
      return;
    }
    
    // Cast a ray from the camera through the mouse position
    this.raycaster.setFromCamera(this.pointer, this.camera);
    
    // Find all intersected objects that are selectable
    const selectableObjects = this.getSelectableObjects();
    const intersects = this.raycaster.intersectObjects(selectableObjects, true);
    
    if (intersects.length > 0) {
      // Find the first intersected object that is selectable
      let selectedObject = intersects[0].object;
      
      // Find the root object (usually the model's root node)
      while (selectedObject.parent && !selectedObject.userData.isModelRoot) {
        selectedObject = selectedObject.parent;
      }
      
      // Select the object
      this.select(selectedObject);
    } else {
      // Clicked on empty space - deselect
      this.deselect();
    }
  }
  
  // Handle keyboard shortcuts
  onKeyDown(event) {
    if (!this.selectedObject) return;
    
    switch (event.key) {
      case 't': // Translate mode
        this.setMode('translate');
        break;
      case 'r': // Rotate mode
        this.setMode('rotate');
        break;
      case 's': // Scale mode
        this.setMode('scale');
        break;
      case 'p': // Toggle pin
        this.togglePin(this.selectedObject);
        break;
      case 'Delete': // Delete object
      case 'Backspace':
        this.deleteSelected();
        break;
    }
  }
  
  // Get all objects that can be selected
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
    
    // Deselect previous object
    this.deselect();
    
    // Set new selected object
    this.selectedObject = object;
    
    // Highlight selected object
    this.addHighlight(object);
    
    // Attach transform controls if object is not pinned
    if (!this.isPinned(object)) {
      this.transformControls.attach(object);
      this.transformControls.setMode(this.mode);
    }
    
    // Dispatch selection event
    if (this.onObjectSelected) {
      this.onObjectSelected(object);
    }
  }
  
  // Deselect current object
  deselect() {
    if (!this.selectedObject) return;
    
    // Remove highlight
    this.removeHighlight(this.selectedObject);
    
    // Detach transform controls
    this.transformControls.detach();
    
    // Reset selected object
    const previouslySelected = this.selectedObject;
    this.selectedObject = null;
    
    // Dispatch deselection event
    if (this.onObjectDeselected) {
      this.onObjectDeselected(previouslySelected);
    }
  }
  
  // Add highlight effect to selected object
  addHighlight(object) {
    // Store original materials
    object.userData.originalMaterials = [];
    
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        // Store original material
        object.userData.originalMaterials.push({
          mesh: child,
          material: child.material.clone()
        });
        
        // Apply highlight material
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
  
  // Remove highlight effect
  removeHighlight(object) {
    if (!object.userData.originalMaterials) return;
    
    // Restore original materials
    object.userData.originalMaterials.forEach(({ mesh, material }) => {
      mesh.material = material;
    });
    
    delete object.userData.originalMaterials;
  }
  
  // Set interaction mode (translate, rotate, scale)
  setMode(mode) {
    this.mode = mode;
    
    if (this.selectedObject && !this.isPinned(this.selectedObject)) {
      this.transformControls.setMode(mode);
    }
    
    // Dispatch mode change event
    if (this.onModeChanged) {
      this.onModeChanged(mode);
    }
  }
  
  // Check if an object is pinned
  isPinned(object) {
    return this.pinnedObjects.has(object.uuid);
  }
  
  // Pin an object (prevent movement)
  pinObject(object) {
    if (!object) return;
    
    this.pinnedObjects.add(object.uuid);
    
    // If this is the selected object, detach transform controls
    if (this.selectedObject === object) {
      this.transformControls.detach();
    }
    
    // Add visual indicator for pinned state
    object.userData.isPinned = true;
    this.updatePinVisual(object, true);
    
    // Dispatch pin event
    if (this.onObjectPinned) {
      this.onObjectPinned(object);
    }
  }
  
  // Unpin an object
  unpinObject(object) {
    if (!object) return;
    
    this.pinnedObjects.delete(object.uuid);
    
    // If this is the selected object, attach transform controls
    if (this.selectedObject === object) {
      this.transformControls.attach(object);
      this.transformControls.setMode(this.mode);
    }
    
    // Remove visual indicator
    object.userData.isPinned = false;
    this.updatePinVisual(object, false);
    
    // Dispatch unpin event
    if (this.onObjectUnpinned) {
      this.onObjectUnpinned(object);
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
  
  // Add visual indicator for pinned state
  updatePinVisual(object, isPinned) {
    // Remove any existing pin indicator
    const existingPin = object.children.find(child => child.userData.isPinIndicator);
    if (existingPin) {
      object.remove(existingPin);
    }
    
    if (isPinned) {
      // Create a pin indicator
      const geometry = new THREE.SphereGeometry(0.2, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const pinIndicator = new THREE.Mesh(geometry, material);
      
      // Position it above the object
      const box = new THREE.Box3().setFromObject(object);
      const height = box.max.y - box.min.y;
      pinIndicator.position.y = height / 2 + 0.3;
      
      // Mark it as a pin indicator
      pinIndicator.userData.isPinIndicator = true;
      
      // Add to object
      object.add(pinIndicator);
    }
  }
  
  // Delete the selected object
  deleteSelected() {
    if (!this.selectedObject) return;
    
    const objectToDelete = this.selectedObject;
    
    // Deselect first
    this.deselect();
    
    // Remove from pinned objects if pinned
    this.pinnedObjects.delete(objectToDelete.uuid);
    
    // Remove from scene
    this.scene.remove(objectToDelete);
    
    // Dispatch delete event
    if (this.onObjectDeleted) {
      this.onObjectDeleted(objectToDelete);
    }
  }
  
  // Rotate selected object by a specific angle
  rotateSelected(angleInDegrees) {
    if (!this.selectedObject || this.isPinned(this.selectedObject)) return;
    
    // Convert to radians
    const angleInRadians = THREE.MathUtils.degToRad(angleInDegrees);
    
    // Rotate around Y axis
    this.selectedObject.rotation.y += angleInRadians;
    
    // Dispatch change event
    if (this.onObjectChanged) {
      this.onObjectChanged(this.selectedObject);
    }
  }
  
  // Set up callback functions
  setCallbacks(callbacks) {
    const {
      onObjectSelected,
      onObjectDeselected,
      onObjectChanged,
      onObjectPinned,
      onObjectUnpinned,
      onObjectDeleted,
      onModeChanged
    } = callbacks;
    
    this.onObjectSelected = onObjectSelected;
    this.onObjectDeselected = onObjectDeselected;
    this.onObjectChanged = onObjectChanged;
    this.onObjectPinned = onObjectPinned;
    this.onObjectUnpinned = onObjectUnpinned;
    this.onObjectDeleted = onObjectDeleted;
    this.onModeChanged = onModeChanged;
  }
  
  // Clean up on destroy
  dispose() {
    this.transformControls.dispose();
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}