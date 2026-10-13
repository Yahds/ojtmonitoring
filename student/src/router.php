<?php
const ROUTES = [
    'GET /'                    => 'actions/home.php',
    'GET /login'               => 'pages/login.php',
    'POST /login'              => 'actions/login.php',
    'POST /logout'             => 'actions/logout.php',
    'GET /sso/start'           => 'actions/sso-start.php',
    'GET /sso/callback'        => 'actions/sso-callback.php',
    'GET /account/password'    => 'pages/change-password.php',
    'POST /account/password'   => 'actions/change-password.php',
    'GET /session/keep-alive'  => 'actions/keep-alive.php',
    'GET /dashboard'           => 'pages/dashboard.php',
    'GET /choose-company'      => 'pages/choose-company.php',
    'POST /endorsement'        => 'actions/endorsement-form.php',
    'POST /choose-company'     => 'actions/update-company.php',
    'GET /requirements'        => 'pages/requirements.php',
    'POST /requirements'       => 'actions/submit-requirement.php',
    'GET /requirements/file'   => 'actions/download-requirement.php',
    'GET /weekly-reports'      => 'pages/weekly-reports.php',
    'POST /weekly-reports'     => 'actions/submit-weekly-report.php',
    'GET /weekly-reports/file' => 'actions/download-weekly-report.php',
    'GET /journals'            => 'pages/journals.php',
    'POST /journals'           => 'actions/submit-journal.php',
    'GET /journals/file'       => 'actions/download-journal.php',
    'GET /supervisor'          => 'pages/supervisor.php',
    'POST /supervisor'         => 'actions/save-supervisor.php',
    'GET /announcements'       => 'pages/announcements.php',
    'GET /announcements/file'  => 'actions/download-announcement-file.php',
];

// "/requirements/?reqid=3" -> "/requirements"
function normalizePath(string $uri): string
{
    return rtrim(parse_url($uri, PHP_URL_PATH) ?? '/', '/') ?: '/';
}

function routeFor(string $method, string $uri): ?string
{
    return ROUTES[$method . ' ' . normalizePath($uri)] ?? null;
}
