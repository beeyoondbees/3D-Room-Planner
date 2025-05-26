// src/components/UI/SidePanel.jsx
// Side panel with multi-level drill-down equipment catalog.

import React, { useState, useMemo } from 'react';
import IconButton from '../common/IconButton'; 

const SidePanel = ({ equipmentCatalog, onAddModel, setShowSidePanel }) => {
  // State to control if the panel content is visible (expanded) or hidden (collapsed)
  const [isExpanded, setIsExpanded] = useState(true); 
  const [currentLevel, setCurrentLevel] = useState('TOP_CATEGORIES');
  const [selectedTopCategory, setSelectedTopCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);

  const topLevelCategories = useMemo(() => equipmentCatalog ? Object.keys(equipmentCatalog) : [], [equipmentCatalog]);
  const [hoveredSubCategory, setHoveredSubCategory] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredProductId, setHoveredProductId] = useState(null);
  // const [showSidePanel, setShowSidePanel] = useState(true);
  

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
      <span
        key="categories"
        onClick={() => {
          setCurrentLevel('TOP_CATEGORIES');
          setSelectedTopCategory(null);
          setSelectedSubCategory(null);
        }}
        style={styles.breadcrumbLink}
      >
        Categories
      </span>
    );

    if (selectedTopCategory) {
      segments.push(
        <span key="sep1" style={styles.breadcrumbSeparator}> &gt; </span>,
        <span
          key="topCategory"
          onClick={() => {
            setCurrentLevel('SUB_CATEGORIES');
            setSelectedSubCategory(null);
          }}
          style={styles.breadcrumbLink}
        >
          {selectedTopCategory}
        </span>
      );
    }

    if (selectedSubCategory && currentLevel === 'PRODUCTS') {
      segments.push(
        <span key="sep2" style={styles.breadcrumbSeparator}> &gt; </span>,
        <span style={styles.breadcrumbActive}>{selectedSubCategory}</span>
      );
    }

    return <div style={styles.breadcrumb}>{segments}</div>;
  };

    const renderContent = () => {
    if (!equipmentCatalog) return <p style={styles.noItemsText}>Loading catalog...</p>;

    if (currentLevel === 'TOP_CATEGORIES') {
      if (topLevelCategories.length === 0) return <p style={styles.noItemsText}>No categories available.</p>;
      return topLevelCategories.map((categoryName) => {
        const subCategories = equipmentCatalog[categoryName] ? Object.keys(equipmentCatalog[categoryName]) : [];
        const subCategoryCount = subCategories.length;
        const fallbackIcon = subCategories.length > 0 && equipmentCatalog[categoryName][subCategories[0]] && equipmentCatalog[categoryName][subCategories[0]][0] ? equipmentCatalog[categoryName][subCategories[0]][0]?.icon : '/assets/icons/default-category.png';

        return (
          <div key={categoryName} className="list-item top-category-item" style={{ ...styles.listItem, ...(hoveredCategory === categoryName ? styles.listItemHover : {}) }} onMouseEnter={() => setHoveredCategory(categoryName)} onMouseLeave={() => setHoveredCategory(null)} onClick={() => handleTopCategorySelect(categoryName)} title={`View ${categoryName}`}>
            <span style={styles.itemIconProductContainer}>
              <img src={fallbackIcon} alt={categoryName} style={styles.productIcon} />
            </span>
            <span style={styles.itemNameText}>{categoryName}</span>
            <span style={styles.itemCount}>({subCategoryCount})</span>
            <span style={styles.chevronRight}><i className="fas fa-chevron-right"></i></span>
          </div>
        );
      });
    }

    if (currentLevel === 'SUB_CATEGORIES' && selectedTopCategory && equipmentCatalog[selectedTopCategory]) {
      const subCategoriesMap = equipmentCatalog[selectedTopCategory];
      if (Object.keys(subCategoriesMap).length === 0) return <p style={styles.noItemsText}>No sub-categories in {selectedTopCategory}.</p>;
      return Object.keys(subCategoriesMap).map((subCategoryName) => {
        const products = subCategoriesMap[subCategoryName] || [];
        const icon = products[0]?.icon || '/assets/icons/default.png';
        return (
          <div key={subCategoryName} className="list-item sub-category-item" style={{ ...styles.listItem, ...(hoveredSubCategory === subCategoryName ? styles.listItemHover : {}) }} onMouseEnter={() => setHoveredSubCategory(subCategoryName)} onMouseLeave={() => setHoveredSubCategory(null)} onClick={() => handleSubCategorySelect(subCategoryName)} title={`View ${subCategoryName}`}>
            <span style={styles.itemIconProductContainer}>
              <img src={icon} alt={subCategoryName} style={styles.productIcon} />
            </span>
            <span style={styles.itemNameText}>{subCategoryName}</span>
            <span style={styles.itemCount}>({products.length})</span>
            <span style={styles.chevronRight}><i className="fas fa-chevron-right"></i></span>
          </div>
        );
      });
    }

    if (currentLevel === 'PRODUCTS' && selectedTopCategory && selectedSubCategory && equipmentCatalog[selectedTopCategory] && equipmentCatalog[selectedTopCategory][selectedSubCategory]) {
      const products = equipmentCatalog[selectedTopCategory][selectedSubCategory];
      if (products.length === 0) return <p style={styles.noItemsText}>No products in {selectedSubCategory}.</p>;
      return products.map((item) => (
        <div key={item.id} className="list-item product-item" style={{ ...styles.listItemProduct, ...(hoveredProductId === item.id ? styles.listItemHover : {}) }} onMouseEnter={() => setHoveredProductId(item.id)} onMouseLeave={() => setHoveredProductId(null)} onClick={() => typeof onAddModel === 'function' && onAddModel(item.id)} title={`Add ${item.name}`}>
          <span style={styles.itemIconProductContainer}>
            <img src={item.icon} alt={item.name} style={styles.productIcon} />
          </span>
          <span style={styles.itemNameText}>{item.name}</span>
        </div>
      ));
    }

    return <p style={styles.noItemsText}>Please select a category.</p>;
  };

  return (
    <div className={`side-panel ${isExpanded ? 'expanded' : 'collapsed'}`} style={styles.sidePanel(isExpanded)}>
      <div style={styles.panelHeader}>
        {currentLevel !== 'TOP_CATEGORIES' && (
          <button onClick={handleBack} title="Back" style={styles.backButtonSymbol}>&larr;</button>
        )}
        {isExpanded && renderBreadcrumb()}
        <div style={{ marginLeft: currentLevel !== 'TOP_CATEGORIES' ? 'auto' : '0' }}>
          <button className="close-button" title="Close Panel" onClick={() => typeof setShowSidePanel === 'function' && setShowSidePanel(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px 8px', color: '#333' }}>×</button>
        </div>
      </div>
      {isExpanded && <div style={styles.contentWrapper}>{renderContent()}</div>}
    </div>
  );
};

// Styles
const styles = {
  sidePanel: (isExpanded) => ({
    position: 'fixed',
    // Assuming you want the panel on the LEFT side based on chevron icons
    right: '20px', 
    top: '80px', // Adjusted to match your screenshot's top margin
    bottom: '20px',
    width: isExpanded ? '360px' : '45px', // Collapsed width to show only toggle
    backgroundColor: '#f8f9fa',
    // borderRight: '1px solid #dee2e6', // Border on the right for a left panel
    boxShadow: '2px 0 5px rgba(0,0,0,0.05)', // Shadow on the right
    display: 'flex',
    flexDirection: 'column', 
    transition: 'width 0.3s ease-in-out',
    zIndex: 1000,
    overflow: 'hidden', // This hides content when width is small
  }),
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f1f3f5',
    flexShrink: 0,
    height: '45px',
  },

    breadcrumbLink: {
    cursor: 'pointer',
    color: '#E4002B',
    textDecoration: 'underline' ,
    textDecorationColor: '#E4002B',
  },

  breadcrumbSeparator: {
    margin: '0 4px',
    color: '#6c757d',
  },

  breadcrumbActive: {
    color: '#E4002B',
    fontWeight: 'bold',
  },

  breadcrumb: {
    fontSize: '1.10em', 
    color: '#6c757d',
    marginLeft: '10px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flexGrow: 1,
    lineHeight: '45px', 
  },
  backButtonSymbol: { 
    background: 'transparent',
    border: 'none',
    color: '#333',
    padding: '8px 10px', 
    marginRight: '8px', 
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '18px', 
    lineHeight: '1',
    fontWeight: 'bold', 
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
  contentWrapper: {
    overflowY: 'auto',
    flexGrow: 1,
    padding: '12px',
    backgroundColor: '#fff',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 8px',
    cursor: 'pointer',
    borderRadius: '4px',
    marginBottom: '5px',
    transition: 'background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease',
    border: '1px solid #ddd', 
    backgroundColor: '#fff'   
  },
  listItemProduct: { 
    display: 'flex',
    alignItems: 'center',
    padding: '8px',
    cursor: 'pointer',
    borderRadius: '4px',
    marginBottom: '5px',
    transition: 'background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease',
    border: '1px solid #f0f0f0', 
  },
  listItemHover: { 
    transform: 'scale(1.02)',
    // borderColor: '#E4002B',
    backgroundColor: '#fff1f1',
    boxShadow: '0 0 10px rgba(228, 0, 43, 0.3)',
  },
  
  itemIconPlaceholder: { // Used for category/subcategory icons if no image
    width: '24px', 
    height: '24px',
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  genericIcon: {
    fontSize: '16px', 
    color: '#868e96',
  },
  itemIconProductContainer: { // Used for product icons AND category/subcategory icons
    width: '90px', 
    height: '90px',
    marginRight: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: '#fff', // Ensure background for images
  },
  productIcon: { 
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  itemNameText: {
    flexGrow: 1,
    fontSize: '0.9em',
    color: '#343a40', 
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemCount: {
    fontSize: '0.8em',
    color: '#6c757d',
    marginLeft: '8px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    padding: '2px 6px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
  },
  chevronRight: {
    marginLeft: 'auto', 
    color: '#adb5bd',
    fontSize: '0.8em',
  },
  noItemsText: {
    textAlign: 'center',
    color: '#6c757d',
    marginTop: '20px',
    fontSize: '0.95em',
  }

};

export default SidePanel;
