<?php
// the intern was accepted by a company that is not on the list
requireLogin();
verify_csrf();
if (in_array($_SESSION['status'], ['ACTIVE', 'FINISHED'], true)) {
    redirect('/dashboard');
}

$field = fn (string $name): string => is_string($_POST[$name] ?? null) ? trim($_POST[$name]) : '';
$ownForm = ['name' => $field('name'), 'address' => $field('address'), 'email' => $field('email')];

$ownErrors = [];
if ($ownForm['name'] === '' || mb_strlen($ownForm['name']) > 100) {
    $ownErrors['name'] = 'Enter the company name, up to 100 characters.';
} elseif ((int) (findCompanyByName($ownForm['name'])['moa_on_file'] ?? 0) === 1) {
    $ownErrors['name'] = 'This company is already on the list. Choose it in the list above.';
}
if (mb_strlen($ownForm['address']) > 150) {
    $ownErrors['address'] = 'Use 150 characters or fewer.';
}
if ($ownForm['email'] !== '' && (!filter_var($ownForm['email'], FILTER_VALIDATE_EMAIL) || mb_strlen($ownForm['email']) > 255)) {
    $ownErrors['email'] = 'Enter their HR email, like hr@company.com, or leave it empty.';
}

if ($ownErrors) {
    http_response_code(400);
    require __DIR__ . '/../pages/choose-company.php';
    exit();
}

if (addOwnCompany($_SESSION['internid'], $ownForm) === null) {
    redirect('/dashboard');
}
flash('success', 'Company saved. Your adviser will review it. Submit the MOA under Requirements, because SLU has no agreement with this company yet.');
redirect('/choose-company');
