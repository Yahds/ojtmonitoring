<?php
function internLogIn($id, $password)
{
    $query = "SELECT * FROM interns i JOIN students s ON i.studentid = s.studentID WHERE s.studentid = ?";
    $statement = db()->prepare($query);
    $statement->bind_param("i", $id);
    $statement->execute();
    $row = $statement->get_result()->fetch_assoc();
    if ($row && password_verify($password, $row['password'])) {
        return $row;
    }
    return false;
}

function getInternStatus($internID)
{
    $statement = db()->prepare("SELECT status FROM interns WHERE internid = ?");
    $statement->bind_param("i", $internID);
    $statement->execute();
    $row = $statement->get_result()->fetch_assoc();
    $statement->close();
    return $row ? $row['status'] : null;
}

function getInternProfile($internID)
{
    $query = "SELECT s.studentName, s.course, s.classcode, i.companyid, c.companyname, a.adviserName, a.adviserEmail
              FROM interns i
              JOIN students s ON s.studentID = i.studentid
              JOIN advisers a ON a.adviserID = i.adviserid
              LEFT JOIN company c ON c.companyid = i.companyid
              WHERE i.internid = ?";
    $statement = db()->prepare($query);
    $statement->bind_param("i", $internID);
    $statement->execute();
    $row = $statement->get_result()->fetch_assoc();
    $statement->close();
    return $row;
}

// a deployed (ACTIVE) intern cannot change company
function chooseCompany($internID, $companyID)
{
    $query = "UPDATE interns SET companyid = ?, status = 'PENDING' WHERE internid = ? AND status <> 'ACTIVE'";
    $statement = db()->prepare($query);
    $statement->bind_param("ii", $companyID, $internID);
    $statement->execute();
    $statement->close();
}
