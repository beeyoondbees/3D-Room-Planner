// src/three/utils/FloorPlanEngine.js
import * as THREE from 'three';

export class FloorPlanEngine {
    constructor(group) {
      this.group = group; // Reference to THREE.Group from Room
      this.corners = [];
      this.walls = [];
    }
  
    reset() {
      this.corners = [];
      this.walls = [];
  
      // Remove previous walls if needed
      const toRemove = [];
      this.group.traverse((child) => {
        if (child.userData.isWall) toRemove.push(child);
      });
  
      toRemove.forEach((wall) => this.group.remove(wall));
      console.log("✅ FloorPlan reset");
    }
  
    newCorner(x, y) {
      const corner = { x, y };
      this.corners.push(corner);
      return corner;
    }
  
    newWall(cornerA, cornerB) {
      const geometry = new THREE.BoxGeometry(0.1, 2.5, this.distance(cornerA, cornerB));
      const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
      const wall = new THREE.Mesh(geometry, material);
      wall.userData.isWall = true;
  
      const midX = (cornerA.x + cornerB.x) / 2;
      const midZ = (cornerA.y + cornerB.y) / 2;
  
      wall.position.set(midX, 1.25, midZ);
      wall.lookAt(cornerB.x, 1.25, cornerB.y);
  
      this.group.add(wall);
      this.walls.push(wall);
  
      console.log("🧱 Wall added:", cornerA, "->", cornerB);
    }
  
    distance(a, b) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  
    update() {
      console.log("🔄 Floor plan updated.");
      // You could add logic here to close loops, validate room shape, etc.
    }
  }
  