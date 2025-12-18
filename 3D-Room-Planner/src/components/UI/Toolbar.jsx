import React, { useState, useEffect } from 'react';
import IconButton from '../common/IconButton';
import MoreOptionsModal from '../../three/MoreOptionsModal';

const Toolbar = ({
  viewMode,
  onViewAction,
  onObjectAction,
  selectedObject,
  showSidePanel,
  setShowSidePanel,
  hasSelectedModel = false,
  selectedModel = null,
  isModelLoaded = false,
  hasModelsInScene = false,
  
  // Remove darkMode prop completely
}) => {
  const [activeButton, setActiveButton] = useState(null);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  
  // Auto-read dark mode from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('isDarkMode') === 'true';
  });

  // Listen for theme changes from MoreOptionsModal
  useEffect(() => {
    const handleThemeChange = (event) => {
      const { isDarkMode } = event.detail;
      setDarkMode(isDarkMode);
    };

    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const handleARViewClick = () => {
    console.log("AR View activated for model:", selectedModel || "available models");
    onViewAction('generate-ar-qr');
    setActiveButton('generate-ar-qr');
    setIsMoreOptionsOpen(false);
  };

  const isAREnabled = hasSelectedModel || isModelLoaded || hasModelsInScene || selectedObject;

  const handleClick = (action, toggleOnly = false) => {
    if (action === 'more-options') {
      setIsMoreOptionsOpen(prev => !prev);
      setActiveButton(prev => (prev === action ? null : action));
      setShowSidePanel(false);
    } else {
      setIsMoreOptionsOpen(false);
      if (!toggleOnly) {
        setActiveButton(prev => (prev === action ? null : action));
      }
      onViewAction(action);
    }
  };

  const EnhancedIconButton = ({
    disabled = false,
    disabledTooltip = "",
    onClick,
    tooltip,
    ...props
  }) => {
    const handleEnhancedClick = () => {
      if (disabled) {
        if (disabledTooltip) {
          alert(disabledTooltip);
        }
        return;
      }
      onClick();
    };

    return (
      <div
        style={{
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
        }}
        title={disabled ? disabledTooltip : tooltip}
      >
        <IconButton
          {...props}
          tooltip={disabled ? disabledTooltip : tooltip}
          onClick={handleEnhancedClick}
          style={{
            ...props.style,
            filter: disabled ? 'grayscale(1)' : 'none',
            pointerEvents: disabled ? 'none' : 'auto',
          }}
        />
      </div>
    );
  };

  return (
    <div className="toolbar">
      {/* Left section */}
      <div className="toolbar-section">
        <IconButton
          imageSrc="assets/icons/logo.svg" // Light mode icon
          darkImageSrc="assets/icons/logo-light.svg" // Dark mode icon
          tooltip="Logo"
          onClick={() => console.log('Logo clicked')}
          darkMode={darkMode} // Pass darkMode to IconButton
        />
      </div>

      {/* Center section - Scene controls */}
      <div className="toolbar-section toolbar-center">
        <IconButton
          imageSrc="assets/icons/undo.svg"
          darkImageSrc="assets/icons/undo-light.svg"
          tooltip="Undo"
          onClick={() => handleClick('undo')}
          active={activeButton === 'undo'}
          darkMode={darkMode}
        />
        <IconButton
          imageSrc="assets/icons/redo.svg"
          darkImageSrc="assets/icons/redo-light.svg"
          tooltip="Redo"
          onClick={() => handleClick('redo')}
          active={activeButton === 'redo'}
          darkMode={darkMode}
        />
        <div className="toolbar-separator"></div>
        <IconButton
          imageSrc="assets/icons/grid-settings.svg"
          darkImageSrc="assets/icons/grid-settings-light.svg"
          tooltip="Grid"
          onClick={() => handleClick('toggle-grid')}
          active={activeButton === 'toggle-grid'}
          darkMode={darkMode}
        />
        <IconButton
          imageSrc="assets/icons/scale.svg"
          darkImageSrc="assets/icons/scale-light.svg"
          tooltip="Dimensions"
          onClick={() => handleClick('toggle-floor-dimensions')}
          active={activeButton === 'toggle-floor-dimensions'}
          darkMode={darkMode}
        />
        {/* <EnhancedIconButton
          imageSrc="assets/icons/ar.svg"
          darkImageSrc="assets/icons/ar-light.svg"
          tooltip={isAREnabled ? "Generate AR QR Code" : "No models available"}
          disabledTooltip="No models available in room. Please load a .glb or .gltf file first."
          onClick={handleARViewClick}
          active={activeButton === 'generate-ar-qr'}
          disabled={!isAREnabled}
          darkMode={darkMode}
        /> */}
      </div>

      {/* Right section */}
      <div className="toolbar-section toolbar-right">
        <IconButton
          imageSrc="assets/icons/screenshot.svg"
          darkImageSrc="assets/icons/screenshot-light.svg"
          tooltip="Screenshot"
          onClick={() => handleClick('take-screenshot')}
          active={activeButton === 'take-screenshot'}
          darkMode={darkMode}
        />
        <IconButton
          imageSrc="assets/icons/pep.svg"
          darkImageSrc="assets/icons/pep-light.svg"
          tooltip="More Options"
          onClick={() => handleClick('more-options')}
          active={activeButton === 'more-options'}
          darkMode={darkMode}
        />
      </div>

      {/* More Options Modal */}
      <MoreOptionsModal
        isOpen={isMoreOptionsOpen}
        onClose={() => {
          setIsMoreOptionsOpen(false);
          setActiveButton(null);
          // ✅ Only open side panel on desktop, not mobile
          const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
          if (!isMobile) {
            setShowSidePanel(true);
          }
        }}
        onViewAction={onViewAction}
      />
    </div>
  );
};

const styles = {
  toolbarSection: {
  }
};

export default Toolbar;