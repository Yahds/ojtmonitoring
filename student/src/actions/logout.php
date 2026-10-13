<?php
// ends the session; needs the CSRF token so another site cannot log the intern out
verify_csrf();
$idToken = $_SESSION['idToken'] ?? null;
session_destroy();

// end the SLU sign-in too, so the next person on a shared computer is not signed in as this student
if ($idToken !== null && ssoEnabled()) {
    try {
        ssoClient()->signOut($idToken, requiredEnv('OIDC_LOGOUT_REDIRECT_URI'));
    } catch (Throwable $exception) {
        error_log('SLU sign-out is not available: ' . $exception->getMessage());
    }
}
redirect('/login');