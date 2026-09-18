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
            <div class="nav-name"> <?php echo htmlspecialchars($_SESSION['studentName'])?></div>
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
            <div class="intern-list-container">
                <div class="table-label-filter">
                    <div class="title">REQUIREMENTS</div>
                </div>

                <?php foreach ($requirements as $requirement): ?>
                    <div class="requirement-card" style="background:#fff;border:1px solid #e0ddd4;border-radius:8px;padding:16px;margin-bottom:14px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong style="color:#0D0464;font-size:16px;"><?php echo htmlspecialchars($requirement->reqName); ?></strong>
                            <span style="font-weight:600;"><?php echo htmlspecialchars($requirement->status); ?></span>
                        </div>

                        <?php if (!empty($requirement->remarks)): ?>
                            <p style="color:#8a6d0f;margin:8px 0;"><em>Adviser: <?php echo htmlspecialchars($requirement->remarks); ?></em></p>
                        <?php endif; ?>

                        <?php if (!empty($requirement->filePath)): ?>
                            <p style="margin:8px 0;">Submitted file:
                                <a href="../includes/downloadRequirement.php?reqid=<?php echo (int)$requirement->reqID; ?>">view</a>
                            </p>
                        <?php endif; ?>

                        <form action="../includes/submitRequirement.php" method="POST" enctype="multipart/form-data" style="margin-top:10px;">
                            <input type="hidden" name="reqid" value="<?php echo (int)$requirement->reqID; ?>">
                            <label>Your remarks</label>
                            <textarea name="intern_remarks" rows="2" style="width:100%;box-sizing:border-box;"><?php echo htmlspecialchars($requirement->internRemarks ?? ''); ?></textarea>
                            <div style="margin-top:8px;">
                                <input type="file" name="requirement_file">
                                <button type="submit">Submit</button>
                            </div>
                        </form>
                    </div>
                <?php endforeach; ?>

                <?php if (empty($requirements)): ?>
                    <p>No requirements assigned yet.</p>
                <?php endif; ?>
            </div>
        </section>
    </main>
</body>
</html>