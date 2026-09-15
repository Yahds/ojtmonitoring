<?php
include("DataAccessObject.php");

session_start();
$db = new DAO();

date_default_timezone_set('Asia/Manila'); // Set the timezone to Philippines

$internID = $_SESSION['internid'];
$companyID = $_SESSION['companyid'];

// Get current date and time for time out
$timeOut= date("g:i:s A");

$inserted = $db->insertTimeOut($internID, $companyID, $timeOut);

if ($inserted) {
    echo "success"; 
} else {
    echo "failure"; 
}
?>
