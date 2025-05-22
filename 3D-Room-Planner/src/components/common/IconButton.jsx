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
}) => {
  // Map size to class name
  const sizeClass = {
    small: 'icon-button-sm',
    medium: 'icon-button-md',
    large: 'icon-button-lg',
  }[size] || 'icon-button-md';

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
    >
      <i className={`icon icon-${icon}`}></i>
      
    </button>
  );
};

export default IconButton;