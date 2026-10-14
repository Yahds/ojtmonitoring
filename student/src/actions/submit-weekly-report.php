<?php
requireDeployed();
verify_csrf();

// week comes from the deploy date, not the form
$profile = getInternProfile($_SESSION['internid']);
$now = $profile['deployedOn']
    ? reportingWeek($profile['deployedOn'], getDueRules($profile['adviserid']), getReportedWeeks($_SESSION['internid']), date('Y-m-d'))
    : ['week' => null];
$week = $now['week'];
$hours = wholeNumberIn($_POST['hours'] ?? null, 1, 168);
$description = trim($_POST['workdescription'] ?? '');
$file = $_FILES['report_file'] ?? null;

if ($week === null) {
    $error = 'There is no week to report right now. A week opens on its Friday.';
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
submitWeeklyReport($_SESSION['internid'], $week, $now['range'][0]->format('Y-m-d'), $hours, $description, $fileName);

flash('success', "Your week $week report has been submitted for your adviser's review.");
redirect('/weekly-reports');
