<?php
requireDeployed();
verify_csrf();

// week comes from the deploy date, not the form
$profile = getInternProfile($_SESSION['internid']);
$now = $profile['deployedOn']
    ? reportingWeek($profile['deployedOn'], getDueRules($profile['adviserid']), getReportedWeeks($_SESSION['internid']), date('Y-m-d'))
    : ['week' => null];
if ($now['week'] === null) {
    flash('error', 'There is no week to report right now. A week opens on its Friday.');
    redirect('/weekly-reports');
}

$supervisor = getSupervisor($_SESSION['internid']);
$form = [
    'days' => is_array($_POST['days'] ?? null) ? $_POST['days'] : [],
    'accomplishment' => is_string($_POST['accomplishment'] ?? null) ? trim($_POST['accomplishment']) : '',
];
$file = $_FILES['report_file'] ?? null;
$record = readTimeRecord($form['days'], array_column(reportDays($now['range']), 'date'));

$errors = [];
if ($record['error'] !== null) {
    $errors['days'] = $record['error'];
} elseif (!$record['days']) {
    $errors['days'] = 'Enter your times for at least one day.';
}
if ($form['accomplishment'] === '' || mb_strlen($form['accomplishment']) > 2000) {
    $errors['accomplishment'] = 'Write what you worked on this week, up to 2000 characters.';
}
if (!$supervisor) {
    $errors['supervisor'] = 'Add your supervisor first.';
}
if ($file === null || $file['error'] === UPLOAD_ERR_NO_FILE) {
    $errors['report_file'] = 'Attach the copy your supervisor signed.';
} elseif (($fileError = uploadError($file)) !== null) {
    $errors['report_file'] = $fileError;
}

if ($errors) {
    http_response_code(400);
    require __DIR__ . '/../pages/weekly-reports.php';
    exit();
}

$fileName = saveUpload($file, 'weekly');
submitWeeklyReport($_SESSION['internid'], $now['week'], $now['range'][0]->format('Y-m-d'), $record['days'],
    $form['accomplishment'], $supervisor['supervisorname'], $fileName);

flash('success', "Your week {$now['week']} report has been sent for your adviser's review.");
redirect('/weekly-reports');
