<?php
// sends one of the intern's own journal files
requireDeployed(true);
sendUpload(getMonthlyJournalFile($_SESSION['internid'], (int) ($_GET['journalid'] ?? 0)));
