<?php
// sends one of the intern's own requirement files
requireLogin();
sendUpload((new DAO())->getRequirementFile($_SESSION['internid'], (int) ($_GET['reqid'] ?? 0)));
