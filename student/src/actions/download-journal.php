<?php
// sends one of the intern's own journal files
requireDeployed();
sendUpload((new DAO())->getMonthlyJournalFile($_SESSION['internid'], (int) ($_GET['journalid'] ?? 0)));
