<?php
requireDeployed();
$db = new DAO();
$reports = $db->getWeeklyReports($_SESSION['internid']);
$adviser = displayName($db->getInternProfile($_SESSION['internid'])['adviserName']);
$nextWeek = $reports ? max(array_column($reports, 'weeknumber')) + 1 : 1;
$title = 'Weekly reports';
require __DIR__ . '/../views/header.php';
?>
<h1 class="page-title">Weekly reports</h1>
<p class="muted">Submit one report per week with your supervisor's signature. PDF, JPG, PNG, DOC or DOCX, up to 5 MB.</p>

<h2 class="section-title">Submit a report</h2>
<section class="card card-pad">
    <form class="form" action="/student/weekly-reports" method="post" enctype="multipart/form-data">
        <?= csrf_field() ?>
        <div class="field">
            <label for="weeknumber">Week number</label>
            <input class="input" id="weeknumber" type="number" name="weeknumber" min="1" max="52" value="<?= (int) $nextWeek ?>" required>
        </div>
        <div class="field">
            <label for="hours">Hours worked this week</label>
            <input class="input" id="hours" type="number" name="hours" min="1" max="168" required>
        </div>
        <div class="field">
            <label for="workdescription">What you worked on <span class="muted">(optional)</span></label>
            <textarea class="input" id="workdescription" name="workdescription" rows="3" maxlength="500"></textarea>
        </div>
        <div class="field">
            <label for="report_file">Supervisor-signed report</label>
            <input class="input" id="report_file" type="file" name="report_file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required>
        </div>
        <div class="btn-row">
            <button class="btn btn-create btn-sm" type="submit">Submit report</button>
        </div>
    </form>
</section>

<h2 class="section-title">Your reports · <?= count($reports) ?></h2>
<section class="card">
    <?php if (!$reports): ?>
        <div class="empty"><b>No reports yet</b>Your submitted weekly reports and your adviser's remarks will show up here.</div>
    <?php endif; ?>
    <?php foreach ($reports as $report): ?>
        <article class="item">
            <div class="item-head">
                <h3>Week <?= (int) $report['weeknumber'] ?> · <?= (int) $report['hours'] ?> hrs</h3>
                <?php $status = $report['status']; require __DIR__ . '/../views/status-tag.php'; ?>
            </div>
            <p class="meta">
                Submitted <?= e($report['datesubmitted']) ?>
                <?php if ($report['file_path']): ?>
                    · <a href="/student/weekly-reports/file?reportid=<?= (int) $report['reportid'] ?>">View your file</a>
                <?php endif; ?>
            </p>
            <?php if ($report['workdescription']): ?>
                <p class="note"><?= e($report['workdescription']) ?></p>
            <?php endif; ?>
            <?php if ($report['remark']): ?>
                <div class="remark"><?= e($adviser) ?>: “<?= e($report['remark']) ?>”</div>
            <?php endif; ?>
        </article>
    <?php endforeach; ?>
</section>
<?php require __DIR__ . '/../views/footer.php'; ?>
