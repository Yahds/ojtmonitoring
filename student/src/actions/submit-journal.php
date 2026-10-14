<?php
// saves a monthly journal: the month number, optional notes, and the journal file
requireDeployed();
verify_csrf();

$month = wholeNumberIn($_POST['monthnumber'] ?? null, 1, 12);
$notes = trim($_POST['notes'] ?? '');
$file = $_FILES['journal_file'] ?? null;

if ($month === null) {
    $error = 'Please enter a month number from 1 to 12.';
} elseif (mb_strlen($notes) > 2000) {
    $error = 'Please keep your notes within 2000 characters.';
} elseif ($file === null || $file['error'] === UPLOAD_ERR_NO_FILE) {
    $error = 'Please attach your monthly journal file.';
} else {
    $error = uploadError($file);
}

if ($error !== null) {
    flash('error', $error);
    redirect('/journals');
}

$fileName = saveUpload($file, 'journal');
if (!submitJournal($_SESSION['internid'], $month, $notes, $fileName)) {
    unlink(UPLOAD_DIR . $fileName);
    flash('error', "You already sent your month $month journal. You can send it again only if your adviser asks for changes.");
    redirect('/journals');
}

flash('success', "Your month $month journal has been submitted for your adviser's review.");
redirect('/journals');
