<?php
// sends a file attached to one of the posts this intern can see
requireLogin();
sendUpload(getAnnouncementFileForIntern($_SESSION['internid'], (int) ($_GET['id'] ?? 0)), ANNOUNCEMENT_DIR);
