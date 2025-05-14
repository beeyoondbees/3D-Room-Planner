// src/components/UI/SidePanel.jsx
// Side panel with equipment catalog

import React, { useState } from 'react';
import IconButton from '../common/IconButton';

const SidePanel = ({ equipmentCatalog, onAddModel }) => {
  const [activeCategory, setActiveCategory] = useState(Object.keys(equipmentCatalog)[0]);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Get equipment items for the active category
  const activeItems = equipmentCatalog[activeCategory] || [];
  
  return (
    <div className={`side-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Toggle button */}
      <div className="panel-toggle">
        <IconButton 
          icon={isExpanded ? 'chevron-left' : 'chevron-right'} 
          tooltip={isExpanded ? 'Collapse Panel' : 'Expand Panel'}
          onClick={() => setIsExpanded(!isExpanded)}
        />
      </div>
      
      {isExpanded && (
        <>
          {/* Category tabs */}
          <div className="category-tabs">
            {Object.keys(equipmentCatalog).map((category) => (
              <div 
                key={category}
                className={`category-tab ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </div>
            ))}
          </div>
          
          {/* Equipment items grid */}
          <div className="equipment-grid">
            {activeItems.map((item) => (
              <div 
                key={item.id}
                className="equipment-item"
                onClick={() => onAddModel(item.id)}
              >
                <div className="item-icon">
                  <img src={item.icon} alt={item.name} />
                </div>
                <div className="item-name">{item.name}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SidePanel;