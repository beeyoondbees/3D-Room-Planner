// src/three/RoomScene.js
// Manages the room environment, lighting, and ambient settings

import * as THREE from 'three';
import { Room } from './objects/Room'; // Assuming Room.js exists and exports Room class

export class RoomScene {
  constructor(scene, options = {}) {
    this.scene = scene; // The main Three.js scene object

    // Default room options, merging with any provided options
    this.options = {
      roomWidth: options.roomWidth || 10,
      roomHeight: options.roomHeight || 3,
      roomDepth: options.roomDepth || 8,
      wallColor: options.wallColor || 0xffffff, // Default wall color (white)
      floorColor: options.floorColor || 0xcccccc, // Default floor color (light gray) - Note: this.room.setFloorColor would be needed if Room class supports it directly
      lightIntensity: options.lightIntensity || 0.5, // Default ambient light intensity
      shadowsEnabled: options.shadowsEnabled !== undefined ? options.shadowsEnabled : true // Shadows enabled by default
    };

    // Initialize the room scene components
    this.init();
  }

  init() {
    this.setupLighting();
    this.createRoom();
    this.setupEnvironment();
  }

  setupLighting() {
    // Ambient light for overall, non-directional illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, this.options.lightIntensity);
    this.scene.add(this.ambientLight);

    // Main directional light (simulating sunlight or a primary overhead source)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Slightly stronger than ambient
    this.directionalLight.position.set(5, 10, 7.5); // Positioned to cast from an angle

    // Configure shadows if enabled
    if (this.options.shadowsEnabled) {
      this.directionalLight.castShadow = true;
      // Shadow map resolution - higher values mean better shadow quality but more performance cost
      this.directionalLight.shadow.mapSize.width = 2048;
      this.directionalLight.shadow.mapSize.height = 2048;

      // Configure the orthographic camera used to render shadows
      const d = 15; // Shadow camera frustum size
      this.directionalLight.shadow.camera.left = -d;
      this.directionalLight.shadow.camera.right = d;
      this.directionalLight.shadow.camera.top = d;
      this.directionalLight.shadow.camera.bottom = -d;
      this.directionalLight.shadow.camera.near = 0.5; // Default is 0.5
      this.directionalLight.shadow.camera.far = 50; // How far shadows are rendered

      // Optional: Visualize the shadow camera's frustum for debugging
      // const helper = new THREE.CameraHelper(this.directionalLight.shadow.camera);
      // this.scene.add(helper);
    }
    this.scene.add(this.directionalLight);

    // Additional rim light to highlight object edges and improve depth perception
    this.rimLight = new THREE.DirectionalLight(0xffffff, 0.3); // Softer intensity
    this.rimLight.position.set(-5, 5, -5); // Positioned opposite to the main light or from a side
    this.scene.add(this.rimLight);

    // Add subtle point lights for more distributed illumination within the room
    this.createPointLights();
  }

  createPointLights() {
    const { roomWidth, roomHeight, roomDepth } = this.options; // roomHeight is available but not used here

    // Define properties for the point lights
    const intensity = 0.3; // Intensity of each point light
    const distance = 15;   // Maximum range of the light
    const decay = 2;       // The amount the light dims along the distance of the light

    this.pointLights = []; // Array to store point lights for later access

    // Create and position four point lights, typically near corners or distributed
    // Light positions are relative to the room's center (0,0,0)

    // Front left (assuming +Z is front, -X is left)
    const light1 = new THREE.PointLight(0xffffcc, intensity, distance, decay); // Warm white light
    light1.position.set(-roomWidth / 3, 2.5, roomDepth / 3); // Positioned within the room volume

    // Front right
    const light2 = new THREE.PointLight(0xffffcc, intensity, distance, decay);
    light2.position.set(roomWidth / 3, 2.5, roomDepth / 3);

    // Back left
    const light3 = new THREE.PointLight(0xffffcc, intensity, distance, decay);
    light3.position.set(-roomWidth / 3, 2.5, -roomDepth / 3);

    // Back right
    const light4 = new THREE.PointLight(0xffffcc, intensity, distance, decay);
    light4.position.set(roomWidth / 3, 2.5, -roomDepth / 3);

    this.pointLights.push(light1, light2, light3, light4);

    // Add lights to the scene and configure shadows
    this.pointLights.forEach(light => {
      if (this.options.shadowsEnabled) {
        light.castShadow = true;
        // Point light shadows can be expensive; use smaller map sizes if performance is an issue
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 25; // Adjust far plane for point light shadows
      }
      this.scene.add(light);
    });
  }

