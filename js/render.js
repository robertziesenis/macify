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
    const width = parseInt(document.getElementById('width').value);
    const height = parseInt(document.getElementById('height').value);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Get background color
    const frame = document.querySelector('.image-frame');
    const bgColor = getComputedStyle(frame).backgroundColor;

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

    const stream = canvas.captureStream(60); // 60 fps
    const recorder = new MediaRecorder(stream, { mimeType: mimeType });
    const chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'macified.mp4';
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
      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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

// Function to download image with frame overlay
function downloadImageWithFrame() {
  // For images, render the framed image on canvas and download as JPG
            const frame = document.querySelector('.image-frame');
            const width = parseInt(document.getElementById('width').value);
            const height = parseInt(document.getElementById('height').value);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Fill background
            const bgColor = getComputedStyle(frame).backgroundColor;
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, width, height);

            // Get scale factors
            const frameRect = frame.getBoundingClientRect();
            const scaleX = width / frameRect.width;
            const scaleY = height / frameRect.height;

            // Draw uploaded image
            const uploadedImg = document.querySelector('#uploaded-media img');
            if (uploadedImg) {
                const imgRect = uploadedImg.getBoundingClientRect();
                const offsetX = (imgRect.left - frameRect.left) * scaleX;
                const offsetY = (imgRect.top - frameRect.top) * scaleY;
                const dw = imgRect.width * scaleX;
                const dh = imgRect.height * scaleY;

                // Calculate object-fit: cover crop
                const divRect = uploadedImg.parentElement.getBoundingClientRect();
                const s = Math.max(divRect.width / uploadedImg.naturalWidth, divRect.height / uploadedImg.naturalHeight);
                const scaledWidth = uploadedImg.naturalWidth * s;
                const scaledHeight = uploadedImg.naturalHeight * s;
                const cropOffsetX = (scaledWidth - divRect.width) / 2;
                const cropOffsetY = (scaledHeight - divRect.height) / 2;
                const sx = cropOffsetX / s;
                const sy = cropOffsetY / s;
                const sw = divRect.width / s;
                const sh = divRect.height / s;

                ctx.drawImage(uploadedImg, sx, sy, sw, sh, offsetX, offsetY, dw, dh);
            }

            // Draw device frame
            const deviceImg = document.querySelector('.device-frame');
            if (deviceImg) {
                const deviceRect = deviceImg.getBoundingClientRect();
                const deviceOffsetX = (deviceRect.left - frameRect.left) * scaleX;
                const deviceOffsetY = (deviceRect.top - frameRect.top) * scaleY;
                ctx.drawImage(deviceImg, deviceOffsetX, deviceOffsetY, deviceRect.width * scaleX, deviceRect.height * scaleY);
            }

            // Download
            const link = document.createElement('a');
            link.download = 'macified.jpg';
            link.href = canvas.toDataURL('image/jpeg');
            link.click();
}

// Download button
$(document).ready(function() {
    $('#btn-download').click(function() {
        if (uploadedFileType.startsWith('video/')) {
            downloadVideoWithFrame();
        } else {
            downloadImageWithFrame();
        }
    });
});