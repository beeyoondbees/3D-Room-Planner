import React, { useState, useMemo, useEffect } from 'react';
import officeEquipmentConfig from '../../config/officeEquipmentConfig';

const OfficeSidePanel = ({ onAddModel, setShowOfficeSidePanel }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentLevel, setCurrentLevel] = useState('TOP_CATEGORIES');
  const [selectedTopCategory, setSelectedTopCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBlockedByPopup, setIsBlockedByPopup] = useState(false);

  const officeEquipmentCatalog = officeEquipmentConfig.catalog;
  const topLevelCategories = useMemo(
    () => (officeEquipmentCatalog ? Object.keys(officeEquipmentCatalog) : []),
    [officeEquipmentCatalog]
  );

  const [hoveredSubCategory, setHoveredSubCategory] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredProductId, setHoveredProductId] = useState(null);

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Listen for room popup state changes (block on desktop when popup is open)
  useEffect(() => {
    const handlePopupStateChange = (event) => {
      const { isOpen } = event.detail;
      // Only block on desktop
      if (!isMobile) {
        setIsBlockedByPopup(isOpen);
      }
    };

    window.addEventListener('roomPopupStateChange', handlePopupStateChange);

    return () => {
      window.removeEventListener('roomPopupStateChange', handlePopupStateChange);
    };
  }, [isMobile]);

  // Inject preloader styles
  useEffect(() => {
    const styleId = 'side-panel-preloader-styles';
    
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes spin-clockwise {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .preloader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .preloader-logo {
          width: 80px;
          height: 80px;
          animation: spin-clockwise 1.5s linear infinite;
        }

        .preloader-text {
          margin-top: 20px;
          color: #fff;
          font-size: 16px;
          font-weight: 500;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        @media (max-width: 768px) {
          .preloader-logo {
            width: 60px;
            height: 60px;
          }

          .preloader-text {
            font-size: 14px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      // Don't remove styles on unmount as other instances may use them
    };
  }, []);

  // Listen for model loaded event from ModelLoader.js
  useEffect(() => {
    const handleModelLoaded = () => {
      console.log('✅ Model loaded - hiding preloader');
      setIsLoading(false);
      
      // Close panel on mobile after import
      if (isMobile && typeof setShowOfficeSidePanel === 'function') {
        setShowOfficeSidePanel(false);
      }
    };

    // Listen to the correct event from ModelLoader.js
    window.addEventListener('model-loading-completed', handleModelLoaded);

    return () => {
      window.removeEventListener('model-loading-completed', handleModelLoaded);
    };
  }, [isMobile, setShowOfficeSidePanel]);

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
        setIsLoading(true);
        onAddModel(productId);
      }
    }
  };

  const handleImportClick = () => {
    if (
      typeof onAddModel !== 'function' ||
      currentLevel !== 'PRODUCTS' ||
      !officeEquipmentCatalog ||
      !selectedTopCategory ||
      !selectedSubCategory ||
      !selectedProductId
    ) {
      return;
    }

    const products =
      officeEquipmentCatalog[selectedTopCategory][selectedSubCategory] || [];
    const product = products.find((p) => p.id === selectedProductId);

    if (product) {
      setIsLoading(true);
      onAddModel(product.id);
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

  // Function to render the mobile header title
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

  // Preloader component with rotating logo
  const renderPreloader = () => {
    if (!isLoading) return null;

    return (
      <div className="preloader-overlay">
        <svg 
          className="preloader-logo" 
          width="52" 
          height="66" 
          viewBox="0 0 52 66" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M4.61688 22.2042C3.57812 22.8117 2.66372 23.6344 1.92729 24.6237C1.19087 25.6129 0.647263 26.749 0.328356 27.9649C0.00944876 29.181 -0.0783376 30.4528 0.0701471 31.7055C0.218632 32.9582 0.600398 34.1668 1.19305 35.2602C1.7857 36.3536 2.5773 37.3098 3.52143 38.0728C4.46557 38.8361 5.5432 39.3906 6.69114 39.7039C7.83908 40.0175 9.0342 40.0834 10.2064 39.8981C11.3786 39.7129 12.5043 39.2802 13.5174 38.6253L47.5456 17.7062C48.5585 17.0835 49.4462 16.2543 50.1583 15.266C50.8705 14.2777 51.3929 13.1496 51.6959 11.9462C51.9989 10.7427 52.0764 9.4875 51.9242 8.25213C51.7719 7.01675 51.3925 5.82544 50.8082 4.74622C50.2237 3.66699 49.4456 2.72098 48.518 1.96222C47.5906 1.20344 46.5318 0.646761 45.4024 0.323955C44.2729 0.00114685 43.0947 -0.0814628 41.9353 0.0808417C40.7759 0.243147 39.6578 0.647187 38.6451 1.26989L4.61688 22.2042Z" fill="#E4002B"/>
          <path d="M4.35456 49.1651C2.33475 50.3959 0.87526 52.3727 0.288808 54.6714C-0.297643 56.9701 0.035594 59.4083 1.21712 61.4633C2.39865 63.5183 4.33447 65.0267 6.6098 65.6652C8.88515 66.3039 11.319 66.022 13.3899 64.8799L34.0027 52.9441C36.0792 51.7406 37.5948 49.7578 38.2159 47.4318C38.8369 45.1058 38.5128 42.6274 37.3146 40.5416C36.7214 39.5088 35.9314 38.6034 34.9899 37.8774C34.0482 37.1511 32.9734 36.6185 31.8269 36.3095C29.5113 35.6857 27.044 36.0112 24.9673 37.2148L4.35456 49.1651Z" fill="#E4002B"/>
        </svg>
        <div className="preloader-text">Loading model...</div>
      </div>
    );
  };

  const renderContent = () => {
    if (!officeEquipmentCatalog)
      return <p className="no-items-text">Loading office catalog...</p>;

    if (currentLevel === 'TOP_CATEGORIES') {
      if (topLevelCategories.length === 0)
        return <p className="no-items-text">No office categories available.</p>;

      return topLevelCategories.map((categoryName) => {
        const subCategories = officeEquipmentCatalog[categoryName]
          ? Object.keys(officeEquipmentCatalog[categoryName])
          : [];
        const subCategoryCount = subCategories.length;
        const fallbackIcon =
          subCategories.length > 0 &&
          officeEquipmentCatalog[categoryName][subCategories[0]] &&
          officeEquipmentCatalog[categoryName][subCategories[0]][0]
            ? officeEquipmentCatalog[categoryName][subCategories[0]][0]?.icon
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
      officeEquipmentCatalog[selectedTopCategory]
    ) {
      const subCategoriesMap = officeEquipmentCatalog[selectedTopCategory];
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
      officeEquipmentCatalog[selectedTopCategory] &&
      officeEquipmentCatalog[selectedTopCategory][selectedSubCategory]
    ) {
      const products =
        officeEquipmentCatalog[selectedTopCategory][selectedSubCategory];
      if (products.length === 0)
        return (
          <p className="no-items-text">
            No products in {selectedSubCategory}.
          </p>
        );

      return products.map((item) => (
        <div
          key={item.id}
          className={`list-item product-item ${
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

  // Don't render if blocked by room popup on desktop
  if (isBlockedByPopup && !isMobile) {
    return null;
  }

  return (
    <>
      {/* Preloader overlay */}
      {renderPreloader()}
      
      {/* Hide category panel while preloader is showing - ONLY ON MOBILE */}
      {!(isLoading && isMobile) && (
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
                  typeof setShowOfficeSidePanel === 'function' &&
                  setShowOfficeSidePanel(false)
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
                    disabled={currentLevel !== 'PRODUCTS' || !selectedProductId || isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Import'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default OfficeSidePanel;