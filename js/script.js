// Global variables to track uploaded file
let uploadedDataURL = '';
let uploadedFileType = '';

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

// Function to download video with frame overlay
async function downloadVideoWithFrame() {
  try {
    const video = document.querySelector('#uploaded-media video');
    if (!video) {
      console.error('No video element found');
      return;
    }

    const frameImg = new Image();
    frameImg.src = './img/macbook.png';

    // Wait for frame image to load
    await new Promise((resolve, reject) => {
      frameImg.onload = resolve;
      frameImg.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');

    // Get current frame size for scaling
    const frameElement = document.querySelector('.image-frame');
    const frameRect = frameElement.getBoundingClientRect();
    const scaleX = canvas.width / frameRect.width;
    const scaleY = canvas.height / frameRect.height;

    // Get device frame position
    const deviceElement = document.querySelector('.device-frame');
    const deviceRect = deviceElement.getBoundingClientRect();
    const deviceOffsetX = deviceRect.left - frameRect.left;
    const deviceOffsetY = deviceRect.top - frameRect.top;

    // Determine supported MIME type, preferring MP4
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
      mimeType = 'video/mp4;codecs=h264';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    }

    const stream = canvas.captureStream(30); // 30 fps
    const recorder = new MediaRecorder(stream, { mimeType: mimeType });
    const chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'media-frame.mp4';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    };

    // Reset video to start
    video.currentTime = 0;
    video.play().catch((error) => {
      console.error('Video play failed:', error);
    });

    recorder.start();

    function draw() {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw video (positioned to match the DOM layout, scaled to canvas)
      const videoRect = video.getBoundingClientRect();
      const offsetX = videoRect.left - frameRect.left;
      const offsetY = videoRect.top - frameRect.top;
      ctx.drawImage(video, offsetX * scaleX, offsetY * scaleY, videoRect.width * scaleX, videoRect.height * scaleY);
      // Draw frame overlay at its CSS position and size, scaled
      ctx.drawImage(frameImg, deviceOffsetX * scaleX, deviceOffsetY * scaleY, deviceRect.width * scaleX, deviceRect.height * scaleY);

      if (video.currentTime < video.duration) {
        requestAnimationFrame(draw);
      } else {
        recorder.stop();
        video.pause();
      }
    }

    draw();

    // Stop recording after video duration
    setTimeout(() => {
      recorder.stop();
      video.pause();
    }, video.duration * 1000);
  } catch (error) {
    console.error('Error in downloadVideoWithFrame:', error);
  }
}

// Download button via html2canvas.js library
$(document).ready(function() {
    $('#btn-download').click(function() {
        if (uploadedFileType.startsWith('video/')) {
            downloadVideoWithFrame();
        } else {
            // For images, capture the framed image and download as JPG
            var frame = $('.image-frame')[0];
            var originalWidth = frame.style.width;
            var originalHeight = frame.style.height;
            frame.style.width = '1080px';
            frame.style.height = '1350px';
            html2canvas(frame, {
                scale: 1
            }).then(function(canvas) {
                frame.style.width = originalWidth;
                frame.style.height = originalHeight;
                var link = document.createElement('a');
                link.download = 'media-frame.jpg';
                link.href = canvas.toDataURL('image/jpeg');
                link.click();
            });
        }
    });
});
