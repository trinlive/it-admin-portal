// src/utils/responseHelper.js

exports.renderErrorPopup = (res, title, message, technicalError = "") => {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style> body { font-family: 'Sarabun', sans-serif; background-color: #f8fafc; } </style>
    </head>
    <body>
        <script>
            Swal.fire({
                icon: 'error',
                title: '${title}',
                html: '${message} <br><br> <span style="color:gray; font-size:0.8em;">${technicalError}</span>',
                confirmButtonText: '<i class="fa-solid fa-arrow-left"></i> กลับไป',
                confirmButtonColor: '#059669',
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    window.history.back(); 
                }
            });
        </script>
    </body>
    </html>
    `;
    res.send(htmlContent);
};