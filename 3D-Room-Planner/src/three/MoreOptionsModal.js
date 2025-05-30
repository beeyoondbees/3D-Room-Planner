import React, { useState } from 'react';

const MoreOptionsModal = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    workspace: true,
    grid: true,
    clippingPlanes: false,
    floors: true,
    objectDimensions: true,
  });

  const toggleSetting = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!isOpen) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>Settings</h2>
        <button onClick={onClose} style={styles.closeButton}>×</button>
      </div>

      <hr style={styles.divider} />

      {[
        { label: 'Dark Mode', key: 'Dark Mode' },
        { label: 'Grid', key: 'grid' },
        { label: 'Clipping planes', key: 'clippingPlanes' },
        { label: 'Floors', key: 'floors' },
        { label: 'Object dimensions', key: 'objectDimensions' },
      ].map(({ label, key }) => (
        <div key={key} style={styles.toggleRow}>
          <span>{label}</span>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={() => toggleSetting(key)}
            />
            <span style={{ ...styles.slider, ...(settings[key] ? styles.sliderChecked : {}) }}></span>
          </label>
        </div>
      ))}
    </div>
  );
};

const styles = {
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '300px',
    height: '100vh',
    backgroundColor: '#fff',
    boxShadow: '-2px 0 8px rgba(0,0,0,0.2)',
    padding: '20px',
    zIndex: 9999,
    fontFamily: 'sans-serif',
    color: '#666',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
  },
  closeButton: {
    fontSize: '20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  option: {
    fontSize: '14px',
    padding: '10px 0',
    color: '#333',
    cursor: 'pointer',
  },
  divider: {
    margin: '12px 0',
    borderColor: '#eee',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    fontSize: '14px',
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    width: '40px',
    height: '22px',
  },
  slider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ccc',
    borderRadius: '22px',
    transition: '.4s',
  },
  sliderChecked: {
    backgroundColor: '#f80', // Orange when active
    boxShadow: '0 0 0 2px rgba(255, 136, 0, 0.3)',
  },
};

export default MoreOptionsModal;


// import React, { useState, useEffect, useRef } from 'react';

// const SettingsPanel = () => {
//   const [isSettingsOpen, setIsSettingsOpen] = useState(true);  // You can toggle initial open state
//   const [darkMode, setDarkMode] = useState(false);
//   const panelRef = useRef(null);

//   // Manage dark mode class on root element
//   useEffect(() => {
//     const className = 'dark-mode';
//     const root = document.documentElement;

//     if (darkMode) {
//       root.classList.add(className);
//     } else {
//       root.classList.remove(className);
//     }
//   }, [darkMode]);

//   // Detect clicks outside the panel to close it
//   useEffect(() => {
//     function handleClickOutside(event) {
//       if (panelRef.current && !panelRef.current.contains(event.target)) {
//         setIsSettingsOpen(false);
//       }
//     }

//     if (isSettingsOpen) {
//       document.addEventListener('mousedown', handleClickOutside);
//     } else {
//       document.removeEventListener('mousedown', handleClickOutside);
//     }

//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, [isSettingsOpen]);

//   const styles = {
//     panel: {
//       position: 'absolute',
//       top: '52px',
//       left: '50%',
//       transform: 'translateX(-50%)',
//       width: '260px',
//       backgroundColor: darkMode ? '#2a2a2a' : 'white',
//       border: '1px solid #ccc',
//       padding: '16px',
//       borderRadius: '8px',
//       boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
//       zIndex: 1050,
//       color: darkMode ? '#eee' : '#222',
//       display: isSettingsOpen ? 'block' : 'none',
//     },
//     title: {
//       fontSize: '16px',
//       fontWeight: '600',
//       marginBottom: '12px',
//     },
//     section: {
//       marginBottom: '12px',
//       display: 'flex',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     label: {
//       fontSize: '14px',
//     },
//     input: {
//       transform: 'scale(1.2)',
//       cursor: 'pointer',
//     }
//   };

//   if (!isSettingsOpen) return null;

//   return (
//     <div ref={panelRef} style={styles.panel}>
//       <h3 style={styles.title}>Settings</h3>

//       <div style={styles.section}>
//         <span style={styles.label}>Dark Mode</span>
//         <input
//           type="checkbox"
//           style={styles.input}
//           checked={darkMode}
//           onChange={(e) => setDarkMode(e.target.checked)}
//         />
//       </div>

//       <div style={styles.section}>
//         <label htmlFor="show-grid" style={styles.label}>
//           Show Grid
//         </label>
//         <input
//           type="checkbox"
//           id="show-grid"
//           style={styles.input}
//           // checked={showGrid}
//           // onChange={(e) => setShowGrid(e.target.checked)}
//         />
//       </div>

//       <div style={styles.section}>
//         <label htmlFor="snap-to-grid" style={styles.label}>
//           Snap to Grid
//         </label>
//         <input
//           type="checkbox"
//           id="snap-to-grid"
//           style={styles.input}
//           // checked={snapToGrid}
//           // onChange={(e) => setSnapToGrid(e.target.checked)}
//         />
//       </div>

//       <div style={styles.section}>
//         <label htmlFor="show-dimensions" style={styles.label}>
//           Show Dimensions
//         </label>
//         <input
//           type="checkbox"
//           id="show-dimensions"
//           style={styles.input}
//           // checked={showDimensions}
//           // onChange={(e) => setShowDimensions(e.target.checked)}
//         />
//       </div>
//     </div>
//   );
// };

// export default SettingsPanel;
