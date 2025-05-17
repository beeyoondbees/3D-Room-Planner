// src/three/objects/Room.js
// Class for creating and managing the room (walls, floor, ceiling)

import * as THREE from 'three';

export class Room {
  constructor(width = 10, height = 3, depth = 8) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    
    this.group = new THREE.Group();
    this.group.userData.selectable = false; // Room cannot be selected
    
    this.createFloor();
    this.createWalls();
    this.createCeiling();
  }
  
  createFloor() {
    // Floor geometry
    const geometry = new THREE.PlaneGeometry(this.width, this.depth);
    
    // Floor material - slightly textured
    const texture = new THREE.TextureLoader().load('/assets/textures/room/hardwood.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(this.width, this.depth);
    
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xcccccc,
      roughness: 0.8,
      metalness: 0.2
    });
    
    // Create mesh
    this.floor = new THREE.Mesh(geometry, material);
    this.floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    this.floor.position.set(0, 0, 0);
    this.floor.receiveShadow = true;
    this.floor.userData.isFloor = true; // For raycasting identification
    
    this.group.add(this.floor);
  }
  
  createWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.0
    });
    
    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(this.width, this.height);
    this.backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    this.backWall.position.set(0, this.height / 2, -this.depth / 2);
    this.backWall.receiveShadow = true;
    this.group.add(this.backWall);
    
    // Left wall
    const leftWallGeometry = new THREE.PlaneGeometry(this.depth, this.height);
    this.leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    this.leftWall.position.set(-this.width / 2, this.height / 2, 0);
    this.leftWall.rotation.y = Math.PI / 2;
    this.leftWall.receiveShadow = true;
    this.group.add(this.leftWall);
    
    // Right wall (optional, often kept open for better visibility)
    const rightWallGeometry = new THREE.PlaneGeometry(this.depth, this.height);
    this.rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    this.rightWall.position.set(this.width / 2, this.height / 2, 0);
    this.rightWall.rotation.y = -Math.PI / 2;
    this.rightWall.receiveShadow = true;
    this.group.add(this.rightWall);
    
    // Front wall
      const frontWallGeometry = new THREE.PlaneGeometry(this.width, this.height);
      this.frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
      this.frontWall.position.set(0, this.height / 2, this.depth / 2);
      this.frontWall.rotation.y = Math.PI; // Rotate to face inward
      this.frontWall.receiveShadow = true;
      this.group.add(this.frontWall);
  }


  
  createCeiling() {
    // Ceiling is optional and often not included for better visibility
    // But we'll include the code in case it's needed
    
    const ceilingGeometry = new THREE.PlaneGeometry(this.width, this.depth);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    
    this.ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    this.ceiling.rotation.x = Math.PI / 2;
    this.ceiling.position.set(0, this.height, 0);
    this.ceiling.receiveShadow = true;
    
    // Ceiling is initially hidden for better visibility
    this.ceiling.visible = false;
    
    this.group.add(this.ceiling);
  }
  
  resize(width, height, depth) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    
    // Remove existing elements
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    
    // Recreate with new dimensions
    this.createFloor();
    this.createWalls();
    this.createCeiling();
  }
  
  toggleCeiling() {
    if (this.ceiling) {
      this.ceiling.visible = !this.ceiling.visible;
    }
  }
  
  // Additional methods for room customization
  setFloorTexture(texturePath) {
    const texture = new THREE.TextureLoader().load(texturePath);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(this.width, this.depth);
    
    this.floor.material.map = texture;
    this.floor.material.needsUpdate = true;
  }
  
  setWallColor(color) {
    this.backWall.material.color.set(color);
    this.leftWall.material.color.set(color);
    // Update right wall if exists
    if (this.rightWall) {
      this.rightWall.material.color.set(color);
    }
  }
}