<?php
requireDeployed();
$db = new DAO();
$journals = $db->getMonthlyJournals($_SESSION['internid']);
$adviser = displayName($db->getInternProfile($_SESSION['internid'])['adviserName']);
$nextMonth = $journals ? max(array_column($journals, 'monthnumber')) + 1 : 1;
$title = 'Journals';
require __DIR__ . '/../views/header.php';
?>
<h1 class="page-title">Monthly journals</h1>
<p class="muted">Submit one journal for each month of your OJT.</p>

<h2 class="section-title">Submit a journal</h2>
<section class="card card-pad">
    <form class="form" action="/student/journals" method="post" enctype="multipart/form-data">
        <?= csrf_field() ?>
        <div class="field">
            <label for="monthnumber">Month number</label>
            <input class="input" id="monthnumber" type="number" name="monthnumber" min="1" max="12" value="<?= (int) min($nextMonth, 12) ?>" required>
        </div>
        <div class="field">
            <label for="notes">Notes to your adviser <span class="muted">(optional)</span></label>
            <textarea class="input" id="notes" name="notes" rows="4" maxlength="2000"></textarea>
        </div>
        <div class="field">
            <label for="journal_file">Journal file</label>
            <input class="input" id="journal_file" type="file" name="journal_file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" aria-describedby="journal_file-help" required>
            <span class="help" id="journal_file-help">PDF, JPG, PNG, DOC or DOCX, up to 5 MB.</span>
        </div>
        <div class="btn-row">
            <button class="btn btn-create btn-sm" type="submit">Submit journal</button>
        </div>
    </form>
</section>

<h2 class="section-title">Your journals · <?= count($journals) ?></h2>
<section class="card">
    <?php if (!$journals): ?>
        <div class="empty"><b>No journals yet</b>Your submitted journals and your adviser's remarks will show up here.</div>
    <?php endif; ?>
    <?php foreach ($journals as $journal): ?>
        <article class="item">
            <div class="item-head">
                <h3>Month <?= (int) $journal['monthnumber'] ?></h3>
                <?php $status = $journal['status']; require __DIR__ . '/../views/status-tag.php'; ?>
            </div>
            <p class="meta">
                Submitted <?= e($journal['datesubmitted']) ?>
                <?php if ($journal['file_path']): ?>
                    · <a href="/student/journals/file?journalid=<?= (int) $journal['journalid'] ?>">View your file</a>
                <?php endif; ?>
            </p>
            <?php if ($journal['notes']): ?>
                <p class="note"><?= nl2br(e($journal['notes'])) ?></p>
            <?php endif; ?>
            <?php if ($journal['remark']): ?>
                <div class="remark"><?= e($adviser) ?>: “<?= e($journal['remark']) ?>”</div>
            <?php endif; ?>
        </article>
    <?php endforeach; ?>
</section>
<?php require __DIR__ . '/../views/footer.php'; ?>
