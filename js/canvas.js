const canvas = document.getElementById("image-frame");
const ctx = canvas.getContext("2d");

let canvasWidth = 1080;
let canvasHeight = 1350;
let bgColor = "#000000";
const PLACEHOLDER_SCREEN_COLOR = "#0000ff";
// Per-device frame assets, canvas layout, and screen placement.
// layout padding/shift values are fractions of canvas width (horizontal) or height (vertical).
const DEVICES = {
  macbook: {
    frameSrc: "./img/macbook.png",
    layout: {
      paddingTop: 0.04,
      paddingBottom: 0.12,
      paddingLeft: 0,
      paddingRight: 0,
      shiftX: 0,
      shiftY: 0,
    },
    screen: {
      widthScale: 0.766,
      aspectRatio: 1.539,
      offsetXScale: 0.117,
      offsetYScale: 0.117,
    },
  },
  imac: {
    frameSrc: "./img/imac.png",
    layout: {
      paddingTop: 0.05,
      paddingBottom: 0.1,
      paddingLeft: 0.06,
      paddingRight: 0.06,
      shiftX: 0,
      shiftY: 0.015,
    },
    screen: {
      widthScale: 0.941,
      aspectRatio: 16 / 9,
      offsetXScale: 0.029,
      offsetYScale: 0.04,
    },
  },
  iphone: {
    frameSrc: "./img/iphone.png",
    layout: {
      paddingTop: 0.05,
      paddingBottom: 0.05,
      paddingLeft: 0.1,
      paddingRight: 0.1,
      shiftX: 0,
      shiftY: 0,
    },
    screen: {
      widthScale: 0.868,
      aspectRatio: 0.461,
      offsetXScale: 0.066,
      offsetYScale: 0.033,
      // Corner radius as a fraction of the shorter screen edge
      cornerRadiusScale: 0.12,
    },
  },
};

function getInitialCanvasDimensions() {
  const widthInput = document.getElementById("width");
  const heightInput = document.getElementById("height");
  const widthValue = parseInt(widthInput?.value, 10);
  const heightValue = parseInt(heightInput?.value, 10);

  if (Number.isFinite(widthValue) && widthValue > 0) {
    canvasWidth = widthValue;
  }
  if (Number.isFinite(heightValue) && heightValue > 0) {
    canvasHeight = heightValue;
  }
}

getInitialCanvasDimensions();

// Uploaded media state
let uploadedMedia = null;
let uploadedMediaType = "";
let uploadedObjectURL = null;
let videoRequestId = null;

// Registry of draw functions — add future elements here via registerDrawFunction()
const drawFunctions = [];

function registerDrawFunction(fn) {
  drawFunctions.push(fn);
}

let currentDeviceId =
  document.getElementById("select-device")?.value || "macbook";

function getDeviceConfig(deviceId = currentDeviceId) {
  return DEVICES[deviceId] || DEVICES.macbook;
}

function getDeviceLayout() {
  const layout = getDeviceConfig().layout || {};
  return {
    paddingTop: layout.paddingTop ?? 0,
    paddingBottom: layout.paddingBottom ?? 0,
    paddingLeft: layout.paddingLeft ?? 0,
    paddingRight: layout.paddingRight ?? 0,
    shiftX: layout.shiftX ?? 0,
    shiftY: layout.shiftY ?? 0,
  };
}

function getDeviceFrameBounds() {
  const {
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    shiftX,
    shiftY,
  } = getDeviceLayout();

  const availWidth = canvas.width * (1 - paddingLeft - paddingRight);
  const availHeight = canvas.height * (1 - paddingTop - paddingBottom);
  const availX = canvas.width * paddingLeft;
  const availY = canvas.height * paddingTop;

  let drawWidth = availWidth;
  let drawHeight =
    (deviceFrame.naturalHeight / deviceFrame.naturalWidth) * drawWidth;

  if (drawHeight > availHeight) {
    drawHeight = availHeight;
    drawWidth =
      (deviceFrame.naturalWidth / deviceFrame.naturalHeight) * drawHeight;
  }

  const offsetX =
    availX + (availWidth - drawWidth) / 2 + canvas.width * shiftX;
  const offsetY =
    availY + (availHeight - drawHeight) / 2 + canvas.height * shiftY;

  return { offsetX, offsetY, drawWidth, drawHeight };
}

