// src/components/RoomPlanner.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three'; // Keep if directly used, e.g. for new THREE.Vector3()
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
  const sceneManagerRef = useRef(null); // Use ref for stable SceneManager instance

  const viewMode = useStore(state => state.viewMode);
  const setViewMode = useStore(state => state.setViewMode);
  const isGridVisible = useStore(state => state.isGridVisible);
  const setGridVisible = useStore(state => state.setGridVisible);
  const selectedObject = useStore(state => state.selectedObject);
  const setSelectedObject = useStore(state => state.setSelectedObject);
  
  // This local state is for UI feedback based on SceneManager's interactionMode
  const [interactionModeUI, setInteractionModeUI] = useState('translate'); 

  useEffect(() => {
    if (!containerRef.current || sceneManagerRef.current) { // Initialize only once
        return;
    }
    
    const currentContainer = containerRef.current; // Capture ref for cleanup
    console.log("RoomPlanner: Initializing SceneManager...");
    const manager = new SceneManager(currentContainer);
    sceneManagerRef.current = manager;
    
    // Event listeners for SceneManager updates
    const handleObjectSelected = (event) => setSelectedObject(event.detail);
    const handleObjectDeselected = () => setSelectedObject(null);
    const handleModeChanged = (event) => setInteractionModeUI(event.detail);
    const handleRoomShapeUpdated = (event) => {
        console.log("RoomPlanner: Event 'room-shape-updated' received.", event.detail.points);
        // Here you could update a Zustand store or React state if other parts of your UI
        // need to be aware of the current room points directly.
        // For example: useStore.getState().setCurrentRoomPoints(event.detail.points);
    };

    currentContainer.addEventListener('object-selected', handleObjectSelected);
    currentContainer.addEventListener('object-deselected', handleObjectDeselected);
    currentContainer.addEventListener('mode-changed', handleModeChanged);
    currentContainer.addEventListener('room-shape-updated', handleRoomShapeUpdated);
    
    return () => {
      console.log("RoomPlanner: Cleaning up SceneManager...");
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
        sceneManagerRef.current = null;
      }
      if (currentContainer) { // Use captured ref for cleanup
        currentContainer.removeEventListener('object-selected', handleObjectSelected);
        currentContainer.removeEventListener('object-deselected', handleObjectDeselected);
        currentContainer.removeEventListener('mode-changed', handleModeChanged);
        currentContainer.removeEventListener('room-shape-updated', handleRoomShapeUpdated);
      }
    };
  }, [setSelectedObject]); // setSelectedObject from store is stable, effect runs once
  
  useEffect(() => {
    if (!sceneManagerRef.current) return;
    if (viewMode === '2D') sceneManagerRef.current.setView2D();
    else sceneManagerRef.current.setView3D();
  }, [viewMode]);
  
  useEffect(() => {
    if (!sceneManagerRef.current || !sceneManagerRef.current.grid || !sceneManagerRef.current.grid.instance) return;
    // Assuming your GridHelper setup in SceneManager makes .grid.instance the THREE.GridHelper
    sceneManagerRef.current.grid.setVisible(isGridVisible);
  }, [isGridVisible]);
  
  const handleAddModel = useCallback((modelType) => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.addModel(modelType, null);
  }, []);
  
  const handleObjectAction = useCallback((action, value) => {
    if (!sceneManagerRef.current) return;
    const manager = sceneManagerRef.current;
    const currentSelected = selectedObject;

    if (action === 'deselect') { manager.deselectObject(); return; }
    if (!currentSelected) return; // Most actions require a selected object
    
    switch (action) {
      case 'delete': manager.removeObject(currentSelected); break;
      case 'duplicate': manager.duplicateObject(currentSelected); break;
      case 'translate': manager.setInteractionMode('translate'); break;
      case 'rotate': manager.setInteractionMode('rotate'); break;
      case 'pin': manager.pinObject(currentSelected); break;
      case 'unpin': manager.unpinObject(currentSelected); break;
      case 'rotate-by': manager.rotateObject(currentSelected, value); break;
      default: console.warn("RoomPlanner: Unknown object action:", action); break;
    }
  }, [selectedObject]); 
  
  const handleViewAction = useCallback((action) => {
    if (!sceneManagerRef.current) return;
    const manager = sceneManagerRef.current;

    switch (action) {
      case 'toggle-view': setViewMode(viewMode === '2D' ? '3D' : '2D'); break;
      case 'toggle-grid': setGridVisible(!isGridVisible); break;
      case 'reset-view': viewMode === '2D' ? manager.setView2D() : manager.setView3D(); break;
      case 'zoom-in': if(manager.camera) manager.camera.position.multiplyScalar(0.9); manager.orbitControls?.update(); break;
      case 'zoom-out': if(manager.camera) manager.camera.position.multiplyScalar(1.1); manager.orbitControls?.update(); break;
      case 'undo': manager.undo(); break;
      case 'redo': manager.redo(); break;
      case 'toggle-floor-dimensions': // Action for the ruler icon
        manager.toggleFloorEditor();
        break;
      default: console.warn("RoomPlanner: Unknown view action:", action); break;
    }
  }, [viewMode, isGridVisible, setViewMode, setGridVisible]); 
  
  return (
    <div className="room-planner" style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Container for the Three.js scene */}
      <div 
        ref={containerRef} 
        className="scene-container"
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      />
      
      {/* UI Elements are overlaid */}
      <Toolbar 
        viewMode={viewMode}
        onViewAction={handleViewAction}
        onObjectAction={handleObjectAction}
        selectedObject={selectedObject}
      />
      
      {/* Ensure SidePanel, ViewControls, etc. are correctly imported and accept their props */}
      <SidePanel 
        equipmentCatalog={equipmentConfig.catalog}
        onAddModel={handleAddModel}
      />
      
      <ViewControls 
        viewMode={viewMode} 
        onViewAction={handleViewAction}
        isGridVisible={isGridVisible}
      />
      
      <ModelLoadingIndicator />
      
      {selectedObject && (
        <ObjectControls 
          selectedObject={selectedObject}
          onObjectAction={handleObjectAction}
          interactionMode={interactionModeUI} // Pass UI interaction mode
        />
      )}
      
      {selectedObject && ( // Your existing manipulation hint
        <div style={{ /* Basic style for hint, move to CSS */
          position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 15px', borderRadius: '20px',
          fontSize: '13px', zIndex: 1000, pointerEvents: 'none'
        }}>
          {interactionModeUI === 'translate' ? 
            (<span>🖱️ Drag to move</span>) : 
            (<span>🖱️ Drag to rotate</span>)
          }
        </div>
      )}
    </div>
  );
};

export default RoomPlanner;