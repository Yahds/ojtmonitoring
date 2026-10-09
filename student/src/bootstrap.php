<?php
// loaded once at start of every request
session_start();

require_once __DIR__ . '/db/index.php';
require_once __DIR__ . '/csrf.php';
require_once __DIR__ . '/require-login.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/flash.php';
require_once __DIR__ . '/nav.php';
require_once __DIR__ . '/summary.php';
require_once __DIR__ . '/uploads.php';
require_once __DIR__ . '/validate.php';

// log uncaught errors with a short id and show 500 error page
set_exception_handler(function (Throwable $error): void {
    $errorId = bin2hex(random_bytes(4));
    error_log("[$errorId] {$_SERVER['REQUEST_METHOD']} {$_SERVER['REQUEST_URI']} failed: $error");
    http_response_code(500);
    require __DIR__ . '/pages/500.php';
});

function redirect(string $path): never
{
    header('Location: /student' . $path);
    exit();
}
