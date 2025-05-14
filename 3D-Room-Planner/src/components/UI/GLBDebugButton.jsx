// src/components/UI/GLBDebugButton.jsx
// Component to add a debug button for testing GLB models directly

import React from 'react';
import '../../utils/GLBModelTest';

const GLBDebugButton = ({ modelType }) => {
  const handleDebugClick = () => {
    // Generate model path
    const modelPath = `/assets/models/${modelType}.glb`;
    
    // Launch the GLB tester
    window.testGLBModel(modelPath);
  };
  
  return (
    <button 
      className="glb-debug-button"
      onClick={handleDebugClick}
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        padding: '8px 12px',
        backgroundColor: '#ff3e00',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
        zIndex: 9000,
        cursor: 'pointer'
      }}
    >
      Debug GLB Model
    </button>
  );
};

export default GLBDebugButton;