function getShadowSettings() {
  const hasShadow = document.getElementById("has-shadow")?.checked;
  const size = parseInt(document.getElementById("shadow-size")?.value, 10) || 0;
  return { enabled: Boolean(hasShadow), size };
}

function isFrameVisible() {
  return document.getElementById("has-frame")?.checked ?? true;
}

function getScreenBounds() {
  const { offsetX, offsetY, drawWidth, drawHeight } = getDeviceFrameBounds();
  const { screen } = getDeviceConfig();
  const screenWidth = drawWidth * screen.widthScale;
  const screenHeight = screenWidth / screen.aspectRatio;
  const mediaX =
    screen.offsetXScale != null
      ? offsetX + drawWidth * screen.offsetXScale
      : offsetX + (drawWidth - screenWidth) / 2;
  const mediaY =
    screen.offsetYScale != null
      ? offsetY + drawHeight * screen.offsetYScale
      : offsetY + (drawHeight - screenHeight) / 2;

  return { mediaX, mediaY, screenWidth, screenHeight };
}

function getScreenCornerRadius(screenWidth, screenHeight) {
  if (!isFrameVisible()) return 0;

  const cornerRadiusScale = getDeviceConfig().screen.cornerRadiusScale;
  if (!cornerRadiusScale) return 0;

  const maxRadius = Math.min(screenWidth, screenHeight) / 2;
  return Math.min(
    Math.min(screenWidth, screenHeight) * cornerRadiusScale,
    maxRadius,
  );
}

function addRoundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, r);
    return;
  }

  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function clipToScreenBounds() {
  const { mediaX, mediaY, screenWidth, screenHeight } = getScreenBounds();
  const radius = getScreenCornerRadius(screenWidth, screenHeight);
  if (radius <= 0) return;

  ctx.beginPath();
  addRoundRectPath(ctx, mediaX, mediaY, screenWidth, screenHeight, radius);
  ctx.clip();
}

function drawImageCoverInScreen(image, mediaWidth, mediaHeight) {
  if (!mediaWidth || !mediaHeight) return;

  const { mediaX, mediaY, screenWidth, screenHeight } = getScreenBounds();
  const scale = Math.max(screenWidth / mediaWidth, screenHeight / mediaHeight);
  const sw = screenWidth / scale;
  const sh = screenHeight / scale;
  const sx = Math.max(0, (mediaWidth - sw) / 2);
  const sy = Math.max(0, (mediaHeight - sh) / 2);

  ctx.save();
  clipToScreenBounds();
  applyScreenShadow();

  ctx.drawImage(
    image,
    sx,
    sy,
    sw,
    sh,
    mediaX,
    mediaY,
    screenWidth,
    screenHeight,
  );
  ctx.restore();
}

