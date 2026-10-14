<?php
function getWeeklyReports($internID)
{
    $query = "SELECT w.*, (SELECT COUNT(*) FROM weeklyreport_absences a WHERE a.reportid = w.reportid) AS absences
              FROM weeklyreports w WHERE w.internid = ? ORDER BY w.weeknumber";
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

function submitWeeklyReport($internID, int $week, string $weekStart, array $days, string $accomplishment, string $supervisorName, ?string $filePath, array $absences = []): int
{
    $db = db();
    $db->begin_transaction();
    try {
        $db->execute_query(
            "INSERT INTO weeklyreports (internid, weeknumber, week_start, hours, workdescription, supervisor_name, file_path, status, datesubmitted)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)",
            [$internID, $week, $weekStart, array_sum(array_column($days, 'hours')), $accomplishment, $supervisorName, $filePath, date('Y-m-d')]
        );
        $reportID = $db->insert_id;
        foreach ($days as $date => $day) {
            $db->execute_query(
                "INSERT INTO weeklyreport_days (reportid, work_date, am_in, am_out, pm_in, pm_out, hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [$reportID, $date, $day['am_in'], $day['am_out'], $day['pm_in'], $day['pm_out'], $day['hours']]
            );
        }
        foreach ($absences as $date => $absence) {
            $db->execute_query(
                "INSERT INTO weeklyreport_absences (reportid, absent_date, part, reason, proof_type, proof_path) VALUES (?, ?, ?, ?, ?, ?)",
                [$reportID, $date, $absence['part'], $absence['reason'], $absence['proof_type'], $absence['proof_path']]
            );
        }
        $db->commit();
        return $reportID;
    } catch (Throwable $error) {
        $db->rollback();
        throw $error;
    }
}

function getApprovedHours($internID): float
{
    return (float) db()->execute_query(
        "SELECT COALESCE(SUM(hours), 0) FROM weeklyreports WHERE internid = ? AND status = 'APPROVED'",
        [$internID]
    )->fetch_row()[0];
}
