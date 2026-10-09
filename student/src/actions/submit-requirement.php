<?php
// saves a requirement the intern submits: a file, a note, or both
requireLogin();
verify_csrf();

$reqId = (int) ($_POST['reqid'] ?? 0);
$note = trim($_POST['intern_remarks'] ?? '');
$file = $_FILES['requirement_file'] ?? null;
$hasFile = $file !== null && $file['error'] !== UPLOAD_ERR_NO_FILE;

$error = uploadError($file);
if ($error === null && !$hasFile && $note === '') {
    $error = 'Please attach a file or add a note before submitting.';
}
if ($error !== null) {
    flash('error', $error);
    redirect('/requirements');
}

$fileName = $hasFile ? saveUpload($file, 'req') : null;
$changed = submitRequirement($_SESSION['internid'], $reqId, $note, $fileName);

if ($changed === 0) {
    if ($fileName !== null) {
        unlink(UPLOAD_DIR . $fileName);
    }
    flash('error', 'This requirement has already been approved and can no longer be modified.');
    redirect('/requirements');
}

flash('success', 'Your requirement has been submitted for your adviser\'s review.');
redirect('/requirements');
