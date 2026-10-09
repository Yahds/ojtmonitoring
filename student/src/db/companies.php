<?php
function getCompanies()
{
    $result = db()->query("SELECT companyid, companyname, companyaddress FROM company ORDER BY companyname");
    return $result->fetch_all(MYSQLI_ASSOC);
}
