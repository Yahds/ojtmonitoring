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

function getDueRules($adviserID): array
{
    return db()->execute_query(
        "SELECT DATE_FORMAT(starts_on, '%Y-%m-%d') AS starts_on, due_days FROM weekly_due_rules WHERE adviserid = ? ORDER BY starts_on",
        [$adviserID]
    )->fetch_all(MYSQLI_ASSOC);
}

function getReportedWeeks($internID): array
{
    $rows = db()->execute_query("SELECT DISTINCT weeknumber FROM weeklyreports WHERE internid = ?", [$internID])->fetch_all(MYSQLI_ASSOC);
    return array_map(fn ($row) => (int) $row['weeknumber'], $rows);
}

function submitWeeklyReport($internID, $weeknumber, $weekStart, $hours, $workdescription, $filePath)
{
    return db()->execute_query(
        "INSERT INTO weeklyreports (internid, weeknumber, week_start, hours, workdescription, file_path, status, datesubmitted)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)",
        [$internID, $weeknumber, $weekStart, $hours, $workdescription, $filePath, date('Y-m-d')]
    ) ? db()->affected_rows : 0;
}
