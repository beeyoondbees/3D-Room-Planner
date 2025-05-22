// src/three/utils/GridHelper.js - Fixed to prevent flickering

import * as THREE from 'three';

export class GridHelper {
  constructor(size = 20, divisions = 20, spacing = 1.0) {
    this.createGrid(size, divisions, spacing);
  }
  
  createGrid(size, divisions, spacing) {
    // Create a container group for all grid elements
    const gridGroup = new THREE.Group();
    
    // Create grid without axes
    const gridHelper = new THREE.GridHelper(size, divisions, 0xcccccc, 0xd3d3d3);
    // gridHelper.visible = false; // Hide for final render
    
    // IMPORTANT: Fix z-fighting by adjusting material properties
    if (gridHelper.material) {
      // If it's a single material
      this.adjustMaterial(gridHelper.material);
    } else if (gridHelper.material && Array.isArray(gridHelper.material)) {
      // If it's an array of materials
      gridHelper.material.forEach(mat => this.adjustMaterial(mat));
    }
    
    // Raise grid slightly above floor level to prevent z-fighting
    gridHelper.position.y = 0.02;
    
    // Add grid to group
    gridGroup.add(gridHelper);
    
    // Remove axis lines
    this.removeAxisLines(gridHelper);
    
    // Add a semi-transparent floor plane to enhance visual quality
    const floorGeometry = new THREE.PlaneGeometry(size, size);
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false, // Prevents z-fighting with other floor elements
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2; // Make horizontal
    floor.position.y = 0.01; // Slightly above the actual floor but below the grid
    gridGroup.add(floor);
    
    this.grid = gridGroup;
  }
  
  // Helper method to adjust material properties to prevent z-fighting
  adjustMaterial(material) {
    if (!material) return;
    
    material.depthWrite = true;
    material.polygonOffset = true;
    material.polygonOffsetFactor = -0.5;
    material.polygonOffsetUnits = -1.0;
  }
  
  // Remove axis lines from grid
  removeAxisLines(grid) {
    if (!grid.geometry || !grid.geometry.attributes || !grid.geometry.attributes.position) return;
    
    const positions = grid.geometry.attributes.position.array;
    const colors = grid.geometry.attributes.color.array;
    
    // Find the actual number of vertices that represent the grid (not axes)
    const totalVertices = positions.length / 3;
    const gridOnlyVertices = totalVertices - 4; // Subtract vertices used for axes
    
    // Create new arrays without the axis lines
    const newPositions = new Float32Array(gridOnlyVertices * 3);
    const newColors = new Float32Array(gridOnlyVertices * 3);
    
    // Copy all vertices except the first 4 (which are for axes)
    for (let i = 4; i < totalVertices; i++) {
      newPositions[(i - 4) * 3] = positions[i * 3];
      newPositions[(i - 4) * 3 + 1] = positions[i * 3 + 1];
      newPositions[(i - 4) * 3 + 2] = positions[i * 3 + 2];
      
      newColors[(i - 4) * 3] = colors[i * 3];
      newColors[(i - 4) * 3 + 1] = colors[i * 3 + 1];
      newColors[(i - 4) * 3 + 2] = colors[i * 3 + 2];
    }
    
    // Create a new geometry with only grid lines
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    newGeometry.setAttribute('color', new THREE.BufferAttribute(newColors, 3));
    
    // Replace the original geometry
    grid.geometry.dispose();
    grid.geometry = newGeometry;
  }
  
  // Toggle grid visibility
  setVisible(visible) {
    if (this.grid) {
      this.grid.visible = visible;
    }
  }
}