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

function submitJournal($internID, $monthnumber, $notes, $filePath)
{
    $date = date("Y-m-d");
    $query = "INSERT INTO journals (internid, monthnumber, notes, file_path, status, datesubmitted) VALUES (?, ?, ?, ?, 'PENDING', ?)";
    $statement = db()->prepare($query);
    $statement->bind_param("iisss", $internID, $monthnumber, $notes, $filePath, $date);
    $statement->execute();
    return $statement->affected_rows;
}
