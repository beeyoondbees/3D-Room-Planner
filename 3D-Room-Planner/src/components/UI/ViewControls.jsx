// src/components/UI/ViewControls.jsx
// View controls for 2D/3D toggle and zoom

import React from 'react';
import IconButton from '../common/IconButton';

const ViewControls = ({ viewMode, onViewAction, isGridVisible }) => {
  return (
    <div className="view-controls">
      {/* Main view toggle button */}
      <div className="view-control-button primary">
        <IconButton 
          icon={viewMode === '2D' ? '3d' : '2d'} 
          tooltip={`Switch to ${viewMode === '2D' ? '3D' : '2D'} View`}
          onClick={() => onViewAction('toggle-view')}
          size="large"
        />
      </div>
      
      {/* Zoom controls */}
      <div className="zoom-controls">
        <IconButton 
          icon="plus" 
          tooltip="Zoom In"
          onClick={() => onViewAction('zoom-in')}
        />
        
        <IconButton 
          icon="home" 
          tooltip="Reset View"
          onClick={() => onViewAction('reset-view')}
        />
        
        <IconButton 
          icon="minus" 
          tooltip="Zoom Out"
          onClick={() => onViewAction('zoom-out')}
        />
      </div>
    </div>
  );
};

export default ViewControls;