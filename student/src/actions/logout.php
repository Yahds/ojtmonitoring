<?php
if (isset($_SESSION['id'])) {
    // unset($_SESSION['id']);
    session_destroy();
}

redirect('/login');
?>
