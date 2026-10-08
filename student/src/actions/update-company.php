<?php
requireLogin();
if ($_SESSION['status'] === 'ACTIVE') {
    redirect('/dashboard');
}
$db = new DAO();

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    verify_csrf();
    if (isset($_POST['companyName']) && isset($_POST['companyLocation'])) {
        $company = $_POST['companyName'];
        $location = $_POST['companyLocation'];
        
        $internId = $_SESSION['internid'];

        $companyId = $db->updateCompany($internId, $company, $location);

        // Update the session after updating the company
        $_SESSION['companyid'] = $companyId;

        echo $companyId;
    } else {
        http_response_code(400); 
        echo "Invalid or missing POST data.";
    }
} else {
    http_response_code(405); 
    echo "Only POST requests are allowed.";
}

