<?php
// Apache sends every request that is not a css/image file here
require __DIR__ . '/../src/bootstrap.php';
require __DIR__ . '/../src/router.php';

$file = routeFor($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);

if ($file === null) {
    http_response_code(404);
    require __DIR__ . '/../src/pages/404.php';
    exit();
}

require __DIR__ . '/../src/' . $file;