  createRoom() {
    // Instantiate the Room object using dimensions from options
    this.room = new Room(
      this.options.roomWidth,
      this.options.roomHeight,
      this.options.roomDepth
    );

    // Add the room's visual group (THREE.Group) to the main scene
    // This line was previously duplicated.
    this.scene.add(this.room.group);

    // Customize room appearance using methods from the Room class
    if (this.room.setWallColor) {
        this.room.setWallColor(this.options.wallColor);
    }
    // If the Room class has a setFloorColor method:
    // if (this.room.setFloorColor) {
    //     this.room.setFloorColor(this.options.floorColor);
    // }
  }

  setupEnvironment() {
    // Set the scene's background color
    this.scene.background = new THREE.Color(0xf0f0f0); // Light grey background

    // Add fog for depth perception (objects farther away appear fainter)
    this.scene.fog = new THREE.Fog(0xf0f0f0, 20, 50); // Color, near distance, far distance

    // Create a larger ground plane that extends beyond the room, acting as a general floor
    const groundGeometry = new THREE.PlaneGeometry(50, 50); // Width, height of the plane
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xdddddd,       // Slightly darker grey than background
      roughness: 0.9,        // High roughness for a matte appearance
      metalness: 0.1,        // Low metalness
      side: THREE.DoubleSide // Render both sides (optional, depends on camera angles)
    });

    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    this.ground.position.y = -0.01;      // Position slightly below the room's floor to avoid z-fighting
    this.ground.receiveShadow = this.options.shadowsEnabled; // Ground should receive shadows
    this.ground.userData.isGround = true; // Custom data for identification (e.g., in raycasting)

    this.scene.add(this.ground);
  }

  setRoomDimensions(width, height, depth) {
    this.options.roomWidth = width;
    this.options.roomHeight = height;
    this.options.roomDepth = depth;

    // Update the Room object if it has a resize method
    if (this.room && typeof this.room.resize === 'function') {
      this.room.resize(width, height, depth);
    } else {
        // Fallback: remove old room and create a new one (less efficient)
        if (this.room && this.room.group) this.scene.remove(this.room.group);
        this.createRoom();
    }

    // Update positions of lights that depend on room dimensions
    this.updateLightPositions();
  }

  updateLightPositions() {
    const { roomWidth, roomDepth, roomHeight } = this.options; // roomHeight is available

    if (this.pointLights && this.pointLights.length === 4) {
      // Assuming point lights are positioned relative to room center and near the ceiling
      const lightYPosition = roomHeight * 0.8; // Example: 80% of room height

      // Front left
      this.pointLights[0].position.set(-roomWidth / 3, lightYPosition, roomDepth / 3);
      // Front right
      this.pointLights[1].position.set(roomWidth / 3, lightYPosition, roomDepth / 3);
      // Back left
      this.pointLights[2].position.set(-roomWidth / 3, lightYPosition, -roomDepth / 3);
      // Back right
      this.pointLights[3].position.set(roomWidth / 3, lightYPosition, -roomDepth / 3);
    }
  }

  setLightIntensity(intensity) {
    this.options.lightIntensity = intensity;
    if (this.ambientLight) {
      this.ambientLight.intensity = intensity;
    }
    // Optionally, adjust other lights proportionally or based on new logic
  }

  setShadowsEnabled(enabled) {
    this.options.shadowsEnabled = enabled;

    // Update directional light's shadow casting
    if (this.directionalLight) {
      this.directionalLight.castShadow = enabled;
    }

    // Update point lights' shadow casting
    if (this.pointLights) {
      this.pointLights.forEach(light => {
        light.castShadow = enabled;
      });
    }
    
    // Update ground's shadow receiving
    if (this.ground) {
        this.ground.receiveShadow = enabled;
    }

    // Update all other meshes in the scene (this could be broad)
    // It's generally better to manage shadow properties on a per-object basis or for specific groups.
    // However, if a global toggle is desired:
    this.scene.traverse(object => {
      if (object.isMesh) {
        // Decide if this specific mesh should cast/receive shadows based on the 'enabled' flag
        // For example, the room itself might receive shadows but not cast them internally.
        // object.castShadow = enabled; // Be careful with this, might not be desired for all meshes
        object.receiveShadow = enabled;
      }
    });
    
    // Materials might need to be updated for changes to take effect immediately
    this.scene.traverse(object => {
        if (object.material && typeof object.material.needsUpdate !== 'undefined') {
            object.material.needsUpdate = true;
        }
    });
  }

  toggleCeiling() {
    if (this.room && typeof this.room.toggleCeiling === 'function') {
      this.room.toggleCeiling();
    }
  }

  setWallColor(color) {
    this.options.wallColor = color;
    if (this.room && typeof this.room.setWallColor === 'function') {
      this.room.setWallColor(color);
    }
  }

  setFloorTexture(texturePath) {
    // This implies the Room class has a method to handle texture loading and application
    if (this.room && typeof this.room.setFloorTexture === 'function') {
      this.room.setFloorTexture(texturePath);
    }
  }

  getRoomDimensions() {
    return {
      width: this.options.roomWidth,
      height: this.options.roomHeight,
      depth: this.options.roomDepth
    };
  }

  applyPreset(presetName) {
    console.log(`Applying preset: ${presetName}`);
    switch(presetName) {
      case 'homeGym':
        this.setRoomDimensions(6, 2.8, 5);
        this.setWallColor(new THREE.Color(0xf5f5f5)); // Use THREE.Color instance
        if (this.room) this.room.setFloorTexture('/assets/textures/floor/wood.png');
        this.setLightIntensity(0.6);
        break;

      case 'commercialGym':
        this.setRoomDimensions(15, 4, 12);
        this.setWallColor(new THREE.Color(0xe0e0e0));
        if (this.room) this.room.setFloorTexture('/assets/textures/floor/rubber.png');
        this.setLightIntensity(0.7);
        break;

      case 'studioSpace':
        this.setRoomDimensions(10, 3.5, 8);
        this.setWallColor(new THREE.Color(0xffffff));
        if (this.room) this.room.setFloorTexture('/assets/textures/floor/studio.png'); // Example path
        this.setLightIntensity(0.8);
        break;

      default:
        // Default room setup if presetName is unknown
        this.setRoomDimensions(10, 3, 8);
        this.setWallColor(new THREE.Color(0xffffff));
        if (this.room) this.room.setFloorTexture('/assets/textures/floor/grid.png'); // Example path
        this.setLightIntensity(0.5);
    }
    // After applying a preset, ensure lights are updated if shadows were toggled
    this.setShadowsEnabled(this.options.shadowsEnabled);
  }

  dispose() {
    console.log("Disposing RoomScene resources...");
    // Clean up geometries and materials
    if (this.ground) {
      if (this.ground.geometry) this.ground.geometry.dispose();
      if (this.ground.material) {
          if (Array.isArray(this.ground.material)) {
              this.ground.material.forEach(m => m.dispose());
          } else {
              this.ground.material.dispose();
          }
      }
      this.scene.remove(this.ground);
      this.ground = null;
    }

    // Remove and dispose lights
    if (this.ambientLight) {
        this.scene.remove(this.ambientLight);
        // AmbientLight itself doesn't have a dispose method, but good practice to nullify
        this.ambientLight = null;
    }
    if (this.directionalLight) {
        this.scene.remove(this.directionalLight);
        if (this.directionalLight.shadow && this.directionalLight.shadow.map) {
            this.directionalLight.shadow.map.dispose();
        }
        // DirectionalLight itself doesn't have a dispose method
        this.directionalLight = null;
    }
    if (this.rimLight) {
        this.scene.remove(this.rimLight);
        // RimLight (DirectionalLight) itself doesn't have a dispose method
        this.rimLight = null;
    }

    if (this.pointLights) {
      this.pointLights.forEach(light => {
        this.scene.remove(light);
        if (light.shadow && light.shadow.map) {
            light.shadow.map.dispose();
        }
        // PointLight itself doesn't have a dispose method
      });
      this.pointLights = [];
    }

    // Remove and dispose room
    if (this.room) {
      if (typeof this.room.dispose === 'function') {
        this.room.dispose(); // Assuming Room class has its own dispose method
      } else if (this.room.group) {
        // Basic cleanup if no custom dispose
        this.scene.remove(this.room.group);
        this.room.group.traverse(child => {
            if (child.isMesh) {
                if(child.geometry) child.geometry.dispose();
                if(child.material) {
                     const materials = Array.isArray(child.material) ? child.material : [child.material];
                     materials.forEach(mat => mat.dispose());
                }
            }
        });
      }
      this.room = null;
    }
    
    // Clear scene fog and background
    if (this.scene) {
        this.scene.fog = null;
        this.scene.background = null;
    }
    
    console.log("RoomScene disposed.");
    // Note: The `this.scene` itself is managed externally and should not be disposed here.
  }
}
