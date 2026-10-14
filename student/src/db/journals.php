<?php
function getMonthlyJournals($internID)
{
    $query = "SELECT * FROM journals WHERE internid = ? ORDER BY monthnumber";
    $statement = db()->prepare($query);
    $statement->bind_param("i", $internID);
    $statement->execute();
    $journals = $statement->get_result()->fetch_all(MYSQLI_ASSOC);
    $statement->close();
    return $journals;
}

function getMonthlyJournalFile($internID, $journalID)
{
    $query = "SELECT file_path FROM journals WHERE internid = ? AND journalid = ?";
    $statement = db()->prepare($query);
    $statement->bind_param("ii", $internID, $journalID);
    $statement->execute();
    $row = $statement->get_result()->fetch_assoc();
    $statement->close();
    return $row ? $row['file_path'] : null;
}

// false when the month was already sent and isn't waiting for changes.
// sending a month again replaces the journal that needed changes
function submitJournal($internID, $monthnumber, $notes, $filePath): bool
{
    $db = db();
    $db->begin_transaction();
    try {
        $sent = $db->execute_query(
            "SELECT journalid, status FROM journals WHERE internid = ? AND monthnumber = ? FOR UPDATE",
            [$internID, $monthnumber]
        )->fetch_all(MYSQLI_ASSOC);
        if (array_filter($sent, fn ($journal) => $journal['status'] !== 'REJECTED')) {
            $db->rollback();
            return false;
        }
        $db->execute_query("DELETE FROM journals WHERE internid = ? AND monthnumber = ? AND status = 'REJECTED'", [$internID, $monthnumber]);
        $db->execute_query(
            "INSERT INTO journals (internid, monthnumber, notes, file_path, status, datesubmitted) VALUES (?, ?, ?, ?, 'PENDING', ?)",
            [$internID, $monthnumber, $notes, $filePath, date('Y-m-d')]
        );
        $db->commit();
        return true;
    } catch (Throwable $error) {
        $db->rollback();
        throw $error;
    }
}
