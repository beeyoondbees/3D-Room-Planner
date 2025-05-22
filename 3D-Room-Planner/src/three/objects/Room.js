// src/three/objects/Room.js
// Class for creating and managing the room (walls, floor, ceiling) with distance-optimized watermark system

import * as THREE from 'three';

function isClockwise(points) {
  if (!points || points.length < 2) return false; // Not enough points to determine
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += (next.x - current.x) * (next.z + current.z);
  }
  return sum > 0;
}

export class Room {
  constructor(height = 2.5) { // Default wall height
    this.height = height;
    this.group = new THREE.Group();
    this.group.name = "RoomGroup";
    this.wallSegments = [];
    this._currentPoints = [];
    
    // Watermark system with distance optimization
    this.watermark = null;
    this.watermarkTexture = null;
    this.watermarkConfig = {
      enabled: true,
      size: { width: 1.5, height: 0.4 }, // Default size
      position: { x: 0, y: 0.2 }, // Keep vertical offset
      opacity: 0.3, // Keep for subtle appearance
      logoPath: '/assets/icons/stech_logo.png', // Same image
      // Distance-based scaling options
      minScale: 0.5, // Minimum scale at far distances
      maxScale: 2.0, // Maximum scale at close distances
      scaleDistance: 10, // Distance at which scaling starts
      fadeDistance: 50, // Distance at which watermark starts to fade
      alwaysVisible: true // Keep visible regardless of distance
    };
  }

  /**
   * Main method to build the room. Processes points and calls geometry creation methods.
   * @param {Array<{x: number, z: number}>} points - Raw points defining the polygon.
   * @param {boolean} [isEmpty=false] - If true, only creates the floor.
   */
   buildFromPolygon(points, isEmpty = false) {
    console.log("Room.js: buildFromPolygon called with raw points:", JSON.parse(JSON.stringify(points)));
    if (!points || points.length < 3) {
      console.warn("Room.js: Not enough points to build. Requires at least 3.");
      this._currentPoints = [];
      this.clearRoom();
      return;
    }
  
    let processedPoints = points.map(p => ({ x: p.x, z: p.z }));
    if (isClockwise(processedPoints)) {
      console.log("Room.js: Points were clockwise, reversing to CCW for internal use.");
      processedPoints.reverse();
    }
    this._currentPoints = processedPoints; 
    console.log("Room.js: Processed _currentPoints (CCW):", JSON.parse(JSON.stringify(this._currentPoints)));
  
    this.clearRoom(); 

    this.createFloor(this._currentPoints); 
  
    if (!isEmpty) {
      this.createWalls(this._currentPoints);
    }
  
    const center = this._currentPoints.reduce((acc, p) => {
      acc.x += p.x;
      acc.z += p.z;
      return acc;
    }, { x: 0, z: 0 });
  
    if (this._currentPoints.length > 0) {
        center.x /= this._currentPoints.length;
        center.z /= this._currentPoints.length;
    }
    console.log("Room.js: Calculated center for group offset:", center);
    this.group.position.set(-center.x, 0, -center.z);
    
    // Initialize watermark after room is built
    if (this.watermarkConfig.enabled && !isEmpty) {
      this.loadWatermarkTexture();
    }
  }  

  clearRoom() {
    // Remove watermark first
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
    console.log("Room.js - createFloor using points:", JSON.parse(JSON.stringify(pointsToBuildWith)));
    const shape = new THREE.Shape(pointsToBuildWith.map(p => new THREE.Vector2(p.x, p.z)));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(Math.PI / 2); 

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('/assets/textures/room/hardwood.png', 
        () => {}, 
        undefined, 
        (err) => { console.error('Room.js: Failed to load floor texture.', err)}
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
  
    const material = new THREE.MeshStandardMaterial({
      map: texture, color: 0xcccccc, roughness: 0.8, metalness: 0.2, side: THREE.DoubleSide
    });
  
    const floor = new THREE.Mesh(geometry, material);
    floor.name = "RoomFloor";
    floor.receiveShadow = true;
    floor.userData.isFloor = true;
    this.group.add(floor);
  }
  
  createWalls(pointsToBuildWith) {
    if (!pointsToBuildWith || pointsToBuildWith.length < 3) {
        console.warn("Room.js - createWalls: Not enough points provided.");
        return;
    }
    console.log("Room.js - createWalls using points (should be CCW):", JSON.parse(JSON.stringify(pointsToBuildWith)));
    this.wallSegments = []; 
  
    const material = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5, roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide 
    });
  
