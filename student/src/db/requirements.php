<?php
require_once __DIR__ . '/../classes.php';

// same rule as the adviser app: a deadline for this intern, else for their section, else for all the adviser's sections
const DUE_DATE = "COALESCE(ir.due_date, ds.due_date, da.due_date)";

function getRequirements($internID)
{
    $rows = db()->execute_query(
        "SELECT ir.internid, ir.reqid, r.requirementname, ir.datesubmitted, ir.status, ir.remarks, ir.intern_remarks, ir.file_path,
                DATE_FORMAT(" . DUE_DATE . ", '%Y-%m-%d') AS due_date,
                DATE_FORMAT(" . DUE_DATE . ", '%b %e, %Y') AS due_label,
                CASE
                    WHEN " . DUE_DATE . " IS NULL THEN NULL
                    WHEN ir.status = 'PENDING' AND CURDATE() > " . DUE_DATE . " THEN 'OVERDUE'
                    WHEN DATE((SELECT MIN(v.submitted_at) FROM requirement_versions v
                               WHERE v.internid = ir.internid AND v.reqid = ir.reqid)) > " . DUE_DATE . " THEN 'LATE'
                END AS deadline
         FROM internrequirements ir
         JOIN requirements r ON r.reqid = ir.reqid
         JOIN interns i ON i.internid = ir.internid
         JOIN students s ON s.studentID = i.studentid
         LEFT JOIN requirement_deadlines ds ON ds.adviserid = i.adviserid AND ds.reqid = ir.reqid AND ds.classcode = s.classcode
         LEFT JOIN requirement_deadlines da ON da.adviserid = i.adviserid AND da.reqid = ir.reqid AND da.classcode = ''
         WHERE ir.internid = ?
         ORDER BY ir.reqid",
        [$internID]
    )->fetch_all(MYSQLI_ASSOC);

    return array_map(fn ($row) => new Requirement(
        $row['internid'],
        $row['reqid'],
        $row['requirementname'],
        $row['datesubmitted'],
        $row['status'],
        $row['remarks'],
        $row['intern_remarks'],
        $row['file_path'],
        $row['due_date'],
        $row['due_label'],
        $row['deadline'],
    ), $rows);
}

function getRequirementFile($internID, $reqID)
{
    $query = "SELECT file_path FROM internrequirements WHERE internid = ? AND reqid = ?";
    $statement = db()->prepare($query);
    $statement->bind_param("ii", $internID, $reqID);
    $statement->execute();
    $row = $statement->get_result()->fetch_assoc();
    $statement->close();
    return $row ? $row['file_path'] : null;
}

// an approved requirement is locked; every submit is saved as a new version, older ones stay
function submitRequirement($internID, $reqID, $internRemarks, $filePath)
{
    $db = db();
    $db->begin_transaction();
    try {
        // FOR UPDATE locks the row until commit, so two quick submits can't get the same version number
        $current = $db->execute_query(
            "SELECT status FROM internrequirements WHERE internid = ? AND reqid = ? FOR UPDATE",
            [$internID, $reqID]
        )->fetch_assoc();
        if ($current === null || $current['status'] === 'APPROVED') {
            $db->rollback();
            return 0;
        }
        // a note without a new file keeps the current file; the old remark belongs to the old version
        $db->execute_query(
            "UPDATE internrequirements
             SET intern_remarks = ?, file_path = COALESCE(?, file_path), status = 'SUBMITTED', datesubmitted = ?, remarks = NULL
             WHERE internid = ? AND reqid = ?",
            [$internRemarks, $filePath, date('Y-m-d'), $internID, $reqID]
        );
        $db->execute_query(
            "INSERT INTO requirement_versions (internid, reqid, version_no, file_path, intern_note)
             SELECT ir.internid, ir.reqid,
                    (SELECT COALESCE(MAX(v.version_no), 0) + 1 FROM requirement_versions v WHERE v.internid = ir.internid AND v.reqid = ir.reqid),
                    ir.file_path, ir.intern_remarks
             FROM internrequirements ir
             WHERE ir.internid = ? AND ir.reqid = ?",
            [$internID, $reqID]
        );
        $db->commit();
        return 1;
    } catch (Throwable $error) {
        $db->rollback();
        throw $error;
    }
}

// every version of every requirement for this intern, grouped by requirement, newest first
function getRequirementVersions($internID): array
{
    $rows = db()->execute_query(
        "SELECT reqid, version_no, file_path IS NOT NULL AS has_file, intern_note, decision, remarks,
                DATE_FORMAT(submitted_at, '%b %e, %Y') AS submitted
         FROM requirement_versions
         WHERE internid = ?
         ORDER BY reqid, version_no DESC",
        [$internID]
    )->fetch_all(MYSQLI_ASSOC);

    $byRequirement = [];
    foreach ($rows as $row) {
        $byRequirement[$row['reqid']][] = $row;
    }
    return $byRequirement;
}

function getRequirementVersionFile($internID, $reqID, $versionNo)
{
    $row = db()->execute_query(
        "SELECT file_path FROM requirement_versions WHERE internid = ? AND reqid = ? AND version_no = ?",
        [$internID, $reqID, $versionNo]
    )->fetch_assoc();
    return $row ? $row['file_path'] : null;
}
