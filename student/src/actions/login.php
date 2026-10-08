<?php
// checks the student ID and password sent by the login form
verify_csrf();

$studentId = trim($_POST['id'] ?? '');
$password = $_POST['password'] ?? '';
$row = $studentId !== '' ? (new DAO())->internLogIn($studentId, $password) : false;

if (!$row) {
    http_response_code(401);
    $error = 'Your student ID or password is wrong. Try again.';
    require __DIR__ . '/../pages/login.php';
    exit();
}

session_regenerate_id(true);
$_SESSION['id'] = $row['studentid'];
$_SESSION['studentName'] = $row['studentName'];
$_SESSION['course'] = $row['course'];
$_SESSION['year'] = $row['year'];
$_SESSION['internid'] = $row['internid'];
$_SESSION['companyid'] = $row['companyid'];
$_SESSION['status'] = $row['status'];
redirect('/');
