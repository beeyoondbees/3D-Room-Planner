import React from 'react';

const ARQrModal = ({ visible, modelName, onClose }) => {
  if (!visible || !modelName) return null;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://3d-room-planner-s3.s3.eu-north-1.amazonaws.com/ar_viewer.html?model=${modelName}`)}`;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{ background: 'white', padding: '20px 30px', borderRadius: '10px', textAlign: 'center', position: 'relative' }}>
        <span style={{ position: 'absolute', top: 8, right: 12, cursor: 'pointer', fontSize: 20 }} onClick={onClose}>×</span>
        <h3>Scan to View in AR</h3>
        <img src={qrUrl} alt="AR QR" width="200" height="200" />
      </div>
    </div>
  );
};

export default ARQrModal;
