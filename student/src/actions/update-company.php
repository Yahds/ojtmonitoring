<?php
// saves the company an intern picks while waiting to be deployed
requireLogin();
verify_csrf();
if (in_array($_SESSION['status'], ['ACTIVE', 'FINISHED'], true)) {
    redirect('/dashboard');
}

$companyId = (int) ($_POST['companyid'] ?? 0);
// partners, plus the company the intern added themselves
$companyIds = array_map('intval', array_column(getPartnerCompanies(), 'companyid'));
$ownCompany = getInternProfile($_SESSION['internid'])['companyid'];
if ($ownCompany !== null) {
    $companyIds[] = (int) $ownCompany;
}

if (!in_array($companyId, $companyIds, true)) {
    flash('error', 'Please choose a company from the list.');
    redirect('/choose-company');
}

chooseCompany($_SESSION['internid'], $companyId);

flash('success', 'Company saved. Your adviser will review it.');
redirect('/choose-company');
