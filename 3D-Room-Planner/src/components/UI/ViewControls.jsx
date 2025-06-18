import React, { useState, useEffect } from 'react';
import IconButton from '../common/IconButton';

const ViewControls = ({
  viewMode,
  onViewAction,
  isGridVisible,
  showSidePanel,
  setShowSidePanel,
  showOfficeSidePanel,  // Add this prop
  setShowOfficeSidePanel,  // Add this prop
  activeButton,
  setActiveButton,
}) => {
  // Auto-read dark mode from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('isDarkMode') === 'true';
  });

  // Listen for theme changes from MoreOptionsModal
  useEffect(() => {
    const handleThemeChange = (event) => {
      const { isDarkMode } = event.detail;
      setDarkMode(isDarkMode);
    };

    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Handle sports equipment panel toggle
  const handleToggleSidePanel = () => {
    setShowSidePanel(prev => !prev);
    if (setShowOfficeSidePanel) {
      setShowOfficeSidePanel(false); // Close office panel when opening sports panel
    }
    setActiveButton(prev => (prev === 'side-panel' ? null : 'side-panel'));
  };

  // Handle office panel toggle
  const handleToggleOffice = () => {
    if (setShowOfficeSidePanel) {
      setShowOfficeSidePanel(prev => !prev);
    }
    setShowSidePanel(false); // Close sports panel when opening office panel
    setActiveButton(prev => (prev === 'office-panel' ? null : 'office-panel'));
  };

  // Base and active styles for the <img> element
  const baseStyle = {};

  const activeStyle = {
    backgroundColor: darkMode 
      ? 'rgba(255, 255, 255, 0.2)' // Light highlight for dark mode
      : 'rgba(0, 0, 0, 0.2)', // Dark highlight for light mode
  };

  // Style for the <img> element
  const getImageStyle = (isActive, src) => ({
    ...baseStyle,
    ...(isActive ? activeStyle : {}),
    padding: 0,
    borderRadius: '50%',
    overflow: 'hidden',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    margin: src ? '0px' : '6px',
  });

  // Dark mode compatible button container style for office button
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

  // Dark mode compatible button container style for sports button
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
  }

  return (
    <div className="view-controls">
      {/* View toggle */}
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

      {/* Zoom controls */}
      <div className="zoom-controls">
        <IconButton
          imageSrc="assets/icons/zoom-in.svg"
          darkImageSrc="assets/icons/zoom-in-light.svg"
          tooltip="Zoom-In"
          onClick={() => onViewAction('zoom-in')}
          active={activeButton === 'zoom-in'}
          darkMode={darkMode}
        />
        <IconButton
          imageSrc="assets/icons/home.svg"
          darkImageSrc="assets/icons/home-light.svg"
          tooltip="Home"
          onClick={() => onViewAction('reset-view')}
          active={activeButton === 'reset-view'}
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

      {/* Office Panel Toggle (Top button) */}
      <div style={buttonContainerStyle}>
        <img
          src={`./assets/icons/products/table${darkMode ? '' : ''}.jpg`}
          alt={showOfficeSidePanel ? "Hide Office Categories" : "Show Office Categories"}
          title={showOfficeSidePanel ? "Hide Office Categories" : "Show Office Categories"}
          onClick={handleToggleOffice}
          style={getImageStyle(activeButton === 'office-panel', './assets/icons/products/table.jpg')}
        />
      </div>

      {/* Sports Equipment Panel Toggle (Bottom button) */}
      <div style={buttonContainer}>
        <img
          src={`./assets/icons/products/Sportstech-sBike-Lite${darkMode ? '-light' : ''}.webp`}
          alt={showSidePanel ? "Hide Sports Categories" : "Show Sports Categories"}
          title={showSidePanel ? "Hide Sports Categories" : "Show Sports Categories"}
          onClick={handleToggleSidePanel}
          style={getImageStyle(activeButton === 'sid-panel', './assets/icons/products/Sportstech-sBike-Lite.webp')}
        />
      </div>
    </div>
  );
};

export default ViewControls;