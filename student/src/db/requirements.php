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

// an approved requirement is locked
function submitRequirement($internID, $reqID, $internRemarks, $filePath)
{
    $date = date("Y-m-d");
    if ($filePath !== null) {
        $query = "UPDATE internrequirements SET intern_remarks = ?, file_path = ?, status = 'SUBMITTED', datesubmitted = ? WHERE internid = ? AND reqid = ? AND status <> 'APPROVED'";
        $statement = db()->prepare($query);
        $statement->bind_param("sssii", $internRemarks, $filePath, $date, $internID, $reqID);
    } else {
        $query = "UPDATE internrequirements SET intern_remarks = ?, status = 'SUBMITTED', datesubmitted = ? WHERE internid = ? AND reqid = ? AND status <> 'APPROVED'";
        $statement = db()->prepare($query);
        $statement->bind_param("ssii", $internRemarks, $date, $internID, $reqID);
    }
    $statement->execute();
    return $statement->affected_rows;
}
