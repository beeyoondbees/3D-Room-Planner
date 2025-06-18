import React, { useState, useMemo } from 'react';
import officeEquipmentConfig from '../../config/officeEquipmentConfig'; // Import the config

const OfficeSidePanel = ({ onAddModel, setShowOfficeSidePanel }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentLevel, setCurrentLevel] = useState('TOP_CATEGORIES');
  const [selectedTopCategory, setSelectedTopCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);

  // Use the office equipment catalog from the config file
  const officeEquipmentCatalog = officeEquipmentConfig.catalog;
  const topLevelCategories = useMemo(() => officeEquipmentCatalog ? Object.keys(officeEquipmentCatalog) : [], [officeEquipmentCatalog]);
  
  const [hoveredSubCategory, setHoveredSubCategory] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredProductId, setHoveredProductId] = useState(null);

  const handleTopCategorySelect = (categoryName) => {
    setSelectedTopCategory(categoryName);
    setCurrentLevel('SUB_CATEGORIES');
    setSelectedSubCategory(null);
  };

  const handleSubCategorySelect = (subCategoryName) => {
    setSelectedSubCategory(subCategoryName);
    setCurrentLevel('PRODUCTS');
  };

  const handleBack = () => {
    if (currentLevel === 'PRODUCTS') {
      setCurrentLevel('SUB_CATEGORIES');
      setSelectedSubCategory(null);
    } else if (currentLevel === 'SUB_CATEGORIES') {
      setCurrentLevel('TOP_CATEGORIES');
      setSelectedTopCategory(null);
      setSelectedSubCategory(null);
    }
  };

  const renderBreadcrumb = () => {
    const segments = [];

    segments.push(
      <span key="categories" onClick={() => {
        setCurrentLevel('TOP_CATEGORIES');
        setSelectedTopCategory(null);
        setSelectedSubCategory(null);
      }} className="breadcrumb-link">
        Categories
      </span>
    );

    if (selectedTopCategory) {
      segments.push(
        <span key="sep1" className="breadcrumb-separator"> &gt; </span>,
        <span key="topCategory" onClick={() => {
          setCurrentLevel('SUB_CATEGORIES');
          setSelectedSubCategory(null);
        }} className="breadcrumb-link">
          {selectedTopCategory}
        </span>
      );
    }

    if (selectedSubCategory && currentLevel === 'PRODUCTS') {
      segments.push(
        <span key="sep2" className="breadcrumb-separator"> &gt; </span>,
        <span className="breadcrumb-active">{selectedSubCategory}</span>
      );
    }

    return <div className="breadcrumb">{segments}</div>;
  };

  const renderContent = () => {
    if (!officeEquipmentCatalog) return <p className="no-items-text">Loading office catalog...</p>;

    if (currentLevel === 'TOP_CATEGORIES') {
      if (topLevelCategories.length === 0) return <p className="no-items-text">No office categories available.</p>;
      
      return topLevelCategories.map((categoryName) => {
        const subCategories = officeEquipmentCatalog[categoryName] ? Object.keys(officeEquipmentCatalog[categoryName]) : [];
        const subCategoryCount = subCategories.length;
        const fallbackIcon = subCategories.length > 0 && officeEquipmentCatalog[categoryName][subCategories[0]] && officeEquipmentCatalog[categoryName][subCategories[0]][0] 
          ? officeEquipmentCatalog[categoryName][subCategories[0]][0]?.icon 
          : '/assets/icons/default-category.png';

        return (
          <div 
            key={categoryName} 
            className={`list-item top-category-item ${hoveredCategory === categoryName ? 'hovered' : ''}`} 
            onMouseEnter={() => setHoveredCategory(categoryName)} 
            onMouseLeave={() => setHoveredCategory(null)} 
            onClick={() => handleTopCategorySelect(categoryName)}
          >
            <span className="item-icon-product-container">
              <img src={fallbackIcon} alt={categoryName} className="product-icon" />
            </span>
            <span className="item-name-text">{categoryName}</span>
            <span className="item-count">({subCategoryCount})</span>
            <span className="chevron-right"><i className="fas fa-chevron-right"></i></span>
          </div>
        );
      });
    }

    if (currentLevel === 'SUB_CATEGORIES' && selectedTopCategory && officeEquipmentCatalog[selectedTopCategory]) {
      const subCategoriesMap = officeEquipmentCatalog[selectedTopCategory];
      if (Object.keys(subCategoriesMap).length === 0) return <p className="no-items-text">No sub-categories in {selectedTopCategory}.</p>;
      
      return Object.keys(subCategoriesMap).map((subCategoryName) => {
        const products = subCategoriesMap[subCategoryName] || [];
        const icon = products[0]?.icon || '/assets/icons/default.png';
        return (
          <div 
            key={subCategoryName} 
            className={`list-item sub-category-item ${hoveredSubCategory === subCategoryName ? 'hovered' : ''}`} 
            onMouseEnter={() => setHoveredSubCategory(subCategoryName)} 
            onMouseLeave={() => setHoveredSubCategory(null)} 
            onClick={() => handleSubCategorySelect(subCategoryName)}
          >
            <span className="item-icon-product-container">
              <img src={icon} alt={subCategoryName} className="product-icon" />
            </span>
            <span className="item-name-text">{subCategoryName}</span>
            <span className="item-count">({products.length})</span>
            <span className="chevron-right"><i className="fas fa-chevron-right"></i></span>
          </div>
        );
      });
    }

    if (currentLevel === 'PRODUCTS' && selectedTopCategory && selectedSubCategory && officeEquipmentCatalog[selectedTopCategory] && officeEquipmentCatalog[selectedTopCategory][selectedSubCategory]) {
      const products = officeEquipmentCatalog[selectedTopCategory][selectedSubCategory];
      if (products.length === 0) return <p className="no-items-text">No products in {selectedSubCategory}.</p>;
      
      return products.map((item) => (
        <div 
          key={item.id} 
          className={`list-item product-item ${hoveredProductId === item.id ? 'hovered' : ''}`} 
          onMouseEnter={() => setHoveredProductId(item.id)} 
          onMouseLeave={() => setHoveredProductId(null)} 
          onClick={() => typeof onAddModel === 'function' && onAddModel(item.id)}
        >
          <span className="item-icon-product-container">
            <img src={item.icon} alt={item.name} className="product-icon" />
          </span>
          <span className="item-name-text">{item.name}</span>
        </div>
      ));
    }

    return <p className="no-items-text">Please select a category.</p>;
  };

  return (
    <div className={`side-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="panel-header">
        {currentLevel !== 'TOP_CATEGORIES' && (
          <button onClick={handleBack} title="Back" className="back-button">&larr;</button>
        )}
        {isExpanded && renderBreadcrumb()}
        <div className="close-button-container">
          <button 
            className="close-button" 
            title="Close Panel" 
            onClick={() => typeof setShowOfficeSidePanel === 'function' && setShowOfficeSidePanel(false)}
          >
            ×
          </button>
        </div>
      </div>
      {isExpanded && <div className="content-wrapper">{renderContent()}</div>}
    </div>
  );
};

export default OfficeSidePanel;