<?php
requireDeployed();

$db = new DAO();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    redirect('/journals');
}

verify_csrf();

$internID = $_SESSION['internid'];
$monthnumber = $_POST['monthnumber'] ?? null;
$notes = $_POST['notes'] ?? '';

if (!$monthnumber) {
    redirect('/journals');
}

$filePath = null;

if (isset($_FILES['journal_file']) && $_FILES['journal_file']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['journal_file'];

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
    $safeName = 'journal_' . $internID . '_' . $monthnumber . '_' . time() . '.' . $ext;

    if (!move_uploaded_file($file['tmp_name'], '/var/www/uploads/' . $safeName)) {
        exit('Could not save the file.');
    }

    $filePath = $safeName;
}

if ($filePath === null) {
    exit('Please attach your monthly journal file.');
}

$db->submitJournal($internID, $monthnumber, $notes, $filePath);

redirect('/journals');
