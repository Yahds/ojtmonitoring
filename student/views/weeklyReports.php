<?php 
    include("../includes/DataAccessObject.php");
    session_start();
    $db = new DAO();
    $reports = $db->getWeeklyReports($_SESSION['internid']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OJT Portal — Weekly Reports</title>
    <link rel="stylesheet" href="../css/requirements.css">
    <link rel="stylesheet" href="https://unicons.iconscout.com/release/v4.0.0/css/line.css" />
</head>
<body id="main">
    <header>
        <nav class="navbar">
            <div class="nav-logo">SAINT LOUIS UNIVERSITY</div>
            <div class="nav-name"> <?php echo htmlspecialchars($_SESSION['studentName'])?></div>
            <div class="nav-item">
                <img src="../images/jannsen.png" alt="Profile" class="profile-image">
            </div>
        </nav>
    </header>
    <main class="container">
        <aside class="left-nav">
            <ol>
                <li><a href="../dashboard.php">DASHBOARD</a></li>
                <li><a href="./requirements.php">REQUIREMENTS</a></li>
                <li><a href="./weeklyReports.php">WEEKLY REPORTS</a></li>
                <li><a href="./monthlyJournals.php">MONTHLY JOURNALS</a></li>
                <li><a href="#">ABOUT US</a></li>
            </ol>
            <form action="../includes/logoutController.php" method="post">
                <input type="submit" value="Logout">
            </form>
        </aside>
        <section>
            <div class="intern-list-container">
                <div class="table-label-filter">
                    <div class="title">WEEKLY REPORTS</div>
                </div>

                <div class="requirement-card" style="background:#fff;border:1px solid #e0ddd4;border-radius:8px;padding:16px;margin-bottom:20px;">
                    <strong style="color:#0D0464;font-size:16px;">Submit a weekly report</strong>
                    <form action="../includes/submitWeeklyReport.php" method="POST" enctype="multipart/form-data" style="margin-top:10px;display:grid;gap:8px;max-width:420px;">
                        <label>Week number</label>
                        <input type="number" name="weeknumber" min="1" required>
                        <label>Hours worked this week</label>
                        <input type="number" name="hours" min="0" required>
                        <label>What you worked on</label>
                        <textarea name="workdescription" rows="3" style="width:100%;box-sizing:border-box;"></textarea>
                        <label>Supervisor-signed report (PDF, JPG, PNG, DOC, DOCX)</label>
                        <input type="file" name="report_file" required>
                        <button type="submit">Submit report</button>
                    </form>
                </div>

                <?php foreach ($reports as $report): ?>
                    <div class="requirement-card" style="background:#fff;border:1px solid #e0ddd4;border-radius:8px;padding:16px;margin-bottom:14px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong style="color:#0D0464;font-size:16px;">Week <?php echo (int)$report['weeknumber']; ?> — <?php echo (int)$report['hours']; ?> hrs</strong>
                            <span style="font-weight:600;"><?php echo htmlspecialchars($report['status']); ?></span>
                        </div>
                        <?php if (!empty($report['workdescription'])): ?>
                            <p style="margin:8px 0;"><?php echo htmlspecialchars($report['workdescription']); ?></p>
                        <?php endif; ?>
                        <?php if (!empty($report['file_path'])): ?>
                            <p style="margin:8px 0;">File:<a href="../includes/downloadWeeklyReport.php?reportid=<?php echo (int)$report['reportid']; ?>">view</a></p>
                        <?php endif; ?>
                        <?php if (!empty($report['remark'])): ?>
                            <p style="color:#8a6d0f;margin:8px 0;"><em>Adviser: <?php echo htmlspecialchars($report['remark']); ?></em></p>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>

                <?php if (empty($reports)): ?>
                    <p>No weekly reports submitted yet.</p>
                <?php endif; ?>
            </div>
        </section>
    </main>
</body>
</html>
