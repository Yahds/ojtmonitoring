<?php
// ./includes/updateTimeOutWorkDescription.php

// Include the DataAccessObject.php file
include("./DataAccessObject.php");

// Start the session if it's not started already
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Check if the form is submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (isset($_POST['workDescription'])) {

        $workDescription = $_POST['workDescription'];

        $db = new DAO();

        $internID = $_SESSION['internid'];
        $companyID = $_SESSION['companyid'];

        // Update the dailyreports table with the work description
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
