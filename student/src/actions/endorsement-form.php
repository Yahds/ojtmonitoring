<?php
// saves the endorsement form and the adviser uses it to prepare the endorsement letter
verify_csrf();
requireLogin();

$profile = getInternProfile($_SESSION['internid']);
$endorsement = getEndorsement($_SESSION['internid']);
if (!$profile['companyid']) {
    flash('error', 'Select your company first.');
    redirect('/choose-company');
}
if ($endorsement && $endorsement['status'] !== 'REQUESTED') {
    flash('error', 'Your adviser already sent your endorsement letter, so the form can no longer be changed.');
    redirect('/choose-company');
}

$field = fn (string $name): string => is_string($_POST[$name] ?? null) ? trim($_POST[$name]) : '';
$form = [
    'contact_name' => $field('contact_name'),
    'contact_email' => $field('contact_email'),
    'position' => $field('position'),
    'start_date' => $field('start_date'),
];

$errors = [];
if ($form['contact_name'] === '' || mb_strlen($form['contact_name']) > 100) {
    $errors['contact_name'] = 'Enter the name of your contact at the company, up to 100 characters.';
}
if (!filter_var($form['contact_email'], FILTER_VALIDATE_EMAIL)) {
    $errors['contact_email'] = 'Enter their email, like hr@company.com.';
}
if (mb_strlen($form['position']) > 100) {
    $errors['position'] = 'Use 100 characters or fewer.';
}
if ($form['start_date'] !== '' && validDate($form['start_date']) === null) {
    $errors['start_date'] = 'Enter a real date.';
}

if ($errors) {
    http_response_code(400);
    require __DIR__ . '/../pages/choose-company.php';
    exit();
}

saveEndorsementForm($_SESSION['internid'], (int) $profile['companyid'], $form);
flash('success', 'Endorsement form sent to your adviser.');
redirect('/choose-company');