function applyScreenShadow() {
  const shadow = getShadowSettings();
  if (shadow.enabled && shadow.size > 0) {
    ctx.shadowColor =
      document.getElementById("shadow-color")?.value || "rgba(0, 0, 0, 1)";
    ctx.shadowBlur = shadow.size;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = shadow.size * 0.4;
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

function drawPlaceholderScreen() {
  const { mediaX, mediaY, screenWidth, screenHeight } = getScreenBounds();

  ctx.save();
  clipToScreenBounds();
  applyScreenShadow();
  ctx.fillStyle = PLACEHOLDER_SCREEN_COLOR;
  ctx.fillRect(mediaX, mediaY, screenWidth, screenHeight);
  ctx.restore();
}

function drawScreenContent() {
  if (!deviceFrame.complete) return;

  if (uploadedMedia) {
    if (uploadedMediaType === "video" && uploadedMedia.readyState < 2) return;

    const mediaWidth =
      uploadedMediaType === "image"
        ? uploadedMedia.naturalWidth
        : uploadedMedia.videoWidth;
    const mediaHeight =
      uploadedMediaType === "image"
        ? uploadedMedia.naturalHeight
        : uploadedMedia.videoHeight;

    drawImageCoverInScreen(uploadedMedia, mediaWidth, mediaHeight);
    return;
  }

  drawPlaceholderScreen();
}

function setDevice(deviceId) {
  if (!DEVICES[deviceId]) return;

  currentDeviceId = deviceId;
  deviceFrame.src = getDeviceConfig().frameSrc;
}

function startVideoLoop() {
  if (uploadedMediaType !== "video" || !uploadedMedia) return;
  if (videoRequestId) return;

  function loop() {
    redraw();
    videoRequestId = requestAnimationFrame(loop);
  }

  loop();
}

function stopVideoLoop() {
  if (videoRequestId) {
    cancelAnimationFrame(videoRequestId);
    videoRequestId = null;
  }
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
setDevice(currentDeviceId);

registerDrawFunction(drawScreenContent);
registerDrawFunction(() => {
  if (!deviceFrame.complete || !isFrameVisible()) return;

  const { offsetX, offsetY, drawWidth, drawHeight } = getDeviceFrameBounds();
  ctx.drawImage(deviceFrame, offsetX, offsetY, drawWidth, drawHeight);
});

deviceFrame.onload = redraw;

document.getElementById("has-shadow").addEventListener("change", redraw);
document.getElementById("shadow-size").addEventListener("input", redraw);
document.getElementById("shadow-color").addEventListener("input", redraw);
document.getElementById("has-frame").addEventListener("change", redraw);
document.getElementById("select-device").addEventListener("change", function () {
  setDevice(this.value);
  redraw();
});

// Download functionality
function setRecordingVisible(isVisible) {
  const recording = document.getElementById("recording");
  if (recording) {
    recording.style.display = isVisible ? "block" : "none";
  }
}

function downloadImage() {
  setRecordingVisible(false);
  const link = document.createElement("a");
  link.download = "macified.jpg";
  link.href = canvas.toDataURL("image/jpeg");
  link.click();
}

async function downloadVideo() {
  try {
    if (!uploadedMedia || uploadedMediaType !== "video") return;
    setRecordingVisible(true);

    // Add class to button for visual feedback during recording and change button text to indicate recording state
    const downloadButton = document.getElementById("btn-download");
    downloadButton.classList.add("recording");
    downloadButton.textContent = "Recording...";

    let mimeType = "video/webm";
    if (MediaRecorder.isTypeSupported("video/mp4;codecs=h264")) {
      mimeType = "video/mp4;codecs=h264";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      mimeType = "video/mp4";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      mimeType = "video/webm;codecs=vp9";
    }

    const stream = canvas.captureStream(60); // 60 fps
    const recorder = new MediaRecorder(stream, { mimeType: mimeType });
    const chunks = [];

    let hasStopped = false;

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      if (hasStopped) return;
      hasStopped = true;

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = mimeType.includes("mp4")
        ? "macified.mp4"
        : "macified.webm";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setRecordingVisible(false);
      downloadButton.classList.remove("recording");
      downloadButton.textContent = "↓ Download";
    };

    // Reset video to start
    uploadedMedia.currentTime = 0;
    uploadedMedia.play().catch(() => {});

    recorder.start();

    // Stop recording after video duration
    setTimeout(() => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      uploadedMedia.pause();
    }, uploadedMedia.duration * 1000);
  } catch (error) {
    console.error("Error in downloadVideo:", error);
    setRecordingVisible(false);
  }
}

document.getElementById("btn-download").addEventListener("click", function () {
  if (uploadedMediaType === "video") {
    downloadVideo();
  } else {
    downloadImage();
  }
});

function clearUploadedMedia() {
  if (uploadedObjectURL) {
    URL.revokeObjectURL(uploadedObjectURL);
    uploadedObjectURL = null;
  }
  stopVideoLoop();
  uploadedMedia = null;
  uploadedMediaType = "";
}

function onFileSelected(event) {
  const selectedFile = event.target.files[0];
  clearUploadedMedia();
  if (!selectedFile) {
    redraw();
    return;
  }

  if (selectedFile.type.startsWith("image/")) {
    const img = new Image();
    uploadedMediaType = "image";
    uploadedMedia = img;
    uploadedObjectURL = URL.createObjectURL(selectedFile);
    img.onload = () => {
      redraw();
    };
    img.onerror = () => {
      clearUploadedMedia();
      redraw();
    };
    img.src = uploadedObjectURL;
  } else if (selectedFile.type.startsWith("video/")) {
    const video = document.createElement("video");
    uploadedMediaType = "video";
    uploadedMedia = video;
    uploadedObjectURL = URL.createObjectURL(selectedFile);
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.src = uploadedObjectURL;
    video.onloadeddata = () => {
      video.play().catch(() => {});
      startVideoLoop();
      redraw();
    };
    video.onerror = () => {
      clearUploadedMedia();
      redraw();
    };
  } else {
    redraw();
  }
}
