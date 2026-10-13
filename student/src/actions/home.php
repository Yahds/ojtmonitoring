<?php
if (!isset($_SESSION['internid'])) {
    redirect('/login');
}
redirect(in_array($_SESSION['status'], ['ACTIVE', 'FINISHED'], true) ? '/dashboard' : '/choose-company');
