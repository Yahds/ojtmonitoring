<?php 
    include("../includes/DataAccessObject.php");
    session_start();
    $db = new DAO();
    $requirements = $db->getRequirements($_SESSION['internid']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OJT Portal</title>
    <link rel="stylesheet" href="../css/requirements.css">
    <link rel="stylesheet" href="https://unicons.iconscout.com/release/v4.0.0/css/line.css" />
</head>
<body id="main">
    <header>
        <nav class="navbar">
            <div class="nav-logo">SAINT LOUIS UNIVERSITY</div>
            <div class="nav-name"> <?php echo($_SESSION['studentName'])?></div>
            <div class="nav-item">
                <img src="../images/jannsen.png" alt="Profile" class="profile-image">
            </div>
        </nav>
    </header>
    <main class="container">
        <aside class="left-nav">
            <ol>
                
                <?php 
                if ($_SESSION['companyid'] == null) {
                    echo "<li><a href='./chooseCompany.php'>DASHBOARD</a></li>";
                } else {
                    echo "<li><a href='../dashboard.php'>DASHBOARD</a></li>";
                    echo "<li><a href='#'>TIME SHEET</a></li>";
                }
                echo "<li><a href='#'>REQUIREMENTS</a></li>";
                echo "<li><a href='#'>ABOUT US</a></li>";
                ?>
              
            </ol>

            <img src="../" alt="">
            <form action="../includes/logoutController.php" method="post">
                <input type="submit" value="Logout">
            </form>
        </aside>
        <section>
            <form action="../includes/updateStatus.php" method="POST" onsubmit="setTimeout(function(){window.location.reload();},10);">
                <div class="intern-list-container">
                    <div class="table-label-filter">
                        <div class="title">DOCUMENTS</div>
                    </div>

                    <div class="intern-table">
                        <table class="intern-table-holder">
                            <tr class="table-header">
                                <th>
                                
                                </th>
                                <th>
                                    REQUIREMENTS
                                </th>
                                <th>
                                    DATE SUBMITTED
                                </th>
                                <th>
                                    STATUS
                                </th>
                                <th>
                                    REMARKS
                                </th>
                            </tr>
                    
                            <?php 
                            foreach ($requirements as $requirement) {
                                echo "<tr class='table-data'>";
                                echo "<td><input type='checkbox' name='status[]' value='$requirement->internID-$requirement->reqName' " . ($requirement->status == 'SUBMITTED' ? 'checked' : '') . "></td>";
                                echo "<td>$requirement->reqName </td>";
                                echo "<td>$requirement->dateSubmitted</td>";
                                echo "<td>$requirement->status</td>";
                                echo "<td>$requirement->remarks</td>";
                                echo "</tr>";
                            }
                            ?>

                        </table>
                    </div>
                </div>

                <div class="cansave-container">
                    NOTE: IF A REQUIREMENT HAS BEEN REJECTED PLEASE CONTACT YOUR ADVISER
                </div>

                <div class="cansave-container">
                    <input type="button" class="cancel-button" value="Cancel" onclick="clearBoxes()">
                    <input type="submit" class="save-button" value="Save">
                </div>
            </form>
        </section>
    </main>
    <script>
        let initialCheckboxes = [];
        let initialStatus = [];

        document.addEventListener("DOMContentLoaded", function () {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            const statusCells = document.querySelectorAll('.table-data td:nth-child(4)'); // Assuming the status cell is the fourth cell in each row

            initialCheckboxes = Array.from(checkboxes).map(checkbox => checkbox.checked);
            initialStatus = Array.from(statusCells).map(cell => cell.textContent);

            checkboxes.forEach(function (checkbox, index) {
                checkbox.addEventListener("change", function () {
                    const statusCell = this.parentNode.nextElementSibling.nextElementSibling.nextElementSibling; // Assuming the status cell is the fourth cell in the row
                    const internID = this.value.split('-')[0];
                    const currentDate = this.checked ? new Date().toISOString().split('T')[0] : '';
                    const requirementName = this.value.split('-')[1];
                    const newStatus = this.checked ? "SUBMITTED" : "PENDING";

                    statusCell.textContent = newStatus;

                    updateStatusInDatabase(internID, currentDate, requirementName, newStatus);
                });
            });
        });

        function clearBoxes() {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            const statusCells = document.querySelectorAll('.table-data td:nth-child(4)'); // Assuming the status cell is the fourth cell in each row

            checkboxes.forEach(function (checkbox, index) {
                checkbox.checked = initialCheckboxes[index];
                statusCells[index].textContent = initialStatus[index];
            });
        }

        function updateStatusInDatabase(internID, currentDate, requirementName, newStatus) {
            const xhr = new XMLHttpRequest();

            xhr.open("POST", "../includes/updateStatus.php", true);
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

            const data = "internID=" + encodeURIComponent(internID) +
                "&currentDate=" + encodeURIComponent(currentDate) +
                "&requirementName=" + encodeURIComponent(requirementName) +
                "&newStatus=" + encodeURIComponent(newStatus);
            xhr.onload = function () {
                console.log(xhr.responseText);
            };

            xhr.send(data);
        }
    </script>


</body>
</html>