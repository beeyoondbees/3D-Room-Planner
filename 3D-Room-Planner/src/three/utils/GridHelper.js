// src/three/utils/GridHelper.js
// Creates an enhanced grid for better spatial awareness

import * as THREE from 'three';

export class GridHelper {
  constructor(size = 20, divisions = 20, gridSize = 1) {
    this.size = size;
    this.divisions = divisions;
    this.gridSize = gridSize;
    
    this.createGrid();
  }
  
  createGrid() {
    // Create a group to hold all grid elements
    this.grid = new THREE.Group();
    this.grid.userData.selectable = false; // Grid should not be selectable
    
    // Create the main grid
    const mainGrid = new THREE.GridHelper(this.size, this.divisions, 0x888888, 0xcccccc);
    mainGrid.material.transparent = true;
    mainGrid.material.opacity = 0.6;
    mainGrid.position.y = 0.01; // Slightly above the floor to avoid z-fighting
    this.grid.add(mainGrid);
    
    // Create a second, larger grid for better orientation
    const majorGrid = new THREE.GridHelper(this.size, this.divisions / 5, 0x666666, 0x888888);
    majorGrid.material.transparent = true;
    majorGrid.material.opacity = 0.8;
    majorGrid.position.y = 0.005; // Slightly below the main grid
    this.grid.add(majorGrid);
    
    // Add coordinate axes for reference
    this.addCoordinateAxes();
  }
  
  addCoordinateAxes() {
    // Create axes helper
    const axesHelper = new THREE.AxesHelper(2);
    axesHelper.position.y = 0.01;
    
    // Make the axes more visible
    axesHelper.traverse((child) => {
      if (child instanceof THREE.Line) {
        child.material.linewidth = 2;
      }
    });
    
    this.grid.add(axesHelper);
  }
  
  setVisible(visible) {
    this.grid.visible = visible;
  }
  
  setOpacity(opacity) {
    this.grid.traverse((child) => {
      if (child instanceof THREE.GridHelper) {
        child.material.opacity = opacity;
      }
    });
  }
  
  setSize(size, divisions) {
    this.size = size;
    this.divisions = divisions;
    
    // Remove old grid
    while (this.grid.children.length > 0) {
      this.grid.remove(this.grid.children[0]);
    }
    
    // Create new grid with updated parameters
    this.createGrid();
  }
  
  // Helper for snapping positions to grid
  snapToGrid(position) {
    const snappedPosition = position.clone();
    
    snappedPosition.x = Math.round(position.x / this.gridSize) * this.gridSize;
    snappedPosition.z = Math.round(position.z / this.gridSize) * this.gridSize;
    
    return snappedPosition;
  }
}