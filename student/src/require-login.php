<?php
const IDLE_LIMIT_SECONDS = 30 * 60;

function sessionExpired(?int $lastSeen, int $now): bool
{
    return $lastSeen === null || $now - $lastSeen > IDLE_LIMIT_SECONDS;
}

// sends logged-out visitors to the login page and keeps the status up to date
function requireLogin(): void
{
    if (!isset($_SESSION['internid'])) {
        redirect('/login');
    }
    if (sessionExpired($_SESSION['lastSeen'] ?? null, time())) {
        // empty the session but keep it, so the message can show on the login page
        session_unset();
        session_regenerate_id(true);
        flash('info', 'You were logged out after 30 minutes without activity. Please log in again.');
        redirect('/login');
    }
    $_SESSION['lastSeen'] = time();

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
function startStudentSession(array $row, ?string $idToken = null): never
{
    session_regenerate_id(true);
    $_SESSION['id'] = $row['studentid'];
    $_SESSION['studentName'] = $row['studentName'];
    $_SESSION['course'] = $row['course'];
    $_SESSION['year'] = $row['year'];
    $_SESSION['internid'] = $row['internid'];
    $_SESSION['status'] = $row['status'];
    $_SESSION['lastSeen'] = time();
    if ($idToken !== null) {
        $_SESSION['idToken'] = $idToken;
    }
    redirect('/');
}

function showLogin(int $status, string $error, string $studentId = ''): never
{
    http_response_code($status);
    require __DIR__ . '/pages/login.php';
    exit();
}