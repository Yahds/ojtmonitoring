<?php
const ANNOUNCEMENTS_PER_PAGE = 10;

// posts from the intern's adviser to all their sections, or to the intern's own section
const VISIBLE_TO_INTERN = "FROM interns i
     JOIN students s ON s.studentID = i.studentid
     JOIN announcements a ON a.senderid = i.adviserid
          AND (a.audience_classcode IS NULL OR a.audience_classcode = s.classcode)
     WHERE i.internid = ?";

// one page of posts, newest first, optionally only those whose subject or message has the search text
function findAnnouncementsForIntern($internID, string $search = '', int $page = 1): array
{
    $filter = '';
    $params = [$internID];
    if ($search !== '') {
        // % and _ are wildcards in LIKE, so a search for "100%" must match the text "100%"
        $like = '%' . addcslashes($search, '%_\\') . '%';
        $filter = ' AND (a.subject LIKE ? OR a.message LIKE ?)';
        array_push($params, $like, $like);
    }

    $total = (int) db()->execute_query("SELECT COUNT(*) " . VISIBLE_TO_INTERN . $filter, $params)->fetch_row()[0];
    $pages = max(1, (int) ceil($total / ANNOUNCEMENTS_PER_PAGE));
    $page = min(max(1, $page), $pages);

    $announcements = db()->execute_query(
        "SELECT a.announcementid, a.subject, a.message, a.file_name, DATE_FORMAT(a.created_at, '%b %e, %Y') AS date,
                a.updated_at IS NOT NULL AS edited
         " . VISIBLE_TO_INTERN . $filter . "
         ORDER BY a.created_at DESC, a.announcementid DESC
         LIMIT ? OFFSET ?",
        [...$params, ANNOUNCEMENTS_PER_PAGE, ($page - 1) * ANNOUNCEMENTS_PER_PAGE]
    )->fetch_all(MYSQLI_ASSOC);

    return ['announcements' => $announcements, 'total' => $total, 'page' => $page, 'pages' => $pages];
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
