<?php
require __DIR__ . '/../vendor/autoload.php';

// use the test database when one is set, so tests never change the demo data.
// HttpTest's built-in server is started from here, so it gets the same setting
$testDatabase = getenv('MYSQL_TEST_DATABASE');
if ($testDatabase) {
    putenv("MYSQL_DATABASE=$testDatabase");
}
