<?php
include("DataAccessObject.php");

session_start();
$db = new DAO();

date_default_timezone_set('Asia/Manila'); // Set the timezone to Philippines

$internID = $_SESSION['internid'];
$companyID = $_SESSION['companyid'];
$supervisorID = $db->getSupervisorIDForIntern($internID);

// Get current date and time for time in
$currentDate = date("Y-m-d");
$currentTime = date("g:i:s A");

// Insert data into dailyreports table for Time In
$inserted = $db->insertTimeIn($internID, $companyID, $supervisorID, $currentDate, $currentTime);

if ($inserted) {
    echo "success"; 
} else {
    echo "failure";
}
?>
