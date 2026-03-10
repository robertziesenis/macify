const canvas = document.getElementById("image-frame");
const ctx = canvas.getContext("2d");

let canvasWidth = 1080;
let canvasHeight = 1350;
let bgColor = "#000000";
// Ratio of bottom padding to image height to ensure the device frame fits nicely within the canvas
const bottomPaddingRatio = 0.12;

// Registry of draw functions — add future elements here via registerDrawFunction()
const drawFunctions = [];

function registerDrawFunction(fn) {
  drawFunctions.push(fn);
}

// Master redraw: clears the canvas, repaints background, then runs all registered draw functions
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawFunctions.forEach((fn) => fn());
}

// Set canvas dimensions and trigger a full redraw
function resizeCanvas(width, height) {
  canvas.width = width;
  canvas.height = height;
  redraw();
}

resizeCanvas(canvasWidth, canvasHeight);

document.getElementById("width").addEventListener("input", function () {
  canvasWidth = parseInt(this.value);
  resizeCanvas(canvasWidth, canvasHeight);
});

document.getElementById("height").addEventListener("input", function () {
  canvasHeight = parseInt(this.value);
  resizeCanvas(canvasWidth, canvasHeight);
});

// Update background color and redraw
document.getElementById("bg-color").addEventListener("input", function () {
  bgColor = this.value;
  redraw();
});

// Uploaded media handling

// Device frame image
const deviceFrame = new Image();
deviceFrame.src = "./img/macbook.png";

registerDrawFunction(() => {
  if (!deviceFrame.complete) return;

  let drawWidth = canvas.width;
  let drawHeight =
    (deviceFrame.naturalHeight / deviceFrame.naturalWidth) * drawWidth;
  const maxImageHeight = canvas.height / (1 + bottomPaddingRatio);

  if (drawHeight > maxImageHeight) {
    drawHeight = maxImageHeight;
    drawWidth =
      (deviceFrame.naturalWidth / deviceFrame.naturalHeight) * drawHeight;
  }

  const bottomPadding = drawHeight * bottomPaddingRatio;
  const totalHeight = drawHeight + bottomPadding;
  const offsetX = (canvas.width - drawWidth) / 2;
  const offsetY = (canvas.height - totalHeight) / 2;

  ctx.drawImage(deviceFrame, offsetX, offsetY, drawWidth, drawHeight);
});

deviceFrame.onload = redraw;
