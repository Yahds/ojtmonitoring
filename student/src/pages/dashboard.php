<?php
requireDeployed();
$profile = getInternProfile($_SESSION['internid']);
$summary = summarize(getRequirements($_SESSION['internid']), getWeeklyReports($_SESSION['internid']));
$announcements = getAnnouncementsForIntern($_SESSION['internid']);
$target = targetHoursFor($profile['course']);
$adviser = displayName($profile['adviserName']);
$todoCount = count($summary['todo']);
$title = 'Dashboard';
require __DIR__ . '/../views/header.php';
?>
<div class="dash">
    <div class="dash-main">
        <section class="card hero">
            <div class="hero-banner" role="img" aria-label="Saint Louis University campus"></div>
            <div class="hero-body">
                <img src="/assets/img/slu-logo.png" alt="Saint Louis University crest">
                <div>
                    <h1 class="hero-name"><?= e(displayName($profile['studentName'])) ?></h1>
                    <div class="hero-divider"></div>
                    <div class="hero-meta">
                        Intern · <?= e($profile['course']) ?> · Section <?= e($profile['classcode']) ?> · <?= e($profile['companyname'] ?? 'No company yet') ?>
                    </div>
                </div>
                <div class="clock">
                    <div><div class="k">Time</div><div class="v" id="clock-time">&nbsp;</div></div>
                    <div><div class="k">Date</div><div class="v" id="clock-date">&nbsp;</div></div>
                </div>
            </div>
        </section>

        <section class="card">
            <div class="card-head">
                <h2>To do <span class="sub"><?= $todoCount ?> <?= $todoCount === 1 ? 'thing' : 'things' ?></span></h2>
            </div>
            <?php if ($todoCount === 0): ?>
                <div class="empty"><b>You are all caught up</b>Nothing needs your action right now.</div>
            <?php else: ?>
                <ul class="todo">
                    <?php foreach ($summary['todo'] as $requirement): ?>
                        <li>
                            <div>
                                <?php if ($requirement->status === 'REJECTED'): ?>
                                    <b><?= e($requirement->reqName) ?> needs changes</b>
                                    <?php if ($requirement->remarks): ?>
                                        <div class="remark"><?= e($adviser) ?>: “<?= e($requirement->remarks) ?>”</div>
                                    <?php endif; ?>
                                <?php else: ?>
                                    <b><?= e($requirement->reqName) ?></b>
                                    <span class="d">Not submitted yet</span>
                                <?php endif; ?>
                            </div>
                            <a class="btn btn-outline btn-sm" href="/student/requirements">
                                <?= $requirement->status === 'REJECTED' ? 'Upload new version' : 'Upload' ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
        </section>

        <section class="prog" aria-label="Progress">
            <div class="card">
                <div class="k">Approved hours</div>
                <div class="big"><?= $summary['approvedHours'] ?><?php if ($target): ?> <small>/ <?= $target ?></small><?php endif; ?></div>
                <?php if ($target): ?>
                    <div class="bar"><span style="width: <?= min(100, round($summary['approvedHours'] / $target * 100)) ?>%"></span></div>
                    <div class="d">
                        <?= $summary['approvedHours'] >= $target ? 'Target reached' : ($target - $summary['approvedHours']) . ' hours to go' ?>
                        · <?= $summary['waitingHours'] ?> hours waiting for review
                    </div>
                <?php endif; ?>
            </div>
            <div class="card">
                <div class="k">Weekly reports</div>
                <div class="big"><?= $summary['reportsApproved'] ?> <small>approved</small></div>
                <div class="d"><?= $summary['reportsWaiting'] ?> waiting for review</div>
            </div>
            <div class="card">
                <div class="k">Requirements</div>
                <div class="big"><?= $summary['requirementsApproved'] ?> <small>/ <?= $summary['requirementsTotal'] ?> approved</small></div>
                <div class="d"><?= $summary['requirementsWaiting'] ?> waiting · <?= $summary['requirementsNeedChanges'] ?> need changes</div>
            </div>
        </section>
    </div>

    <aside class="dash-side" aria-label="Adviser and announcements">
        <section class="card card-pad">
            <h2 class="section-title">Your adviser</h2>
            <div class="person">
                <b><?= e($adviser) ?></b>
                <span><?= e($profile['adviserEmail']) ?></span>
            </div>
        </section>

        <section class="card">
            <div class="card-head"><h2>Announcements</h2></div>
            <?php if (!$announcements): ?>
                <div class="empty"><b>No announcements yet</b>Posts from your adviser will show up here.</div>
            <?php endif; ?>
            <?php foreach ($announcements as $announcement): ?>
                <article class="item">
                    <h3><?= e($announcement['subject']) ?></h3>
                    <p class="meta"><?= e((string) $announcement['date']) ?></p>
                    <p><?= e($announcement['message']) ?></p>
                </article>
            <?php endforeach; ?>
        </section>
    </aside>
</div>
<script src="/assets/js/clock.js" defer></script>
<?php require __DIR__ . '/../views/footer.php'; ?>
