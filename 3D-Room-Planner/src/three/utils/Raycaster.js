// src/three/utils/Raycaster.js
// Utility class for raycasting and object selection

import * as THREE from 'three';

export class RaycasterHelper {
  constructor(camera, domElement, scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    
    // Create raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Selected object tracking
    this.selectedObject = null;
    this.hoveredObject = null;
    
    // Callbacks
    this.onObjectSelected = null;
    this.onObjectDeselected = null;
    this.onObjectHovered = null;
    this.onObjectUnhovered = null;
    
    // Event bindings
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    
    // Initialize
    this.bindEvents();
    
    // Internal tracking
    this._isDragging = false;
    this._mouseDownPosition = new THREE.Vector2();
    this._clickThreshold = 5; // Pixels of movement to consider a drag vs a click
  }
  
  bindEvents() {
    // Add event listeners
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
  }
  
  unbindEvents() {
    // Remove event listeners
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
  }
  
  onPointerMove(event) {
    // Update mouse position
    this.updateMousePosition(event);
    
    // Check if dragging
    if (event.buttons === 1) {
      this._isDragging = true;
    }
    
    // Only check for hover if not dragging
    if (!this._isDragging) {
      this.checkHover();
    }
  }
  
  onPointerDown(event) {
    // Save mouse down position for drag detection
    this._mouseDownPosition.x = event.clientX;
    this._mouseDownPosition.y = event.clientY;
    this._isDragging = false;
    
    // Update mouse position
    this.updateMousePosition(event);
  }
  
