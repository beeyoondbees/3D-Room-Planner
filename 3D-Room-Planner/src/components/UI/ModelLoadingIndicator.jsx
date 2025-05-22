// src/components/UI/ModelLoadingIndicator.jsx
// Shows progress when loading models

import React, { useState, useEffect } from 'react';

const ModelLoadingIndicator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentModel, setCurrentModel] = useState('');
  
  useEffect(() => {
    // Listen for model loading events
    const handleLoadingStarted = (event) => {
      setIsLoading(true);
      setProgress(0);
      setCurrentModel(event.detail.modelType);
    };
    
    const handleLoadingProgress = (event) => {
      setProgress(event.detail.progress * 100);
    };
    
    const handleLoadingCompleted = () => {
      setIsLoading(false);
    };
    
    const handleLoadingError = () => {
      setIsLoading(false);
    };
    
    // Add event listeners
    window.addEventListener('model-loading-started', handleLoadingStarted);
    window.addEventListener('model-loading-progress', handleLoadingProgress);
    window.addEventListener('model-loading-completed', handleLoadingCompleted);
    window.addEventListener('model-loading-error', handleLoadingError);
    
    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('model-loading-started', handleLoadingStarted);
      window.removeEventListener('model-loading-progress', handleLoadingProgress);
      window.removeEventListener('model-loading-completed', handleLoadingCompleted);
      window.removeEventListener('model-loading-error', handleLoadingError);
    };
  }, []);
  
  if (!isLoading) return null;
  
  return (
    <div className="model-loading-indicator">
      <div className="loading-overlay">
        <div className="loading-content">
          <h3>Loading {currentModel}</h3>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
          <div className="progress-text">
            {Math.round(progress)}%
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .model-loading-indicator {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          pointer-events: none;
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .loading-content {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          text-align: center;
          pointer-events: auto;
        }
        
        .progress-bar {
          width: 300px;
          height: 20px;
          background-color: #f0f0f0;
          border-radius: 10px;
          margin: 10px 0;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background-color: #4caf50;
          transition: width 0.3s ease;
        }
        
        .progress-text {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default ModelLoadingIndicator;