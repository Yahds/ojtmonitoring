<?php
// checks the student ID and password sent by the login form
verify_csrf();

$studentId = trim($_POST['id'] ?? '');
$password = $_POST['password'] ?? '';
$row = $studentId !== '' ? internLogIn($studentId, $password) : false;

if (!$row) {
    showLogin(401, 'Your student ID or password is wrong. After 5 wrong tries, please wait for 15 minutes and try again.', $studentId);
}
startStudentSession($row);