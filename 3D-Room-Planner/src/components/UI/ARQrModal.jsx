// src/components/UI/ARQrModal.jsx
import React from 'react';

const ARQrModal = ({ visible, modelName, onClose }) => {
  if (!visible || !modelName) return null;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://3d-room-planner-s3.s3.eu-north-1.amazonaws.com/ar_viewer.html?model=${modelName}`)}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: '#ffffff',
        padding: '36px',
        borderRadius: '20px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        textAlign: 'center',
        position: 'relative',
        maxWidth: '90%',
        width: '320px',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      }}>
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 16,
            fontSize: '24px',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#555'
          }}
          onClick={onClose}
        >
          ×
        </span>
        <h2 style={{ marginBottom: '12px', fontSize: '20px', color: '#666' }}>Scan to View in AR</h2>
        <img
          src={qrUrl}
          alt="Scan QR to View in AR"
          width="240"
          height="240"
          style={{
            border: '8px solid #f1f1f1',
            borderRadius: '12px',
            marginBottom: '16px'
          }}
        />
        <p style={{ fontSize: '14px', color: '#666' }}>
          Model: <strong>{modelName.replace(/-/g, ' ')}</strong>
        </p>
      </div>
    </div>
  );
};

export default ARQrModal;

