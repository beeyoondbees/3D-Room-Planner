// Enhanced Room.js with better HTML integration and wall thickness support

import * as THREE from 'three';

function isClockwise(points) {
  if (!points || points.length < 2) return false;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += (next.x - current.x) * (next.z + current.z);
  }
  return sum > 0;
}

export class Room {
  constructor(height = 2.5, thickness = 0.2) {
    this.height = height;
    this.thickness = thickness; // Add wall thickness support
    this.group = new THREE.Group();
    this.group.name = "RoomGroup";
    this.wallSegments = [];
    this._currentPoints = [];
    
    // Enhanced watermark system
    this.watermark = null;
    this.watermarkTexture = null;
    this.watermarkConfig = {
      enabled: true,
      size: { width: 1.5, height: 0.4 },
      position: { x: 0, y: 0.2 },
      opacity: 0.3,
      logoPath: '/assets/icons/stech_logo.png',
      minScale: 0.5,
      maxScale: 2.0,
      scaleDistance: 10,
      fadeDistance: 50,
      alwaysVisible: true
    };
  }

  /**
   * Enhanced buildFromPolygon with configuration object support
   * @param {Array<{x: number, z: number}>} points - Raw points defining the polygon
   * @param {boolean} [isEmpty=false] - If true, only creates the floor
   * @param {Object} [config] - Additional configuration from HTML
   * @param {number} [config.height] - Wall height override
   * @param {number} [config.thickness] - Wall thickness override
   */
  buildFromPolygon(points, isEmpty = false, config = {}) {
    console.log("Room.js: buildFromPolygon called with:", {
      points: points?.length || 0,
      isEmpty,
      config
    });

    // Update room properties from config
    if (config.height !== undefined) {
      this.height = config.height;
      console.log(`Room.js: Height updated to ${this.height}m`);
    }
    if (config.thickness !== undefined) {
      this.thickness = config.thickness;
      console.log(`Room.js: Thickness updated to ${this.thickness}m`);
    }

    if (!points || points.length < 3) {
      console.warn("Room.js: Not enough points to build. Requires at least 3.");
      this._currentPoints = [];
      this.clearRoom();
      return;
    }

    // Process points
    let processedPoints = points.map(p => ({ x: p.x, z: p.z }));
    if (isClockwise(processedPoints)) {
      console.log("Room.js: Points were clockwise, reversing to CCW for internal use.");
      processedPoints.reverse();
    }
    this._currentPoints = processedPoints;

    this.clearRoom();
    this.createFloor(this._currentPoints);

    if (!isEmpty) {
      this.createWalls(this._currentPoints);
    }

    // Center the room
    const center = this._currentPoints.reduce((acc, p) => {
      acc.x += p.x;
      acc.z += p.z;
      return acc;
    }, { x: 0, z: 0 });

    if (this._currentPoints.length > 0) {
      center.x /= this._currentPoints.length;
      center.z /= this._currentPoints.length;
    }
    
    this.group.position.set(-center.x, 0, -center.z);

    // Initialize watermark
    if (this.watermarkConfig.enabled && !isEmpty) {
      this.loadWatermarkTexture();
    }

    console.log(`Room.js: Room built successfully with ${this.wallSegments.length} walls`);
  }

  /**
   * Enhanced wall creation with thickness support
   */
  createWalls(pointsToBuildWith) {
    if (!pointsToBuildWith || pointsToBuildWith.length < 3) {
      console.warn("Room.js - createWalls: Not enough points provided.");
      return;
    }

    console.log(`Room.js - createWalls: Creating walls with thickness ${this.thickness}m`);
    this.wallSegments = [];

    const material = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < pointsToBuildWith.length; i++) {
      const a = pointsToBuildWith[i];
      const b = pointsToBuildWith[(i + 1) % pointsToBuildWith.length];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.sqrt(dx * dx + dz * dz);

      if (length < 0.001) {
        console.warn(`Room.js - createWalls: Skipping tiny wall segment at index ${i}`);
        continue;
      }

      // Create wall with thickness using BoxGeometry instead of PlaneGeometry
      const wallGeometry = new THREE.BoxGeometry(length, this.height, this.thickness);
      const wall = new THREE.Mesh(wallGeometry, material.clone());
      
      // Position wall
      wall.position.set(
        (a.x + b.x) / 2,
        this.height / 2,
        (a.z + b.z) / 2
      );
      
      // Rotate wall to align with edge
      wall.rotation.y = -Math.atan2(dz, dx);
      
      wall.name = `RoomWall_${i}`;
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData.isWall = true;
      wall.userData.wallIndex = i;
      wall.userData.wallLength = length;
      wall.userData.wallThickness = this.thickness;
      wall.userData.inwardNormalLocalXZ = new THREE.Vector3(-dz, 0, dx).normalize();
      
      this.group.add(wall);
      this.wallSegments.push(wall);
    }

