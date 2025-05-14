// src/components/common/IconButton.jsx
// Reusable icon button component

import React from 'react';

const IconButton = ({ 
  icon, 
  tooltip, 
  onClick, 
  disabled = false,
  size = 'medium', // 'small', 'medium', 'large'
  active = false
}) => {
  // Map size to class name
  const sizeClass = {
    'small': 'icon-button-sm',
    'medium': 'icon-button-md',
    'large': 'icon-button-lg'
  }[size] || 'icon-button-md';
  
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