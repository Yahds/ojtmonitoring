<?php
const UPLOAD_TYPES = [
    'application/pdf' => 'pdf',
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'application/msword' => 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
];
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = '/var/www/uploads/';

// checks type of file via the bytes instead of filename
function mimeOf(string $path): string
{
    return (new finfo(FILEINFO_MIME_TYPE))->file($path) ?: '';
}

function uploadError(?array $file): ?string
{
    if ($file === null || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || $file['size'] > UPLOAD_MAX_BYTES) {
        return 'The file exceeds the 5 MB size limit. Please upload a smaller file.';
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return 'The file failed to upload. Please try again.';
    }
    if (!isset(UPLOAD_TYPES[mimeOf($file['tmp_name'])])) {
        return 'This file type is not supported. Please upload a PDF, JPG, PNG, DOC or DOCX file.';
    }
    return null;
}

function saveUpload(array $file, string $prefix): string
{
    $name = $prefix . '_' . bin2hex(random_bytes(8)) . '.' . UPLOAD_TYPES[mimeOf($file['tmp_name'])];
    if (!move_uploaded_file($file['tmp_name'], UPLOAD_DIR . $name)) {
        throw new RuntimeException('Could not save the upload ' . $name);
    }
    return $name;
}

function sendUpload(?string $fileName): never
{
    $path = $fileName ? UPLOAD_DIR . basename($fileName) : null;
    if ($path === null || !is_file($path)) {
        http_response_code(404);
        require __DIR__ . '/pages/404.php';
        exit();
    }
    header('Content-Type: ' . mimeOf($path));
    header('Content-Disposition: inline; filename="' . basename($path) . '"');
    header('Content-Length: ' . filesize($path));
    header('X-Content-Type-Options: nosniff');
    readfile($path);
    exit();
}