    for (let i = 0; i < pointsToBuildWith.length; i++) {
      const a = pointsToBuildWith[i];
      const b = pointsToBuildWith[(i + 1) % pointsToBuildWith.length];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.sqrt(dx * dx + dz * dz);

      if (length < 0.001) {
        console.warn(`Room.js - createWalls: Skipping zero/tiny length wall segment at index ${i}. Length: ${length}`);
        continue;
      }
  
      const wallGeometry = new THREE.PlaneGeometry(length, this.height);
      const wall = new THREE.Mesh(wallGeometry, material.clone()); 
      wall.position.set( (a.x + b.x) / 2, this.height / 2, (a.z + b.z) / 2 );
      wall.rotation.y = -Math.atan2(dz, dx);
      wall.name = `RoomWall_${i}`;
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData.isWall = true;
      wall.userData.wallIndex = i;
      wall.userData.wallLength = length;
      // For CCW points (a to b), vector (-dz, 0, dx) points INWARDS into the polygon.
      wall.userData.inwardNormalLocalXZ = new THREE.Vector3(-dz, 0, dx).normalize(); 
      this.group.add(wall);
      this.wallSegments.push(wall);
    }
  }

  getCurrentPoints() {
    return this._currentPoints.map(p => ({ ...p }));
  }

  /**
   * Updates wall visibility and watermark position based on camera view
   * @param {THREE.Camera} camera - The scene camera.
   */
  updateWallVisibility(camera) {
    if (!camera || !this.wallSegments || this.wallSegments.length === 0) return;
  
    const cameraWorldDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraWorldDirection); // Direction camera is looking
  
    const groupWorldQuaternion = new THREE.Quaternion();
    this.group.getWorldQuaternion(groupWorldQuaternion);
  
    const threshold = 0.4; // Adjust this value to control how "wide" the view cone is
  
    this.wallSegments.forEach(wall => {
      if (!wall.userData.inwardNormalLocalXZ) {
        wall.visible = true;
        return;
      }
  
      const worldInwardNormal = wall.userData.inwardNormalLocalXZ.clone().applyQuaternion(groupWorldQuaternion);
      const dotProduct = cameraWorldDirection.dot(worldInwardNormal);
  
      // If the wall is facing toward the camera direction (dot > threshold), hide it
      wall.visible = dotProduct < threshold;
    });

    // Update watermark position after wall visibility changes
    this.updateWatermarkPosition(camera);
  }

  /**
   * Load watermark texture with maximum quality settings for all distances
   */
  loadWatermarkTexture() {
    if (this.watermarkTexture) return; // Already loaded

    const textureLoader = new THREE.TextureLoader();
    this.watermarkTexture = textureLoader.load(
      this.watermarkConfig.logoPath,
      (texture) => {
        console.log('Room.js: High-quality watermark texture loaded successfully');
        
        // Maximum quality settings for all distances
        texture.format = THREE.RGBAFormat;
        texture.type = THREE.UnsignedByteType;
        texture.premultiplyAlpha = false;
        
        // Enhanced filtering for crisp rendering at all distances
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        // Prevent texture wrapping issues
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        
        // Maintain original orientation
        texture.flipY = true;
        
        // Maximum anisotropic filtering for sharp rendering at angles
        const renderer = this.getRenderer?.() || window.renderer;
        if (renderer && renderer.capabilities) {
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        } else {
          texture.anisotropy = 16; // Maximum fallback
        }
        
        // Force texture update
        texture.needsUpdate = true;
        
        console.log(`Room.js: Texture configured with anisotropy: ${texture.anisotropy}`);
      },
      undefined,
      (err) => {
        console.error('Room.js: Failed to load watermark texture:', err);
        this.watermarkTexture = null;
      }
    );
  }

  /**
   * Find the most suitable visible wall for watermark placement
   * @param {THREE.Camera} camera - The scene camera
   * @returns {THREE.Mesh|null} - The best wall for watermark placement
   */
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

    // Filter for visible walls only
    const visibleWalls = this.wallSegments.filter(wall => wall.visible);
    
    if (visibleWalls.length === 0) {
      return null;
    }

    visibleWalls.forEach(wall => {
      // Get wall world position
      const wallWorldPos = new THREE.Vector3();
      wall.getWorldPosition(wallWorldPos);
      
      // Get wall world normal (inward facing)
      const wallNormal = wall.userData.inwardNormalLocalXZ.clone()
        .applyQuaternion(groupWorldQuaternion)
        .normalize();
      
      // Calculate direction from camera to wall
      const toWall = wallWorldPos.clone().sub(cameraPos).normalize();
      
      // Calculate factors for scoring
      const alignmentFactor = cameraDirection.dot(toWall); // How directly camera looks at wall
      const facingFactor = -wallNormal.dot(toWall); // How much wall faces camera
      const distance = cameraPos.distanceTo(wallWorldPos);
      
      // Score based on alignment, facing, and distance
      if (alignmentFactor > 0 && facingFactor > 0) {
        const score = (alignmentFactor * facingFactor) / (1 + distance * 0.1);
        
        if (score > bestScore) {
          bestScore = score;
          bestWall = wall;
        }
      }
    });

    return bestWall || visibleWalls[0]; // Return best wall or first visible wall as fallback
  }

  /**
   * Create watermark on specified wall with distance optimization
   * @param {THREE.Mesh} wall - The wall to place watermark on
   */
  createWatermark(wall) {
    if (!wall || !this.watermarkTexture || !this.watermarkConfig.enabled) {
      return;
    }

    // Remove existing watermark
    this.removeWatermark();

    // Create high-resolution watermark geometry
    const geometry = new THREE.PlaneGeometry(
      this.watermarkConfig.size.width,
      this.watermarkConfig.size.height,
      128, 128 // High resolution for sharp rendering at all distances
    );

    // Create distance-optimized watermark material
    const material = new THREE.MeshBasicMaterial({
      map: this.watermarkTexture,
      transparent: true,
      opacity: this.watermarkConfig.opacity,
      side: THREE.DoubleSide,
      
      // Optimized alpha settings for distance rendering
      alphaTest: 0.001, // Very low threshold to prevent cutoff
      depthWrite: false,
      depthTest: true,
      
      // Prevent fog and tone mapping interference
      fog: false,
      toneMapped: false,
      
      // Enhanced blending for consistent appearance
      blending: THREE.NormalBlending,
      premultipliedAlpha: false,
      
      // Vertex colors for potential distance-based adjustments
      vertexColors: false,
      
      // Disable automatic LOD to maintain quality
      dithering: false
    });

    // Create watermark mesh
    this.watermark = new THREE.Mesh(geometry, material);
    this.watermark.name = "RoomWatermark";
    this.watermark.userData.isWatermark = true;
    this.watermark.userData.originalScale = 1.0;

    // Position watermark on the wall
    this.positionWatermarkOnWall(wall);

    // Add to room group
    this.group.add(this.watermark);
    
    console.log(`Room.js: Distance-optimized watermark placed on wall ${wall.userData.wallIndex}`);
  }

  /**
   * Position watermark on the specified wall with distance-based scaling
   * @param {THREE.Mesh} wall - The wall to position watermark on
   */
  positionWatermarkOnWall(wall) {
    if (!this.watermark || !wall) return;

    // Copy wall position and rotation
    this.watermark.position.copy(wall.position);
    this.watermark.rotation.copy(wall.rotation);

    // Get wall's local coordinate system
    const wallRight = new THREE.Vector3(1, 0, 0);
    const wallUp = new THREE.Vector3(0, 1, 0);
    const wallForward = new THREE.Vector3(0, 0, 1);

    // Apply wall's rotation to local axes
    wallRight.applyEuler(wall.rotation);
    wallUp.applyEuler(wall.rotation);
    wallForward.applyEuler(wall.rotation);

    // Apply position offset
    const offsetX = this.watermarkConfig.position.x;
    const offsetY = this.watermarkConfig.position.y;
    const offsetZ = 0.01; // Increased offset to prevent z-fighting at all distances

    this.watermark.position.add(wallRight.multiplyScalar(offsetX));
    this.watermark.position.add(wallUp.multiplyScalar(offsetY));
    this.watermark.position.add(wallForward.multiplyScalar(offsetZ));

    // Maximum render order for consistent visibility
    this.watermark.renderOrder = 9999;
    
    // Auto-scale based on wall size
    const wallLength = wall.userData.wallLength || 1;
    const maxWatermarkSize = Math.min(wallLength * 0.6, this.height * 0.4);
    const currentSize = Math.max(this.watermarkConfig.size.width, this.watermarkConfig.size.height);
    
    if (currentSize > maxWatermarkSize) {
      const autoScale = maxWatermarkSize / currentSize;
      this.watermark.scale.setScalar(autoScale);
      this.watermark.userData.originalScale = autoScale;
      console.log(`Room.js: Watermark auto-scaled by ${autoScale.toFixed(2)} to fit wall`);
    }
  }

  /**
   * Update watermark position and scale based on camera view and distance
   * @param {THREE.Camera} camera - The scene camera
   */
  updateWatermarkPosition(camera) {
    if (!this.watermarkConfig.enabled || !this.watermarkTexture) {
      return;
    }

    const bestWall = this.findVisibleWallForWatermark(camera);
    
    if (!bestWall) {
      // No suitable wall found, hide watermark
      if (this.watermark) {
        this.watermark.visible = false;
      }
      return;
    }

    // Check if watermark needs to be moved to a different wall
    const currentWallIndex = this.watermark?.userData.currentWallIndex;
    const newWallIndex = bestWall.userData.wallIndex;

    if (!this.watermark || currentWallIndex !== newWallIndex) {
      // Create or move watermark
      this.createWatermark(bestWall);
      if (this.watermark) {
        this.watermark.userData.currentWallIndex = newWallIndex;
      }
    }

    // Apply distance-based scaling and opacity adjustments
    if (this.watermark && camera) {
      this.updateWatermarkDistanceEffects(camera);
    }

    // Make sure watermark is visible
    if (this.watermark) {
      this.watermark.visible = true;
    }
  }

  /**
   * Update watermark scale and opacity based on camera distance
   * @param {THREE.Camera} camera - The scene camera
   */
  updateWatermarkDistanceEffects(camera) {
    if (!this.watermark || !camera) return;

    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);
    
    const watermarkPos = new THREE.Vector3();
    this.watermark.getWorldPosition(watermarkPos);
    
    const distance = cameraPos.distanceTo(watermarkPos);
    const originalScale = this.watermark.userData.originalScale || 1.0;
    
    // Distance-based scaling
    let scaleMultiplier = 1.0;
    if (distance > this.watermarkConfig.scaleDistance) {
      const scaleFactor = Math.min(
        distance / this.watermarkConfig.scaleDistance,
        this.watermarkConfig.maxScale / this.watermarkConfig.minScale
      );
      scaleMultiplier = Math.max(scaleFactor, this.watermarkConfig.minScale);
    }
    
    // Apply scale with smooth transition
    const targetScale = originalScale * scaleMultiplier;
    this.watermark.scale.setScalar(targetScale);
    
    // Distance-based opacity (optional - maintains visibility)
    let opacityMultiplier = 1.0;
    if (!this.watermarkConfig.alwaysVisible && distance > this.watermarkConfig.fadeDistance) {
      const fadeRange = this.watermarkConfig.fadeDistance * 2;
      const fadeProgress = Math.min((distance - this.watermarkConfig.fadeDistance) / fadeRange, 1.0);
      opacityMultiplier = Math.max(1.0 - fadeProgress, 0.1); // Minimum 10% opacity
    }
    
    // Apply opacity
    this.watermark.material.opacity = this.watermarkConfig.opacity * opacityMultiplier;
    
    // Force material update
    this.watermark.material.needsUpdate = true;
  }

  /**
   * Remove watermark from the room
   */
  removeWatermark() {
    if (this.watermark) {
      this.group.remove(this.watermark);
      if (this.watermark.geometry) this.watermark.geometry.dispose();
      if (this.watermark.material) this.watermark.material.dispose();
      this.watermark = null;
    }
  }

  /**
   * Configure watermark settings
   * @param {Object} config - Watermark configuration
   * @param {boolean} [config.enabled] - Enable/disable watermark
   * @param {Object} [config.size] - Watermark size {width, height}
   * @param {Object} [config.position] - Watermark position offset {x, y}
   * @param {number} [config.opacity] - Watermark opacity (0-1)
   * @param {string} [config.logoPath] - Path to logo texture
   * @param {number} [config.minScale] - Minimum scale at far distances
   * @param {number} [config.maxScale] - Maximum scale at close distances
   * @param {number} [config.scaleDistance] - Distance at which scaling starts
   * @param {boolean} [config.alwaysVisible] - Keep visible regardless of distance
   */
  configureWatermark(config) {
    const oldLogoPath = this.watermarkConfig.logoPath;
    
    // Update configuration
    Object.assign(this.watermarkConfig, config);

    // Reload texture if path changed
    if (config.logoPath && config.logoPath !== oldLogoPath) {
      if (this.watermarkTexture) {
        this.watermarkTexture.dispose();
        this.watermarkTexture = null;
      }
      this.loadWatermarkTexture();
    }

    // Update existing watermark if present
    if (this.watermark) {
      if (config.opacity !== undefined) {
        this.watermark.material.opacity = this.watermarkConfig.opacity;
      }
      
      if (config.size) {
        this.watermark.geometry.dispose();
        this.watermark.geometry = new THREE.PlaneGeometry(
          this.watermarkConfig.size.width,
          this.watermarkConfig.size.height,
          128, 128 // High resolution
        );
      }
    }

    // Handle enable/disable
    if (config.enabled === false) {
      this.removeWatermark();
    } else if (config.enabled === true && !this.watermark) {
      this.loadWatermarkTexture();
    }
  }

  /**
   * Add watermark with enhanced configuration options (maintains API compatibility)
   * @param {string} logoPath - Path to the watermark image
   * @param {Object} options - Watermark options
   * @param {number} [options.opacity=0.3] - Watermark opacity (0-1)
   * @param {number} [options.scale=0.8] - Watermark scale factor
   * @param {number} [options.offset=0.5] - Vertical offset (0-1, where 0.5 is center)
   * @param {string} [options.blendMode='normal'] - Blend mode (normal, multiply, screen, overlay)
   * @param {number} [options.size=1] - Base size of the watermark
   */
  addWatermark(logoPath, options = {}) {
    // Calculate size from scale and base size
    const baseSize = options.size || 1;
    const scale = options.scale || 0.8;
    const finalSize = baseSize * scale;
    
    // Convert offset to position
    const offset = options.offset || 0.5;
    const positionY = (offset - 0.5) * this.height * 0.8; // Scale within wall height
    
    // Update watermark configuration
    this.watermarkConfig = {
      ...this.watermarkConfig,
      enabled: true,
      logoPath: logoPath,
      opacity: options.opacity || 0.3,
      size: { 
        width: finalSize, 
        height: finalSize * 0.5 // Maintain aspect ratio
      },
      position: { x: 0, y: positionY },
      // Distance optimization settings
      minScale: 0.8,
      maxScale: 2.5,
      scaleDistance: 8,
      fadeDistance: 40,
      alwaysVisible: true
    };

    console.log('Room.js: Adding distance-optimized watermark with config:', {
      logoPath,
      opacity: this.watermarkConfig.opacity,
      size: this.watermarkConfig.size,
      position: this.watermarkConfig.position,
      distanceOptimization: 'enabled'
    });

    // Clear existing watermark and texture
    this.removeWatermark();
    if (this.watermarkTexture) {
      this.watermarkTexture.dispose();
      this.watermarkTexture = null;
    }

    // Load new texture
    this.loadWatermarkTexture();

    return this; // For method chaining
  }

  /**
   * Enable/disable watermark
   * @param {boolean} enabled - Whether to enable watermark
   */
  setWatermarkEnabled(enabled) {
    this.configureWatermark({ enabled });
  }

  /**
   * Set renderer reference for advanced texture settings
   * @param {THREE.WebGLRenderer} renderer - The WebGL renderer
   */
  setRenderer(renderer) {
    this.renderer = renderer;
  }

  /**
   * Get renderer reference
   * @returns {THREE.WebGLRenderer|null}
   */
  getRenderer() {
    return this.renderer || null;
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
      if (obj.material && obj.material.color && obj.userData.isWall) {
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

  dispose() {
    console.log("Disposing Room instance and its contents...");
    
    // Dispose watermark texture
    if (this.watermarkTexture) {
      this.watermarkTexture.dispose();
      this.watermarkTexture = null;
    }
    
    this.clearRoom();
    this._currentPoints = [];
  }
}