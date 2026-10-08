<?php
requireLogin();
if ($_SESSION['status'] === 'ACTIVE') {
    redirect('/dashboard');
}
$db = new DAO();
$profile = $db->getInternProfile($_SESSION['internid']);
$companies = $db->getCompanies();
$summary = summarize($db->getRequirements($_SESSION['internid']), []);
$todoCount = count($summary['todo']);
$title = 'Choose company';
require __DIR__ . '/../views/header.php';
?>
<h1 class="page-title">Welcome, <?= e(displayName($profile['studentName'])) ?></h1>
<p class="muted">To be deployed, select your company and complete your requirements. Your adviser reviews both.</p>

<h2 class="section-title">Step 1 · Company</h2>
<section class="card card-pad">
    <?php if ($profile['companyname']): ?>
        <div class="item-head">
            <p><b><?= e($profile['companyname']) ?></b></p>
            <span class="tag tag-warn">Waiting for approval</span>
        </div>
        <p class="muted">Your adviser will confirm this company. You can still change it until then.</p>
    <?php endif; ?>
    <form class="form" action="/student/choose-company" method="post">
        <?= csrf_field() ?>
        <div class="field">
            <label for="companyid"><?= $profile['companyname'] ? 'Change company' : 'Company where you were accepted' ?></label>
            <select class="input" id="companyid" name="companyid" required>
                <option value="">Select a company</option>
                <?php foreach ($companies as $company): ?>
                    <option value="<?= (int) $company['companyid'] ?>" <?= (int) $company['companyid'] === (int) $profile['companyid'] ? 'selected' : '' ?>>
                        <?= e($company['companyname']) ?> · <?= e($company['companyaddress']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="btn-row">
            <button class="btn btn-create btn-sm" type="submit">Save company</button>
        </div>
    </form>
</section>

<h2 class="section-title">Step 2 · Requirements</h2>
<section class="card card-pad">
    <p>
        <b><?= $summary['requirementsApproved'] ?> of <?= $summary['requirementsTotal'] ?></b> requirements approved
        <?php if ($todoCount > 0): ?>
            · <?= $todoCount ?> <?= $todoCount === 1 ? 'needs' : 'need' ?> your action
        <?php endif; ?>
    </p>
    <div class="btn-row">
        <a class="btn btn-create btn-sm" href="/student/requirements">View requirements</a>
    </div>
</section>
<?php require __DIR__ . '/../views/footer.php'; ?>
