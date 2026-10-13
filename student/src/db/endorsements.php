<?php
function getEndorsement($internID): ?array
{
    return db()->execute_query("SELECT * FROM endorsements WHERE internid = ?", [$internID])->fetch_assoc();
}

// new answers replace the old ones and the action stops this once the letter is sent
function saveEndorsementForm($internID, int $companyID, array $form): void
{
    db()->execute_query(
        "INSERT INTO endorsements (internid, companyid, contact_name, contact_email, position, start_date)
         VALUES (?, ?, ?, ?, ?, ?) AS new
         ON DUPLICATE KEY UPDATE companyid = new.companyid, contact_name = new.contact_name,
             contact_email = new.contact_email, position = new.position, start_date = new.start_date",
        [$internID, $companyID, $form['contact_name'], $form['contact_email'], $form['position'] ?: null, $form['start_date'] ?: null]
    );
}
