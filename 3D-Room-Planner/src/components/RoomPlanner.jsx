// src/components/RoomPlanner.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SceneManager } from '../three/SceneManager';
import Toolbar from './UI/Toolbar';
import SidePanel from './UI/SidePanel';
import ViewControls from './UI/ViewControls';
import ModelLoadingIndicator from './UI/ModelLoadingIndicator';
import ObjectControls from './UI/ObjectControls';
import useStore from '../store';
import equipmentConfig from '../config/equipment';
import { generateQR } from '../three/ARManager';
import ARQrModal from './UI/ARQrModal';

const RoomPlanner = () => {
  const containerRef = useRef(null);
  const sceneManagerRef = useRef(null);

  const viewMode = useStore(state => state.viewMode);
  const setViewMode = useStore(state => state.setViewMode);
  const isGridVisible = useStore(state => state.isGridVisible);
  const setGridVisible = useStore(state => state.setGridVisible);
  const selectedObject = useStore(state => state.selectedObject);
  const setSelectedObject = useStore(state => state.setSelectedObject);
  const [arQrVisible, setArQrVisible] = useState(false);
  const [qrModelName, setQrModelName] = useState(null);
  const [interactionModeUI, setInteractionModeUI] = useState('translate');

  // side panel state
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [activeButton, setActiveButton] = useState(null);

  useEffect(() => {
    if (!containerRef.current || sceneManagerRef.current) {
      return;
    }

    const currentContainer = containerRef.current;
    console.log("RoomPlanner: Initializing SceneManager...");
    const manager = new SceneManager(currentContainer);
    sceneManagerRef.current = manager;
    window.sceneManager = manager;

    const handleObjectSelected = (event) => setSelectedObject(event.detail);
    const handleObjectDeselected = () => setSelectedObject(null);
    const handleModeChanged = (event) => setInteractionModeUI(event.detail);
    const handleRoomShapeUpdated = (event) => {
      console.log("RoomPlanner: Event 'room-shape-updated' received.", event.detail.points);
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
      if (currentContainer) {
        currentContainer.removeEventListener('object-selected', handleObjectSelected);
        currentContainer.removeEventListener('object-deselected', handleObjectDeselected);
        currentContainer.removeEventListener('mode-changed', handleModeChanged);
        currentContainer.removeEventListener('room-shape-updated', handleRoomShapeUpdated);
      }
    };
  }, [setSelectedObject]);

  useEffect(() => {
    if (!sceneManagerRef.current) return;
    if (viewMode === '2D') sceneManagerRef.current.setView2D();
    else sceneManagerRef.current.setView3D();
  }, [viewMode]);

  useEffect(() => {
    if (!sceneManagerRef.current || !sceneManagerRef.current.grid || !sceneManagerRef.current.grid.instance) return;
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

    if (action === 'deselect') {
      manager.deselectObject();
      return;
    }
    if (!currentSelected) return;

    switch (action) {
      case 'delete':
        manager.removeObject(currentSelected);
        break;
      case 'duplicate':
        manager.duplicateObject(currentSelected);
        break;
      case 'translate':
        manager.setInteractionMode('translate');
        break;
      case 'rotate':
        manager.setInteractionMode('rotate');
        break;
      case 'pin':
        manager.pinObject(currentSelected);
        break;
      case 'unpin':
        manager.unpinObject(currentSelected);
        break;
      case 'rotate-by':
        manager.rotateObject(currentSelected, value);
        break;
      case 'animate':
        manager.toggleAnimation(currentSelected);
        break;
      default:
        console.warn("RoomPlanner: Unknown object action:", action);
        break;
    }
  }, [selectedObject]);

  const handleViewAction = useCallback((action) => {
    if (!sceneManagerRef.current) return;
    const manager = sceneManagerRef.current;

    switch (action) {
      case 'toggle-view':
        setViewMode(viewMode === '2D' ? '3D' : '2D');
        break;
      case 'reset-view':
        viewMode === '2D' ? manager.setView2D() : manager.setView3D();
        break;
      case 'zoom-in':
        if (manager.camera) manager.camera.position.multiplyScalar(0.9);
        manager.orbitControls?.update();
        break;
      case 'zoom-out':
        if (manager.camera) manager.camera.position.multiplyScalar(1.1);
        manager.orbitControls?.update();
        break;
      case 'undo':
        manager.undo();
        break;
      case 'redo':
        manager.redo();
        break;
      case 'toggle-floor-dimensions':
        manager.toggleFloorEditor();
        break;

      case 'toggle-side-panel': setShowSidePanel(prev => !prev); break;
      
      case 'take-screenshot':
        manager.takeScreenshot();
        break;
      case 'toggle-grid':
        manager.toggleGridVisibility();
        setGridVisible(!isGridVisible);
        break;

      // AR QR Code generation
      case 'generate-ar-qr': {
        const currentObject = useStore.getState().selectedObject;
        if (!currentObject || !currentObject.userData?.type) {
          console.warn("No model type found on selected object", currentObject);
          alert("Please select a model in the room.");
          return;
        }
      
        const modelName = currentObject.userData.type;
        setQrModelName(modelName);
        setArQrVisible(true);
        console.log("Opening QR for:", modelName);
        break;
      }  
      
      
      default:
        console.warn("RoomPlanner: Unknown view action:", action);
        break;
    }
  }, [viewMode, isGridVisible, setViewMode, setGridVisible]);

  return (
    <div className="room-planner" style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        className="scene-container"
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      />
      
      <Toolbar 
        viewMode={viewMode}
        onViewAction={handleViewAction}
        onObjectAction={handleObjectAction}
        selectedObject={selectedObject}
        showSidePanel={showSidePanel}
        setShowSidePanel={setShowSidePanel}
        activeButton={activeButton}
        setActiveButton={setActiveButton}
      />

      {showSidePanel && (
      <SidePanel 
        equipmentCatalog={equipmentConfig.catalog}
        onAddModel={handleAddModel}
        setShowSidePanel={setShowSidePanel} // ✅ Add this
      />
      )}

      <ViewControls
        viewMode={viewMode}
        onViewAction={handleViewAction}
        isGridVisible={isGridVisible}
        showSidePanel={showSidePanel}
        setShowSidePanel={setShowSidePanel}
        activeButton={activeButton}
        setActiveButton={setActiveButton}
      />

      <ModelLoadingIndicator />
      {selectedObject && (
        <ObjectControls
          selectedObject={selectedObject}
          onObjectAction={handleObjectAction}
          interactionMode={interactionModeUI}
        />
      )}
      {selectedObject && (
        <div style={{
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
      <ARQrModal
          visible={arQrVisible}
          modelName={qrModelName}
          onClose={() => setArQrVisible(false)}
        />
    </div>
  );
};

export default RoomPlanner;