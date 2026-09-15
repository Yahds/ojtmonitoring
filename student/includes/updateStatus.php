<?php
require_once __DIR__ . '/requireLogin.php';
include("DataAccessObject.php");

$db = new DAO();

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (isset($_POST['requirementName'], $_POST['newStatus'])) {
        $internID = $_SESSION['internID'];
        $currentDate = $_POST['currentDate'];
        $requirementName = $_POST['requirementName'];
        $newStatus = $_POST['newStatus'];

        // Update the status in the database
        $db->updateStatusByCheckbox("$internID-$requirementName", $newStatus, $currentDate);
        
        // Optionally, you can return a response to the client
        echo "Status updated successfully";
    }
}
?>
