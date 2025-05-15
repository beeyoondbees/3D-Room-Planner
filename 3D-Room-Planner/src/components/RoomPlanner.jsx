// src/components/RoomPlanner.jsx
// Main component with direct manipulation support

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SceneManager } from '../three/SceneManager';
import Toolbar from './UI/Toolbar';
import SidePanel from './UI/SidePanel';
import ViewControls from './UI/ViewControls';
import ModelLoadingIndicator from './UI/ModelLoadingIndicator';
import ObjectControls from './UI/ObjectControls';
import useStore from '../store';
import equipmentConfig from '../config/equipment';

const RoomPlanner = () => {
  const containerRef = useRef(null);
  const [sceneManager, setSceneManager] = useState(null);
  const [interactionMode, setInteractionMode] = useState('translate');
  
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
    
    const handleModeChanged = (event) => {
      setInteractionMode(event.detail);
    };
    
    container.addEventListener('object-selected', handleObjectSelected);
    container.addEventListener('object-deselected', handleObjectDeselected);
    container.addEventListener('mode-changed', handleModeChanged);
    
    // Clean up on unmount
    return () => {
      if (manager) {
        manager.dispose();
      }
      
      // Use the captured container value instead of containerRef.current
      container.removeEventListener('object-selected', handleObjectSelected);
      container.removeEventListener('object-deselected', handleObjectDeselected);
      container.removeEventListener('mode-changed', handleModeChanged);
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
  const handleObjectAction = (action, value) => {
    if (!sceneManager) return;
    
    // Some actions don't require a selected object
    if (action === 'deselect') {
      sceneManager.deselectObject();
      return;
    }
    
    // Rest of the actions require a selected object
    if (!selectedObject && action !== 'deselect') return;
    
    switch (action) {
      case 'delete':
        sceneManager.removeObject(selectedObject);
        break;
        
      case 'duplicate':
        sceneManager.duplicateObject(selectedObject);
        break;
        
      case 'translate':
        sceneManager.setInteractionMode('translate');
        break;
        
      case 'rotate':
        sceneManager.setInteractionMode('rotate');
        break;
        
      case 'pin':
        sceneManager.pinObject(selectedObject);
        break;
        
      case 'unpin':
        sceneManager.unpinObject(selectedObject);
        break;
        
      case 'rotate-by':
        // Rotate by specific angle (in degrees)
        sceneManager.rotateObject(selectedObject, value);
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
      
      {/* Model Loading Indicator */}
      <ModelLoadingIndicator />
      
      {/* Object Controls Panel (shown when an object is selected) */}
      {selectedObject && (
        <ObjectControls 
          selectedObject={selectedObject}
          onObjectAction={handleObjectAction}
          interactionMode={interactionMode}
        />
      )}
      
      {/* Direct Manipulation Instructions */}
      {selectedObject && (
        <div className="manipulation-hint">
          {interactionMode === 'translate' ? (
            <span>🖱️ Click and drag to move the object</span>
          ) : (
            <span>🖱️ Click and drag left/right to rotate the object</span>
          )}
        </div>
      )}
      
      <style jsx>{`
        .room-planner {
          width: 100%;
          height: 100vh;
          position: relative;
          overflow: hidden;
        }
        
        .manipulation-hint {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 10px 16px;
          border-radius: 20px;
          font-size: 14px;
          display: flex;
          align-items: center;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          pointer-events: none;
          opacity: 0.9;
          transition: opacity 0.3s ease;
        }
        
        .manipulation-hint span {
          display: flex;
          align-items: center;
        }
      `}</style>
    </div>
  );
};

export default RoomPlanner;