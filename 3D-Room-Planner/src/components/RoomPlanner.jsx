// src/components/RoomPlanner.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SceneManager } from '../three/SceneManager';
import Toolbar from './UI/Toolbar';
import SidePanel from './UI/SidePanel';
import OfficeSidePanel from './UI/OfficeSidePanel';
import ViewControls from './UI/ViewControls';
import ModelLoadingIndicator from './UI/ModelLoadingIndicator';
import ObjectControls from './UI/ObjectControls';
import useStore from '../store';
import equipmentConfig from '../config/equipment';
import officeEquipmentConfig from '../config/officeEquipmentConfig';
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

  // -------------------------------
  // 📱 MOBILE LOGIC (default hidden)
  // -------------------------------
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // Desktop → show by default
  // Mobile  → hide by default
  const [showSidePanel, setShowSidePanel] = useState(!isMobile);
  const [showOfficeSidePanel, setShowOfficeSidePanel] = useState(false);

  const [activeButton, setActiveButton] = useState(null);

  // --------------------------------
  // SceneManager initialization
  // --------------------------------
  useEffect(() => {
    if (!containerRef.current || sceneManagerRef.current) return;

    const currentContainer = containerRef.current;
    const manager = new SceneManager(currentContainer);
    sceneManagerRef.current = manager;
    window.sceneManager = manager;

    const handleObjectSelected = e => setSelectedObject(e.detail);
    const handleObjectDeselected = () => setSelectedObject(null);
    const handleModeChanged = e => setInteractionModeUI(e.detail);

    currentContainer.addEventListener('object-selected', handleObjectSelected);
    currentContainer.addEventListener('object-deselected', handleObjectDeselected);
    currentContainer.addEventListener('mode-changed', handleModeChanged);

    return () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
        sceneManagerRef.current = null;
      }
      currentContainer.removeEventListener('object-selected', handleObjectSelected);
      currentContainer.removeEventListener('object-deselected', handleObjectDeselected);
      currentContainer.removeEventListener('mode-changed', handleModeChanged);
    };
  }, [setSelectedObject]);

  // View mode update
  useEffect(() => {
    if (!sceneManagerRef.current) return;
    if (viewMode === '2D') sceneManagerRef.current.setView2D();
    else sceneManagerRef.current.setView3D();
  }, [viewMode]);

  // Grid visibility
  useEffect(() => {
    if (!sceneManagerRef.current?.grid) return;
    sceneManagerRef.current.grid.setVisible(isGridVisible);
  }, [isGridVisible]);

  // Add model callback
  const handleAddModel = useCallback(modelType => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.addModel(modelType, null);
  }, []);

  // Object actions
  const handleObjectAction = useCallback(
    (action, value) => {
      if (!sceneManagerRef.current) return;

      const manager = sceneManagerRef.current;
      const obj = selectedObject;

      if (action === 'deselect') {
        manager.deselectObject();
        return;
      }
      if (!obj) return;

      switch (action) {
        case 'delete':
          manager.removeObject(obj);
          break;
        case 'duplicate':
          manager.duplicateObject(obj);
          break;
        case 'translate':
          manager.setInteractionMode('translate');
          break;
        case 'rotate':
          manager.setInteractionMode('rotate');
          break;
        case 'pin':
          manager.pinObject(obj);
          break;
        case 'unpin':
          manager.unpinObject(obj);
          break;
        case 'rotate-by':
          manager.rotateObject(obj, value);
          break;
        case 'animate':
          manager.toggleAnimation(obj);
          break;
        default:
          console.warn("Unknown object action:", action);
      }
    },
    [selectedObject]
  );

  // View controls
  const handleViewAction = useCallback(
    (action) => {
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
          manager.camera.position.multiplyScalar(0.9);
          manager.orbitControls?.update();
          break;
        case 'zoom-out':
          manager.camera.position.multiplyScalar(1.1);
          manager.orbitControls?.update();
          break;
        case 'undo':
          manager.undo();
          break;
        case 'redo':
          manager.redo();
          break;

        case 'toggle-side-panel':
          setShowSidePanel(prev => !prev);
          break;

        case 'toggle-grid':
          manager.toggleGridVisibility();
          setGridVisible(!isGridVisible);
          break;

        // ✅ ADD THESE TWO CASES FOR DIMENSIONS
        case 'toggle-floor-dimensions': // Desktop Toolbar
          console.log('🔧 Toggle floor dimensions (desktop)');
          if (manager.toggleFloorEditor) {
            manager.toggleFloorEditor();
          } else {
            console.warn('toggleFloorEditor method not found');
          }
          break;

        case 'scale': // Mobile ViewControls
          console.log('🔧 Toggle floor dimensions (mobile)');
          if (manager.toggleFloorEditor) {
            manager.toggleFloorEditor();
          } else {
            console.warn('toggleFloorEditor method not found');
          }
          break;

        case 'take-screenshot':
          console.log('📸 Taking screenshot');
          if (manager.takeScreenshot) {
            manager.takeScreenshot();
          }
          break;

        default:
          console.warn("Unknown view action:", action);
          break;
      }
    },
    [viewMode, setViewMode, isGridVisible, setGridVisible]
  );

  return (
    <div className="room-planner" style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* 3D Scene */}
      <div
        ref={containerRef}
        className="scene-container"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 0
        }}
      />

      {/* Toolbar */}
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

      {/* MAIN EQUIPMENT SIDE PANEL */}
      {showSidePanel && (
        <SidePanel
          equipmentCatalog={equipmentConfig.catalog}
          onAddModel={handleAddModel}
          setShowSidePanel={setShowSidePanel}
        />
      )}

      {/* OFFICE SIDE PANEL */}
      {showOfficeSidePanel && (
        <OfficeSidePanel
          onAddModel={handleAddModel}
          setShowOfficeSidePanel={setShowOfficeSidePanel}
        />
      )}

      {/* PAN + ZOOM CONTROLS */}
      <ViewControls
        viewMode={viewMode}
        onViewAction={handleViewAction}
        isGridVisible={isGridVisible}
        showSidePanel={showSidePanel}
        setShowSidePanel={setShowSidePanel}
        showOfficeSidePanel={showOfficeSidePanel}
        setShowOfficeSidePanel={setShowOfficeSidePanel}
        activeButton={activeButton}
        setActiveButton={setActiveButton}
      />

      {/* MODEL LOADING INDICATOR */}
      <ModelLoadingIndicator />

      {/* OBJECT CONTROLS */}
      {selectedObject && (
        <ObjectControls
          selectedObject={selectedObject}
          onObjectAction={handleObjectAction}
          interactionMode={interactionModeUI}
          onViewAction={handleViewAction}
        />
      )}

      {/* QR MODAL */}
      <ARQrModal
        visible={arQrVisible}
        modelName={qrModelName}
        onClose={() => setArQrVisible(false)}
      />
    </div>
  );
};

export default RoomPlanner;