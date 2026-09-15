<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
if (!isset($_SESSION['internid'])) {
    http_response_code(401);
    exit('Unauthorized');
}
