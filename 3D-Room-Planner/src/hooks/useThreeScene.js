// src/hooks/useThreeScene.js
// Custom hook for setting up and managing a Three.js scene in a React component

import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControlsWrapper } from '../three/controls/OrbitControls';
import { TransformControlsWrapper } from '../three/controls/TransformControls';
import { RoomScene } from '../three/RoomScene';
import { GridHelper } from '../three/utils/GridHelper';
import { RaycasterHelper } from '../three/utils/Raycaster';
import equipmentConfig from '../config/equipment';
import roomDefaults from '../config/roomDefaults';

/**
 * Custom hook for setting up a Three.js scene
 * @param {Object} options - Scene configuration options
 * @returns {Object} - Scene management methods and state
 */
const useThreeScene = (options = {}) => {
  // Default options merged with provided options
  const config = {
    antialias: true,
    shadows: true,
    pixelRatio: window.devicePixelRatio,
    backgroundColor: 0xf0f0f0,
    roomConfig: roomDefaults,
    ...options
  };
  
  // Scene objects refs
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  
  // Controls refs
  const orbitControlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const raycasterRef = useRef(null);
  
  // Scene components refs
  const roomSceneRef = useRef(null);
  const gridHelperRef = useRef(null);
  
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [hoveredObject, setHoveredObject] = useState(null);
  const [viewMode, setViewMode] = useState('3D'); // '2D' or '3D'
  const [transformMode, setTransformMode] = useState('translate');
  const [isGridVisible, setIsGridVisible] = useState(true);
  
  // Initialize Three.js scene
  const initScene = useCallback((container) => {
    if (!container) return false;
    
    // Store container reference
    containerRef.current = container;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(config.backgroundColor);
    scene.fog = new THREE.Fog(config.backgroundColor, 20, 50);
    sceneRef.current = scene;
    
    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(5, 5, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: config.antialias,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(config.pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = config.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Create orbit controls
    const orbitControls = new OrbitControlsWrapper(camera, renderer.domElement);
    orbitControlsRef.current = orbitControls;
    
    // Create transform controls
    const transformControls = new TransformControlsWrapper(camera, renderer.domElement, scene);
    transformControls.setMode(transformMode);
    transformControlsRef.current = transformControls;
    
    // Create raycaster
    const raycaster = new RaycasterHelper(camera, renderer.domElement, scene);
    raycasterRef.current = raycaster;
    
    // Set up selection callbacks
    raycaster.setOnObjectSelected((object, point) => {
      selectObject(object);
    });
    
    raycaster.setOnObjectDeselected(() => {
      deselectObject();
    });
    
    // Create room
    const roomScene = new RoomScene(scene, config.roomConfig);
    roomSceneRef.current = roomScene;
    
    // Create grid
    const gridHelper = new GridHelper(30, 30, 0.5);
    scene.add(gridHelper.grid);
    gridHelperRef.current = gridHelper;
    
    // Set up resize handler
    const handleResize = () => {
      if (containerRef.current && cameraRef.current && rendererRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Start animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Update controls
      if (orbitControlsRef.current) {
        orbitControlsRef.current.update();
      }
      
      // Update objects (animations, etc.)
      const delta = clockRef.current.getDelta();
      objects.forEach(obj => {
        if (obj.update && typeof obj.update === 'function') {
          obj.update(delta);
        }
      });
      
      // Render scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    animate();
    
    // Cleanup function
    const cleanup = () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (transformControlsRef.current) {
        transformControlsRef.current.dispose();
      }
      
      if (orbitControlsRef.current) {
        orbitControlsRef.current.dispose();
      }
      
      if (raycasterRef.current) {
        raycasterRef.current.dispose();
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      
      // Clear scene
      if (sceneRef.current) {
        while (sceneRef.current.children.length > 0) {
          const object = sceneRef.current.children[0];
          sceneRef.current.remove(object);
        }
      }
    };
    
    // Store cleanup function
    container.sceneCleanup = cleanup;
    
    setIsInitialized(true);
    return true;
  }, [config, transformMode, objects]);
  
  // Add an object to the scene
  const addObject = useCallback((object) => {
    if (!sceneRef.current) return null;
    
    // Add to scene
    sceneRef.current.add(object);
    
    // Update objects array
    setObjects(prev => [...prev, object]);
    
    return object;
  }, []);
  
  // Remove an object from the scene
  const removeObject = useCallback((object) => {
    if (!sceneRef.current || !object) return false;
    
    // Remove from scene
    sceneRef.current.remove(object);
    
    // Update objects array
    setObjects(prev => prev.filter(obj => obj !== object));
    
    // If this is the selected object, deselect it
    if (selectedObject === object) {
      deselectObject();
    }
    
    return true;
  }, [selectedObject]);
  
  // Select an object
  const selectObject = useCallback((object) => {
    if (!transformControlsRef.current) return;
    
    // Deselect current object first
    if (selectedObject && selectedObject !== object) {
      deselectObject();
    }
    
    // Set as selected
    setSelectedObject(object);
    
    // Add highlight (this would typically be done in a material manager)
    setObjectHighlight(object, true);
    
    // Attach transform controls
    transformControlsRef.current.attach(object);
    
    // Dispatch event
    if (containerRef.current) {
      const event = new CustomEvent('object-selected', { detail: object });
      containerRef.current.dispatchEvent(event);
    }
  }, [selectedObject]);
  
  // Deselect the current object
  const deselectObject = useCallback(() => {
    if (!transformControlsRef.current) return;
    
    // Remove highlight from current object
    if (selectedObject) {
      setObjectHighlight(selectedObject, false);
    }
    
    // Detach transform controls
    transformControlsRef.current.detach();
    
    // Clear selection
    setSelectedObject(null);
    
    // Dispatch event
    if (containerRef.current) {
      const event = new CustomEvent('object-deselected');
      containerRef.current.dispatchEvent(event);
    }
  }, [selectedObject]);
  
  // Add highlight effect to an object
  const setObjectHighlight = (object, highlighted) => {
    if (!object) return;
    
    // This is a simplified version - in a real app, you might use
    // a more sophisticated approach like outline effect or custom shaders
    object.traverse((node) => {
      if (node.isMesh && node.material) {
        if (!node.userData.originalEmissive && highlighted) {
          if (Array.isArray(node.material)) {
            node.userData.originalEmissive = node.material.map(m => m.emissive ? m.emissive.clone() : new THREE.Color(0x000000));
            node.material.forEach(m => {
              if (m.emissive) m.emissive.set(0x333333);
            });
          } else if (node.material.emissive) {
            node.userData.originalEmissive = node.material.emissive.clone();
            node.material.emissive.set(0x333333);
          }
        } else if (node.userData.originalEmissive && !highlighted) {
          if (Array.isArray(node.material)) {
            node.material.forEach((m, i) => {
              if (m.emissive) m.emissive.copy(node.userData.originalEmissive[i]);
            });
          } else if (node.material.emissive) {
            node.material.emissive.copy(node.userData.originalEmissive);
          }
          delete node.userData.originalEmissive;
        }
      }
    });
  };
  
  // Set the transform mode
  const setTransformModeInternal = useCallback((mode) => {
    if (!transformControlsRef.current) return;
    
    transformControlsRef.current.setMode(mode);
    setTransformMode(mode);
  }, []);
  
  // Set view mode (2D or 3D)
  const setViewModeInternal = useCallback((mode) => {
    if (!orbitControlsRef.current) return;
    
    if (mode === '2D') {
      orbitControlsRef.current.set2DView();
    } else {
      orbitControlsRef.current.set3DView();
    }
    
    setViewMode(mode);
  }, []);
  
  // Set grid visibility
  const setGridVisibleInternal = useCallback((visible) => {
    if (!gridHelperRef.current) return;
    
    gridHelperRef.current.setVisible(visible);
    setIsGridVisible(visible);
  }, []);
  
  // Change room dimensions
  const changeRoomSize = useCallback((width, height, depth) => {
    if (!roomSceneRef.current) return;
    
    roomSceneRef.current.setRoomDimensions(width, height, depth);
  }, []);
  
  // Set room wall color
  const setWallColor = useCallback((color) => {
    if (!roomSceneRef.current) return;
    
    roomSceneRef.current.setWallColor(color);
  }, []);
  
  // Set floor texture
  const setFloorTexture = useCallback((texturePath) => {
    if (!roomSceneRef.current) return;
    
    roomSceneRef.current.setFloorTexture(texturePath);
  }, []);
  
  // Toggle ceiling visibility
  const toggleCeiling = useCallback(() => {
    if (!roomSceneRef.current) return;
    
    roomSceneRef.current.toggleCeiling();
  }, []);
  
  // Apply a room preset
  const applyRoomPreset = useCallback((presetName) => {
    if (!roomSceneRef.current) return;
    
    roomSceneRef.current.applyPreset(presetName);
  }, []);
  
  // Take a screenshot
  const takeScreenshot = useCallback((width, height) => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return null;
    
    const originalSize = {
      width: rendererRef.current.domElement.width,
      height: rendererRef.current.domElement.height
    };
    
    // Set renderer size to requested dimensions (or use original if not specified)
    if (width && height) {
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    }
    
    // Render the scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    
    // Get the image data
    const imageData = rendererRef.current.domElement.toDataURL('image/png');
    
    // Restore original size
    rendererRef.current.setSize(originalSize.width, originalSize.height);
    cameraRef.current.aspect = originalSize.width / originalSize.height;
    cameraRef.current.updateProjectionMatrix();
    
    return imageData;
  }, []);
  
  // Find an empty position for a new model
  const findEmptyPosition = useCallback((modelType) => {
    const position = new THREE.Vector3(0, 0, 0);
    
    // Get model dimensions from config
    const dimensions = equipmentConfig.dimensions[modelType] || { width: 1, depth: 1 };
    
    // Check for existing objects
    let hasCollision = true;
    let attempts = 0;
    const maxAttempts = 20;
    
    while (hasCollision && attempts < maxAttempts) {
      // Randomize position within room bounds
      const roomDimensions = roomSceneRef.current ? 
        roomSceneRef.current.getRoomDimensions() : 
        { width: 10, depth: 8 };
      
      position.x = (Math.random() - 0.5) * (roomDimensions.width - dimensions.width);
      position.z = (Math.random() - 0.5) * (roomDimensions.depth - dimensions.depth);
      
      // Check for collisions with existing objects
      hasCollision = objects.some(obj => {
        // Skip objects without userData
        if (!obj.userData || !obj.userData.dimensions) return false;
        
        // Get object's world position
        const objPos = new THREE.Vector3();
        obj.getWorldPosition(objPos);
        
        // Get object dimensions
        const objDim = obj.userData.dimensions;
        
        // Check for overlap (simple box collision)
        const xOverlap = Math.abs(position.x - objPos.x) < (dimensions.width + objDim.width) / 2;
        const zOverlap = Math.abs(position.z - objPos.z) < (dimensions.depth + objDim.depth) / 2;
        
        return xOverlap && zOverlap;
      });
      
      attempts++;
    }
    
    return position;
  }, [objects]);
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (containerRef.current && containerRef.current.sceneCleanup) {
        containerRef.current.sceneCleanup();
      }
    };
  }, []);
  
  return {
    initScene,
    addObject,
    removeObject,
    selectObject,
    deselectObject,
    setTransformMode: setTransformModeInternal,
    setViewMode: setViewModeInternal,
    setGridVisible: setGridVisibleInternal,
    changeRoomSize,
    setWallColor,
    setFloorTexture,
    toggleCeiling,
    applyRoomPreset,
    takeScreenshot,
    findEmptyPosition,
    isInitialized,
    objects,
    selectedObject,
    hoveredObject,
    viewMode,
    transformMode,
    isGridVisible,
    containerRef,
    sceneRef,
    cameraRef,
    rendererRef
  };
};

export default useThreeScene;