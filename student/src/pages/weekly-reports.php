<?php
requireDeployed(true);
$reports = getWeeklyReports($_SESSION['internid']);
$profile = getInternProfile($_SESSION['internid']);
$adviser = displayName($profile['adviserName']);
$supervisor = getSupervisor($_SESSION['internid']);
$approvedHours = getApprovedHours($_SESSION['internid']);
$now = $profile['deployedOn']
    ? reportingWeek($profile['deployedOn'], getDueRules($profile['adviserid']), getReportedWeeks($_SESSION['internid']), date('Y-m-d'))
    : null;
$form = $form ?? ['days' => [], 'accomplishment' => ''];
$errors = $errors ?? [];
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
<?php $days = reportDays($now['range']); ?>
<h2 class="section-title">Week <?= (int) $now['week'] ?> report</h2>
<section class="card card-pad">
    <p class="meta"><?= e(weekLabel($now['range'])) ?><?= $profile['companyname'] ? ' · ' . e($profile['companyname']) : '' ?> · due <?= e($now['due']->format('l, M j')) ?>, 12 noon</p>
    <?php if ($errors): ?>
        <div class="flash flash-error" role="alert">Please fix the items marked below. Attach the signed copy again too.</div>
    <?php endif; ?>
    <form class="form form-wide" action="/student/weekly-reports" method="post" enctype="multipart/form-data" data-time-record data-draft="weekly-draft-<?= (int) $_SESSION['internid'] ?>-<?= (int) $now['week'] ?>">
        <?= csrf_field() ?>
        <fieldset class="field" aria-describedby="<?= isset($errors['days']) ? 'days-error' : 'days-help' ?>">
            <legend class="label">Detailed time record</legend>
            <span class="help" id="days-help">Enter your morning and afternoon times separately, so lunch isn't counted. Leave a day empty if you didn't work.</span>
            <?php if (isset($errors['days'])): ?>
                <span class="error" id="days-error"><?= e($errors['days']) ?></span>
            <?php endif; ?>
            <div class="table-wrap">
                <table class="time-table">
                    <thead><tr><th scope="col">Date</th><th scope="col">Morning</th><th scope="col">Afternoon</th><th scope="col">Hours</th></tr></thead>
                    <tbody>
                        <?php foreach (array_filter($days, fn ($day) => !$day['weekend']) as $day): ?>
                            <?php require __DIR__ . '/../views/time-row.php'; ?>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <button class="btn btn-outline btn-sm" type="button" data-copy-days hidden>Copy first day to empty weekdays</button>
            <?php $weekend = array_filter($days, fn ($day) => $day['weekend']); ?>
            <?php $weekendFilled = (bool) array_filter(array_column($weekend, 'date'), fn ($date) => array_filter($form['days'][$date] ?? [])); ?>
            <details<?= $weekendFilled ? ' open' : '' ?>>
                <summary class="link-btn">Worked on the weekend?</summary>
                <div class="table-wrap">
                    <table class="time-table">
                        <tbody>
                            <?php foreach ($weekend as $day): ?>
                                <?php require __DIR__ . '/../views/time-row.php'; ?>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </details>
        </fieldset>
        <div class="field">
            <label for="accomplishment">Work accomplishment</label>
            <textarea class="input" id="accomplishment" name="accomplishment" rows="4" maxlength="2000" required<?= isset($errors['accomplishment']) ? ' aria-invalid="true" aria-describedby="accomplishment-error"' : '' ?>><?= e($form['accomplishment']) ?></textarea>
            <?php if (isset($errors['accomplishment'])): ?>
                <span class="error" id="accomplishment-error"><?= e($errors['accomplishment']) ?></span>
            <?php endif; ?>
        </div>
        <div class="field">
            <span class="label">Supervisor</span>
            <?php if ($supervisor): ?>
                <p><?= e($supervisor['supervisorname']) ?><?= $supervisor['position'] ? ' · ' . e($supervisor['position']) : '' ?> · <a href="/student/supervisor">Change</a></p>
            <?php else: ?>
                <p class="error">Add your supervisor before you submit. <a href="/student/supervisor">Add supervisor</a></p>
            <?php endif; ?>
        </div>
        <div class="field">
            <label for="report_file">Signed copy of this form</label>
            <input class="input" id="report_file" type="file" name="report_file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required aria-describedby="<?= isset($errors['report_file']) ? 'report_file-error' : 'report_file-help' ?>">
            <?php if (isset($errors['report_file'])): ?>
                <span class="error" id="report_file-error"><?= e($errors['report_file']) ?></span>
            <?php else: ?>
                <span class="help" id="report_file-help">Photo or PDF of the form your supervisor signed, up to 5 MB.</span>
            <?php endif; ?>
        </div>
        <p class="note">
            This week: <b><output data-week-total>0</output> hours</b> · Approved so far: <b><?= e(hoursText($approvedHours)) ?> of <?= (int) $profile['target_hours'] ?> hours</b><br>
            This week's hours count toward your total after your adviser approves the report.
        </p>
        <div class="btn-row">
            <button class="btn btn-create" type="submit"<?= $supervisor ? '' : ' disabled' ?>>Submit week <?= (int) $now['week'] ?></button>
        </div>
    </form>
</section>
<script src="/assets/js/time-record.js" defer></script>
<?php endif; ?>

<h2 class="section-title">Your reports · <?= count($reports) ?></h2>
<section class="card">
    <?php if (!$reports): ?>
        <div class="empty"><b>No reports yet</b>Your submitted weekly reports and your adviser's remarks will show up here.</div>
    <?php endif; ?>
    <?php foreach ($reports as $report): ?>
        <article class="item">
            <div class="item-head">
                <h3>Week <?= (int) $report['weeknumber'] ?> · <?= e(hoursText($report['hours'])) ?> hours</h3>
                <?php $status = $report['status']; require __DIR__ . '/../views/status-tag.php'; ?>
            </div>
            <p class="meta">
                <?php if ($profile['deployedOn'] && $report['week_start']): ?>
                    <?= e(weekLabel(weekRange($profile['deployedOn'], (int) $report['weeknumber']))) ?> ·
                <?php endif; ?>
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
