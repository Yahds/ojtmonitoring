<?php
requireDeployed();

$db = new DAO();

$internID = $_SESSION['internid'];
$journalID = $_GET['journalid'] ?? null;

if (!$journalID) {
    http_response_code(400);
    exit('Bad request');
}

$filePath = $db->getMonthlyJournalFile($internID, $journalID);
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
