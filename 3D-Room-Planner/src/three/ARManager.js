// src/three/ARManager.js
export function generateQR(modelName) {
  console.log("generateQR called for model:", modelName);

  // Replace this with your actual CloudFront distribution domain
  const redirectUrl = `https://d3hu0a43t9wj79.cloudfront.net/ar_redirect.html?model=${modelName}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(redirectUrl)}`;

  const modal = document.getElementById("arQrModal");
  const image = document.getElementById("arQrImage");

  if (modal && image) {
    image.src = qrUrl;
    modal.style.display = "flex";
  } else {
    console.warn("QR modal elements not found in DOM.");
  }
}

