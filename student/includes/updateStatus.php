<?php
include("DataAccessObject.php");
if (session_status() == PHP_SESSION_NONE) {
    session_start();
} 

$db = new DAO();

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (isset($_POST['internID'], $_POST['requirementName'], $_POST['newStatus'])) {
        $internID = $_POST['internID'];
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