  onPointerUp(event) {
    // Check if this was a click or a drag
    const dx = Math.abs(event.clientX - this._mouseDownPosition.x);
    const dy = Math.abs(event.clientY - this._mouseDownPosition.y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If it's a click (not a drag), perform selection
    if (distance < this._clickThreshold) {
      this.updateMousePosition(event);
      this.checkSelection();
    }
    
    this._isDragging = false;
  }
  
  updateMousePosition(event) {
    // Calculate normalized device coordinates (-1 to +1)
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
  
  checkSelection() {
    // Set up raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Find objects that intersect with the ray
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    // Filter out non-selectable objects
    const selectableIntersects = intersects.filter(intersect => {
      // Find the root object (the model root)
      let rootObject = intersect.object;
      while (rootObject.parent && rootObject.parent !== this.scene) {
        rootObject = rootObject.parent;
      }
      
      // Check if object is selectable
      return rootObject.userData && 
             rootObject.userData.selectable !== false && 
             rootObject.userData.isModelRoot === true;
    });
    
    // If we found a selectable object
    if (selectableIntersects.length > 0) {
      // Find the root object (the model root)
      let selectedObject = selectableIntersects[0].object;
      while (selectedObject.parent && !selectedObject.userData.isModelRoot) {
        selectedObject = selectedObject.parent;
      }
      
      // If it's a different object than the currently selected one
      if (this.selectedObject !== selectedObject) {
        // Deselect previous object
        if (this.selectedObject && this.onObjectDeselected) {
          this.onObjectDeselected(this.selectedObject);
        }
        
        // Select new object
        this.selectedObject = selectedObject;
        
        if (this.onObjectSelected) {
          this.onObjectSelected(this.selectedObject, selectableIntersects[0].point);
        }
      }
    }
    // If we didn't find any selectable objects
    else {
      // If we had a previously selected object, deselect it
      if (this.selectedObject && this.onObjectDeselected) {
        this.onObjectDeselected(this.selectedObject);
      }
      
      this.selectedObject = null;
    }
  }
  
  checkHover() {
    // Set up raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Find objects that intersect with the ray
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    // Filter out non-selectable objects (similar to checkSelection)
    const selectableIntersects = intersects.filter(intersect => {
      let rootObject = intersect.object;
      while (rootObject.parent && rootObject.parent !== this.scene) {
        rootObject = rootObject.parent;
      }
      
      return rootObject.userData && 
             rootObject.userData.selectable !== false && 
             rootObject.userData.isModelRoot === true;
    });
    
    // If we found a hoverable object
    if (selectableIntersects.length > 0) {
      // Find the root object
      let hoveredObject = selectableIntersects[0].object;
      while (hoveredObject.parent && !hoveredObject.userData.isModelRoot) {
        hoveredObject = hoveredObject.parent;
      }
      
      // If it's a different object than the currently hovered one
      if (this.hoveredObject !== hoveredObject) {
        // Unhover previous object
        if (this.hoveredObject && this.onObjectUnhovered) {
          this.onObjectUnhovered(this.hoveredObject);
        }
        
        // Hover new object
        this.hoveredObject = hoveredObject;
        
        if (this.onObjectHovered) {
          this.onObjectHovered(this.hoveredObject, selectableIntersects[0].point);
        }
        
        // Change cursor to pointer
        this.domElement.style.cursor = 'pointer';
      }
    }
    // If we didn't find any hoverable objects
    else {
      // If we had a previously hovered object, unhover it
      if (this.hoveredObject && this.onObjectUnhovered) {
        this.onObjectUnhovered(this.hoveredObject);
      }
      
      this.hoveredObject = null;
      
      // Reset cursor
      this.domElement.style.cursor = 'auto';
    }
  }
  
  /**
   * Find the first intersection point with a plane at y=0
   * Useful for placing objects on the floor
   * @param {THREE.Vector2} mousePosition - Normalized device coordinates
   * @returns {THREE.Vector3|null} - The intersection point or null if no intersection
   */
  getPlaneIntersection(mousePosition = null) {
    // Use provided mouse position or the current one
    const mouse = mousePosition || this.mouse;
    
    // Set up raycaster
    this.raycaster.setFromCamera(mouse, this.camera);
    
    // Create a plane at y=0 (floor level)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    
    // Calculate intersection
    const intersection = new THREE.Vector3();
    const hasIntersection = this.raycaster.ray.intersectPlane(plane, intersection);
    
    if (hasIntersection) {
      return intersection;
    }
    
    return null;
  }
  
  /**
   * Find objects at a specific position in the scene
   * @param {THREE.Vector2} position - Normalized device coordinates
   * @param {boolean} selectableOnly - Whether to return only selectable objects
   * @returns {Array} - Array of intersected objects
   */
  findObjectsAtPosition(position, selectableOnly = true) {
    // Create temporary raycaster
    const tempRaycaster = new THREE.Raycaster();
    tempRaycaster.setFromCamera(position, this.camera);
    
    // Find intersections
    const intersects = tempRaycaster.intersectObjects(this.scene.children, true);
    
    // Filter results if needed
    if (selectableOnly) {
      return intersects.filter(intersect => {
        let rootObject = intersect.object;
        while (rootObject.parent && rootObject.parent !== this.scene) {
          rootObject = rootObject.parent;
        }
        
        return rootObject.userData && 
               rootObject.userData.selectable !== false && 
               rootObject.userData.isModelRoot === true;
      });
    }
    
    return intersects;
  }
  
  /**
   * Set callback for when an object is selected
   * @param {Function} callback - Function(selectedObject, intersectionPoint)
   */
  setOnObjectSelected(callback) {
    this.onObjectSelected = callback;
  }
  
  /**
   * Set callback for when an object is deselected
   * @param {Function} callback - Function(deselectedObject)
   */
  setOnObjectDeselected(callback) {
    this.onObjectDeselected = callback;
  }
  
  /**
   * Set callback for when the mouse hovers over an object
   * @param {Function} callback - Function(hoveredObject, intersectionPoint)
   */
  setOnObjectHovered(callback) {
    this.onObjectHovered = callback;
  }
  
  /**
   * Set callback for when the mouse stops hovering over an object
   * @param {Function} callback - Function(unhoveredObject)
   */
  setOnObjectUnhovered(callback) {
    this.onObjectUnhovered = callback;
  }
  
  /**
   * Check if a point is inside the bounds of an object
   * @param {THREE.Vector3} point - The point to check
   * @param {THREE.Object3D} object - The object to check against
   * @returns {boolean} - Whether the point is inside the object
   */
  isPointInObject(point, object) {
    // Calculate object's bounding box
    const bbox = new THREE.Box3().setFromObject(object);
    
    // Check if point is inside
    return bbox.containsPoint(point);
  }
  
  /**
   * Dispose of resources
   */
  dispose() {
    this.unbindEvents();
    this.selectedObject = null;
    this.hoveredObject = null;
  }
}