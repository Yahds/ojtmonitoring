<?php
requireLogin();

$db = new DAO();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    redirect('/weekly-reports');
}

verify_csrf();

$internID = $_SESSION['internid'];
$weeknumber = $_POST['weeknumber'] ?? null;
$hours = $_POST['hours'] ?? null;
$workdescription = $_POST['workdescription'] ?? '';

if (!$weeknumber || !$hours) {
    redirect('/weekly-reports');
}

$filePath = null;

if (isset($_FILES['report_file']) && $_FILES['report_file']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['report_file'];

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
    $safeName = 'week_' . $internID . '_' . $weeknumber . '_' . time() . '.' . $ext;

    if (!move_uploaded_file($file['tmp_name'], '/var/www/uploads/' . $safeName)) {
        exit('Could not save the file.');
    }

    $filePath = $safeName;
}

if ($filePath === null) {
    exit('Please attach the supervisor-signed weekly report.');
}

$db->submitWeeklyReport($internID, $weeknumber, $hours, $workdescription, $filePath);

redirect('/weekly-reports');
