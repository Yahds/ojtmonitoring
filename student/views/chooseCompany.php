<?php
    include("../includes/DataAccessObject.php");
    session_start();
    $db = new DAO();

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OJT Portal</title>
    <link rel="stylesheet" href="../css/chooseCompany.css">
    <link rel="stylesheet" href="https://unicons.iconscout.com/release/v4.0.0/css/line.css" />
    <style>
       .main-dashboard .intern-details .details .intern-name {
            font-size: 30px;
            font-weight: bold;
            margin-top: 20px;
            color: #0D0464;
            text-align: center;
        }

        .company-msg-box{
            display: flex;
            justify-content: center;
            height: 100%;
            align-items: center;
        }

        .dashboard-slu-logo {
            width: 10px;
            margin-left: 0px;
            animation-name: floating;
            animation-duration: 1s;
            animation-iteration-count: infinite;
            animation-timing-function: ease-in-out;
            margin-left: 0px;
            margin-top: 5px;
        }

        @keyframes floating {
            0% {
                transform: translate(0, 0px);
            }

            50% {
                transform: translate(0, 15px);
            }

            100% {
                transform: translate(0, -0px);
            }
        }

        .company-msg-box .dashboard-slu-logo{
            display: flex;
            justify-content: center;
            
        }

        .company-under-review-msg-box p{
            font-size: 20px;
            font-weight: bold;
            margin-top: 20px;
            color: #0D0464;
            text-align: center;
            text-transform: uppercase;
        }
    </style>
