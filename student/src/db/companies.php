<?php
const MAX_COMPANY_CHOICES = 3;

function getCompanies()
{
    $result = db()->query("SELECT companyid, companyname, companyaddress FROM company ORDER BY companyname");
    return $result->fetch_all(MYSQLI_ASSOC);
}

// only SLU partners (signed MOA) can be chosen
function getPartnerCompanies(): array
{
    return db()->query("SELECT companyid, companyname, companyaddress FROM company WHERE moa_on_file ORDER BY companyname")->fetch_all(MYSQLI_ASSOC);
}

function getCompanyChoices($internID): array
{
    return db()->execute_query(
        "SELECT ch.choice_rank, ch.companyid, c.companyname
         FROM intern_company_choices ch JOIN company c ON c.companyid = ch.companyid
         WHERE ch.internid = ? ORDER BY ch.choice_rank",
        [$internID]
    )->fetch_all(MYSQLI_ASSOC);
}

// replaces all choices at once; false when the intern is no longer choosing
function saveCompanyChoices($internID, array $companyIDs): bool
{
    $connection = db();
    $connection->begin_transaction();
    try {
        $intern = $connection->execute_query("SELECT status, companyid FROM interns WHERE internid = ? FOR UPDATE", [$internID])->fetch_assoc();
        if (!$intern || $intern['status'] !== 'ENROLLED' || $intern['companyid'] !== null) {
            $connection->rollback();
            return false;
        }
        $connection->execute_query("DELETE FROM intern_company_choices WHERE internid = ?", [$internID]);
        foreach (array_values($companyIDs) as $index => $companyID) {
            $connection->execute_query(
                "INSERT INTO intern_company_choices (internid, choice_rank, companyid) VALUES (?, ?, ?)",
                [$internID, $index + 1, $companyID]
            );
        }
        $connection->commit();
        return true;
    } catch (Throwable $error) {
        $connection->rollback();
        throw $error;
    }
}

function findCompanyByName(string $name): ?array
{
    return db()->execute_query("SELECT companyid, companyname, moa_on_file FROM company WHERE companyname = ?", [$name])->fetch_assoc();
}

// a company that is not an SLU partner yet; it stays off the choices list until an adviser marks the MOA as signed
function addOwnCompany($internID, array $company): ?int
{
    $connection = db();
    $connection->begin_transaction();
    try {
        $status = $connection->execute_query("SELECT status FROM interns WHERE internid = ? FOR UPDATE", [$internID])->fetch_row()[0] ?? null;
        if (!in_array($status, ['ENROLLED', 'PENDING'], true)) {
            $connection->rollback();
            return null;
        }
        $companyID = findCompanyByName($company['name'])['companyid'] ?? null;
        if ($companyID === null) {
            $connection->execute_query(
                "INSERT INTO company (companyname, companyaddress, contact_email, moa_on_file) VALUES (?, ?, ?, FALSE)",
                [$company['name'], $company['address'] ?: null, $company['email'] ?: null]
            );
            $companyID = $connection->insert_id;
        }
        chooseCompany($internID, $companyID);
        $connection->commit();
        return $companyID;
    } catch (Throwable $error) {
        $connection->rollback();
        throw $error;
    }
}
