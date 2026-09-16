<?php 
    include("./includes/DataAccessObject.php");
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    } 
    
    $db = new DAO();


?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OJT Portal</title>    
    <link rel="stylesheet" href="./css/dashboard.css">
    <link rel="stylesheet" href="https://unicons.iconscout.com/release/v4.0.0/css/line.css" />
</head>
<body id="main">
    <!--Header-->
    <header>
        <nav class="navbar">
            <div class="nav-logo">SAINT LOUIS UNIVERSITY</div>
            <div class="nav-name"> <?php echo htmlspecialchars($_SESSION['studentName'])?></div>
            <div class="nav-item">
                <img src="./ojt-images/jannsen.png" alt="Profile" class="profile-image">
            </div>
        </nav>
    </header>

    <!--Main Container-->
    <main class="container">
    
    <!--Side Bar-->
    <aside class="left-nav">
            <ol>
                <?php 
                    echo "<li><a href='dashboard.php'>DASHBOARD</a></li>";
                    echo "<li><a href='#'>TIME SHEET</a></li>";
                    echo "<li><a href='views/requirements.php'>REQUIREMENTS</a></li>";
                    echo "<li><a href='#'>ABOUT US</a></li>";
                ?>
            </ol>

            <!--Logout Button-->
            <img src="../" alt="">
            <form action="./includes/logoutController.php" method="post">
                <input type="submit" value="Logout">
            </form>
        </aside>

        <!--Middle Content-->
        <section class="section">

            <div class="main-dashboard">
                <div class="main-dashboard-content">

                    <div class="main-dashboard-title">DASHBOARD</div>

                        <div class="intern-details">
                        <div class="bg-image">
                            <div class="blue-shade">
                                <img src="./ojt-images/maryheights.jpg" alt="maryheights">
                            </div>
                        </div>
                        
                        <div class="details">

                            <div class="top-div">
                                <div class="dashboard-slu-logo">
                                    <img src="./ojt-images/slu-logo.png" alt="slu logo">
                                </div>

                                <div>
                                    <div class="adviser-name"><?php echo htmlspecialchars($_SESSION["studentName"])?></div>
                                    <p class="intern-p">Intern</p>

                                    <p>COMPANY</p>
                                    <?php
                                        // Fetch the company name based on companyid 
                                        $companyId = $_SESSION['companyid'];
                                        $companyInfo = $db->getCompanyInfoById($companyId);
                                        echo "<div class='company-name'>" . htmlspecialchars($companyInfo['companyname']) . "</div>";
                                    ?>
                                </div>
                                    
                                <div class="total-hours">
                                    <div class="circle">
                                        <?php
                                        $internID = $_SESSION['internid'];
                                        $totalHours = $db->getTotalHours($internID);

                                        // Display the total hours 
                                        echo "<p>$totalHours</p>";
                                        ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="date-and-time">
                        <div class="db-time-and-date">

                            <div class="dashboard-time-date">
                                <div class="time-text-date">
                                    TIME
                                </div>
                                    
                                <p id="currentTime"></p>
                                <p id="currentDate"></p>

                                </div>
                                        
                                <div class="dashboard-location">
                                    <div class="date-text">
                                        LOCATION
                                    </div>

                                    <?php
                                        // Fetch the company address based on companyid 
                                        $companyId = $_SESSION['companyid'];
                                        $companyInfo = $db->getCompanyInfoById($companyId);
                                        echo "<div class='company-location'>". htmlspecialchars($companyInfo['companyaddress']) ."</div>";
                                    ?>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!--Announcement Board-->
        <section class="third-column">
            <h2>Announcement Board</h2>
            <div class="announcement-board">
                <?php
                // Fetch announcements for the logged-in intern based on their internid
                $internID = $_SESSION['internid'];
                $announcements = $db->getAnnouncementsForIntern($internID);

                if (!empty($announcements)) {
                    foreach ($announcements as $announcement) {
                        echo '<div class="announcement">';
                        echo '<h3>' . htmlspecialchars($announcement['subject']) . '</h3>';
                        echo '<p>Date: ' . $announcement['date'] . '</p>';
                        echo '<p>' . htmlspecialchars($announcement['message']) . '</p>';
                        echo '</div>';
                    }
                } else {
                    echo '<p>No announcements found.</p>';
                }
                ?>
            </div>
        </section>

    </main>
</body>

<script>
    function updateDateTime() {
      var currentDateTime = new Date();
      var date = currentDateTime.toDateString();
      var time = currentDateTime.toLocaleTimeString();
      
      document.getElementById("currentDate").innerHTML = date;
      document.getElementById("currentTime").innerHTML = time;
    }
    
    setInterval(updateDateTime, 1000);
    
    // Initialize the date and time
    window.onload = function() {
      updateDateTime();
    };

  </script>
  
</html>
