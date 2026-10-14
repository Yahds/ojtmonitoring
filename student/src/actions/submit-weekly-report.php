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
    'absences' => is_array($_POST['absences'] ?? null) ? $_POST['absences'] : [],
];
$file = $_FILES['report_file'] ?? null;
$days = reportDays($now['range']);
$record = readTimeRecord($form['days'], array_column($days, 'date'));
$weekdays = array_column(array_filter($days, fn ($day) => !$day['weekend']), 'date');
$absent = readAbsences($form['absences'], $weekdays, (bool) $profile['accepts_parent_letter'], $record['days']);
$proofs = uploadedFiles('absence_proof');

$errors = [];
if ($record['error'] !== null) {
    $errors['days'] = $record['error'];
} elseif (!$record['days'] && !$absent['absences']) {
    $errors['days'] = 'Enter your times for at least one day, or report your absences.';
}
if ($absent['error'] !== null) {
    $errors['absences'] = $absent['error'];
}
foreach (array_keys($absent['absences']) as $date) {
    $proof = $proofs[$date] ?? null;
    if ($proof === null || $proof['error'] === UPLOAD_ERR_NO_FILE) {
        $errors['absences'] = 'Attach your proof for ' . dayLabel($date) . '.';
    } elseif (($proofError = uploadError($proof)) !== null) {
        $errors['absences'] = 'Proof for ' . dayLabel($date) . ': ' . $proofError;
    }
    if (isset($errors['absences'])) {
        break;
    }
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
$absences = $absent['absences'];
foreach ($absences as $date => $absence) {
    $absences[$date]['proof_path'] = saveUpload($proofs[$date], 'absence');
}
submitWeeklyReport($_SESSION['internid'], $now['week'], $now['range'][0]->format('Y-m-d'), $record['days'],
    $form['accomplishment'], $supervisor['supervisorname'], $fileName, $absences);

flash('success', "Your week {$now['week']} report has been sent for your adviser's review.");
redirect('/weekly-reports');