    console.log(`Room.js: Created ${this.wallSegments.length} walls with thickness`);
  }

  /**
   * Update room configuration (for real-time updates from HTML)
   * @param {Object} config - New configuration
   * @param {number} [config.height] - New wall height
   * @param {number} [config.thickness] - New wall thickness
   */
  updateConfiguration(config) {
    let needsRebuild = false;

    if (config.height !== undefined && config.height !== this.height) {
      this.height = config.height;
      needsRebuild = true;
    }

    if (config.thickness !== undefined && config.thickness !== this.thickness) {
      this.thickness = config.thickness;
      needsRebuild = true;
    }

    if (needsRebuild && this._currentPoints.length > 0) {
      console.log("Room.js: Rebuilding room with new configuration");
      const isEmpty = this.wallSegments.length === 0;
      this.buildFromPolygon(this._currentPoints, isEmpty, config);
    }
  }

  /**
   * Static method to create room instance and attach to window (for HTML integration)
   * @param {number} [height=2.5] - Initial wall height
   * @param {number} [thickness=0.2] - Initial wall thickness
   * @returns {Room} - Room instance
   */
  static createGlobalInstance(height = 2.5, thickness = 0.2) {
    const room = new Room(height, thickness);
    window.roomInstance = room;
    
    // Also expose useful methods globally
    window.updateRoomConfiguration = (config) => room.updateConfiguration(config);
    window.getRoomConfiguration = () => ({
      height: room.height,
      thickness: room.thickness,
      wallCount: room.wallSegments.length
    });

    console.log("Room.js: Global room instance created and attached to window");
    return room;
  }

  // ... (keep all existing watermark methods unchanged)
  clearRoom() {
    this.removeWatermark();
    
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if(m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          if(child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    }
    this.wallSegments = [];
  }

  createFloor(pointsToBuildWith) {
    if (!pointsToBuildWith || pointsToBuildWith.length < 3) {
      console.warn("Room.js - createFloor: Not enough points provided.");
      return;
    }

    const shape = new THREE.Shape(pointsToBuildWith.map(p => new THREE.Vector2(p.x, p.z)));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(Math.PI / 2);

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('/assets/textures/room/hardwood.png', 
      () => {}, 
      undefined, 
      (err) => console.error('Room.js: Failed to load floor texture.', err)
    );
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
    floor.name = "RoomFloor";
    floor.receiveShadow = true;
    floor.userData.isFloor = true;
    this.group.add(floor);
  }

  getCurrentPoints() {
    return this._currentPoints.map(p => ({ ...p }));
  }

  // ... (keep all existing watermark methods)
  updateWallVisibility(camera) {
    if (!camera || !this.wallSegments || this.wallSegments.length === 0) return;

    const cameraWorldDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraWorldDirection);

    const groupWorldQuaternion = new THREE.Quaternion();
    this.group.getWorldQuaternion(groupWorldQuaternion);

    const threshold = 0.4;

    this.wallSegments.forEach(wall => {
      if (!wall.userData.inwardNormalLocalXZ) {
        wall.visible = true;
        return;
      }

      const worldInwardNormal = wall.userData.inwardNormalLocalXZ.clone().applyQuaternion(groupWorldQuaternion);
      const dotProduct = cameraWorldDirection.dot(worldInwardNormal);
      wall.visible = dotProduct < threshold;
    });

    this.updateWatermarkPosition(camera);
  }

  // ... (keep all watermark methods from original)
  loadWatermarkTexture() {
    if (this.watermarkTexture) return;

    const textureLoader = new THREE.TextureLoader();
    this.watermarkTexture = textureLoader.load(
      this.watermarkConfig.logoPath,
      (texture) => {
        texture.format = THREE.RGBAFormat;
        texture.type = THREE.UnsignedByteType;
        texture.premultiplyAlpha = false;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.flipY = true;
        
        const renderer = this.getRenderer?.() || window.renderer;
        if (renderer && renderer.capabilities) {
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        } else {
          texture.anisotropy = 16;
        }
        
        texture.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.error('Room.js: Failed to load watermark texture:', err);
        this.watermarkTexture = null;
      }
    );
  }

  findVisibleWallForWatermark(camera) {
    if (!camera || !this.wallSegments || this.wallSegments.length === 0) {
      return null;
    }

    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);
    
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const groupWorldQuaternion = new THREE.Quaternion();
    this.group.getWorldQuaternion(groupWorldQuaternion);

    let bestWall = null;
    let bestScore = -Infinity;

    const visibleWalls = this.wallSegments.filter(wall => wall.visible);
    
    if (visibleWalls.length === 0) {
      return null;
    }

    visibleWalls.forEach(wall => {
      const wallWorldPos = new THREE.Vector3();
      wall.getWorldPosition(wallWorldPos);
      
      const wallNormal = wall.userData.inwardNormalLocalXZ.clone()
        .applyQuaternion(groupWorldQuaternion)
        .normalize();
      
      const toWall = wallWorldPos.clone().sub(cameraPos).normalize();
      
      const alignmentFactor = cameraDirection.dot(toWall);
      const facingFactor = -wallNormal.dot(toWall);
      const distance = cameraPos.distanceTo(wallWorldPos);
      
      if (alignmentFactor > 0 && facingFactor > 0) {
        const score = (alignmentFactor * facingFactor) / (1 + distance * 0.1);
        
        if (score > bestScore) {
          bestScore = score;
          bestWall = wall;
        }
      }
    });

    return bestWall || visibleWalls[0];
  }

  createWatermark(wall) {
    if (!wall || !this.watermarkTexture || !this.watermarkConfig.enabled) {
      return;
    }

    this.removeWatermark();

    const geometry = new THREE.PlaneGeometry(
      this.watermarkConfig.size.width,
      this.watermarkConfig.size.height,
      128, 128
    );

    const material = new THREE.MeshBasicMaterial({
      map: this.watermarkTexture,
      transparent: true,
      opacity: this.watermarkConfig.opacity,
      side: THREE.DoubleSide,
      alphaTest: 0.001,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false,
      blending: THREE.NormalBlending,
      premultipliedAlpha: false,
      vertexColors: false,
      dithering: false
    });

    this.watermark = new THREE.Mesh(geometry, material);
    this.watermark.name = "RoomWatermark";
    this.watermark.userData.isWatermark = true;
    this.watermark.userData.originalScale = 1.0;

    this.positionWatermarkOnWall(wall);
    this.group.add(this.watermark);
  }

  positionWatermarkOnWall(wall) {
    if (!this.watermark || !wall) return;

    this.watermark.position.copy(wall.position);
    this.watermark.rotation.copy(wall.rotation);

    const wallRight = new THREE.Vector3(1, 0, 0);
    const wallUp = new THREE.Vector3(0, 1, 0);
    const wallForward = new THREE.Vector3(0, 0, 1);

    wallRight.applyEuler(wall.rotation);
    wallUp.applyEuler(wall.rotation);
    wallForward.applyEuler(wall.rotation);

    const offsetX = this.watermarkConfig.position.x;
    const offsetY = this.watermarkConfig.position.y;
    const offsetZ = this.thickness / 2 + 0.01; // Position on wall surface

    this.watermark.position.add(wallRight.multiplyScalar(offsetX));
    this.watermark.position.add(wallUp.multiplyScalar(offsetY));
    this.watermark.position.add(wallForward.multiplyScalar(offsetZ));

    this.watermark.renderOrder = 9999;
    
    const wallLength = wall.userData.wallLength || 1;
    const maxWatermarkSize = Math.min(wallLength * 0.6, this.height * 0.4);
    const currentSize = Math.max(this.watermarkConfig.size.width, this.watermarkConfig.size.height);
    
    if (currentSize > maxWatermarkSize) {
      const autoScale = maxWatermarkSize / currentSize;
      this.watermark.scale.setScalar(autoScale);
      this.watermark.userData.originalScale = autoScale;
    }
  }

  updateWatermarkPosition(camera) {
    if (!this.watermarkConfig.enabled || !this.watermarkTexture) {
      return;
    }

    const bestWall = this.findVisibleWallForWatermark(camera);
    
    if (!bestWall) {
      if (this.watermark) {
        this.watermark.visible = false;
      }
      return;
    }

    const currentWallIndex = this.watermark?.userData.currentWallIndex;
    const newWallIndex = bestWall.userData.wallIndex;

    if (!this.watermark || currentWallIndex !== newWallIndex) {
      this.createWatermark(bestWall);
      if (this.watermark) {
        this.watermark.userData.currentWallIndex = newWallIndex;
      }
    }

    if (this.watermark && camera) {
      this.updateWatermarkDistanceEffects(camera);
    }

    if (this.watermark) {
      this.watermark.visible = true;
    }
  }

  updateWatermarkDistanceEffects(camera) {
    if (!this.watermark || !camera) return;

    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);
    
    const watermarkPos = new THREE.Vector3();
    this.watermark.getWorldPosition(watermarkPos);
    
    const distance = cameraPos.distanceTo(watermarkPos);
    const originalScale = this.watermark.userData.originalScale || 1.0;
    
    let scaleMultiplier = 1.0;
    if (distance > this.watermarkConfig.scaleDistance) {
      const scaleFactor = Math.min(
        distance / this.watermarkConfig.scaleDistance,
        this.watermarkConfig.maxScale / this.watermarkConfig.minScale
      );
      scaleMultiplier = Math.max(scaleFactor, this.watermarkConfig.minScale);
    }
    
    const targetScale = originalScale * scaleMultiplier;
    this.watermark.scale.setScalar(targetScale);
    
    let opacityMultiplier = 1.0;
    if (!this.watermarkConfig.alwaysVisible && distance > this.watermarkConfig.fadeDistance) {
      const fadeRange = this.watermarkConfig.fadeDistance * 2;
      const fadeProgress = Math.min((distance - this.watermarkConfig.fadeDistance) / fadeRange, 1.0);
      opacityMultiplier = Math.max(1.0 - fadeProgress, 0.1);
    }
    
    this.watermark.material.opacity = this.watermarkConfig.opacity * opacityMultiplier;
    this.watermark.material.needsUpdate = true;
  }

  removeWatermark() {
    if (this.watermark) {
      this.group.remove(this.watermark);
      if (this.watermark.geometry) this.watermark.geometry.dispose();
      if (this.watermark.material) this.watermark.material.dispose();
      this.watermark = null;
    }
  }

  addWatermark(logoPath, options = {}) {
    const baseSize = options.size || 1;
    const scale = options.scale || 0.8;
    const finalSize = baseSize * scale;
    
    const offset = options.offset || 0.5;
    const positionY = (offset - 0.5) * this.height * 0.8;
    
    this.watermarkConfig = {
      ...this.watermarkConfig,
      enabled: true,
      logoPath: logoPath,
      opacity: options.opacity || 0.3,
      size: { 
        width: finalSize, 
        height: finalSize * 0.5
      },
      position: { x: 0, y: positionY },
      minScale: 0.8,
      maxScale: 2.5,
      scaleDistance: 8,
      fadeDistance: 40,
      alwaysVisible: true
    };

    this.removeWatermark();
    if (this.watermarkTexture) {
      this.watermarkTexture.dispose();
      this.watermarkTexture = null;
    }

    this.loadWatermarkTexture();
    return this;
  }

  configureWatermark(config) {
    const oldLogoPath = this.watermarkConfig.logoPath;
    Object.assign(this.watermarkConfig, config);

    if (config.logoPath && config.logoPath !== oldLogoPath) {
      if (this.watermarkTexture) {
        this.watermarkTexture.dispose();
        this.watermarkTexture = null;
      }
      this.loadWatermarkTexture();
    }

    if (this.watermark) {
      if (config.opacity !== undefined) {
        this.watermark.material.opacity = this.watermarkConfig.opacity;
      }
      
      if (config.size) {
        this.watermark.geometry.dispose();
        this.watermark.geometry = new THREE.PlaneGeometry(
          this.watermarkConfig.size.width,
          this.watermarkConfig.size.height,
          128, 128
        );
      }
    }

    if (config.enabled === false) {
      this.removeWatermark();
    } else if (config.enabled === true && !this.watermark) {
      this.loadWatermarkTexture();
    }
  }

  setWatermarkEnabled(enabled) {
    this.configureWatermark({ enabled });
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  getRenderer() {
    return this.renderer || null;
  }

  dispose() {
    console.log("Disposing Room instance and its contents...");
    
    if (this.watermarkTexture) {
      this.watermarkTexture.dispose();
      this.watermarkTexture = null;
    }
    
    this.clearRoom();
    this._currentPoints = [];
  }
}