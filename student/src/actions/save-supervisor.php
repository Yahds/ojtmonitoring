<?php
verify_csrf();
requireDeployed();

$field = fn (string $name): string => is_string($_POST[$name] ?? null) ? trim($_POST[$name]) : '';
$form = ['name' => $field('name'), 'email' => $field('email'), 'position' => $field('position')];

$errors = [];
if ($form['name'] === '' || mb_strlen($form['name']) > 100) {
    $errors['name'] = "Enter your supervisor's name, up to 100 characters.";
}
if (!filter_var($form['email'], FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Enter their email, like name@company.com.';
}
if (mb_strlen($form['position']) > 100) {
    $errors['position'] = 'Use 100 characters or fewer.';
}

if ($errors) {
    http_response_code(400);
    require __DIR__ . '/../pages/supervisor.php';
    exit();
}

saveSupervisor($_SESSION['internid'], $form);
flash('success', 'Supervisor details saved.');
redirect('/dashboard');
