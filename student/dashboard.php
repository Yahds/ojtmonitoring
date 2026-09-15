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
            <div class="nav-name"> <?php echo($_SESSION['studentName'])?></div>
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
                                    <div class="adviser-name"><?php echo($_SESSION["studentName"])?></div>
                                    <p class="intern-p">Intern</p>

                                    <p>COMPANY</p>
                                    <?php
                                        // Fetch the company name based on companyid 
                                        $companyId = $_SESSION['companyid'];
                                        $companyInfo = $db->getCompanyInfoById($companyId);
                                        echo "<div class='company-name'>" .$companyInfo['companyname']. "</div>";
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
                                        echo "<div class='company-location'>".$companyInfo['companyaddress']."</div>";
                                    ?>
                                </div>
                            </div>

                            <div class="timeForm">
                                <div class="yellow-horizontal bar"></div>

                                <p class="attendance">ATTENDANCE</p>
                                
                                <?php
                                    // Fetch the time in and time out for the current date
                                    $currentDate = date("Y-m-d"); // Get the current date

                                    $internID = $_SESSION['internid']; // Assuming the internID is stored in the session

                                    $db = new DAO();
                                    $currentDayAttendance = $db->getCurrentDayAttendance($internID, $currentDate);

                                    if ($currentDayAttendance) {
                                        // Display the time in and time out for the current date
                                        echo "Time In: " . $currentDayAttendance['timeIn'] . "<br>";
                                        echo "Time Out: " . $currentDayAttendance['timeOut'] . "<br>";
                                    } else {
                                        echo "No attendance recorded for today.";
                                    }
                                ?>
                                

                                <button id="timeInButton">Time In</button>
                                <button id="timeOutButton" style="display: none;">Time Out</button>

                                <!-- Time Out Modal -->
                                <div id="timeOutModal" class="modal" style="visibility: hidden;">
                                    <div class="modal-content">
                                        <span class="close">&times;</span>
                                        <form id="timeOutForm">
                                            <textarea id="workDescription" name="workDescription" placeholder="Enter work description..." required></textarea>
                                            <input type="button" value="Submit" onclick="submitForm()">
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="recent-attendance">
                        <h2>Recent Attendance</h2>
                        <table>
                            <tr>
                                <th>Date</th>
                                <th>Time In</th>
                                <th>Time Out</th>
                            </tr>
                            <?php
                            // Fetch the top 5 recent attendances for the logged-in intern
                            $internID = $_SESSION['internid'];
                            $recentAttendances = $db->getRecentAttendances($internID);

                            if (!empty($recentAttendances)) {
                                foreach ($recentAttendances as $attendance) {
                                    echo '<tr>';
                                    echo '<td>' . $attendance['date'] . '</td>';
                                    echo '<td>' . $attendance['timeIn'] . '</td>';
                                    echo '<td>' . $attendance['timeOut'] . '</td>';
                                    echo '</tr>';
                                }
                            } else {
                                echo '<tr><td colspan="3">No recent attendances found.</td></tr>';
                            }
                            ?>
                        </table>
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
                        echo '<h3>' . $announcement['subject'] . '</h3>';
                        echo '<p>Date: ' . $announcement['date'] . '</p>';
                        echo '<p>' . $announcement['message'] . '</p>';
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

    function submitForm() {
        var workDescription = document.getElementById('workDescription').value.trim();
        
        if (workDescription !== '') {
            // Perform AJAX request
            var xhr = new XMLHttpRequest();
            xhr.open('POST', './includes/updateTimeOutWorkDescription.php', true);
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        // Reload the page after successful submission
                        location.reload();
                    } else {
                        alert("Failed to process the request.");
                    }
                }
            };
            
            // Send form data
            xhr.send('workDescription=' + encodeURIComponent(workDescription));
            alert("Work description updated successfully!");
        } else {
            alert("Work description is required!");
        }
    }


    var requestInProgress = false;

    document.getElementById("timeInButton").addEventListener("click", function() {
        if (!requestInProgress) {
            requestInProgress = true;

            var xhr = new XMLHttpRequest();
            xhr.open("POST", "./includes/insertTimeIn.php", true);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.onreadystatechange = function() {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        var response = xhr.responseText;
                        if (response === "success") {
                            document.getElementById("timeInButton").style.display = "none";
                            document.getElementById("timeOutButton").style.display = "block";
                        } else {
                            alert("Failed to record Time In.");
                        }
                    } else {
                        alert("Failed to record Time In.");
                    }
                    requestInProgress = false;
                }
            };
            xhr.send();
        }
    });

    document.getElementById("timeOutButton").addEventListener("click", function() {
        if (!requestInProgress) {
            requestInProgress = true;

            var xhr = new XMLHttpRequest();
            xhr.open("POST", "./includes/insertTimeOut.php", true);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.onreadystatechange = function() {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        var response = xhr.responseText;
                        if (response === "success") {
                            document.getElementById("timeOutButton").style.display = "none";
                        } else {
                            alert("Failed to record Time Out.");
                        }
                    } else {
                        alert("Failed to record Time Out.");
                    }
                    requestInProgress = false;
                }
            };
            xhr.send();
        }
    });

    // Show the time out modal when the time out button is clicked
    document.getElementById("timeOutButton").addEventListener("click", function() {
      console.log("Time Out button clicked"); // Check if this message appears in the console
      document.getElementById("timeOutModal").style.visibility = "visible";
    });

    // Close the modal when the close button is clicked
    document.querySelector(".close").addEventListener("click", function() {
        document.getElementById("timeOutModal").style.display = "none";
    });

    document.addEventListener('DOMContentLoaded', function() {
        const timeInButton = document.getElementById('timeInButton');
        const timeOutButton = document.getElementById('timeOutButton');

        timeInButton.addEventListener('click', function() {
            localStorage.setItem('timeButton', 'timeOut');
            window.location.reload();
        });

        timeOutButton.addEventListener('click', function() {
            localStorage.setItem('timeButton', 'timeIn');
        });

        const savedTimeButton = localStorage.getItem('timeButton');
        if (savedTimeButton === 'timeIn') {
            timeInButton.style.display = 'block';
            timeOutButton.style.display = 'none';
        } else {
            timeInButton.style.display = 'none';
            timeOutButton.style.display = 'block';
        }

    });

  </script>
  
</html>
