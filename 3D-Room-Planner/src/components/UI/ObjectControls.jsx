// src/components/UI/ObjectControls.jsx
// UI component for controlling selected objects

import React from 'react';

const ObjectControls = ({ 
  selectedObject, 
  onObjectAction,
  transformMode
}) => {
  if (!selectedObject) return null;
  
  // Check if object is pinned
  const isPinned = selectedObject.userData.isPinned;
  
  // Handle transform mode button clicks
  const handleModeClick = (mode) => {
    onObjectAction(mode);
  };
  
  // Handle object action clicks
  const handleActionClick = (action) => {
    onObjectAction(action);
  };
  
  // Handle rotation
  const handleRotate = (degrees) => {
    onObjectAction('rotate-by', degrees);
  };
  
  return (
    <div className="object-controls">
      <h3>Selected: {selectedObject.userData.type}</h3>
      
      <div className="control-section">
        <h4>Transform</h4>
        <div className="button-group">
          <button 
            className={transformMode === 'translate' ? 'active' : ''} 
            onClick={() => handleModeClick('translate')}
            disabled={isPinned}
          >
            Move
          </button>
          <button 
            className={transformMode === 'rotate' ? 'active' : ''} 
            onClick={() => handleModeClick('rotate')}
            disabled={isPinned}
          >
            Rotate
          </button>
          <button 
            className={transformMode === 'scale' ? 'active' : ''} 
            onClick={() => handleModeClick('scale')}
            disabled={isPinned}
          >
            Scale
          </button>
        </div>
      </div>
      
      <div className="control-section">
        <h4>Quick Rotation</h4>
        <div className="button-group">
          <button 
            onClick={() => handleRotate(-90)}
            disabled={isPinned}
          >
            -90°
          </button>
          <button 
            onClick={() => handleRotate(-45)}
            disabled={isPinned}
          >
            -45°
          </button>
          <button 
            onClick={() => handleRotate(45)}
            disabled={isPinned}
          >
            +45°
          </button>
          <button 
            onClick={() => handleRotate(90)}
            disabled={isPinned}
          >
            +90°
          </button>
        </div>
      </div>
      
      <div className="control-section">
        <h4>Actions</h4>
        <div className="button-group">
          <button 
            onClick={() => handleActionClick(isPinned ? 'unpin' : 'pin')}
          >
            {isPinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={() => handleActionClick('duplicate')}>
            Duplicate
          </button>
          <button onClick={() => handleActionClick('delete')} className="danger">
            Delete
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .object-controls {
          position: absolute;
          top: 10px;
          right: 10px;
          background-color: rgba(30, 30, 30, 0.8);
          color: white;
          padding: 15px;
          border-radius: 8px;
          width: 250px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        
        h3 {
          margin-top: 0;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.2);
          text-transform: capitalize;
        }
        
        h4 {
          margin: 10px 0 5px;
          font-size: 14px;
        }
        
        .control-section {
          margin-bottom: 15px;
        }
        
        .button-group {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        
        button {
          padding: 8px 12px;
          background-color: #444;
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 12px;
          flex-grow: 1;
        }
        
        button:hover {
          background-color: #555;
        }
        
        button.active {
          background-color: #0088ff;
        }
        
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        button.danger {
          background-color: #ff3333;
        }
        
        button.danger:hover {
          background-color: #ff5555;
        }
      `}</style>
    </div>
  );
};

export default ObjectControls;