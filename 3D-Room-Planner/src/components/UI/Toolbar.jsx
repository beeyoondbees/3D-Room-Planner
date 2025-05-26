// Top toolbar component with visual feedback (dark highlight) for clicked buttons

import React, { useState } from 'react';
import IconButton from '../common/IconButton';

const Toolbar = ({
  viewMode,
  onViewAction,
  onObjectAction,
  selectedObject,
  showSidePanel,
  setShowSidePanel,
  // New props for AR functionality
  hasSelectedModel = false,
  selectedModel = null,
  isModelLoaded = false
}) => {

  // AR View click handler
  const handleARViewClick = () => {
    if (!hasSelectedModel && !isModelLoaded) {
      console.log("AR View disabled - no model selected");
      return;
    }
   
    console.log("AR View activated for model:", selectedModel);
    onViewAction('ar-view'); // Fixed: proper AR action instead of 'open-settings'
  };
 
  // Determine if AR button should be enabled
  const isAREnabled = hasSelectedModel || isModelLoaded || selectedObject;

  // State to track active button for visual feedback
  const [activeButton, setActiveButton] = useState(null);

  const handleClick = (action, toggleOnly = false) => {
    if (!toggleOnly) {
      setActiveButton(prev => (prev === action ? null : action));
    }
    onViewAction(action);
  };

  return (
    <div className="toolbar" style={styles.toolbar}>
      {/* Left section */}
      <div className="toolbar-section" style={styles.toolbarSection}>
        <IconButton
          icon="logo"
          tooltip="Logo"
          onClick={() => handleClick('logo')}
          active={activeButton === 'logo'}
        />
      </div>

      {/* Center section - Scene controls */}
      <div className="toolbar-section toolbar-center" style={{ ...styles.toolbarSection, ...styles.toolbarCenter }}>
       
        <IconButton
            imageSrc="assets/icons/undo-icon.svg"
            tooltip="Undo"
            onClick={() => handleClick('undo')}
            active={activeButton === 'undo'}
        />
        <IconButton
            imageSrc="assets/icons/redo-icon.svg"
            tooltip="Redo"
            onClick={() => handleClick('redo')}
            active={activeButton === 'redo'}
        />

        <div className="toolbar-separator" style={styles.toolbarSeparator}></div>

         <IconButton
            imageSrc="assets/icons/grid-settings.svg"
            tooltip="Grid"
            onClick={() => handleClick('toggle-grid')}
            active={activeButton === 'toggle-grid'}
        />
         <IconButton
            imageSrc="assets/icons/scale-icon.svg"
            tooltip="Dimensions"
            onClick={() => handleClick('toggle-floor-dimensions')}
            active={activeButton === 'toggle-floor-dimensions'}
        />
        
        {/* <IconButton
          icon="text"
          tooltip="Add Text Label"
          onClick={() => handleClick('add-text-label')}
          active={activeButton === 'add-text-label'}
        /> */}
        {/* <IconButton
          icon="ruler"
          tooltip="Toggle Floor Dimensions"
          onClick={() => handleClick('toggle-floor-dimensions')}
          active={activeButton === 'toggle-floor-dimensions'}
        /> */}
        <IconButton
            imageSrc="assets/icons/settings-icon.svg"
            tooltip="Settings"
            onClick={() => handleClick('open-settings')}
            active={activeButton === 'open-settings'}
        />

         {/* Fixed AR View Button */}
        {/* <IconButton
          icon="qrcode"
          tooltip="Generate AR QR"
          onClick={() => onViewAction('generate-ar-qr')}
        /> */}
         <IconButton
            imageSrc="assets/icons/ar-icon.svg"
            tooltip="Generate AR QR"
            onClick={() => onViewAction('generate-ar-qr')}
            active={activeButton === 'generate-ar-qr'}
        />
      </div>

      {/* Right section */}
      <div className="toolbar-section toolbar-right" style={{ ...styles.toolbarSection, ...styles.toolbarRight }}>
        
         <IconButton
            imageSrc="assets/icons/screenshot-icon.svg"
            tooltip="Screenshot"
            onClick={() => onViewAction('take-screenshot')}
            active={activeButton === 'take-screenshot'}
        />
         <IconButton
            imageSrc="assets/icons/pep-icon.svg"
            tooltip="More Options"
            onClick={() => handleClick('more-options')}
            active={activeButton === 'more-options'}
        />
       
      </div>
    </div>
  );
};

const styles = {
  // toolbar: {
  //   position: 'absolute',
  //   top: '10px',
  //   left: '50%',
  //   transform: 'translateX(-50%)',
  //   backgroundColor: 'rgba(40, 40, 40, 0.85)',
  //   padding: '5px 10px',
  //   borderRadius: '8px',
  //   display: 'flex',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   zIndex: 1001,
  //   boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  //   minWidth: 'fit-content',
  //   gap: '15px',
  // },
  // toolbarSection: {
  //   display: 'flex',
  //   alignItems: 'center',
  //   gap: '5px',
  // },
  // toolbarCenter: {
  //   // Can expand with flex-grow
  // },
  // toolbarRight: {
  //   marginLeft: 'auto',
  // },
  // toolbarSeparator: {
  //   width: '1px',
  //   height: '24px',
  //   backgroundColor: '#555',
  //   margin: '0 8px',
  // },
};

export default Toolbar;
