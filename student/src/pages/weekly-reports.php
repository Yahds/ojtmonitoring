<?php
requireDeployed(true);
$reports = getWeeklyReports($_SESSION['internid']);
$profile = getInternProfile($_SESSION['internid']);
$adviser = displayName($profile['adviserName']);
$now = $profile['deployedOn']
    ? reportingWeek($profile['deployedOn'], getDueRules($profile['adviserid']), getReportedWeeks($_SESSION['internid']), date('Y-m-d'))
    : null;
$title = 'Weekly reports';
require __DIR__ . '/../views/header.php';
?>
<h1 class="page-title">Weekly reports</h1>
<p class="muted">Submit one report per week with your supervisor's signature.</p>

<?php if ($_SESSION['status'] === 'ACTIVE' && $now === null): ?>
<section class="card card-pad">
    <p class="muted">Your start date isn't recorded yet, so your weeks can't be counted. Please ask <?= e($adviser) ?> to check your deployment.</p>
</section>
<?php elseif ($_SESSION['status'] === 'ACTIVE' && $now['week'] === null): ?>
<section class="card card-pad">
    <p><b>You're up to date.</b> Your next report opens on <?= e($now['opensOn']->format('l, M j')) ?>.</p>
</section>
<?php elseif ($_SESSION['status'] === 'ACTIVE'): ?>
<h2 class="section-title">Week <?= (int) $now['week'] ?> report</h2>
<section class="card card-pad">
    <p class="meta"><?= e(weekLabel($now['range'])) ?><?= $profile['companyname'] ? ' · ' . e($profile['companyname']) : '' ?> · due <?= e($now['due']->format('l, M j')) ?>, 12 noon</p>
    <form class="form" action="/student/weekly-reports" method="post" enctype="multipart/form-data">
        <?= csrf_field() ?>
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
            <input class="input" id="report_file" type="file" name="report_file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" aria-describedby="report_file-help" required>
            <span class="help" id="report_file-help">PDF, JPG, PNG, DOC or DOCX, up to 5 MB.</span>
        </div>
        <div class="btn-row">
            <button class="btn btn-create btn-sm" type="submit">Submit week <?= (int) $now['week'] ?></button>
        </div>
    </form>
</section>
<?php endif; ?>

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
