<?php
// posts from the intern's adviser to all their sections, or to the intern's own section
function getAnnouncementsForIntern($internID)
{
    return db()->execute_query(
        "SELECT a.subject, a.message, DATE_FORMAT(a.created_at, '%b %e, %Y') AS date
         FROM interns i
         JOIN students s ON s.studentID = i.studentid
         JOIN announcements a ON a.senderid = i.adviserid
              AND (a.audience_classcode IS NULL OR a.audience_classcode = s.classcode)
         WHERE i.internid = ?
         ORDER BY a.created_at DESC, a.announcementid DESC",
        [$internID]
    )->fetch_all(MYSQLI_ASSOC);
}
