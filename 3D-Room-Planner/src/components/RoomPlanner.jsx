// src/components/RoomPlanner.jsx
// Main component that integrates Three.js with React

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SceneManager } from '../three/SceneManager';
import Toolbar from './UI/Toolbar';
import SidePanel from './UI/SidePanel';
import ViewControls from './UI/ViewControls';
import ModelLoadingIndicator from './UI/ModelLoadingIndicator';
import GLBDebugButton from './UI/GLBDebugButton'; // Import the debug button
import useStore from '../store';
import equipmentConfig from '../config/equipment';

const RoomPlanner = () => {
  const containerRef = useRef(null);
  const [sceneManager, setSceneManager] = useState(null);
  
  // Get state from the store
  const {
    viewMode, 
    setViewMode,
    isGridVisible, 
    setGridVisible,
    selectedObject, 
    setSelectedObject
  } = useStore();
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Capture the current ref value to use in cleanup
    const container = containerRef.current;
    
    // Create scene manager
    const manager = new SceneManager(container);
    setSceneManager(manager);
    
    // Add event listeners for object selection
    const handleObjectSelected = (event) => {
      setSelectedObject(event.detail);
    };
    
    const handleObjectDeselected = () => {
      setSelectedObject(null);
    };
    
    container.addEventListener('object-selected', handleObjectSelected);
    container.addEventListener('object-deselected', handleObjectDeselected);
    
    // Clean up on unmount
    return () => {
      if (manager) {
        manager.dispose();
      }
      
      // Use the captured container value instead of containerRef.current
      container.removeEventListener('object-selected', handleObjectSelected);
      container.removeEventListener('object-deselected', handleObjectDeselected);
    };
  }, [setSelectedObject]);
  
  // Handle view mode changes
  useEffect(() => {
    if (!sceneManager) return;
    
    if (viewMode === '2D') {
      sceneManager.setView2D();
    } else {
      sceneManager.setView3D();
    }
  }, [viewMode, sceneManager]);
  
  // Handle grid visibility changes
  useEffect(() => {
    if (!sceneManager) return;
    
    if (sceneManager.grid) {
      sceneManager.grid.setVisible(isGridVisible);
    }
  }, [isGridVisible, sceneManager]);
  
  // Handle adding a model to the scene
  const handleAddModel = (modelType) => {
    if (!sceneManager) return;
    
    // Default position in the center of the room
    const position = new THREE.Vector3(0, 0, 0);
    sceneManager.addModel(modelType, position);
  };
  
  // Handle object actions (delete, duplicate, etc.)
  const handleObjectAction = (action) => {
    if (!sceneManager || !selectedObject) return;
    
    switch (action) {
      case 'delete':
        sceneManager.removeObject(selectedObject);
        break;
        
      case 'duplicate':
        sceneManager.duplicateObject(selectedObject);
        break;
        
      case 'rotate':
        selectedObject.rotation.y += Math.PI / 2; // Rotate 90 degrees
        break;
        
      case 'translate':
        sceneManager.setTransformMode('translate');
        break;
        
      case 'rotate-mode':
        sceneManager.setTransformMode('rotate');
        break;
        
      case 'scale':
        sceneManager.setTransformMode('scale');
        break;
        
      default:
        break;
    }
  };
  
  // Handle view control actions
  const handleViewAction = (action) => {
    if (!sceneManager) return;
    
    switch (action) {
      case 'toggle-view':
        setViewMode(viewMode === '2D' ? '3D' : '2D');
        break;
        
      case 'toggle-grid':
        setGridVisible(!isGridVisible);
        break;
        
      case 'reset-view':
        if (viewMode === '2D') {
          sceneManager.setView2D();
        } else {
          sceneManager.setView3D();
        }
        break;
        
      case 'zoom-in':
        // Implement zoom in
        sceneManager.camera.position.multiplyScalar(0.9);
        break;
        
      case 'zoom-out':
        // Implement zoom out
        sceneManager.camera.position.multiplyScalar(1.1);
        break;
        
      case 'undo':
        sceneManager.undo();
        break;
        
      case 'redo':
        sceneManager.redo();
        break;
        
      default:
        break;
    }
  };
  
  return (
    <div className="room-planner">
      {/* 3D Scene Container */}
      <div 
        ref={containerRef} 
        className="scene-container"
        style={{ width: '100%', height: '100vh', position: 'relative' }}
      />
      
      {/* UI Elements */}
      <Toolbar 
        viewMode={viewMode}
        onViewAction={handleViewAction}
        onObjectAction={handleObjectAction}
        selectedObject={selectedObject}
      />
      
      <SidePanel 
        equipmentCatalog={equipmentConfig.catalog}
        onAddModel={handleAddModel}
      />
      
      <ViewControls 
        viewMode={viewMode} 
        onViewAction={handleViewAction}
        isGridVisible={isGridVisible}
      />
      
      {/* Add the ModelLoadingIndicator component here */}
      <ModelLoadingIndicator />
      
      {/* Debug Button - remove in production */}
      {selectedObject && (
        <GLBDebugButton modelType={selectedObject?.userData?.type || 'treadmill'} />
      )}
      
      {/* Object Properties Panel (shown when an object is selected) */}
      {selectedObject && (
        <div className="properties-panel">
          <h3>Properties</h3>
          <div className="property">
            <span>Type:</span>
            <span>{selectedObject.userData.type}</span>
          </div>














          
          
          <div className="actions">
            <button onClick={() => handleObjectAction('translate')}>Move</button>
            <button onClick={() => handleObjectAction('rotate-mode')}>Rotate</button>
            <button onClick={() => handleObjectAction('scale')}>Scale</button>
            <button onClick={() => handleObjectAction('duplicate')}>Duplicate</button>
            <button onClick={() => handleObjectAction('delete')}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomPlanner;