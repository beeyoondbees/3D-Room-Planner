import React, { useState, useMemo } from 'react';
import IconButton from '../common/IconButton';

const SidePanel = ({ equipmentCatalog, onAddModel, setShowSidePanel }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentLevel, setCurrentLevel] = useState('TOP_CATEGORIES');
  const [selectedTopCategory, setSelectedTopCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const topLevelCategories = useMemo(
    () => (equipmentCatalog ? Object.keys(equipmentCatalog) : []),
    [equipmentCatalog]
  );

  const [hoveredSubCategory, setHoveredSubCategory] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredProductId, setHoveredProductId] = useState(null);

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const handleTopCategorySelect = (categoryName) => {
    setSelectedTopCategory(categoryName);
    setCurrentLevel('SUB_CATEGORIES');
    setSelectedSubCategory(null);
    setSelectedProductId(null);
  };

  const handleSubCategorySelect = (subCategoryName) => {
    setSelectedSubCategory(subCategoryName);
    setCurrentLevel('PRODUCTS');
    setSelectedProductId(null);
  };

  const handleBack = () => {
    if (currentLevel === 'PRODUCTS') {
      setCurrentLevel('SUB_CATEGORIES');
      setSelectedSubCategory(null);
      setSelectedProductId(null);
    } else if (currentLevel === 'SUB_CATEGORIES') {
      setCurrentLevel('TOP_CATEGORIES');
      setSelectedTopCategory(null);
      setSelectedSubCategory(null);
      setSelectedProductId(null);
    }
  };

  const handleProductClick = (productId) => {
    // On desktop: click to add immediately (panel stays open)
    // On mobile: click to select, then use Import button (panel closes)
    if (isMobile) {
      setSelectedProductId(productId);
    } else {
      // Desktop: add immediately but KEEP panel open
      if (typeof onAddModel === 'function') {
        onAddModel(productId);
        // Panel stays open on desktop - do NOT close it
      }
    }
  };

  const handleImportClick = () => {
    if (
      typeof onAddModel !== 'function' ||
      currentLevel !== 'PRODUCTS' ||
      !equipmentCatalog ||
      !selectedTopCategory ||
      !selectedSubCategory ||
      !selectedProductId
    ) {
      return;
    }

    const products =
      equipmentCatalog[selectedTopCategory][selectedSubCategory] || [];
    const product = products.find((p) => p.id === selectedProductId);

    if (product) {
      onAddModel(product.id);
      if (typeof setShowSidePanel === 'function') {
        setShowSidePanel(false);
      }
    }
  };

  const renderBreadcrumb = () => {
    const segments = [];

    segments.push(
      <span
        key="categories"
        onClick={() => {
          setCurrentLevel('TOP_CATEGORIES');
          setSelectedTopCategory(null);
          setSelectedSubCategory(null);
          setSelectedProductId(null);
        }}
        className="breadcrumb-link"
      >
        Categories
      </span>
    );

    if (selectedTopCategory) {
      segments.push(
        <span key="sep1" className="breadcrumb-separator">
          {' '}
          &gt;{' '}
        </span>,
        <span
          key="topCategory"
          onClick={() => {
            setCurrentLevel('SUB_CATEGORIES');
            setSelectedSubCategory(null);
            setSelectedProductId(null);
          }}
          className="breadcrumb-link"
        >
          {selectedTopCategory}
        </span>
      );
    }

    if (selectedSubCategory && currentLevel === 'PRODUCTS') {
      segments.push(
        <span key="sep2" className="breadcrumb-separator">
          {' '}
          &gt;{' '}
        </span>,
        <span className="breadcrumb-active">{selectedSubCategory}</span>
      );
    }

    return <div className="breadcrumb">{segments}</div>;
  };

  // Updated function to render the mobile header title
  const renderMobileHeaderTitle = () => {
    if (currentLevel === 'TOP_CATEGORIES') {
      return <div className="mobile-header-title">Categories</div>;
    } else if (currentLevel === 'SUB_CATEGORIES') {
      return (
        <div className="mobile-header-container">
          <div className="mobile-header-title">{selectedTopCategory}</div>
          <div className="mobile-subtitle">Select a Model</div>
        </div>
      );
    } else if (currentLevel === 'PRODUCTS') {
      // Show category and subcategory on separate lines
      return (
        <div className="mobile-header-container">
          <div className="mobile-header-title">{selectedTopCategory}</div>
          <div className="mobile-subtitle">{selectedSubCategory}</div>
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    if (!equipmentCatalog)
      return <p className="no-items-text">Loading catalog...</p>;

    if (currentLevel === 'TOP_CATEGORIES') {
      if (topLevelCategories.length === 0)
        return <p className="no-items-text">No categories available.</p>;

      return topLevelCategories.map((categoryName) => {
        const subCategories = equipmentCatalog[categoryName]
          ? Object.keys(equipmentCatalog[categoryName])
          : [];
        const subCategoryCount = subCategories.length;
        const fallbackIcon =
          subCategories.length > 0 &&
          equipmentCatalog[categoryName][subCategories[0]] &&
          equipmentCatalog[categoryName][subCategories[0]][0]
            ? equipmentCatalog[categoryName][subCategories[0]][0]?.icon
            : '/assets/icons/default-category.png';

        return (
          <div
            key={categoryName}
            className={`list-item top-category-item ${
              hoveredCategory === categoryName ? 'hovered' : ''
            }`}
            onMouseEnter={() => setHoveredCategory(categoryName)}
            onMouseLeave={() => setHoveredCategory(null)}
            onClick={() => handleTopCategorySelect(categoryName)}
          >
            <span className="item-icon-product-container">
              <img
                src={fallbackIcon}
                alt={categoryName}
                className="product-icon"
              />
            </span>
            <span className="item-name-text">{categoryName}</span>
            <span className="item-count">({subCategoryCount})</span>
            <span className="chevron-right">
              <i className="fas fa-chevron-right"></i>
            </span>
          </div>
        );
      });
    }

    if (
      currentLevel === 'SUB_CATEGORIES' &&
      selectedTopCategory &&
      equipmentCatalog[selectedTopCategory]
    ) {
      const subCategoriesMap = equipmentCatalog[selectedTopCategory];
      if (Object.keys(subCategoriesMap).length === 0)
        return (
          <p className="no-items-text">
            No sub-categories in {selectedTopCategory}.
          </p>
        );

      return Object.keys(subCategoriesMap).map((subCategoryName) => {
        const products = subCategoriesMap[subCategoryName] || [];
        const icon = products[0]?.icon || '/assets/icons/default.png';
        return (
          <div
            key={subCategoryName}
            className={`list-item sub-category-item ${
              hoveredSubCategory === subCategoryName ? 'hovered' : ''
            } ${selectedSubCategory === subCategoryName ? 'selected-subcategory' : ''}`}
            onMouseEnter={() => setHoveredSubCategory(subCategoryName)}
            onMouseLeave={() => setHoveredSubCategory(null)}
            onClick={() => handleSubCategorySelect(subCategoryName)}
          >
            <span className="item-icon-product-container">
              <img
                src={icon}
                alt={subCategoryName}
                className="product-icon"
              />
            </span>
            <span className="item-name-text">{subCategoryName}</span>
            <span className="item-count">({products.length})</span>
            <span className="chevron-right">
              <i className="fas fa-chevron-right"></i>
            </span>
          </div>
        );
      });
    }

    if (
      currentLevel === 'PRODUCTS' &&
      selectedTopCategory &&
      selectedSubCategory &&
      equipmentCatalog[selectedTopCategory] &&
      equipmentCatalog[selectedTopCategory][selectedSubCategory]
    ) {
      const products =
        equipmentCatalog[selectedTopCategory][selectedSubCategory];
      if (products.length === 0)
        return (
          <p className="no-items-text">
            No products in {selectedSubCategory}.
          </p>
        );

      return products.map((item) => (
        <div
          key={item.id}
          className={`list-item-product ${
            hoveredProductId === item.id ? 'hovered' : ''
          } ${selectedProductId === item.id ? 'selected-product' : ''}`}
          onMouseEnter={() => setHoveredProductId(item.id)}
          onMouseLeave={() => setHoveredProductId(null)}
          onClick={() => handleProductClick(item.id)}
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
        {/* Only show back button on desktop, not on mobile */}
        {!isMobile && currentLevel !== 'TOP_CATEGORIES' && (
          <button onClick={handleBack} title="Back" className="back-button">
            &larr;
          </button>
        )}
        {isExpanded && (
          isMobile ? renderMobileHeaderTitle() : renderBreadcrumb()
        )}
        <div className="close-button-container">
          <button
            className="close-button"
            title="Close Panel"
            onClick={() =>
              typeof setShowSidePanel === 'function' &&
              setShowSidePanel(false)
            }
          >
            ×
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="content-wrapper">{renderContent()}</div>

          {/* Footer only shows on MOBILE */}
          {isMobile && (
            <div className="side-panel-footer">
              <button
                type="button"
                className="panel-btn panel-btn-back"
                onClick={handleBack}
                disabled={currentLevel === 'TOP_CATEGORIES'}
              >
                Back
              </button>
              <button
                type="button"
                className="panel-btn panel-btn-import"
                onClick={handleImportClick}
                disabled={currentLevel !== 'PRODUCTS' || !selectedProductId}
              >
                Import
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SidePanel;