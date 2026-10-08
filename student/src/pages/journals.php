<?php 
    requireDeployed();
    $db = new DAO();
    $journals = $db->getMonthlyJournals($_SESSION['internid']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OJT Portal — Monthly Journals</title>
    <link rel="stylesheet" href="/student/css/requirements.css">
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
                <li><a href="/student/dashboard">DASHBOARD</a></li>
                <li><a href="/student/requirements">REQUIREMENTS</a></li>
                <li><a href="/student/weekly-reports">WEEKLY REPORTS</a></li>
                <li><a href="/student/journals">MONTHLY JOURNALS</a></li>
                <li><a href="#">ABOUT US</a></li>
            </ol>
            <form action="/student/logout" method="post">
                <input type="submit" value="Logout">
            </form>
        </aside>
        <section>
            <div class="intern-list-container">
                <div class="table-label-filter">
                    <div class="title">MONTHLY JOURNALS</div>
                </div>

                <div class="requirement-card" style="background:#fff;border:1px solid #e0ddd4;border-radius:8px;padding:16px;margin-bottom:20px;">
                    <strong style="color:#0D0464;font-size:16px;">Submit a monthly journal</strong>
                    <form action="/student/journals" method="POST" enctype="multipart/form-data" style="margin-top:10px;display:grid;gap:8px;max-width:420px;">
                        <?php echo csrf_field(); ?>
                        <label>Month number</label>
                        <input type="number" name="monthnumber" min="1" required>
                        <label>Notes (optional)</label>
                        <textarea name="notes" rows="6" style="width:100%;box-sizing:border-box;"></textarea>
                        <label>Monthly journal file (required) — PDF, JPG, PNG, DOC, DOCX</label>
                        <input type="file" name="journal_file" required>
                        <button type="submit">Submit journal</button>
                    </form>
                </div>

                <?php foreach ($journals as $journal): ?>
                    <div class="requirement-card" style="background:#fff;border:1px solid #e0ddd4;border-radius:8px;padding:16px;margin-bottom:14px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong style="color:#0D0464;font-size:16px;">Month <?php echo (int)$journal['monthnumber']; ?></strong>
                            <span style="font-weight:600;"><?php echo htmlspecialchars($journal['status']); ?></span>
                        </div>
                        <?php if (!empty($journal['file_path'])): ?>
                            <p style="margin:8px 0;">File:<a href="/student/journals/file?journalid=<?php echo (int)$journal['journalid']; ?>">view</a></p>
                        <?php endif; ?>
                        <?php if (!empty($journal['notes'])): ?>
                            <p style="margin:8px 0;"><?php echo nl2br(htmlspecialchars($journal['notes'])); ?></p>
                        <?php endif; ?>
                        <?php if (!empty($journal['remark'])): ?>
                            <p style="color:#8a6d0f;margin:8px 0;"><em>Adviser: <?php echo htmlspecialchars($journal['remark']); ?></em></p>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>

                <?php if (empty($journals)): ?>
                    <p>No journals submitted yet.</p>
                <?php endif; ?>
            </div>
        </section>
    </main>
</body>
</html>
