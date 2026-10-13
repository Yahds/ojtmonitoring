<?php
require_once __DIR__ . '/../classes.php';

function getRequirements($internID)
{
    $requirements = [];
    $query = "SELECT * FROM internrequirements ir JOIN requirements r ON ir.reqid = r.reqid where internid = ?";
    $statement = db()->prepare($query);
    $statement->bind_param("i", $internID);
    $statement->execute();
    $result = $statement->get_result();

    while ($row = $result->fetch_assoc()) {
        $requirements[] = new Requirement(
            $row["internid"],
            $row["reqid"],
            $row["requirementname"],
            $row["datesubmitted"],
            $row["status"],
            $row["remarks"],
            $row["intern_remarks"],
            $row["file_path"],
        );
    }
    $statement->close();
    return $requirements;
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
