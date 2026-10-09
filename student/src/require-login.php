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