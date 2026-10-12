<?php
// sends the student to the SLU sign-in page
if (!ssoEnabled()) {
    http_response_code(404);
    require __DIR__ . '/../pages/404.php';
    exit();
}

try {
    ssoClient()->authenticate();
} catch (Throwable $exception) {
    error_log('SLU sign-in is not available: ' . $exception->getMessage());
    showLogin(503, 'SLU sign-in is not available right now. Log in with your student ID and password instead.');
}