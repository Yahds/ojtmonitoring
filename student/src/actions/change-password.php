<?php
verify_csrf();
requireLogin();

$field = fn (string $name): string => is_string($_POST[$name] ?? null) ? $_POST[$name] : '';
$newPassword = $field('newPassword');

$errors = [];
$problem = passwordProblem($newPassword);
if ($problem !== null) {
    $errors['newPassword'] = $problem;
} elseif ($newPassword !== $field('confirmPassword')) {
    $errors['confirmPassword'] = 'The two new passwords do not match.';
} elseif (!changeInternPassword($_SESSION['internid'], $field('currentPassword'), $newPassword)) {
    $errors['currentPassword'] = 'Your current password is wrong.';
}

if ($errors) {
    http_response_code(400);
    require __DIR__ . '/../pages/change-password.php';
    exit();
}

session_regenerate_id(true);
flash('success', 'Your password has been changed.');
redirect('/');