<?php
// saves a weekly report: the week number, hours, what the intern did, and the signed file
requireDeployed();
verify_csrf();

$week = wholeNumberIn($_POST['weeknumber'] ?? null, 1, 52);
$hours = wholeNumberIn($_POST['hours'] ?? null, 1, 168);
$description = trim($_POST['workdescription'] ?? '');
$file = $_FILES['report_file'] ?? null;

if ($week === null) {
    $error = 'Please enter a week number from 1 to 52.';
} elseif ($hours === null) {
    $error = 'Please enter the hours you worked, from 1 to 168.';
} elseif (mb_strlen($description) > 500) {
    $error = 'Please keep the work description within 500 characters.';
} elseif ($file === null || $file['error'] === UPLOAD_ERR_NO_FILE) {
    $error = 'Please attach your supervisor-signed weekly report.';
} else {
    $error = uploadError($file);
}

if ($error !== null) {
    flash('error', $error);
    redirect('/weekly-reports');
}

$fileName = saveUpload($file, 'weekly');
submitWeeklyReport($_SESSION['internid'], $week, $hours, $description, $fileName);

flash('success', "Your week $week report has been submitted for your adviser's review.");
redirect('/weekly-reports');
