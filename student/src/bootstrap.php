<?php
// loaded once at start of every request
session_start();

require_once __DIR__ . '/DataAccessObject.php';
require_once __DIR__ . '/csrf.php';
require_once __DIR__ . '/require-login.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/flash.php';
require_once __DIR__ . '/nav.php';

function redirect(string $path): never
{
    header('Location: /student' . $path);
    exit();
}
