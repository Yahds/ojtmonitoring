<?php
requireLogin();
$db = new DAO();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    redirect('/requirements');
}

verify_csrf(); 

$internID = $_SESSION['internid'];
$reqID = $_POST['reqid'] ?? null;
$internRemarks = $_POST['intern_remarks'] ?? '';

if (!$reqID) {
    redirect('/requirements');
}

$filePath = null;

if (isset($_FILES['requirement_file']) && $_FILES['requirement_file']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['requirement_file'];

    if ($file['size'] > 5 * 1024 * 1024) {
        exit('File too large. Maximum size is 5MB.');
    }

    $allowed = [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
    ];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!isset($allowed[$mime])) {
        exit('File type not allowed. Use PDF, JPG, PNG, DOC, or DOCX.');
    }

    $ext = $allowed[$mime];
    $safeName = 'req_' . $internID . '_' . $reqID . '_' . time() . '.' . $ext;

    if (!move_uploaded_file($file['tmp_name'], '/var/www/uploads/' . $safeName)) {
        exit('Could not save the file.');
    }

    $filePath = $safeName;
}

$db->submitRequirement($internID, $reqID, $internRemarks, $filePath);

redirect('/requirements');
