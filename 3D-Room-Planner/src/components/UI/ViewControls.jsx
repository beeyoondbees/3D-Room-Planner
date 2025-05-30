import React from 'react';
import IconButton from '../common/IconButton';

const ViewControls = ({
  viewMode,
  onViewAction,
  isGridVisible,
  showSidePanel,
  setShowSidePanel,
  activeButton,
  setActiveButton
}) => {
  const handleToggleSidePanel = () => {
    setShowSidePanel(prev => !prev);
    setActiveButton(prev => (prev === 'side-panel' ? null : 'side-panel'));
  };

  // Base and active styles for the <img> element
  const baseStyle = {
    // Add base styles if needed
  };

  const activeStyle = {
    // backgroundColor: 'rgba(0, 0, 0, 0.2)', // Dark highlight for active state
  };

  // Style for the <img> element
  const getImageStyle = (isActive, src) => ({
    ...baseStyle,
    ...(isActive ? activeStyle : {}),
    padding: 0,
    borderRadius: '50%',
    overflow: 'hidden',
    width: '24px', // Consistent with Toolbar styling
    height: '24px',
    cursor: 'pointer',
    margin: src ? '0px' : '6px', // Conditional margin: 0px since src is present
  });

  return (
    <div className="view-controls">
      {/* View toggle */}
      <div className="view-control-button primary">
        <IconButton
          imageSrc={`assets/icons/${viewMode === '2D' ? '3d' : '2d'}-icon.svg`}
          tooltip={`Switch to ${viewMode === '2D' ? '3D' : '2D'} View`}
          onClick={() => onViewAction('toggle-view')}
          active={activeButton === 'toggle-view'}
        />
      </div>

      {/* Zoom controls */}
      <div className="zoom-controls">
        <IconButton
          imageSrc="assets/icons/zoom-in.svg"
          tooltip="Zoom-In"
          onClick={() => onViewAction('zoom-in')}
          active={activeButton === 'zoom-in'}
        />
        <IconButton
          imageSrc="assets/icons/home-icon.svg"
          tooltip="Home"
          onClick={() => onViewAction('reset-view')}
          active={activeButton === 'reset-view'}
        />
        <IconButton
          imageSrc="assets/icons/zoom-out.svg"
          tooltip="Zoom-Out"
          onClick={() => onViewAction('zoom-out')}
          active={activeButton === 'zoom-out'}
        />
      </div>

      {/* Categories Toggle (Right side button) */}
      <div
        className="sidepanel-toggle-button"
      >
        <img
          src="./assets/icons/products/Sportstech-sBike.webp"
          alt={showSidePanel ? "Hide Categories" : "Show Categories"}
          title={showSidePanel ? "Hide Categories" : "Show Categories"}
          onClick={handleToggleSidePanel}
          style={getImageStyle(activeButton === 'side-panel', './assets/icons/products/Sportstech-sBike.webp')}
        />
      </div>

    </div>
  );
};

export default ViewControls;