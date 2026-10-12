<?php
// sends logged-out visitors to the login page and keeps the status up to date
function requireLogin(): void
{
    if (!isset($_SESSION['internid'])) {
        redirect('/login');
    }
    $status = getInternStatus($_SESSION['internid']);
    if ($status === null) {
        session_destroy();
        redirect('/login');
    }
    $_SESSION['status'] = $status;
}

// for pages only deployed interns may use (weekly reports, journals, dashboard)
function requireDeployed(): void
{
    requireLogin();
    if ($_SESSION['status'] !== 'ACTIVE') {
        flash('info', 'This page is available only to deployed interns. Please select your company and complete your requirements while waiting for deployment.');
        redirect('/');
    }
}

// same session for password login and SLU sign-in
function startStudentSession(array $row): never
{
    session_regenerate_id(true);
    $_SESSION['id'] = $row['studentid'];
    $_SESSION['studentName'] = $row['studentName'];
    $_SESSION['course'] = $row['course'];
    $_SESSION['year'] = $row['year'];
    $_SESSION['internid'] = $row['internid'];
    $_SESSION['status'] = $row['status'];
    redirect('/');
}

function showLogin(int $status, string $error, string $studentId = ''): never
{
    http_response_code($status);
    require __DIR__ . '/pages/login.php';
    exit();
}