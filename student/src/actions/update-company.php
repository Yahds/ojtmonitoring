<?php
// saves the company an intern picks while waiting to be deployed
requireLogin();
verify_csrf();
if ($_SESSION['status'] === 'ACTIVE') {
    redirect('/dashboard');
}

$companyId = (int) ($_POST['companyid'] ?? 0);
$companyIds = array_map('intval', array_column(getCompanies(), 'companyid'));

if (!in_array($companyId, $companyIds, true)) {
    flash('error', 'Please choose a company from the list.');
    redirect('/choose-company');
}

chooseCompany($_SESSION['internid'], $companyId);

flash('success', 'Company saved. Your adviser will review it.');
redirect('/choose-company');
