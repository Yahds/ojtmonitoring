<?php
session_start();

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['companyId'])) {
    $_SESSION['companyid'] = $_POST['companyId'];
    echo "Session Company ID updated: " . $_SESSION['companyid'];
} else {
    http_response_code(400);
    echo "Invalid or missing POST data.";
}
