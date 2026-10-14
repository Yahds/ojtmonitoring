<?php
requireDeployed();
verify_csrf();

$profile = getInternProfile($_SESSION['internid']);
$now = currentWeekFor($_SESSION['internid'], $profile);
if ($now === null || $now['week'] === null) {
    flash('error', 'There is no week to report right now. A week opens on its Friday.');
    redirect('/weekly-reports');
}

$form = [
    'no_work_reason' => is_string($_POST['no_work_reason'] ?? null) ? $_POST['no_work_reason'] : '',
    'details' => is_string($_POST['details'] ?? null) ? trim($_POST['details']) : '',
];
$file = $_FILES['proof_file'] ?? null;

$errors = [];
if (!isset(NO_WORK_REASONS[$form['no_work_reason']])) {
    $errors['no_work_reason'] = 'Choose why there was no work this week.';
}
if ($form['details'] === '' || mb_strlen($form['details']) > 500) {
    $errors['details'] = 'Write what happened this week, up to 500 characters.';
}
if (($fileError = uploadError($file)) !== null) {
    $errors['proof_file'] = $fileError;
}

if ($errors) {
    http_response_code(400);
    $noWork = true;
    require __DIR__ . '/../pages/weekly-reports.php';
    exit();
}

$fileName = $file && $file['error'] !== UPLOAD_ERR_NO_FILE ? saveUpload($file, 'nowork') : null;
submitNoWorkWeek($_SESSION['internid'], $now['week'], $now['range'][0]->format('Y-m-d'), $form['no_work_reason'], $form['details'], $fileName);

flash('success', "Your week {$now['week']} no-work report has been sent for your adviser's review.");
redirect('/weekly-reports');
