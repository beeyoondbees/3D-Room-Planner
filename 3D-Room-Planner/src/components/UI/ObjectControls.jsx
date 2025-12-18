import React, { useState, useEffect } from 'react';
import ARQrModal from './ARQrModal';

const ObjectControls = ({
  selectedObject,
  onObjectAction,
  interactionMode,
  onViewAction
}) => {
  const [qrVisible, setQrVisible] = useState(false);
  const [qrModelName, setQrModelName] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Sync local pin state whenever selectedObject changes
  useEffect(() => {
    setIsPinned(selectedObject?.userData?.isPinned || false);
    setIsAnimating(selectedObject?.userData?.isAnimating || false);
  }, [selectedObject]);

  // Early return after hooks
  if (!selectedObject) return null;

  const hasAnimations = selectedObject.userData?.animations?.length > 0;

  const formatType = (type) => {
    if (!type) return 'Object';
    return type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleAnimationClick = () => {
    onObjectAction('animate');
    setIsAnimating(!isAnimating);
    if (selectedObject.userData) {
      selectedObject.userData.isAnimating = !isAnimating;
    }
  };

  const handlePinClick = () => {
    if (isPinned) {
      setIsPinned(false);
      onObjectAction('unpin');
    } else {
      setIsPinned(true);
      onObjectAction('pin');
    }
  };

  const handleARClick = () => {
    const modelType = selectedObject?.userData?.type || 'unknown';
    setQrModelName(modelType);
    setQrVisible(true);
  };

  // MOBILE FLOATING BAR - SEPARATE MOVE AND ROTATE BUTTONS
  if (isMobile) {
    return (
      <>
        <div className="object-controls-mobile">
  <button
    className="mobile-control-btn"
    onClick={() => onObjectAction('duplicate')}
    title="Duplicate"
  >
    <i className="fas fa-copy"></i>
  </button>

  <button
    className={`mobile-control-btn ${isPinned ? 'active' : ''}`}
    onClick={handlePinClick}
    title={isPinned ? "Unpin" : "Pin"}
  >
    <i className="fas fa-thumbtack"></i>
  </button>

  <button
    className="mobile-control-btn danger"
    onClick={() => onObjectAction('delete')}
    title="Delete"
  >
    <i className="fas fa-trash"></i>
  </button>

  <button
    className={`mobile-control-btn ${interactionMode === 'translate' ? 'active' : ''}`}
    onClick={() => onObjectAction('translate')}
    title="Move Mode"
    disabled={isPinned}
  >
    <i className="fas fa-arrows-alt"></i>
  </button>

  <button
    className={`mobile-control-btn ${interactionMode === 'rotate' ? 'active' : ''}`}
    onClick={() => onObjectAction('rotate')}
    title="Rotate Mode"
    disabled={isPinned}
  >
    <i className="fas fa-sync-alt"></i>
  </button>

  {/* ✅ ADD THIS BUTTON (Animation) */}
  <button
    className={`mobile-control-btn ${isAnimating ? 'active' : ''} ${!hasAnimations ? 'disabled' : ''}`}
    onClick={handleAnimationClick}
    disabled={!hasAnimations}
    title={
      !hasAnimations
        ? "No animation available"
        : isAnimating
        ? "Pause Animation"
        : "Play Animation"
    }
  >
    <i className={`fas ${isAnimating ? 'fa-pause' : 'fa-play'}`}></i>
  </button>
        </div>
        
        <ARQrModal
          visible={qrVisible}
          modelName={qrModelName}
          onClose={() => setQrVisible(false)}
        />
      </>
    );
  }

  // DESKTOP SIDE PANEL (original)
  return (
    <>
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
                <path d="M5 9l7-7 7 7M12 2v20" />
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
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
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
              onClick={handlePinClick}
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
            <button
              className={`action-button ${isAnimating ? 'animating' : ''}`}
              onClick={handleAnimationClick}
              disabled={!hasAnimations}
              title={isAnimating ? "Pause Animation" : "Play Animation"}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                <path d={isAnimating ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M5 3l14 9-14 9V3z"} />
              </svg>
              <span>{isAnimating ? 'Pause' : 'Play'}</span>
            </button>
            <button
              className="action-button ar-button"
              onClick={handleARClick}
              title="View in AR"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <img src="./assets/icons/ar-icon.svg" alt="AR Icon" width="16" height="16" />
              <span>View in AR</span>
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
      </div>
      
      <ARQrModal
        visible={qrVisible}
        modelName={qrModelName}
        onClose={() => setQrVisible(false)}
      />
    </>
  );
};

export default ObjectControls;