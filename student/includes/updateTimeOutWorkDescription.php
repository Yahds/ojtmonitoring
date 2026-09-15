<?php
// ./includes/updateTimeOutWorkDescription.php
require_once __DIR__ . '/requireLogin.php';
include("./DataAccessObject.php");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (isset($_POST['workDescription'])) {

        $workDescription = $_POST['workDescription'];

        $db = new DAO();

        $internID = $_SESSION['internid'];
        $companyID = $_SESSION['companyid'];

        $result = $db->updateWorkDescription($internID, $companyID, $workDescription);

        if ($result) {
            echo '<script>alert("Work description updated successfully!");</script>';
        } else {
            echo '<script>alert("Failed to update work description!");</script>';
        }
    } else {
        echo '<script>alert("Work description is required!");</script>';
    }
} else {
    echo '<script>alert("Invalid request method!");</script>';
}
?>
