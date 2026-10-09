<?php
function getWeeklyReports($internID)
{
    $query = "SELECT * FROM weeklyreports WHERE internid = ? ORDER BY weeknumber";
    $statement = db()->prepare($query);
    $statement->bind_param("i", $internID);
    $statement->execute();
    $reports = $statement->get_result()->fetch_all(MYSQLI_ASSOC);
    $statement->close();
    return $reports;
}

function getWeeklyReportFile($internID, $reportID)
{
    $query = "SELECT file_path FROM weeklyreports WHERE internid = ? AND reportid = ?";
    $statement = db()->prepare($query);
    $statement->bind_param("ii", $internID, $reportID);
    $statement->execute();
    $row = $statement->get_result()->fetch_assoc();
    $statement->close();
    return $row ? $row['file_path'] : null;
}

function submitWeeklyReport($internID, $weeknumber, $hours, $workdescription, $filePath)
{
    $date = date("Y-m-d");
    $query = "INSERT INTO weeklyreports (internid, weeknumber, hours, workdescription, file_path, status, datesubmitted) VALUES (?, ?, ?, ?, ?, 'PENDING', ?)";
    $statement = db()->prepare($query);
    $statement->bind_param("iiisss", $internID, $weeknumber, $hours, $workdescription, $filePath, $date);
    $statement->execute();
    return $statement->affected_rows;
}
