// src/components/UI/ObjectControls.jsx
// UI component for object manipulation

import React from 'react';

const ObjectControls = ({ 
  selectedObject, 
  onObjectAction,
  interactionMode
}) => {
  if (!selectedObject) return null;
  
  // Check if object is pinned
  const isPinned = selectedObject.userData?.isPinned;
  
  // Format object type for display
  const formatType = (type) => {
    if (!type) return 'Object';
    return type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  return (
    <div className="object-controls">
      <div className="object-header">
        <h3>{formatType(selectedObject.userData?.type)}</h3>
        <button 
          className="close-button"
          onClick={() => onObjectAction('deselect')}
          title="Deselect"
        >
          ×
        </button>
      </div>
      
      <div className="control-section">
        <h4>Interaction Mode</h4>
        <div className="button-group">
          <button 
            className={`tool-button ${interactionMode === 'translate' ? 'active' : ''}`}
            onClick={() => onObjectAction('translate')}
            disabled={isPinned}
            title="Move Mode (T)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M5 9l7-7 7 7M12 2v20"/>
            </svg>
            <span>Move</span>
          </button>
          <button 
            className={`tool-button ${interactionMode === 'rotate' ? 'active' : ''}`}
            onClick={() => onObjectAction('rotate')}
            disabled={isPinned}
            title="Rotate Mode (R)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            <span>Rotate</span>
          </button>
        </div>
      </div>
      
      <div className="control-section">
        <h4>Quick Rotation</h4>
        <div className="button-group">
          <button 
            className="rotation-button"
            onClick={() => onObjectAction('rotate-by', -90)}
            disabled={isPinned}
            title="Rotate -90°"
          >
            -90°
          </button>
          <button 
            className="rotation-button"
            onClick={() => onObjectAction('rotate-by', -45)}
            disabled={isPinned}
            title="Rotate -45°"
          >
            -45°
          </button>
          <button 
            className="rotation-button"
            onClick={() => onObjectAction('rotate-by', 45)}
            disabled={isPinned}
            title="Rotate +45°"
          >
            +45°
          </button>
          <button 
            className="rotation-button"
            onClick={() => onObjectAction('rotate-by', 90)}
            disabled={isPinned}
            title="Rotate +90°"
          >
            +90°
          </button>
        </div>
      </div>
      
      <div className="control-section">
        <h4>Actions</h4>
        <div className="button-group">
          <button 
            className={`action-button ${isPinned ? 'pinned' : ''}`}
            onClick={() => onObjectAction(isPinned ? 'unpin' : 'pin')}
            title={isPinned ? "Unpin (P)" : "Pin (P)"}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <path d={isPinned 
                ? "M18 8l-6 6M15 5l3 3-5 5-3-3M9 15l-5 5M14 19l5-5-3-3-5 5 3 3z" 
                : "M9 4v6l-2 2M16 4v7.5"} />
              <circle cx="12" cy="12" r={isPinned ? 0 : 3} />
              <path d={isPinned ? "" : "M5 19l5-5M15 13l4 4"} />
            </svg>
            <span>{isPinned ? 'Unpin' : 'Pin'}</span>
          </button>
          <button 
            className="action-button"
            onClick={() => onObjectAction('duplicate')}
            title="Duplicate"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
            </svg>
            <span>Duplicate</span>
          </button>
          <button 
            className="action-button danger"
            onClick={() => onObjectAction('delete')}
            title="Delete (Del)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
            </svg>
            <span>Delete</span>
          </button>
        </div>
      </div>
      
      <div className="help-section">
        <p className="help-text">
          <span className="help-icon">💡</span> 
          {interactionMode === 'translate' 
            ? "Click and drag to move the object" 
            : "Click and drag left/right to rotate the object"}
        </p>
      </div>
      
      <style jsx>{`
        .object-controls {
          position: absolute;
          top: 70px;
          right: 15px;
          background-color: rgba(42, 42, 46, 0.9);
          color: white;
          padding: 15px;
          border-radius: 8px;
          width: 280px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(5px);
          z-index: 1000;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        }
        
        .object-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
        }
        
        .close-button {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        
        .close-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: white;
        }
        
        h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }
        
        .control-section {
          margin-bottom: 18px;
        }
        
        .button-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .tool-button, .action-button, .rotation-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          background-color: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 13px;
          flex-grow: 1;
          transition: all 0.2s ease;
        }
        
        .tool-button svg, .action-button svg {
          margin-right: 5px;
        }
        
        .tool-button:hover, .action-button:hover, .rotation-button:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        
        .tool-button.active {
          background-color: rgba(66, 153, 225, 0.6);
        }
        
        .tool-button:disabled, .action-button:disabled, .rotation-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .action-button.danger {
          background-color: rgba(229, 62, 62, 0.6);
        }
        
        .action-button.danger:hover {
          background-color: rgba(229, 62, 62, 0.8);
        }
        
        .action-button.pinned {
          background-color: rgba(237, 137, 54, 0.6);
        }
        
        .action-button.pinned:hover {
          background-color: rgba(237, 137, 54, 0.8);
        }
        
        .help-section {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 10px;
        }
        
        .help-text {
          margin: 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
        }
        
        .help-icon {
          margin-right: 8px;
          font-size: 16px;
        }
        
        @media (max-width: 768px) {
          .object-controls {
            bottom: 10px;
            top: auto;
            right: 10px;
            left: 10px;
            width: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default ObjectControls;