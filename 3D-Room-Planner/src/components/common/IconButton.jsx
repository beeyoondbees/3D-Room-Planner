// src/components/common/IconButton.jsx
// Reusable icon button component

import React from 'react';

const IconButton = ({
  icon,
  tooltip,
  onClick,
  disabled = false,
  size = 'medium', // 'small', 'medium', 'large'
  active = false,
  imageSrc,
}) => {
  const sizeClass = {
    small: 'icon-button-sm',
    medium: 'icon-button-md',
    large: 'icon-button-lg',
  }[size] || 'icon-button-md';


    const baseStyle = {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    outline: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
  };

  const activeStyle = active
    ? {
        background: 'rgba(228, 0, 43, 0.1)',
        boxShadow: '0 0 4px rgba(228, 0, 43, 0.3)',
        transform: 'scale(1.05)',
      }
    : {};

  // If icon is 'logo', just return the image without a button
  if (icon === 'logo') {
    // Ensure the path to your logo is correct.
    // If your public folder is served at the root, '/assets/icons/logo.svg' is correct.
    return <img src="/assets/icons/logo.svg" width="160px" alt="Logo" style={{ display: 'block' }} />;
  }

  // Otherwise, return the button with the icon
    return (
    <button
      className={`icon-button ${sizeClass} ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      aria-label={tooltip}
      style={imageSrc
        ? {
            ...baseStyle,
            ...activeStyle,
            padding: 0,
            borderRadius: '50%',
            overflow: 'hidden',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            margin: '10px',
          }
        : { ...baseStyle, ...activeStyle }}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={tooltip || 'icon'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            
          }}
        />
      ) : (
        <i className={`icon icon-${icon}`} style={{ fontSize: '1.2em' }}></i>
      )}
    </button>
  );
};


export default IconButton;