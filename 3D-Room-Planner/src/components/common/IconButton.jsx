import React from 'react';

const IconButton = ({
  imageSrc, // Light mode image source
  darkImageSrc, // Dark mode image source
  tooltip,
  onClick,
  darkMode = false, // Default to false
  style = {} // Allow external style overrides
}) => {
  // Dynamically switch between light and dark mode images
  const iconSrc = darkMode && darkImageSrc ? darkImageSrc : imageSrc;

  return (
    <button
      onClick={onClick}
      style={{
        ...style,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title={tooltip}
      aria-label={tooltip}
    >
      <img
        src={iconSrc} // Dynamically change the image based on darkMode
        alt={tooltip}
        style={{
        }}
      />
    </button>
  );
};

export default IconButton;
