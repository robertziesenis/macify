const canvas = document.getElementById("image-frame");
const ctx = canvas.getContext("2d");

let canvasWidth = 1080;
let canvasHeight = 1350;
let bgColor = "#000000";
// Ratio of bottom padding to image height to ensure the device frame fits nicely within the canvas
const bottomPaddingRatio = 0.12;

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

function getDeviceFrameBounds() {
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

function drawUploadedMedia() {
  if (!uploadedMedia || !deviceFrame.complete) return;
  if (uploadedMediaType === "video" && uploadedMedia.readyState < 2) return;

  const { offsetX, offsetY, drawWidth, drawHeight } = getDeviceFrameBounds();
  const mediaWidth =
    uploadedMediaType === "image"
      ? uploadedMedia.naturalWidth
      : uploadedMedia.videoWidth;
  const mediaHeight =
    uploadedMediaType === "image"
      ? uploadedMedia.naturalHeight
      : uploadedMedia.videoHeight;

  if (!mediaWidth || !mediaHeight) return;

  const screenWidth = drawWidth * 0.767;
  const screenHeight = screenWidth / (15.4 / 10);
  const mediaX = offsetX + (drawWidth - screenWidth) / 2;
  const mediaY = offsetY + (drawHeight - screenHeight) / 2;

  const scale = Math.max(screenWidth / mediaWidth, screenHeight / mediaHeight);
  const sw = screenWidth / scale;
  const sh = screenHeight / scale;
  const sx = Math.max(0, (mediaWidth - sw) / 2);
  const sy = Math.max(0, (mediaHeight - sh) / 2);

  const shadow = getShadowSettings();
  ctx.save();
  if (shadow.enabled && shadow.size > 0) {
    ctx.shadowColor = "rgba(0, 0, 0, 1)";
    ctx.shadowBlur = shadow.size;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = shadow.size * 0.4;
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  ctx.drawImage(
    uploadedMedia,
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
deviceFrame.src = "./img/macbook.png";

registerDrawFunction(drawUploadedMedia);
registerDrawFunction(() => {
  if (!deviceFrame.complete || !isFrameVisible()) return;

  const { offsetX, offsetY, drawWidth, drawHeight } = getDeviceFrameBounds();
  ctx.drawImage(deviceFrame, offsetX, offsetY, drawWidth, drawHeight);
});

deviceFrame.onload = redraw;

document.getElementById("has-shadow").addEventListener("change", redraw);
document.getElementById("shadow-size").addEventListener("input", redraw);
document.getElementById("has-frame").addEventListener("change", redraw);

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
