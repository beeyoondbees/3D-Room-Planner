

const modelBaseURL = "https://superb-pothos-4d9d4f.netlify.app/glb/";
const redirectURL = "https://moonlit-alfajores-aadeab.netlify.app/";
let currentModel = "SBike";
  
function loadModel(name) {
    currentModel = name;

    const glbUrl = `${modelBaseURL}${name}.glb`;
    const usdzUrl = `${modelBaseURL}${name}.usdz`;

    const viewer = document.getElementById("arViewer");
    viewer.setAttribute("src", glbUrl);
    viewer.setAttribute("ios-src", usdzUrl);

    generateQR(); // Show QR in center when model is clicked
}

function generateQR() {
    const qrImg = document.getElementById("qrCode");
    const qrLink = document.getElementById("qrLink");

    const universalURL = `${redirectURL}?model=${currentModel}`;

    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(universalURL)}&size=160x160`;
    qrLink.href = universalURL;

    document.getElementById("qrContainer").style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => loadModel(currentModel));