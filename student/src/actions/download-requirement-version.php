<?php
// sends the file of one earlier version of the intern's own requirement
requireLogin();
sendUpload(getRequirementVersionFile($_SESSION['internid'], (int) ($_GET['reqid'] ?? 0), (int) ($_GET['version'] ?? 0)));
