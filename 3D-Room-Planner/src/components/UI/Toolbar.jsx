import React, { useState } from 'react';
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
}) => {
  const [activeButton, setActiveButton] = useState(null);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);

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
      setShowSidePanel(false); // 👈 Hide SidePanel
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
        <EnhancedIconButton
          imageSrc="assets/icons/ar-icon.svg"
          tooltip={isAREnabled ? "Generate AR QR Code" : "No models available"}
          disabledTooltip="No models available in room. Please load a .glb or .gltf file first."
          onClick={handleARViewClick}
          active={activeButton === 'generate-ar-qr'}
          disabled={!isAREnabled}
        />
      </div>

      {/* Right section */}
      <div className="toolbar-section toolbar-right" style={{ ...styles.toolbarSection, ...styles.toolbarRight }}>
        <IconButton
          imageSrc="assets/icons/screenshot-icon.svg"
          tooltip="Screenshot"
          onClick={() => handleClick('take-screenshot')}
          active={activeButton === 'take-screenshot'}
        />
        <IconButton
          imageSrc="assets/icons/pep-icon.svg"
          tooltip="More Options"
          onClick={() => handleClick('more-options')}
          active={activeButton === 'more-options'}
        />
      </div>

      {/* More Options Modal */}
      <MoreOptionsModal
        isOpen={isMoreOptionsOpen}
        onClose={() => {
          setIsMoreOptionsOpen(false);
          setActiveButton(null);
          setShowSidePanel(true); // 👈 Show it back
        }}
      />
    </div>
  );
};

const styles = {
};

export default Toolbar;