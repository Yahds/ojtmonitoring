<?php
require_once __DIR__ . '/requireLogin.php';
include("DataAccessObject.php");

$db = new DAO();

$internID = $_SESSION['internid'];         
$reqID = $_GET['reqid'] ?? null;

if (!$reqID) {
    http_response_code(400);
    exit('Bad request');
}

$filePath = $db->getRequirementFile($internID, $reqID);
if (!$filePath) {
    http_response_code(404);
    exit('File not found');
}

$fullPath = '/var/www/uploads/' . basename($filePath);  
if (!is_file($fullPath)) {
    http_response_code(404);
    exit('File not found');
}

header('Content-Type: ' . (mime_content_type($fullPath) ?: 'application/octet-stream'));
header('Content-Disposition: inline; filename="' . basename($fullPath) . '"');
header('Content-Length: ' . filesize($fullPath));
readfile($fullPath);
exit();
