<?php
// posts from the intern's adviser to all their sections, or to the intern's own section
const VISIBLE_TO_INTERN = "FROM interns i
     JOIN students s ON s.studentID = i.studentid
     JOIN announcements a ON a.senderid = i.adviserid
          AND (a.audience_classcode IS NULL OR a.audience_classcode = s.classcode)
     WHERE i.internid = ?";

function getAnnouncementsForIntern($internID)
{
    return db()->execute_query(
        "SELECT a.announcementid, a.subject, a.message, a.file_name, DATE_FORMAT(a.created_at, '%b %e, %Y') AS date,
                a.updated_at IS NOT NULL AS edited
         " . VISIBLE_TO_INTERN . "
         ORDER BY a.created_at DESC, a.announcementid DESC",
        [$internID]
    )->fetch_all(MYSQLI_ASSOC);
}

// same rule as the list, so an intern can't download a file from a post they can't see
function getAnnouncementFileForIntern($internID, $announcementID)
{
    $row = db()->execute_query(
        "SELECT a.file_path " . VISIBLE_TO_INTERN . " AND a.announcementid = ?",
        [$internID, $announcementID]
    )->fetch_assoc();
    return $row ? $row['file_path'] : null;
}
