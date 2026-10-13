<?php
function getSupervisor($internID): ?array
{
    return db()->execute_query(
        "SELECT s.supervisorname, s.supervisoremail, s.position
         FROM interns i JOIN supervisors s ON s.supervisorid = i.supervisorid
         WHERE i.internid = ?",
        [$internID]
    )->fetch_assoc();
}

function saveSupervisor($internID, array $supervisor): void
{
    $connection = db();
    $connection->begin_transaction();
    try {
        $connection->execute_query(
            "INSERT INTO supervisors (supervisorname, supervisoremail, position, companyid)
             SELECT ?, ?, ?, companyid FROM interns WHERE internid = ?",
            [$supervisor['name'], $supervisor['email'], $supervisor['position'] ?: null, $internID]
        );
        $connection->execute_query("UPDATE interns SET supervisorid = ? WHERE internid = ?", [$connection->insert_id, $internID]);
        $connection->commit();
    } catch (Throwable $error) {
        $connection->rollback();
        throw $error;
    }
}