<?php
requireLogin();
$db = new DAO();
$groups = groupRequirements($db->getRequirements($_SESSION['internid']));
$adviser = displayName($db->getInternProfile($_SESSION['internid'])['adviserName']);
$title = 'Requirements';
require __DIR__ . '/../views/header.php';
?>
<h1 class="page-title">Requirements</h1>
<p class="muted">PDF, JPG, PNG, DOC or DOCX, up to 5 MB. Only you and your adviser can open your files.</p>

<h2 class="section-title">Needs your action · <?= count($groups['action']) ?></h2>
<section class="card">
    <?php if (!$groups['action']): ?>
        <div class="empty"><b>Nothing to submit right now</b>Requirements you still need to send will show up here.</div>
    <?php endif; ?>
    <?php foreach ($groups['action'] as $requirement): ?>
        <article class="item">
            <div class="item-head">
                <h3><?= e($requirement->reqName) ?></h3>
                <?php if ($requirement->status === 'REJECTED'): ?>
                    <span class="tag tag-bad">Needs changes</span>
                <?php else: ?>
                    <span class="tag">Not submitted</span>
                <?php endif; ?>
            </div>
            <?php if ($requirement->remarks): ?>
                <div class="remark"><?= e($adviser) ?>: “<?= e($requirement->remarks) ?>”</div>
            <?php endif; ?>
            <?php $buttonLabel = $requirement->status === 'REJECTED' ? 'Submit again' : 'Submit'; ?>
            <?php require __DIR__ . '/../views/requirement-form.php'; ?>
        </article>
    <?php endforeach; ?>
</section>

<h2 class="section-title">Waiting for your adviser · <?= count($groups['waiting']) ?></h2>
<section class="card">
    <?php if (!$groups['waiting']): ?>
        <div class="empty"><b>Nothing waiting</b>After you submit, a requirement waits here until your adviser checks it.</div>
    <?php endif; ?>
    <?php foreach ($groups['waiting'] as $requirement): ?>
        <article class="item">
            <div class="item-head">
                <h3><?= e($requirement->reqName) ?></h3>
                <span class="tag tag-warn">Submitted</span>
            </div>
            <p class="meta">
                Submitted <?= e($requirement->dateSubmitted) ?>
                <?php if ($requirement->filePath): ?>
                    · <a href="/student/requirements/file?reqid=<?= (int) $requirement->reqID ?>">View your file</a>
                <?php endif; ?>
            </p>
            <?php if ($requirement->internRemarks): ?>
                <p class="note">Your note: <?= e($requirement->internRemarks) ?></p>
            <?php endif; ?>
            <details>
                <summary class="link-btn">Replace the file or change your note</summary>
                <?php $buttonLabel = 'Submit again'; ?>
                <?php require __DIR__ . '/../views/requirement-form.php'; ?>
            </details>
        </article>
    <?php endforeach; ?>
</section>

<h2 class="section-title">Approved · <?= count($groups['approved']) ?></h2>
<section class="card">
    <?php if (!$groups['approved']): ?>
        <div class="empty"><b>None approved yet</b>Approved requirements are locked and listed here.</div>
    <?php endif; ?>
    <?php foreach ($groups['approved'] as $requirement): ?>
        <article class="item">
            <div class="item-head">
                <h3><?= e($requirement->reqName) ?></h3>
                <span class="tag tag-ok">Approved</span>
            </div>
            <p class="meta">
                Locked, approved by <?= e($adviser) ?>
                <?php if ($requirement->filePath): ?>
                    · <a href="/student/requirements/file?reqid=<?= (int) $requirement->reqID ?>">View your file</a>
                <?php endif; ?>
            </p>
        </article>
    <?php endforeach; ?>
</section>
<?php require __DIR__ . '/../views/footer.php'; ?>