</head>
<body id="main">
    <header>
        <nav class="navbar">
            <div class="nav-logo">SAINT LOUIS UNIVERSITY</div>
            <div class="nav-name">
                <?php echo(isset($_SESSION['studentName']) ? $_SESSION['studentName'] : ''); ?>
            </div>
            <div class="nav-item">
                <img src="#" alt="Profile" class="profile-image">
            </div>
        </nav>
    </header>
    <main class="container">
        <aside class="left-nav">
            <ol>
                <li><a href="../temporary_dashboard.php">DASHBOARD</a></li>
                <li><a href="requirements.php">REQUIREMENTS</a></li>
                <li><a href="#">ABOUT US</a></li>
            </ol>

            <img src="../" alt="">
        </aside>
        <section>
        <div class="main-dashboard">
                <div class="main-dashboard-content">
                    <div class="main-dashboard-title">DASHBOARD</div>
                    <div class="intern-details">
                        <div class="bg-image">
                            <div class="blue-shade">
                                <img src="../ojt-images/maryheights.jpg" alt="maryheights">
                            </div>
                        </div>
                        <?php
                            if ($_SESSION['status'] == "PENDING" && $_SESSION['companyid'] != null) {
                                echo '<div class="details">';
                                echo '    <div class="intern-name">';
                                echo '        ' . (isset($_SESSION['studentName']) ? $_SESSION['studentName'] : '');
                                echo '    </div>';
                                echo '    <div class="yellow-horizontal bar"></div>';
                                echo '    <div class="intern-title">INTERN</div>';
                                echo '    <div class="company-msg-box">';
                                echo '        <div class="dashboard-slu-logo">';
                                echo '            <img src="../ojt-images/slu-logo.png" alt="slu logo">';
                                echo '        </div>';
                                echo '        <div class="company-under-review-msg-box">';
                                echo '            <p>Congratulations! Your chosen company is under review.</p>';
                                echo '            <p>Kindly wait for confirmation from your adviser.</p>';
                                echo '        </div>';
                                echo '    </div>';
                                echo '</div>';
                            }  else{
                                echo '<div class="details" ' . ($_SESSION['status'] == "PENDING" && $_SESSION['companyid'] != null ? 'style="display:none;"' : '') . '>';
                                echo '    <div class="intern-name">';
                                echo '        ' . (isset($_SESSION['studentName']) ? $_SESSION['studentName'] : '');
                                echo '    </div>';
                                echo '    <div class="yellow-horizontal bar"></div>';
                                echo '    <div class="intern-title">INTERN</div>';
                                echo '    <div class="db-time-and-date">';
                                echo '        <div class="dashboard-slu-logo">';
                                echo '            <img src="../ojt-images/slu-logo.png" alt="slu logo">';
                                echo '        </div>';
                                echo '        <div class="dashboard-time">';
                                echo '            <div class="time-text">TIME</div>';
                                echo '            <div id="current-time">10:22:31 GMT+7</div>';
                                echo '        </div>';
                                echo '        <div class="dashboard-date">';
                                echo '            <div class="date-text">DATE</div>';
                                echo '            <div id="current-date">MONDAY, 20 NOVEMBER 2023</div>';
                                echo '        </div>';
                                echo '    </div>';
                                echo '    <div class="chooseCompany-box">';
                                echo '        <label for="dropdown" class="chooseCompany-title">COMPANY</label>';
                                echo '        <div class="company-dropdown-box">';
                                echo '            <select id="dropdown" name="companySelect" onchange="updateCompanyId()">';
                                echo '                <option value=\'default\' data-view=\'default\'>Choose company here...</option>';

                                $companyData = $db->getCompanyData();

                                if ($companyData->num_rows > 0) {
                                    $row = $companyData->fetch_assoc();
                                    do {
                                        $companyName = $row['companyname'];
                                        $companyAddress = $row['companyaddress'];
                                        $optionValue = "$companyName - $companyAddress";
                                        echo "                <option value='$optionValue' data-view='company'>$optionValue</option>";
                                    } while ($row = $companyData->fetch_assoc());
                                } else {
                                    echo "                <option value='default' data-view='default'>Choose company here...</option>";
                                }

                                echo '            </select>';
                                echo '        </div>';
                                echo '        <div id="companyData" style="display: none;"></div>';
                                echo '    </div>';
                                echo '</div>';
                                echo '</div>';
                            }
                        ?>
                    </div>
                </div>
            </div>
        </section>
    </main>
    <script>

        // Displays the current time with respect to UTC+8 time zone
        function updateCurrentTime() {
            var now = new Date();
            var hours = now.getUTCHours() + 8;
            var minutes = now.getUTCMinutes();
            var seconds = now.getUTCSeconds();
            // Adjust hours to wrap around 24
            hours = hours % 24;
            // Format minutes and seconds to always be two digits
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            var currentTimeString = hours + ':' + minutes + ':' + seconds + ' UTC+8';
            document.getElementById('current-time').textContent = currentTimeString;
        }

        setInterval(updateCurrentTime, 1000);
        updateCurrentTime();

        // Displays current date from device
        function updateCurrentDate() {
            var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            var currentDate = new Date().toLocaleDateString('en-US', options);
            document.getElementById('current-date').textContent = currentDate;
        }
        updateCurrentDate();

        // update the companyid of the intern using the selected company in the dropdown
        function updateCompanyId() {
            var dropdown = document.getElementById('dropdown');
            var selectedOption = dropdown.options[dropdown.selectedIndex].value;

            if (selectedOption !== 'default') {
                console.log('Selected Option:', selectedOption);
                var [companyName, companyAddress] = selectedOption.split(' - ');
                console.log('Company Name:', companyName);
                console.log('Company Address:', companyAddress);

                var xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function () {
                    if (xhr.readyState == 4 && xhr.status == 200) {
                        var companyId = xhr.responseText;
                        console.log('Company ID updated:', companyId);
                        updateSessionCompanyId(companyId);
                        displaySuccessMessage('Company information updated successfully.');
                    } else {
                    console.error('Failed to update Company ID.');
                    }
                };

                var data = 'companyName=' + encodeURIComponent(companyName) +
                        '&companyLocation=' + encodeURIComponent(companyAddress);

                xhr.open('POST', '../includes/updateCompany.php', true);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                console.log('Data:', data);
                xhr.send(data);
            }
        }

        // update the session variable on the server side
        function updateSessionCompanyId(companyId) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    console.log('Session Company ID updated:', xhr.responseText);
                }
            };

            var data = 'companyId=' + encodeURIComponent(companyId);

            xhr.open('POST', '../includes/updateSessionCompanyId.php', true); // Updated file path
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.send(data);
        }

        function displaySuccessMessage(message) {
                alert(message);
                location.reload();
        }

    </script>
</body>
</html>