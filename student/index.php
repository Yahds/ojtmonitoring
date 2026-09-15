<?php
  session_start();

  if (!isset($_SESSION["id"])) {
    include "login.html";
    // include "404.html";
  } else {
    include "dashboard.php";
  }

  if (isset($_SESSION['success_message'])) {
    echo "<div style='color: green; font-weight: bold;'>" . $_SESSION['success_message'] . "</div>";
    unset($_SESSION['success_message']);
}
?>