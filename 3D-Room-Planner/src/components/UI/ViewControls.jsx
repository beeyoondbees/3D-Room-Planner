import React, { useState, useEffect } from 'react';
import IconButton from '../common/IconButton';
import ARQrModal from './ARQrModal';
import useStore from '../../store';

const ViewControls = ({
  viewMode,
  onViewAction,
  isGridVisible,
  showSidePanel,
  setShowSidePanel,
  showOfficeSidePanel,
  setShowOfficeSidePanel,
  activeButton,
  setActiveButton,
}) => {
  // Get selectedObject from Zustand store
  const selectedObject = useStore((state) => state.selectedObject);

  // Auto-read dark mode from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('isDarkMode') === 'true';
  });

  // AR Modal state
  const [qrVisible, setQrVisible] = useState(false);
  const [qrModelName, setQrModelName] = useState(null);

  // Debug: Log when selectedObject changes
  useEffect(() => {
    console.log('🔍 ViewControls - selectedObject from store:', selectedObject);
    console.log('🔍 Is selectedObject truthy?', !!selectedObject);
  }, [selectedObject]);

  // Listen for theme changes from MoreOptionsModal
  useEffect(() => {
    const handleThemeChange = (event) => {
      const { isDarkMode } = event.detail;
      setDarkMode(isDarkMode);
    };

    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Handle AR click
  const handleARClick = () => {
    console.log('🎯 AR button clicked!');
    console.log('🎯 selectedObject:', selectedObject);

    if (!selectedObject) {
      console.log('❌ No object selected for AR');
      return;
    }

    const modelType = selectedObject?.userData?.type || 'unknown';
    console.log('✅ Opening AR for model:', modelType);
    setQrModelName(modelType);
    setQrVisible(true);
  };

  // Handle Room Shapes click - Open popup
  const handleRoomShapesClick = () => {
    console.log('🏠 Room Shapes clicked - Opening popup');
    const popup = document.getElementById('roomPopup');
    const overlay = document.getElementById('overlay');

    if (popup && overlay) {
      popup.style.display = 'block';
      overlay.style.display = 'block';
    } else {
      console.warn('Room popup elements not found');
    }
  };

  // ✅ Handle Home button click - deactivate dimensions and clear active state
  const handleHomeClick = () => {
    console.log('🏠 Home button clicked - Deactivating dimensions');
    
    // Clear active button state
    setActiveButton(null);
    
    // Call reset-view action
    onViewAction('reset-view');
    
    // Deactivate floor dimensions
    try {
      if (window.floorDimensionEditor && typeof window.floorDimensionEditor.clearEditor === 'function') {
        window.floorDimensionEditor.clearEditor();
        console.log('✅ Floor dimension editor cleared');
      }
      if (window.sceneManager && typeof window.sceneManager.clearObjectDimensions === 'function') {
        window.sceneManager.clearObjectDimensions();
        console.log('✅ Object dimensions cleared');
      }
      
      // Dispatch events to sync with other components
      const events = [
        { name: 'objectDimensionsToggle', detail: { visible: false, source: 'home-button' } },
        { name: 'floorDimensionsToggle', detail: { visible: false, source: 'home-button' } },
        { name: 'updateToolbarButton', detail: { action: 'toggle-floor-dimensions', active: false, source: 'home-button' } },
        { name: 'syncIconButton', detail: { action: 'toggle-floor-dimensions', active: false, source: 'home-button' } },
      ];
      
      events.forEach(event => {
        window.dispatchEvent(new CustomEvent(event.name, { detail: event.detail }));
        console.log(`📡 Dispatched: ${event.name}`, event.detail);
      });
      
      console.log('✅ Dimensions deactivated successfully');
    } catch (error) {
      console.error('❌ Error deactivating dimensions:', error);
    }
  };

  // Inject mobile-only styles
  useEffect(() => {
    const styleId = 'view-controls-mobile-styles';

    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Mobile-only styles - Desktop unaffected */
        @media (max-width: 768px) {
          .view-controls-mobile-wrapper {
            position: fixed;
            width: 100%;
            height: 100%;
            pointer-events: none;
            top: 0;
            left: 0;
            z-index: 100;
          }

          .view-controls-mobile-wrapper > * {
            pointer-events: auto;
          }

          /* ✅ HIDE desktop panel buttons on MOBILE only */
          .view-controls-mobile-wrapper .desktop-panel-button-mobile {
            display: none !important;
          }

          .view-controls-mobile-wrapper .view-control-button.primary {
            display: none !important;
          }

          /* ✅ Undo/Redo buttons - Mobile only, with 10px top gap */
          .view-controls-mobile-wrapper .mobile-undo-redo-controls {
            position: fixed !important;
            left: 15px !important;
            top: 105px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            z-index: 101 !important;
          }

          /* Override IconButton styles for undo/redo to match zoom controls */
          .view-controls-mobile-wrapper .mobile-undo-redo-controls .icon-button {
            background-color: #fff !important;
            border-radius: 50% !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
            width: 48px !important;
            height: 48px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border: 1px solid rgba(0, 0, 0, 0.06) !important;
            transition: all 0.3s ease !important;
          }

          .view-controls-mobile-wrapper.dark-mode .mobile-undo-redo-controls .icon-button {
            background-color: #333 !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
          }

          .view-controls-mobile-wrapper .mobile-undo-redo-controls .icon-button:active {
            transform: scale(0.95) !important;
          }

          .view-controls-mobile-wrapper .zoom-controls {
            position: fixed !important;
            left: 20px !important;
            bottom: 200px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            z-index: 101 !important;
            transform: none !important;
            top: auto !important;
          }

          .view-controls-mobile-wrapper .zoom-controls > *:nth-child(2) {
            display: none !important;
          }

          .mobile-controls-unified-container {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 12px !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 102 !important;
            pointer-events: auto !important;
            background-color: #fff;
            border-radius: 16px 16px 0 0;
            padding: 12px;
            padding-bottom: 16px;
            box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(0, 0, 0, 0.06);
            border-bottom: none;
            max-width: 100% !important;
            width: calc(100% - 40px) !important;
          }

          .view-controls-mobile-wrapper.dark-mode .mobile-controls-unified-container {
            background-color: #2a2a2a;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-bottom: none;
            box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.4);
          }

          /* REMOVED floating home button */
          .mobile-home-button-wrapper {
            display: none !important;
          }

          .mobile-panel-buttons-wrapper {
            display: flex !important;
            gap: 12px !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: auto !important;
            width: 100% !important;
          }

          .mobile-panel-btn {
            background-color: #f5f5f5;
            border-radius: 10px;
            padding: 0;
            box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
            flex: 1 !important;
            height: 75px;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: center;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }

          .mobile-panel-btn:active {
            transform: scale(0.98);
          }

          .mobile-panel-btn.active {
            border-color: #ff4757;
            box-shadow: 0 3px 10px rgba(255, 71, 87, 0.25);
          }

          .mobile-panel-btn-bg {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            border-radius: 10px;
          }

          .mobile-panel-btn-bg::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to bottom, transparent 40%, rgba(0, 0, 0, 0.6) 100%);
            border-radius: 10px;
          }

          .mobile-panel-btn-icon {
            position: absolute;
            top: 35%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 32px;
            height: 32px;
            z-index: 2;
            filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
          }

          .mobile-panel-btn-label {
            color: #fff;
            font-size: 11px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3;
            position: absolute;
            bottom: 8px;
            left: 0;
            right: 0;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          }

          .view-controls-mobile-wrapper.dark-mode .mobile-panel-btn {
            background-color: #1a1a1a;
            box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
          }

          .view-controls-mobile-wrapper.dark-mode .mobile-panel-btn.active {
            border-color: #ff6b7a;
            box-shadow: 0 3px 10px rgba(255, 107, 122, 0.3);
          }

          /* Bottom 4 icons - Grid layout for 4 icons */
          .mobile-bottom-container {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 8px !important;
            width: 100%;
          }

          .mobile-bottom-icon {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
            cursor: pointer;
            padding: 12px 6px;
            transition: all 0.3s ease;
            background-color: #f5f5f5;
            border-radius: 10px;
            box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(0, 0, 0, 0.04);
          }

          .mobile-bottom-icon.disabled {
            opacity: 0.4;
            cursor: not-allowed;
            pointer-events: none;
          }

          .view-controls-mobile-wrapper.dark-mode .mobile-bottom-icon {
            background-color: #1a1a1a;
            border: 1px solid rgba(255, 255, 255, 0.06);
            box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
          }

          .mobile-bottom-icon:not(:last-child)::after {
            display: none;
          }

          .mobile-bottom-icon:active:not(.disabled) {
            transform: scale(0.98);
            background-color: rgba(0, 0, 0, 0.04);
          }

          .view-controls-mobile-wrapper.dark-mode .mobile-bottom-icon:active:not(.disabled) {
            background-color: rgba(255, 255, 255, 0.04);
          }

          .mobile-bottom-icon.active,
          .mobile-bottom-icon.ar-active {
            background-color: rgba(255, 71, 87, 0.08);
            border-color: #ff4757;
            box-shadow: 0 2px 8px rgba(255, 71, 87, 0.2);
          }

          .view-controls-mobile-wrapper.dark-mode .mobile-bottom-icon.active,
          .view-controls-mobile-wrapper.dark-mode .mobile-bottom-icon.ar-active {
            background-color: rgba(255, 107, 122, 0.15);
            border-color: #ff6b7a;
            box-shadow: 0 2px 8px rgba(255, 107, 122, 0.3);
          }

          .mobile-bottom-icon-img {
            width: 20px;
            height: 20px;
            transition: filter 0.3s ease;
          }

          /* AR icon color - LIGHT MODE */
          .mobile-bottom-icon.disabled .mobile-bottom-icon-img.ar-icon {
            filter: grayscale(100%) opacity(0.4);
          }

          .mobile-bottom-icon.ar-active .mobile-bottom-icon-img.ar-icon {
            filter: brightness(0) saturate(100%) invert(27%) sepia(98%) saturate(7051%) hue-rotate(348deg) brightness(97%) contrast(106%);
          }

          /* AR icon color - DARK MODE */
          .view-controls-mobile-wrapper.dark-mode .mobile-bottom-icon.ar-active .mobile-bottom-icon-img.ar-icon {
            filter: brightness(0) invert(1);
          }

          .view-controls-mobile-wrapper.dark-mode .mobile-bottom-icon.disabled .mobile-bottom-icon-img.ar-icon {
            filter: grayscale(100%) opacity(0.4);
          }

          .mobile-bottom-icon-label {
            font-size: 9px;
            font-weight: 600;
            color: #333;
            text-align: center;
            line-height: 1.2;
          }

          .view-controls-mobile-wrapper.dark-mode .mobile-bottom-icon-label {
            color: #fff;
          }

          .mobile-bottom-icon.active .mobile-bottom-icon-label,
          .mobile-bottom-icon.ar-active .mobile-bottom-icon-label {
            color: #ff4757;
          }

          .view-controls-mobile-wrapper.dark-mode .mobile-bottom-icon.active .mobile-bottom-icon-label,
          .view-controls-mobile-wrapper.dark-mode .mobile-bottom-icon.ar-active .mobile-bottom-icon-label {
            color: #ff6b7a;
          }
        }

        @media (min-width: 449px) and (max-width: 768px) {
          .mobile-controls-unified-container {
            bottom: 0 !important;
            padding: 12px !important;
            padding-bottom: 16px !important;
            gap: 12px !important;
          }

          .mobile-undo-redo-controls {
            background-color: white;
            border-radius: 30px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 10px 0;
            align-items: center;
          }

          /* ✅ Dark mode for undo/redo container */
          .view-controls-mobile-wrapper.dark-mode .mobile-undo-redo-controls {
            background-color: #2a2a2a !important;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4) !important;
          }

          .mobile-panel-buttons-wrapper {
            gap: 12px !important;
          }

          .mobile-panel-btn {
            height: 75px !important;
          }

          .mobile-panel-btn-icon {
            width: 32px !important;
            height: 32px !important;
          }

          .mobile-panel-btn-label {
            font-size: 11px !important;
          }

          .mobile-bottom-container {
            gap: 8px !important;
          }

          .mobile-bottom-icon {
            padding: 12px 5px !important;
          }

          .mobile-bottom-icon-img {
            width: 20px !important;
            height: 20px !important;
          }

          .mobile-bottom-icon-label {
            font-size: 9px !important;
          }

          .view-controls-mobile-wrapper .zoom-controls {
            left: 20px !important;
            gap: 10px !important;
            bottom: 220px !important;
          }

          .view-controls-mobile-wrapper .mobile-undo-redo-controls {
            position: fixed !important;
            left: 15px !important;
            top: 105px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            z-index: 101 !important;
          }
        }

        @media (max-width: 448px) {
          .mobile-controls-unified-container {
            bottom: 0 !important;
            padding: 10px !important;
            padding-bottom: 14px !important;
            gap: 10px !important;
          }

          .mobile-undo-redo-controls {
            background-color: white;
            border-radius: 30px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            gap: 10px;
            top: 100px !important;
            padding: 10px 0;
            align-items: center;
          }

          /* ✅ Dark mode for undo/redo container */
          .view-controls-mobile-wrapper.dark-mode .mobile-undo-redo-controls {
            background-color: #2a2a2a !important;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4) !important;
          }

          .mobile-panel-buttons-wrapper {
            gap: 10px !important;
          }

          .mobile-panel-btn {
            height: 70px;
          }

          .mobile-panel-btn-icon {
            width: 28px;
            height: 28px;
          }

          .mobile-panel-btn-label {
            font-size: 10px;
            bottom: 6px;
          }

          .mobile-bottom-container {
            gap: 6px !important;
          }

          .mobile-bottom-icon {
            padding: 10px 4px !important;
          }

          .mobile-bottom-icon-img {
            width: 18px !important;
            height: 18px !important;
          }

          .mobile-bottom-icon-label {
            font-size: 8px !important;
          }

          .view-controls-mobile-wrapper .zoom-controls {
            left: 15px !important;
            gap: 8px !important;
            bottom: 200px !important;
          }

          .view-controls-mobile-wrapper .mobile-undo-redo-controls {
            position: fixed !important;
            left: 15px !important;
            top: 100px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            z-index: 101 !important;
          }
        }

        @media (max-width: 380px) {
          .mobile-controls-unified-container {
            padding: 8px !important;
            padding-bottom: 12px !important;
            gap: 8px !important;
          }

          .mobile-panel-buttons-wrapper {
            gap: 8px !important;
          }

          .mobile-panel-btn {
            height: 65px;
          }

          .mobile-bottom-container {
            gap: 5px !important;
          }

          .mobile-bottom-icon {
            padding: 8px 3px !important;
          }

          .mobile-bottom-icon-img {
            width: 16px !important;
            height: 16px !important;
          }

          .mobile-bottom-icon-label {
            font-size: 7px !important;
          }
        }

        /* ✅ Desktop - no changes */
        @media (min-width: 769px) {
          .mobile-home-button-wrapper,
          .mobile-controls-unified-container,
          .mobile-undo-redo-controls {
            display: none !important;
          }

          /* ✅ Desktop panel buttons stay visible */
          .view-controls-mobile-wrapper .desktop-panel-button-mobile {
            display: block !important;
          }
        }

        @media (min-width: 769px) {
          .view-controls-mobile-wrapper .view-control-button.primary {
            display: block !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      const styleElement = document.getElementById(styleId);
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  const handleToggleSidePanel = () => {
    setShowSidePanel(prev => !prev);
    if (setShowOfficeSidePanel) {
      setShowOfficeSidePanel(false);
    }
    setActiveButton(prev => (prev === 'side-panel' ? null : 'side-panel'));
  };

  const handleToggleOffice = () => {
    if (setShowOfficeSidePanel) {
      setShowOfficeSidePanel(prev => !prev);
    }
    setShowSidePanel(false);
    setActiveButton(prev => (prev === 'office-panel' ? null : 'office-panel'));
  };

  const buttonContainerStyle = {
    position: 'absolute',
    top: '-40px',
    right: '1px',
    transform: 'translateY(-50%)',
    zIndex: 1001,
    backgroundColor: darkMode ? '#333' : '#fff',
    borderRadius: '50%',
    padding: '8px',
    boxShadow: darkMode
      ? '0 2px 8px rgba(0,0,0,0.4)'
      : '0 2px 8px rgba(0,0,0,0.15)',
    width: '48px',
    height: '48px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : 'none',
    transition: 'all 0.3s ease',
  };

  const buttonContainer = {
    position: 'absolute',
    top: '-105px',
    right: '1px',
    transform: 'translateY(-50%)',
    zIndex: 1001,
    backgroundColor: darkMode ? '#333' : '#fff',
    borderRadius: '50%',
    padding: '8px',
    boxShadow: darkMode
      ? '0 2px 8px rgba(0,0,0,0.4)'
      : '0 2px 8px rgba(0,0,0,0.15)',
    width: '48px',
    height: '48px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : 'none',
    transition: 'all 0.3s ease',
  };

  return (
    <>
      <div className={`view-controls view-controls-mobile-wrapper ${darkMode ? 'dark-mode' : ''}`}>
        <div className="view-control-button primary">
          <IconButton
            imageSrc={`assets/icons/${viewMode === '2D' ? '3d' : '2d'}.svg`}
            darkImageSrc={`assets/icons/${viewMode === '2D' ? '3d-light' : '2d-light'}.svg`}
            tooltip={`Switch to ${viewMode === '2D' ? '3D' : '2D'} View`}
            onClick={() => onViewAction('toggle-view')}
            active={activeButton === 'toggle-view'}
            darkMode={darkMode}
          />
        </div>

        {/* ✅ Mobile Undo/Redo Controls - Top Left, styled like zoom controls */}
        <div className="mobile-undo-redo-controls">
          <IconButton
            imageSrc="assets/icons/undo.svg"
            darkImageSrc="assets/icons/undo-light.svg"
            tooltip="Undo"
            onClick={() => onViewAction('undo')}
            active={activeButton === 'undo'}
            darkMode={darkMode}
          />
          <IconButton
            imageSrc="assets/icons/redo.svg"
            darkImageSrc="assets/icons/redo-light.svg"
            tooltip="Redo"
            onClick={() => onViewAction('redo')}
            active={activeButton === 'redo'}
            darkMode={darkMode}
          />
        </div>

        {/* Zoom Controls - Bottom Left */}
        <div className="zoom-controls">
          <IconButton
            imageSrc="assets/icons/zoom-in.svg"
            darkImageSrc="assets/icons/zoom-in-light.svg"
            tooltip="Zoom-In"
            onClick={() => onViewAction('zoom-in')}
            active={activeButton === 'zoom-in'}
            darkMode={darkMode}
          />
          {/* ✅ Home button with dimension deactivation - no active state */}
          <IconButton
            imageSrc="assets/icons/home.svg"
            darkImageSrc="assets/icons/home-light.svg"
            tooltip="Home"
            onClick={handleHomeClick}
            active={false}
            darkMode={darkMode}
          />
          <IconButton
            imageSrc="assets/icons/zoom-out.svg"
            darkImageSrc="assets/icons/zoom-out-light.svg"
            tooltip="Zoom-Out"
            onClick={() => onViewAction('zoom-out')}
            active={activeButton === 'zoom-out'}
            darkMode={darkMode}
          />
        </div>

        {/* ✅ Desktop panel buttons - visible on desktop, hidden on mobile */}
        <div style={buttonContainerStyle} className="desktop-panel-button-mobile">
          <img
            src={`./assets/icons/products/table${darkMode ? '' : ''}.png`}
            alt={showOfficeSidePanel ? "Hide Office Categories" : "Show Office Categories"}
            title={showOfficeSidePanel ? "Hide Office Categories" : "Show Office Categories"}
            onClick={handleToggleOffice}
            style={{
              padding: 0,
              borderRadius: '50%',
              overflow: 'hidden',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              objectFit: 'cover',
            }}
          />
        </div>

        <div style={buttonContainer} className="desktop-panel-button-mobile">
          <img
            src={`./assets/icons/products/Sportstech-sBike-Lite${darkMode ? '-light' : ''}.webp`}
            alt={showSidePanel ? "Hide Sports Categories" : "Show Sports Categories"}
            title={showSidePanel ? "Hide Sports Categories" : "Show Sports Categories"}
            onClick={handleToggleSidePanel}
            style={{
              padding: 0,
              borderRadius: '50%',
              overflow: 'hidden',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              objectFit: 'cover',
            }}
          />
        </div>

        <div className="mobile-controls-unified-container">
          <div className="mobile-panel-buttons-wrapper">
            <div
              className={`mobile-panel-btn mobile-office-btn ${activeButton === 'office-panel' ? 'active' : ''}`}
              onClick={handleToggleOffice}
              title="Home Assets"
            >
              <div
                className="mobile-panel-btn-bg"
                style={{
                  backgroundImage: `url('./assets/icons/products/assetshome.png')`
                }}
              >
                <img
                  src="assets/icons/home2.svg"
                  alt="Home Assets Icon"
                  className="mobile-panel-btn-icon"
                />
              </div>
              <div className="mobile-panel-btn-label">Home Assets</div>
            </div>
            <div
              className={`mobile-panel-btn mobile-sports-btn ${activeButton === 'side-panel' ? 'active' : ''}`}
              onClick={handleToggleSidePanel}
              title="Products"
            >
              <div
                className="mobile-panel-btn-bg"
                style={{
                  backgroundImage: `url('./assets/icons/products/products.png')`
                }}
              >
                <img
                  src="assets/icons/home3.svg"
                  alt="Products Icon"
                  className="mobile-panel-btn-icon"
                />
              </div>
              <div className="mobile-panel-btn-label">Products</div>
            </div>
          </div>

          {/* Bottom 4 icons - Home, Scale, AR, Room Shapes */}
          <div className="mobile-bottom-container">
            {/* ✅ Home button in bottom panel - no active state */}
            <div
              className="mobile-bottom-icon"
              onClick={handleHomeClick}
              title="Home"
            >
              <img
                src={darkMode ? "assets/icons/home-light.svg" : "assets/icons/home.svg"}
                alt="Home"
                className="mobile-bottom-icon-img"
              />
              <span className="mobile-bottom-icon-label">Home</span>
            </div>

            <div
              className={`mobile-bottom-icon ${activeButton === 'scale' ? 'active' : ''}`}
              onClick={() => {
                onViewAction('scale');
                setActiveButton(activeButton === 'scale' ? null : 'scale');
              }}
              title="Scale"
            >
              <img
                src={darkMode ? "assets/icons/scale-light.svg" : "assets/icons/scale.svg"}
                alt="Scale"
                className="mobile-bottom-icon-img"
              />
              <span className="mobile-bottom-icon-label">Scale</span>
            </div>

            <div
              className={`mobile-bottom-icon ${!selectedObject ? 'disabled' : 'ar-active'}`}
              onClick={handleARClick}
              title={selectedObject ? "View in AR" : "Select an object first"}
            >
              <img
                src="./assets/icons/ar-icon.svg"
                alt="AR"
                className="mobile-bottom-icon-img ar-icon"
              />
              <span className="mobile-bottom-icon-label">AR</span>
            </div>

            <div
              className="mobile-bottom-icon"
              onClick={handleRoomShapesClick}
              title="Room Shapes"
            >
              <img
                src="./assets/icons/wall-fill.svg"
                alt="Room Shapes"
                className="mobile-bottom-icon-img"
                style={{
                  filter: darkMode ? 'brightness(0) invert(1)' : 'none'
                }}
              />
              <span className="mobile-bottom-icon-label">Room Shapes</span>
            </div>
          </div>
        </div>
      </div>

      <ARQrModal
        visible={qrVisible}
        modelName={qrModelName}
        onClose={() => setQrVisible(false)}
      />
    </>
  );
};

export default ViewControls;