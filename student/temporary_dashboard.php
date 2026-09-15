<?php 
    /**
     * TEMPORARY DASHBOARD
     * FOR CHECKING SESSION VARIABLES
     */
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    } 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello</h1>
    <br>
    <h1>id: <?php echo($_SESSION["id"])?></h1>
    <br>
    <h1>name: <?php echo($_SESSION["studentName"])?></h1>
    <br>
    <h1>course: <?php echo($_SESSION["course"])?></h1>
    <br>
    <h1>year: <?php echo($_SESSION["year"])?></h1>
    <br>
    <h1>internid: <?php echo($_SESSION["internid"])?></h1>
    <br>
    <a href="views/requirements.php">req</a>
    <form action="includes/logoutController.php" method="post">
        <input type="submit" value="Logout">
    </form>
</body>
</html>