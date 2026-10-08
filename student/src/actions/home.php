<?php
if (!isset($_SESSION['internid'])) {
    redirect('/login');
}
redirect($_SESSION['status'] === 'ACTIVE' ? '/dashboard' : '/choose-company');
