<?php
const MAX_FAILED_LOGINS = 5;

function internLogIn($id, $password)
{
    $query = "SELECT *, i.locked_until > NOW() AS isLocked FROM interns i JOIN students s ON i.studentid = s.studentID WHERE s.studentid = ?";
    $row = db()->execute_query($query, [$id])->fetch_assoc();
    if (!$row || $row['isLocked'] || $row['password'] === null) {
        return false;
    }

    if (password_verify($password, $row['password'])) {
        db()->execute_query("UPDATE interns SET failed_logins = 0, locked_until = NULL WHERE internid = ?", [$row['internid']]);
        return $row;
    }

    // the 5th wrong try locks for 15 minutes and starts the count again
    db()->execute_query(
        "UPDATE interns
         SET locked_until = IF(failed_logins + 1 >= ?, NOW() + INTERVAL 15 MINUTE, locked_until),
             failed_logins = IF(failed_logins + 1 >= ?, 0, failed_logins + 1)
         WHERE internid = ?",
        [MAX_FAILED_LOGINS, MAX_FAILED_LOGINS, $row['internid']]
    );
    return false;
}

function findInternByEmail(string $email)
{
    $query = "SELECT * FROM interns i JOIN students s ON i.studentid = s.studentID WHERE s.email = ?";
    return db()->execute_query($query, [$email])->fetch_assoc();
}

function internHasPassword($internID): bool
{
    $row = db()->execute_query("SELECT password IS NOT NULL AS hasPassword FROM interns WHERE internid = ?", [$internID])->fetch_assoc();
    return (bool) ($row['hasPassword'] ?? false);
}

function changeInternPassword($internID, string $currentPassword, string $newPassword): bool
{
    $row = db()->execute_query("SELECT password FROM interns WHERE internid = ?", [$internID])->fetch_assoc();
    if (!$row || $row['password'] === null || !password_verify($currentPassword, $row['password'])) {
        return false;
    }
    db()->execute_query("UPDATE interns SET password = ? WHERE internid = ?", [password_hash($newPassword, PASSWORD_BCRYPT), $internID]);
    return true;
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
    $query = "SELECT s.studentName, s.course, s.classcode, co.target_hours, i.companyid, c.companyname, a.adviserName, a.adviserEmail
              FROM interns i
              JOIN students s ON s.studentID = i.studentid
              JOIN courses co ON co.code = s.course
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
