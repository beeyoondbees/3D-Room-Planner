import React, { useState, useEffect, useRef, useCallback } from 'react';

// Utility Export
export const getIsDarkMode = () => {
  try {
    return localStorage.getItem('isDarkMode') === 'true';
  } catch {
    return false;
  }
};

// Icon Components
const SunIcon = ({ size = 16, color = "#fbbf24" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="5" fill={color} />
    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
      stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MoonIcon = ({ size = 16, color = "#3b82f6" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={color} />
  </svg>
);

const DarkModeToggle = ({ isDarkMode, onToggle, size = 'medium' }) => {
  const sizeMap = {
    small: { width: 50, height: 25, thumb: 19, iconSize: 12 },
    medium: { width: 60, height: 30, thumb: 22, iconSize: 14 },
    large: { width: 70, height: 35, thumb: 27, iconSize: 16 },
  };
  const config = sizeMap[size];

  return (
    <label style={{ ...styles.switch, width: config.width, height: config.height }}>
      <input 
        type="checkbox" 
        checked={isDarkMode} 
        onChange={(e) => onToggle(e.target.checked)} 
        style={styles.hiddenInput} 
      />
      <span style={{ ...styles.slider, backgroundColor: '#2d3748' }}>
        <span style={{ 
          ...styles.sunIcon, 
          opacity: isDarkMode ? 0 : 1, 
          right: 8,
          transform: isDarkMode ? 'scale(0.6) translateY(-50%)' : 'scale(1) translateY(-50%)'
        }}>
          <SunIcon size={config.iconSize} />
        </span>
        <span style={{ 
          ...styles.moonIcon, 
          opacity: isDarkMode ? 1 : 0, 
          left: 8,
          transform: isDarkMode ? 'scale(1) translateY(-50%)' : 'scale(0.6) translateY(-50%)'
        }}>
          <MoonIcon size={config.iconSize} />
        </span>
        <span style={{
          ...styles.thumb,
          width: config.thumb,
          height: config.thumb,
          transform: isDarkMode
            ? `translateX(${config.width - config.thumb - 6}px)`
            : 'translateX(3px)',
        }} />
      </span>
    </label>
  );
};

// Main Component
const MoreOptionsModal = ({ isOpen, onClose, onViewAction }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const storedDarkMode = localStorage.getItem('isDarkMode') === 'true';
      
      return {
        grid: true,
        objectDimensions: false,
        darkMode: storedDarkMode,
      };
    } catch {
      return {
        grid: true,
        objectDimensions: false,
        darkMode: false,
      };
    }
  });

  const [syncStatus, setSyncStatus] = useState({
    gridConnected: false,
    dimensionsConnected: false,
    floorEditorConnected: false,
    toolbarConnected: false,
  });

  const [toolbarStates, setToolbarStates] = useState({
    floorDimensionsActive: false,
    gridActive: false,
  });

  const [dimensionStatus, setDimensionStatus] = useState({
    isActivating: false,
    lastActivation: null,
    activationAttempts: 0,
    editorReady: false,
    sceneManagerReady: false,
  });

  const [logs, setLogs] = useState([]);
  const eventListenersRef = useRef(new Map());

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-4), { message, type, timestamp }]);
  }, []);

  const checkComponents = useCallback(() => {
    const floorEditorExists = !!window.floorDimensionEditor;
    const sceneManagerExists = !!window.sceneManager;
    const floorEditorMethods = floorEditorExists && 
      typeof window.floorDimensionEditor.initEditor === 'function' &&
      typeof window.floorDimensionEditor.clearEditor === 'function' &&
      typeof window.floorDimensionEditor.quickActivate === 'function';
    const sceneManagerMethods = sceneManagerExists &&
      typeof window.sceneManager.initObjectDimensions === 'function' &&
      typeof window.sceneManager.clearObjectDimensions === 'function';

    setDimensionStatus(prev => ({
      ...prev,
      editorReady: floorEditorMethods,
      sceneManagerReady: sceneManagerMethods,
    }));

    return {
      floorEditor: floorEditorMethods,
      sceneManager: sceneManagerMethods,
      bothReady: floorEditorMethods && sceneManagerMethods,
      available: floorEditorExists || sceneManagerExists,
    };
  }, []);

  const activateDimensions = useCallback(async (enable) => {
    const action = enable ? 'ACTIVATING' : 'DEACTIVATING';
    console.log(`🎯 ${action} dimensions`);
    addLog(`${action} object dimensions...`, 'info');
    
    setDimensionStatus(prev => ({
      ...prev,
      isActivating: true,
      lastActivation: new Date().toISOString(),
      activationAttempts: prev.activationAttempts + 1,
    }));

    if (enable) {
      const maxAttempts = 5;
      const delays = [0, 100, 300, 600, 1000];

      const attemptActivation = async (attemptNumber) => {
        console.log(`🔄 Activation attempt ${attemptNumber + 1}/${maxAttempts}`);
        addLog(`Attempt ${attemptNumber + 1}/${maxAttempts}`, 'info');
        
        const components = checkComponents();
        
        if (components.bothReady) {
          console.log('✅ Components ready, activating...');
          addLog('Components ready, activating...', 'success');
          
          try {
            if (window.sceneManager) {
              window.sceneManager.initObjectDimensions();
            }
            if (window.floorDimensionEditor) {
              window.floorDimensionEditor.quickActivate();
            }
            
            const events = [
              { name: 'objectDimensionsToggle', detail: { visible: true, source: 'modal' } },
              { name: 'floorDimensionsToggle', detail: { visible: true, source: 'modal' } },
              { name: 'updateToolbarButton', detail: { action: 'toggle-floor-dimensions', active: true, source: 'modal' } },
              { name: 'syncIconButton', detail: { action: 'toggle-floor-dimensions', active: true, source: 'modal' } },
            ];
            
            events.forEach(event => {
              window.dispatchEvent(new CustomEvent(event.name, { detail: event.detail }));
              console.log(`📡 Dispatched: ${event.name}`, event.detail);
            });
            
            setTimeout(() => {
              setDimensionStatus(prev => ({ ...prev, isActivating: false }));
              setSettings(prev => ({ ...prev, objectDimensions: true }));
              setSyncStatus(prev => ({ ...prev, dimensionsConnected: true }));
              addLog('✅ Activation successful!', 'success');
            }, 200);
            
            console.log('✅ Activation successful');
            return true;
          } catch (error) {
            console.error('❌ Activation error:', error);
            addLog(`❌ Error: ${error.message}`, 'error');
            setDimensionStatus(prev => ({ ...prev, isActivating: false }));
          }
        }
        else if (attemptNumber === 0) {
          console.log('⚠️ External components not available, using fallback activation');
          addLog('External components not found, using fallback...', 'warning');
          
          try {
            const events = [
              { name: 'objectDimensionsToggle', detail: { visible: true, source: 'modal' } },
              { name: 'floorDimensionsToggle', detail: { visible: true, source: 'modal' } },
              { name: 'updateToolbarButton', detail: { action: 'toggle-floor-dimensions', active: true, source: 'modal' } },
              { name: 'syncIconButton', detail: { action: 'toggle-floor-dimensions', active: true, source: 'modal' } },
              { name: 'dimensionsActivated', detail: { active: true, source: 'modal', fallback: true } },
            ];
            
            events.forEach(event => {
              window.dispatchEvent(new CustomEvent(event.name, { detail: event.detail }));
              console.log(`📡 Dispatched: ${event.name}`, event.detail);
            });
            
            events.forEach(event => {
              document.dispatchEvent(new CustomEvent(event.name, { detail: event.detail }));
            });
            
            setTimeout(() => {
              setDimensionStatus(prev => ({ ...prev, isActivating: false }));
              setSettings(prev => ({ ...prev, objectDimensions: true }));
              setSyncStatus(prev => ({ ...prev, dimensionsConnected: false }));
              addLog('✅ Fallback activation complete!', 'success');
              addLog('ℹ️ Check if 3D scene components are loaded', 'info');
            }, 200);
            
            console.log('✅ Fallback activation successful');
            return true;
          } catch (error) {
            console.error('❌ Fallback activation error:', error);
            addLog(`❌ Fallback error: ${error.message}`, 'error');
            setDimensionStatus(prev => ({ ...prev, isActivating: false }));
          }
        }

        if (attemptNumber < maxAttempts - 1 && components.available) {
          const delay = delays[attemptNumber + 1];
          console.log(`⏳ Retrying in ${delay}ms...`);
          addLog(`Retrying in ${delay}ms...`, 'warning');
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptActivation(attemptNumber + 1);
        } else {
          console.warn('⚠️ Max attempts reached or no components available');
          addLog('⚠️ Activation failed', 'error');
          setDimensionStatus(prev => ({ ...prev, isActivating: false }));
          setSettings(prev => ({ ...prev, objectDimensions: false }));
        }
        return false;
      };

      await attemptActivation(0);
    } else {
      console.log('🔧 Deactivating dimensions...');
      addLog('Deactivating dimensions...', 'info');
      
      try {
        if (window.floorDimensionEditor && typeof window.floorDimensionEditor.clearEditor === 'function') {
          window.floorDimensionEditor.clearEditor();
        }
        if (window.sceneManager && typeof window.sceneManager.clearObjectDimensions === 'function') {
          window.sceneManager.clearObjectDimensions();
        }
        
        const events = [
          { name: 'objectDimensionsToggle', detail: { visible: false, source: 'modal' } },
          { name: 'floorDimensionsToggle', detail: { visible: false, source: 'modal' } },
          { name: 'updateToolbarButton', detail: { action: 'toggle-floor-dimensions', active: false, source: 'modal' } },
          { name: 'syncIconButton', detail: { action: 'toggle-floor-dimensions', active: false, source: 'modal' } },
        ];
        
        events.forEach(event => {
          window.dispatchEvent(new CustomEvent(event.name, { detail: event.detail }));
        });
        
        setTimeout(() => {
          setDimensionStatus(prev => ({ ...prev, isActivating: false }));
          setSettings(prev => ({ ...prev, objectDimensions: false }));
          setSyncStatus(prev => ({ ...prev, dimensionsConnected: false }));
          addLog('✅ Deactivation successful!', 'success');
        }, 200);
        
        console.log('✅ Deactivation successful');
      } catch (error) {
        console.error('❌ Deactivation error:', error);
        addLog(`❌ Error: ${error.message}`, 'error');
        setDimensionStatus(prev => ({ ...prev, isActivating: false }));
      }
    }

    if (onViewAction) {
      onViewAction('toggle-floor-dimensions', enable);
    }
  }, [addLog, checkComponents, onViewAction]);

  useEffect(() => {
    const componentCheckInterval = setInterval(checkComponents, 2000);

    const handleGridStateChange = (e) => {
      const { visible, source } = e.detail;
      setSyncStatus(prev => ({ ...prev, gridConnected: true }));
      if (source !== 'modal') {
        setSettings(prev => ({ ...prev, grid: visible }));
        addLog(`Grid ${visible ? 'enabled' : 'disabled'} from ${source}`, 'info');
      }
    };

    const handleGridReady = (e) => {
      const { visible } = e.detail;
      setSettings(prev => ({ ...prev, grid: visible }));
      setSyncStatus(prev => ({ ...prev, gridConnected: true }));
    };

    const handleObjectDimensionsStateChange = (e) => {
      const { visible, source } = e.detail;
      setSyncStatus(prev => ({ ...prev, dimensionsConnected: true }));
      if (source !== 'modal' && !source.includes('modal') && !dimensionStatus.isActivating) {
        setSettings(prev => ({ ...prev, objectDimensions: visible }));
        addLog(`Object dimensions ${visible ? 'enabled' : 'disabled'} from ${source}`, 'info');
      }
    };

    const handleObjectDimensionsReady = (e) => {
      const { visible } = e.detail;
      if (!dimensionStatus.isActivating) {
        setSettings(prev => ({ ...prev, objectDimensions: visible }));
      }
      setSyncStatus(prev => ({ ...prev, dimensionsConnected: true }));
    };

    const handleFloorEditorStateChange = (e) => {
      const { active, source } = e.detail;
      setSyncStatus(prev => ({ ...prev, floorEditorConnected: true }));
      if (source !== 'modal' && !source.includes('modal') && !dimensionStatus.isActivating) {
        setSettings(prev => ({ ...prev, objectDimensions: active }));
      }
    };

    const handleFloorEditorReady = (e) => {
      setSyncStatus(prev => ({ ...prev, floorEditorConnected: true }));
    };

    const handleToolbarButtonStateChange = (e) => {
      const { action, active, source } = e.detail;
      setSyncStatus(prev => ({ ...prev, toolbarConnected: true }));
      
      if (action === 'toggle-floor-dimensions') {
        setToolbarStates(prev => ({ ...prev, floorDimensionsActive: active }));
        if ((source === 'toolbar' || source === 'iconbutton') && !dimensionStatus.isActivating) {
          setSettings(prev => ({ ...prev, objectDimensions: active }));
        }
      }
      if (action === 'toggle-grid') {
        setToolbarStates(prev => ({ ...prev, gridActive: active }));
        if (source === 'toolbar' || source === 'iconbutton') {
          setSettings(prev => ({ ...prev, grid: active }));
        }
      }
    };

    const handleIconButtonClick = (e) => {
      const { action, newState } = e.detail;
      setSyncStatus(prev => ({ ...prev, toolbarConnected: true }));
      if (action === 'toggle-floor-dimensions' && !dimensionStatus.isActivating) {
        setToolbarStates(prev => ({ ...prev, floorDimensionsActive: newState }));
        setSettings(prev => ({ ...prev, objectDimensions: newState }));
        activateDimensions(newState);
      }
      if (action === 'toggle-grid') {
        setToolbarStates(prev => ({ ...prev, gridActive: newState }));
        setSettings(prev => ({ ...prev, grid: newState }));
      }
    };

    const currentEventListeners = eventListenersRef.current;
    const eventHandlers = [
      ['gridStateChanged', handleGridStateChange],
      ['gridReady', handleGridReady],
      ['objectDimensionsStateChanged', handleObjectDimensionsStateChange],
      ['objectDimensionsReady', handleObjectDimensionsReady],
      ['floorEditorStateChange', handleFloorEditorStateChange],
      ['floorEditorReady', handleFloorEditorReady],
      ['toolbarButtonStateChanged', handleToolbarButtonStateChange],
      ['iconButtonClicked', handleIconButtonClick],
    ];

    eventHandlers.forEach(([eventName, handler]) => {
      window.addEventListener(eventName, handler);
      currentEventListeners.set(eventName, handler);
    });

    return () => {
      clearInterval(componentCheckInterval);
      eventHandlers.forEach(([eventName]) => {
        const handler = currentEventListeners.get(eventName);
        if (handler) {
          window.removeEventListener(eventName, handler);
        }
      });
      currentEventListeners.clear();
    };
  }, [addLog, activateDimensions, dimensionStatus.isActivating, checkComponents]);

  useEffect(() => {
    try {
      localStorage.setItem('isDarkMode', settings.darkMode ? 'true' : 'false');
      
      document.body.classList.toggle('dark-mode', settings.darkMode);
      document.documentElement.classList.toggle('dark-mode', settings.darkMode);
      
      window.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { isDarkMode: settings.darkMode }
      }));
    } catch (error) {
      console.warn('Storage not available:', error);
    }
  }, [settings.darkMode]);

  // ✅ Hide/Show ViewControls when modal opens/closes
  // ✅ Hide bottom container, zoom controls, and close side panels
  useEffect(() => {
  const hideShowControls = () => {
    const mobileContainer = document.querySelector('.mobile-controls-unified-container');
    const zoomControls = document.querySelector('.view-controls-mobile-wrapper .zoom-controls');
    const undoRedoControls = document.querySelector('.view-controls-mobile-wrapper .mobile-undo-redo-controls');

    // ✅ side panels (office + products both share .side-panel)
    const sidePanels = document.querySelectorAll('.side-panel');

    if (isOpen) {
      // Hide when settings opens
      mobileContainer?.style.setProperty('display', 'none', 'important');
      zoomControls?.style.setProperty('display', 'none', 'important');
      undoRedoControls?.style.setProperty('display', 'none', 'important');

      sidePanels.forEach((p) => p.style.setProperty('display', 'none', 'important'));
    } else {
      // Show when settings closes
      mobileContainer && (mobileContainer.style.display = 'flex');
      zoomControls && (zoomControls.style.display = 'flex');
      undoRedoControls && (undoRedoControls.style.display = 'flex');

      // restore panels (only if they were open already, display should be default)
      sidePanels.forEach((p) => p.style.removeProperty('display'));
    }
  };

  hideShowControls();

  const t1 = setTimeout(hideShowControls, 50);
  const t2 = setTimeout(hideShowControls, 100);
  const t3 = setTimeout(hideShowControls, 200);

  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);
  };
}, [isOpen]);


  const toggleSetting = (key) => {
    if (key === 'objectDimensions' && dimensionStatus.isActivating) {
      console.log('⚠️ Cannot toggle dimensions during activation');
      addLog('⚠️ Cannot toggle during activation', 'warning');
      return;
    }

    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));

    if (key === 'grid') {
      addLog(`Grid ${newValue ? 'enabled' : 'disabled'}`, 'info');
      
      window.dispatchEvent(new CustomEvent('gridToggle', {
        detail: { visible: newValue, source: 'modal' }
      }));
      
      window.dispatchEvent(new CustomEvent('updateToolbarButton', {
        detail: { action: 'toggle-grid', active: newValue, source: 'modal' }
      }));
      
      if (onViewAction) onViewAction('toggle-grid', newValue);
    }

    if (key === 'objectDimensions') {
      activateDimensions(newValue);
    }

    if (key === 'darkMode') {
      addLog(`Theme changed to ${newValue ? 'dark' : 'light'} mode`, 'info');
      
      try {
        localStorage.setItem('isDarkMode', newValue ? 'true' : 'false');
      } catch {}
      
      window.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { isDarkMode: newValue }
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .toggle-switch:hover .slider {
            border: 1px solid #a855f7;
          }
          .toggle-switch.disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .toggle-switch.disabled .slider {
            border: 1px solid #f59e0b;
            animation: pulse 1s infinite;
          }
          .settings-panel {
            animation: slideIn 0.3s ease-out;
          }
          
          /* Settings overlay background */
          .settings-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
          }
        `}
      </style>

      {/* Overlay background - click to close */}
      <div 
        className="settings-overlay"
        onClick={onClose}
      />

      <div 
        className="settings-panel"
        style={{
          ...styles.panel,
          backgroundColor: settings.darkMode ? '#1a202c' : '#fff',
          color: settings.darkMode ? '#e2e8f0' : '#444',
        }}
      >
        <div style={styles.header}>
          <h2 style={{ ...styles.title, color: settings.darkMode ? '#fff' : 'black' }}>
            Settings
          </h2>
          <button 
            onClick={onClose}
            style={{ 
              ...styles.closeButton, 
              color: settings.darkMode ? '#a0aec0' : '#666',
            }}
          >
            ×
          </button>
        </div>

        <hr style={{ ...styles.divider, borderColor: settings.darkMode ? '#4a5568' : '#eee' }} />

        <div style={styles.toggleRow}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>Theme</span>
          </div>
          <DarkModeToggle
            isDarkMode={settings.darkMode}
            onToggle={() => toggleSetting('darkMode')}
            size="medium"
          />
        </div>

        <hr style={{ ...styles.divider, borderColor: settings.darkMode ? '#4a5568' : '#eee' }} />

        {[
          { 
            label: 'Grid', 
            key: 'grid', 
            status: settings.grid ? '✓ Visible' : '✗ Hidden',
            color: settings.grid ? '#68d391' : '#f56565',
            icon: '',
            connected: syncStatus.gridConnected,
            toolbarActive: toolbarStates.gridActive,
          },
        ].map(({ label, key, status, color, icon, connected, toolbarActive }) => (
          <div key={key} style={styles.toggleRow}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{icon}</span>
                {label}
                <span style={{
                  width: '0px',
                  height: '0px',
                  borderRadius: '50%',
                  backgroundColor: connected ? '#22c55e' : '#f56565',
                  marginLeft: '4px',
                }} />
              </span>
              <small style={{ 
                fontSize: '10px', 
                color,
                marginTop: '4px',
                fontWeight: '600',
              }}>
                {status}
              </small>
            </div>
            <label style={{
              ...styles.regularSwitch,
              opacity: key === 'objectDimensions' && dimensionStatus.isActivating ? 0.6 : 1,
              cursor: key === 'objectDimensions' && dimensionStatus.isActivating ? 'not-allowed' : 'pointer',
            }}>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={() => toggleSetting(key)}
                disabled={key === 'objectDimensions' && dimensionStatus.isActivating}
                style={styles.checkbox}
              />
              <span style={{
                ...styles.regularSlider,
                backgroundColor: settings[key] ? '#ef4444' : '#4a5568',
                boxShadow: settings[key] ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none',
                border: key === 'objectDimensions' && dimensionStatus.isActivating ? '1px solid #f59e0b' : '1px solid transparent',
                animation: key === 'objectDimensions' && dimensionStatus.isActivating ? 'pulse 1s infinite' : 'none',
              }}>
                <span style={{
                  ...styles.regularThumb,
                  transform: settings[key] ? 'translateX(20px)' : 'translateX(2px)',
                  boxShadow: settings[key] ? '0 0 6px rgba(239, 68, 68, 0.7)' : '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </span>
            </label>
          </div>
        ))}

        <hr style={{ ...styles.divider, borderColor: settings.darkMode ? '#4a5568' : '#eee' }} />

      </div>
    </>
  );
};

const styles = {
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '320px',
    height: '100vh',
    padding: '20px',
    boxShadow: '-2px 0 8px rgba(0,0,0,0.2)',
    zIndex: 10000,
    fontFamily: 'system-ui, sans-serif',
    transition: 'all 0.3s ease',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: { 
    fontSize: '18px', 
    fontWeight: 600,
    margin: 0,
  },
  closeButton: {
    fontSize: '20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
  },
  divider: {
    margin: '16px 0',
    border: 'none',
    borderTop: '1px solid',
    transition: 'border-color 0.3s ease',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    fontSize: '14px',
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    cursor: 'pointer',
  },
  hiddenInput: {
    opacity: 0,
    width: 0,
    height: 0,
    position: 'absolute',
  },
  slider: {
    position: 'absolute',
    top: '0px',
    left: '0px',
    right: '0px',
    bottom: '0px',
    borderRadius: '30px',
    transition: 'all 0.4s cubic-bezier(0.23, 1, 0.320, 1)',
    overflow: 'hidden',
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)',
  },
  sunIcon: {
    position: 'absolute',
    top: '50%',
    transition: 'all 0.4s cubic-bezier(0.23, 1, 0.320, 1)',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonIcon: {
    position: 'absolute',
    top: '50%',
    transition: 'all 0.4s cubic-bezier(0.23, 1, 0.320, 1)',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    top: '3px',
    backgroundColor: '#fff',
    borderRadius: '50%',
    transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.320, 1)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    zIndex: 2,
  },
  regularSwitch: {
    position: 'relative',
    display: 'inline-block',
    width: '44px',
    height: '24px',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  checkbox: {
    display: 'none',
  },
  regularSlider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '24px',
    border: '1px solid transparent',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
  },
  regularThumb: {
    position: 'absolute',
    top: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: '#fff',
    borderRadius: '50%',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
  },
};

export default MoreOptionsModal;