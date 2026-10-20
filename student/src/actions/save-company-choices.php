<?php
// saves up to 3 partner companies, in order, while the intern is still choosing
requireLogin();
verify_csrf();

$posted = $_POST['choices'] ?? [];
$posted = is_array($posted) ? array_slice($posted, 0, MAX_COMPANY_CHOICES) : [];
$chosen = array_values(array_filter(array_map('intval', $posted)));
$partnerIds = array_map('intval', array_column(getPartnerCompanies(), 'companyid'));

if ($chosen === []) {
    flash('error', 'Choose at least your first company.');
    redirect('/choose-company');
}
if (array_diff($chosen, $partnerIds) !== []) {
    flash('error', 'Please choose companies from the list.');
    redirect('/choose-company');
}
if (count(array_unique($chosen)) !== count($chosen)) {
    flash('error', 'Choose a different company for each choice.');
    redirect('/choose-company');
}

if (!saveCompanyChoices($_SESSION['internid'], $chosen)) {
    flash('error', 'You already have a company, so your choices can no longer change.');
    redirect('/choose-company');
}

flash('success', 'Choices saved. Your adviser sends your CV to these companies.');
redirect('/choose-company');
