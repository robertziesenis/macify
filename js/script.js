$(document).ready(function () {
  const $canvas = $("#image-frame");
  const $container = $("section.image");
  const $widthInput = $("#width");
  const $heightInput = $("#height");

  function updateCanvasPreview() {
    if (!$canvas.length || !$container.length) return;

    const containerWidth = $container.width();
    const containerHeight = $container.height();
    const canvasWidth = parseInt($widthInput.val(), 10) || 1;
    const canvasHeight = parseInt($heightInput.val(), 10) || 1;

    const canvasAspect = canvasWidth / canvasHeight;
    const containerAspect = containerWidth / containerHeight;
    let previewWidth;
    let previewHeight;

    if (canvasAspect > containerAspect) {
      previewWidth = containerWidth;
      previewHeight = Math.round(containerWidth / canvasAspect);
    } else {
      previewHeight = containerHeight;
      previewWidth = Math.round(containerHeight * canvasAspect);
    }

    $canvas.css({
      width: previewWidth + "px",
      height: previewHeight + "px",
      display: "block",
    });
  }

  $widthInput.on("input", updateCanvasPreview);
  $heightInput.on("input", updateCanvasPreview);
  $(window).on("resize", updateCanvasPreview);

  updateCanvasPreview();
});

// Change text of file-input when a file is selected and show delete button
const fileInputButton = document.getElementById("button-file-input");
const fileInput = document.getElementById("file-input");
const deleteFileButton = document.getElementById("button-delete-file");

fileInput.addEventListener("change", () => {
  if (fileInput.value) {
    fileInput.value = "";
    fileInputButton.textContent = "Upload image or video file";
    deleteFileButton.style.display = "none";
  }

  fileInputButton.textContent = "Change file";
  deleteFileButton.style.display = "flex";
})