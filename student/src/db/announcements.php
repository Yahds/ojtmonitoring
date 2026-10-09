<?php
function getAnnouncementsForIntern($internID)
{
    $statement = db()->prepare("SELECT subject, date, message FROM announcements WHERE recipientid = ?");
    $statement->bind_param("i", $internID);
    $statement->execute();
    $announcements = $statement->get_result()->fetch_all(MYSQLI_ASSOC);
    $statement->close();
    return $announcements;
}
