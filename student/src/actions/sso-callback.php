<?php
// SLU sign-in sends the student back here with a one-time code
if (!ssoEnabled()) {
    http_response_code(404);
    require __DIR__ . '/../pages/404.php';
    exit();
}
if (!isset($_GET['code']) && !isset($_GET['error'])) {
    showLogin(400, 'Your SLU sign-in expired or was not started here. Please try again.');
}

$client = ssoClient();
try {
    $client->authenticate();
} catch (Throwable $exception) {
    error_log('SLU sign-in failed: ' . $exception->getMessage());
    showLogin(400, 'Sign-in with your SLU account did not finish. Please try again.');
}

$claims = $client->getVerifiedClaims();
$intern = !empty($claims->email_verified) ? findInternByEmail($claims->email) : null;
if (!$intern) {
    showLogin(403, 'Your SLU account is not registered in the OJT Portal. Ask your OJT adviser to add you.');
}
startStudentSession($intern, $client->getIdToken());
