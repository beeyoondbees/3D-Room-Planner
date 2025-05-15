// src/components/UI/Toolbar.jsx
// Top toolbar component with various action buttons

import React from 'react';
import IconButton from '../common/IconButton';

const Toolbar = ({ viewMode, onViewAction, onObjectAction, selectedObject }) => {
  return (
    <div className="toolbar">
      {/* Left section - Menu */}
      <div className="toolbar-section">
        <IconButton 
          icon="logo" 
          tooltip="Logo"
          onClick={() => {}} // Toggle menu visibility
        />
      </div>
      
      {/* Center section - Scene controls */}
      <div className="toolbar-section toolbar-center">
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
        
        <div className="toolbar-separator"></div>
        
        <IconButton 
          icon="grid" 
          tooltip="Toggle Grid"
          onClick={() => onViewAction('toggle-grid')}
        />
        
        <IconButton 
          icon="text" 
          tooltip="Add Text Label"
          onClick={() => {}} // Add text label functionality
        />
        
        <IconButton 
          icon="ruler" 
          tooltip="Measure"
          onClick={() => {}} // Measure tool functionality
        />
        
        <IconButton 
          icon="settings" 
          tooltip="Settings"
          onClick={() => {}} // Open settings panel
        />
      </div>
      
      {/* Right section - View options */}
      <div className="toolbar-section toolbar-right">
        <IconButton 
          icon="comments" 
          tooltip="Comments"
          onClick={() => {}} // Open comments panel
        />
        
        <IconButton 
          icon="layers" 
          tooltip="Layers"
          onClick={() => {}} // Open layers panel
        />
        
        <IconButton 
          icon="camera" 
          tooltip="Take Screenshot"
          onClick={() => {}} // Take screenshot functionality
        />
        
        <IconButton 
          icon="images" 
          tooltip="Gallery"
          onClick={() => {}} // Open gallery
        />
        
        <IconButton 
          icon="file-export" 
          tooltip="Export"
          onClick={() => {}} // Export functionality
        />
        
        <IconButton 
          icon="ellipsis-v" 
          tooltip="More Options"
          onClick={() => {}} // More options menu
        />
      </div>
    </div>
  );
};

export default Toolbar;