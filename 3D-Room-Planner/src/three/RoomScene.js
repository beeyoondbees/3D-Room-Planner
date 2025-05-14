// src/three/RoomScene.js
// Manages the room environment, lighting, and ambient settings

import * as THREE from 'three';
import { Room } from './objects/Room';

export class RoomScene {
  constructor(scene, options = {}) {
    this.scene = scene;
    
    // Default room options
    this.options = {
      roomWidth: options.roomWidth || 10,
      roomHeight: options.roomHeight || 3,
      roomDepth: options.roomDepth || 8,
      wallColor: options.wallColor || 0xffffff,
      floorColor: options.floorColor || 0xcccccc,
      lightIntensity: options.lightIntensity || 0.5,
      shadowsEnabled: options.shadowsEnabled !== undefined ? options.shadowsEnabled : true
    };
    
    this.init();
  }
  
  init() {
    this.setupLighting();
    this.createRoom();
    this.setupEnvironment();
  }
  
  setupLighting() {
    // Ambient light for general illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, this.options.lightIntensity);
    this.scene.add(this.ambientLight);
    
    // Main directional light (sun-like)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(5, 10, 7.5);
    
    // Set up shadows if enabled
    if (this.options.shadowsEnabled) {
      this.directionalLight.castShadow = true;
      this.directionalLight.shadow.mapSize.width = 2048;
      this.directionalLight.shadow.mapSize.height = 2048;
      
      // Configure shadow camera
      const d = 15;
      this.directionalLight.shadow.camera.left = -d;
      this.directionalLight.shadow.camera.right = d;
      this.directionalLight.shadow.camera.top = d;
      this.directionalLight.shadow.camera.bottom = -d;
      this.directionalLight.shadow.camera.far = 50;
      
      // Uncomment to visualize light's shadow camera (helpful for debugging)
      // const helper = new THREE.CameraHelper(this.directionalLight.shadow.camera);
      // this.scene.add(helper);
    }
    
    this.scene.add(this.directionalLight);
    
    // Additional rim light for better depth perception
    this.rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    this.rimLight.position.set(-5, 5, -5);
    this.scene.add(this.rimLight);
    
    // Add some subtle point lights for better illumination
    this.createPointLights();
  }
  
  createPointLights() {
    const { roomWidth, roomDepth } = this.options;
    
    // Create point lights at corners
    const intensity = 0.3;
    const distance = 15;
    const decay = 2;
    
    // Create and position four point lights
    this.pointLights = [];
    
    // Front left
    const light1 = new THREE.PointLight(0xffffcc, intensity, distance, decay);
    light1.position.set(-roomWidth / 3, 2.5, roomDepth / 3);
    
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
    
    // Add lights to scene
    this.pointLights.forEach(light => {
      if (this.options.shadowsEnabled) {
        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
      }
      this.scene.add(light);
    });
  }
  
  createRoom() {
    // Create room with walls, floor, ceiling
    this.room = new Room(
      this.options.roomWidth,
      this.options.roomHeight,
      this.options.roomDepth
    );
    
    // Add room to scene
    this.scene.add(this.room.group);
    
    // Customize room appearance
    this.room.setWallColor(this.options.wallColor);
    
    // Add room to scene
    this.scene.add(this.room.group);
  }
  
  setupEnvironment() {
    // Set scene background and fog
    this.scene.background = new THREE.Color(0xf0f0f0);
    this.scene.fog = new THREE.Fog(0xf0f0f0, 20, 50);
    
    // Create a larger ground plane (extends beyond the room)
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.01; // Slightly below room floor to avoid z-fighting
    this.ground.receiveShadow = true;
    this.ground.userData.isGround = true; // For raycasting identification
    
    this.scene.add(this.ground);
  }
  
  setRoomDimensions(width, height, depth) {
    this.options.roomWidth = width;
    this.options.roomHeight = height;
    this.options.roomDepth = depth;
    
    // Update room
    this.room.resize(width, height, depth);
    
    // Update light positions
    this.updateLightPositions();
  }
  
  updateLightPositions() {
    const { roomWidth, roomDepth } = this.options;
    
    if (this.pointLights && this.pointLights.length === 4) {
      // Front left
      this.pointLights[0].position.set(-roomWidth / 3, 2.5, roomDepth / 3);
      
      // Front right
      this.pointLights[1].position.set(roomWidth / 3, 2.5, roomDepth / 3);
      
      // Back left
      this.pointLights[2].position.set(-roomWidth / 3, 2.5, -roomDepth / 3);
      
      // Back right
      this.pointLights[3].position.set(roomWidth / 3, 2.5, -roomDepth / 3);
    }
  }
  
  setLightIntensity(intensity) {
    this.options.lightIntensity = intensity;
    this.ambientLight.intensity = intensity;
  }
  
  setShadowsEnabled(enabled) {
    this.options.shadowsEnabled = enabled;
    
    // Update directional light
    this.directionalLight.castShadow = enabled;
    
    // Update point lights
    this.pointLights.forEach(light => {
      light.castShadow = enabled;
    });
    
    // Update all objects in the scene
    this.scene.traverse(object => {
      if (object.isMesh) {
        object.castShadow = enabled;
        object.receiveShadow = enabled;
      }
    });
  }
  
  toggleCeiling() {
    if (this.room && this.room.ceiling) {
      this.room.toggleCeiling();
    }
  }
  
  // Change wall color
  setWallColor(color) {
    this.options.wallColor = color;
    if (this.room) {
      this.room.setWallColor(color);
    }
  }
  
  // Change floor texture
  setFloorTexture(texturePath) {
    if (this.room) {
      this.room.setFloorTexture(texturePath);
    }
  }
  
  // Get room dimensions
  getRoomDimensions() {
    return {
      width: this.options.roomWidth,
      height: this.options.roomHeight,
      depth: this.options.roomDepth
    };
  }
  
  // Create a preset room environment (e.g., home gym, commercial gym)
  applyPreset(presetName) {
    switch(presetName) {
      case 'homeGym':
        this.setRoomDimensions(6, 2.8, 5);
        this.setWallColor(0xf5f5f5);
        this.setFloorTexture('/assets/textures/floor/wood.png');
        this.setLightIntensity(0.6);
        break;
        
      case 'commercialGym':
        this.setRoomDimensions(15, 4, 12);
        this.setWallColor(0xe0e0e0);
        this.setFloorTexture('/assets/textures/floor/rubber.png');
        this.setLightIntensity(0.7);
        break;
        
      case 'studioSpace':
        this.setRoomDimensions(10, 3.5, 8);
        this.setWallColor(0xffffff);
        this.setFloorTexture('/assets/textures/floor/studio.png');
        this.setLightIntensity(0.8);
        break;
        
      default:
        // Default room setup
        this.setRoomDimensions(10, 3, 8);
        this.setWallColor(0xffffff);
        this.setFloorTexture('/assets/textures/floor/grid.png');
        this.setLightIntensity(0.5);
    }
  }
  
  // Dispose of all resources
  dispose() {
    // Clean up geometry and materials
    if (this.ground) {
      this.ground.geometry.dispose();
      this.ground.material.dispose();
    }
    
    // Remove all lights
    if (this.ambientLight) this.scene.remove(this.ambientLight);
    if (this.directionalLight) this.scene.remove(this.directionalLight);
    if (this.rimLight) this.scene.remove(this.rimLight);
    
    if (this.pointLights) {
      this.pointLights.forEach(light => {
        this.scene.remove(light);
      });
    }
    
    // Remove room
    if (this.room) {
      this.scene.remove(this.room.group);
    }
  }
}