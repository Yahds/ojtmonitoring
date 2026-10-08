<?php
// sends logged-out visitors to the login page
function requireLogin(): void
{
    if (!isset($_SESSION['internid'])) {
        redirect('/login');
    }
}
