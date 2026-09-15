<?php
include("DataAccessObject.php");

if (session_status() == PHP_SESSION_NONE) {
    session_start();
} 

$db = new DAO();

if ($_SERVER["REQUEST_METHOD"] == "POST") {
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

