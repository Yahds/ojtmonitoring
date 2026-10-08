<?php
// sends one of the intern's own weekly report files
requireDeployed();
sendUpload((new DAO())->getWeeklyReportFile($_SESSION['internid'], (int) ($_GET['reportid'] ?? 0)));
