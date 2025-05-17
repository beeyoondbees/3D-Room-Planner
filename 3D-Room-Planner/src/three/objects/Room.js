// src/three/objects/Room.js
// Class for creating a room from polygon with hidden back-facing walls

import * as THREE from 'three';

function isClockwise(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += (next.x - current.x) * (next.z + current.z);
  }
  return sum > 0;  // true if clockwise
}


export class Room {
  constructor(height = 3) {
    this.height = height;
    this.group = new THREE.Group();
    this.group.userData.selectable = false;
    this.wallSegments = [];
  }

  buildFromPolygon(points) {
    if (!points || points.length < 3) {
      console.warn("Not enough points to build a polygon room.");
      return;
    }

    // Reverse points if polygon is clockwise so we always have CCW points
    if (isClockwise(points)) {
      points = points.slice().reverse();
    }

    this.clearRoom();
    this.createFloor(points);
    this.createWalls(points);

    const center = points.reduce((acc, p) => {
      acc.x += p.x;
      acc.z += p.z;
      return acc;
    }, { x: 0, z: 0 });

    center.x /= points.length;
    center.z /= points.length;

    this.group.position.set(-center.x, 0, -center.z);
  }

  clearRoom() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    this.wallSegments = [];
  }

  createFloor(points) {
    const shape = new THREE.Shape(points.map(p => new THREE.Vector2(p.x, p.z)));
    const geometry = new THREE.ShapeGeometry(shape);
  
    // Flip floor upside down: rotate X by +Math.PI/2 instead of -Math.PI/2
    geometry.rotateX(Math.PI / 2);
  
    const texture = new THREE.TextureLoader().load('/assets/textures/room/hardwood.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
  
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xcccccc,
      roughness: 0.8,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
  
    const floor = new THREE.Mesh(geometry, material);
    floor.receiveShadow = true;
    floor.userData.isFloor = true;
    this.group.add(floor);
  }
  

  createWalls(points) {
    this.wallSegments = [];
  
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.0,
      side: THREE.DoubleSide  // DoubleSide so both sides render
    });
  
    // Make sure polygon is counter-clockwise to keep walls facing outward
    const clockwise = isClockwise(points);
    if (clockwise) {
      points = points.slice().reverse();
    }
  
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
  
      // Calculate vector between points
      const dx = b.x - a.x;
      const dz = b.z - a.z;
  
      // Length of the wall segment
      const length = Math.sqrt(dx * dx + dz * dz);
  
      // Create wall geometry
      const wallGeometry = new THREE.PlaneGeometry(length, this.height);
      const wall = new THREE.Mesh(wallGeometry, material.clone());
  
      // Position the wall midpoint between points, at half height
      wall.position.set((a.x + b.x) / 2, this.height / 2, (a.z + b.z) / 2);
  
      // Rotate wall to align with segment direction
      wall.rotation.y = -Math.atan2(dz, dx);
  
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData.isWall = true;
  
      // Store outward facing normal vector for visibility checks
      wall.userData.normal = new THREE.Vector3(-dz, 0, dx).normalize();
  
      this.group.add(wall);
      this.wallSegments.push(wall);
    }
  }
  

  updateWallVisibility(camera) {
    if (!camera || !this.wallSegments) return;

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();

    this.wallSegments.forEach(wall => {
      const normal = wall.userData.normal;
      const dot = normal.dot(camDir);
      wall.visible = dot < 0;
    });
  }

  toggleCeiling() {
    this.group.traverse(obj => {
      if (obj.userData.isCeiling) {
        obj.visible = !obj.visible;
      }
    });
  }

  setWallColor(color) {
    this.group.traverse(obj => {
      if (obj.material && obj.material.color) {
        obj.material.color.set(color);
      }
    });
  }

  setFloorTexture(texturePath) {
    const texture = new THREE.TextureLoader().load(texturePath);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    this.group.traverse(obj => {
      if (obj.userData.isFloor && obj.material.map) {
        obj.material.map = texture;
        obj.material.needsUpdate = true;
      }
    });
  }
}
