// Global variables to track uploaded file
let uploadedDataURL = '';
let uploadedFileType = '';

// Function to update the image frame size based on inputs
function updateFrameSize() {
    const width = parseInt(document.getElementById('width').value);
    const height = parseInt(document.getElementById('height').value);
    const aspectRatio = width / height;
    const frame = document.querySelector('.image-frame');

    // Calculate scale factor to fit within 90% of container
    const container = document.querySelector('section.image');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const maxWidth = containerWidth * 0.9;
    const maxHeight = containerHeight * 0.9;
    const scaleX = maxWidth / width;
    const scaleY = maxHeight / height;
    const scale = Math.min(scaleX, scaleY, 1);

    frame.style.width = (width * scale) + 'px';
    frame.style.height = (height * scale) + 'px';

    const deviceFrame = document.querySelector('.device-frame');
    const uploadedMedia = document.getElementById('uploaded-media');
    if (aspectRatio > 1) {
        // Landscape: fit to height
        deviceFrame.style.width = 'auto';
        deviceFrame.style.height = '100%';
        uploadedMedia.style.width = 'auto';
        uploadedMedia.style.height = '77%';
    } else {
        // Portrait: fit to width
        deviceFrame.style.width = '100%';
        deviceFrame.style.height = 'auto';
        uploadedMedia.style.width = '77%';
        uploadedMedia.style.height = 'auto';
    }
}

// Add event listeners to width and height inputs
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('width').addEventListener('input', updateFrameSize);
    document.getElementById('height').addEventListener('input', updateFrameSize);
    updateFrameSize(); // Set initial size
    window.addEventListener('resize', updateFrameSize);
});

// Render uploaded image or video in the media container
function onFileSelected(event) {
  const selectedFile = event.target.files[0];
  let reader = new FileReader();

  let mediaContainer = document.getElementById("uploaded-media");
  // Clear previous content
  mediaContainer.innerHTML = '';

  let mediaElement;
  if (selectedFile.type.startsWith('image/')) {
    mediaElement = document.createElement('img');
  } else if (selectedFile.type.startsWith('video/')) {
    mediaElement = document.createElement('video');
    mediaElement.controls = false; // Hide controls for a cleaner look
    mediaElement.autoplay = true; // Auto-play videos
    mediaElement.loop = true; // Loop videos for continuous play
    mediaElement.muted = true; // Mute videos to avoid unexpected sound
  } else {
    // Fallback, but since accept is image/*,video/*, shouldn't happen
    return;
  }

  mediaElement.title = selectedFile.name;
  mediaContainer.appendChild(mediaElement);

  reader.onload = function(event) {
    mediaElement.src = event.target.result;
    uploadedDataURL = event.target.result;
    uploadedFileType = selectedFile.type;
  };

  reader.readAsDataURL(selectedFile);
}

// Add event listener to bg-color input to update --background-color CSS variable
document.getElementById('bg-color').addEventListener('input', function() {
    $('html').css('--background-color', this.value);
});

// Add event listener to has-shadow checkbox to update --shadow-size CSS variable
document.getElementById('has-shadow').addEventListener('change', function() {
    if (this.checked) {
        $('html').css('--shadow-size', '30px');
        $('html').css('--shadow-color', 'rgba(255, 255, 255, 0.4)');
    } else {
        $('html').css('--shadow-size', '0px');
        $('html').css('--shadow-color', 'rgba(0, 0, 0, 0)');
    }
});

// Add event listener to shadow-size input to update --shadow-size CSS variable
document.getElementById('shadow-size').addEventListener('input', function() {
    if (document.getElementById('has-shadow').checked) {
        $('html').css('--shadow-size', this.value + 'px');
    }
});

// Add event listener to has-frame checkbox to show/hide device frame
document.getElementById('has-frame').addEventListener('change', function() {
    const deviceFrame = document.querySelector('.device-frame');
    if (this.checked) {
        deviceFrame.style.display = 'block';
    } else {
        deviceFrame.style.display = 'none';
    }
});