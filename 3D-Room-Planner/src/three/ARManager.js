// src/three/ARManager.js
export function generateQR(modelName) {
    console.log("generateQR called for model:", modelName);
  const arViewerUrl = `https://3d-room-planner-s3.s3.eu-north-1.amazonaws.com/ar_viewer.html?model=${modelName}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(arViewerUrl)}`;

  const modal = document.getElementById("arQrModal");
  const image = document.getElementById("arQrImage");

  if (modal && image) {
    image.src = qrUrl;
    modal.style.display = "flex";
  } else {
    console.warn("QR modal elements not found in DOM.");
  }
}
