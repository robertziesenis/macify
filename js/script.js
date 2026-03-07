// Render uploaded image in the image frame
function onFileSelected(event) {
  const selectedFile = event.target.files[0];
  let reader = new FileReader();

  let imgtag = document.getElementById("uploaded-file");
  imgtag.title = selectedFile.name;

  reader.onload = function(event) {
    imgtag.src = event.target.result;
  };

  reader.readAsDataURL(selectedFile);
}

// Download button via html2canvas.js library
$(document).ready(function() {
    $('#btn-download').click(function() {
        html2canvas($('.image-frame')[0], {
            width: 1080,
            height: 1350
        }).then(function(canvas) {
            var link = document.createElement('a');
            link.download = 'image-frame.jpg';
            link.href = canvas.toDataURL('image/jpeg');
            link.click();
        });
    });
});
