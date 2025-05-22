// src/components/UI/Toolbar.jsx
// Top toolbar component with various action buttons

import React from 'react';
import IconButton from '../common/IconButton';

const Toolbar = ({ viewMode, onViewAction, onObjectAction, selectedObject }) => {
  return (
    <div className="toolbar" style={styles.toolbar}> {/* Added style */}
      {/* Left section - Menu */}
      <div className="toolbar-section" style={styles.toolbarSection}> {/* Added style */}
        <IconButton 
          icon="logo" 
          tooltip="Logo"
          onClick={() => { console.log("Logo clicked"); }} // Example action
        />
      </div>
      
      {/* Center section - Scene controls */}
      <div className="toolbar-section toolbar-center" style={{...styles.toolbarSection, ...styles.toolbarCenter}}> {/* Added style */}
        <IconButton 
          icon="undo" 
          tooltip="Undo"
          onClick={() => onViewAction('undo')}
        />
        
        <IconButton 
          icon="redo" 
          tooltip="Redo"
          onClick={() => onViewAction('redo')}
        />
        
        <div className="toolbar-separator" style={styles.toolbarSeparator}></div> {/* Added style */}
        
        <IconButton 
          icon="grid" 
          tooltip="Toggle Grid"
          onClick={() => onViewAction('toggle-grid')}
        />
        
        <IconButton 
          icon="text" 
          tooltip="Add Text Label"
          onClick={() => { console.log("Add text label clicked"); onViewAction('add-text-label');}} // Example action
        />
        <IconButton 
          icon="ruler" 
          tooltip="Toggle Floor Dimensions Editor" // Changed tooltip slightly for clarity
          onClick={() => onViewAction('toggle-floor-dimensions')} // This triggers the action
        />
      
        <IconButton 
          icon="settings" 
          tooltip="Settings"
          onClick={() => { console.log("Settings clicked"); onViewAction('open-settings');}} // Example action
        />
      </div>
      
      {/* Right section - View options */}
      <div className="toolbar-section toolbar-right" style={{...styles.toolbarSection, ...styles.toolbarRight}}> {/* Added style */}
        <IconButton 
          icon="comments" 
          tooltip="Comments"
          onClick={() => {}} // Placeholder
        />
        <IconButton 
        icon="camera" 
        tooltip="Take Screenshot"
        onClick={() => onViewAction('take-screenshot')}
        />

        {/* ... other buttons ... */}
        <IconButton 
          icon="file-export" 
          tooltip="Export"
          onClick={() => {}} // Placeholder
        />
        <IconButton 
          icon="ellipsis-v" 
          tooltip="More Options"
          onClick={() => {}} // Placeholder
        />
      </div>
    </div>
  );
};

// Example inline styles (move to a CSS file for better management)
const styles = {
  // toolbar: {
  //   position: 'absolute',
  //   top: '10px', // Adjust as needed
  //   left: '50%',
  //   transform: 'translateX(-50%)',
  //   backgroundColor: 'rgba(40, 40, 40, 0.85)', // Example dark background
  //   padding: '5px 10px',
  //   borderRadius: '8px',
  //   display: 'flex',
  //   justifyContent: 'space-between', // This might need to be adjusted if toolbar-center is to truly be in center
  //   alignItems: 'center',
  //   zIndex: 1001, // Ensure it's above the 3D scene
  //   boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  //   minWidth: 'fit-content', // Ensure it doesn't collapse too much
  //   gap: '15px', // Gap between major sections
  // },
  // toolbarSection: {
  //   display: 'flex',
  //   alignItems: 'center',
  //   gap: '5px', // Gap between icons within a section
  // },
  // toolbarCenter: {
  //   // If you want this truly centered, the parent 'toolbar' might need
  //   // justifyContent: 'center' and this section would just be one of the items.
  //   // Or use flex-grow if it's between two other flexible sections.
  // },
  // toolbarRight: {
  //   // marginLeft: 'auto', // Pushes to the right if toolbar-center doesn't fill space
  // },
  // toolbarSeparator: {
  //   width: '1px',
  //   height: '24px', // Adjust to match button height
  //   backgroundColor: '#555',
  //   margin: '0 8px',
  // }
};

export default Toolbar;