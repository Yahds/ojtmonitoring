<?php
function requiredEnv(string $name): string
{
    $value = getenv($name);
    if ($value === false || $value === '') {
        throw new RuntimeException("Missing environment variable $name");
    }
    return $value;
}

// one connection per request, opened the first time a query needs it
function db(): mysqli
{
    static $connection = null;
    if ($connection === null) {
        $connection = new mysqli(
            requiredEnv('MYSQL_HOST'), requiredEnv('MYSQL_USER'), requiredEnv('MYSQL_PASSWORD'), requiredEnv('MYSQL_DATABASE')
        );
        $connection->set_charset('utf8mb4');
    }
    return $connection;
}
