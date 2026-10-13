<?php
requireLogin();
if ($_SESSION['status'] === 'ACTIVE') {
    redirect('/dashboard');
}
$profile = getInternProfile($_SESSION['internid']);
$companies = getCompanies();
$summary = summarize(getRequirements($_SESSION['internid']), []);
$todoCount = count($summary['todo']);
$endorsement = getEndorsement($_SESSION['internid']);
$values = $form ?? $endorsement ?? [];
$errors = $errors ?? [];
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

<?php if ($profile['companyname']): ?>
<h2 class="section-title">Step 2 · Endorsement form</h2>
<section class="card card-pad">
    <?php if ($endorsement && $endorsement['status'] === 'SENT'): ?>
        <div class="item-head">
            <p><b>Endorsement letter sent</b> to <?= e($endorsement['contact_name']) ?></p>
            <span class="tag tag-warn">Waiting for the company's reply</span>
        </div>
        <p class="muted">You are officially accepted once the company sends back the reply form.</p>
    <?php elseif ($endorsement && $endorsement['status'] === 'ACCEPTED'): ?>
        <div class="item-head">
            <p><b>Reply form received</b> from <?= e($profile['companyname']) ?></p>
            <span class="tag tag-ok">Accepted</span>
        </div>
    <?php else: ?>
        <?php if ($endorsement): ?>
            <p><span class="tag tag-warn">Waiting for your adviser</span></p>
        <?php endif; ?>
        <p class="muted">Your adviser uses this to prepare your endorsement letter and sends it to the company.</p>
        <form class="form" action="/student/endorsement" method="post">
            <?= csrf_field() ?>
            <div class="field">
                <label for="contact-name">Contact person at the company</label>
                <input class="input" id="contact-name" name="contact_name" maxlength="100" value="<?= e($values['contact_name'] ?? '') ?>" required<?= isset($errors['contact_name']) ? ' aria-invalid="true" aria-describedby="contact-name-error"' : '' ?>>
                <?php if (isset($errors['contact_name'])): ?>
                    <span class="error" id="contact-name-error"><?= e($errors['contact_name']) ?></span>
                <?php endif; ?>
            </div>
            <div class="field">
                <label for="contact-email">Their email</label>
                <input class="input" id="contact-email" type="email" name="contact_email" maxlength="255" value="<?= e($values['contact_email'] ?? '') ?>" required<?= isset($errors['contact_email']) ? ' aria-invalid="true" aria-describedby="contact-email-error"' : '' ?>>
                <?php if (isset($errors['contact_email'])): ?>
                    <span class="error" id="contact-email-error"><?= e($errors['contact_email']) ?></span>
                <?php endif; ?>
            </div>
            <div class="field">
                <label for="position">Your position or department <span class="muted">(optional)</span></label>
                <input class="input" id="position" name="position" maxlength="100" value="<?= e($values['position'] ?? '') ?>"<?= isset($errors['position']) ? ' aria-invalid="true" aria-describedby="position-error"' : '' ?>>
                <?php if (isset($errors['position'])): ?>
                    <span class="error" id="position-error"><?= e($errors['position']) ?></span>
                <?php endif; ?>
            </div>
            <div class="field">
                <label for="start-date">Expected start date <span class="muted">(optional)</span></label>
                <input class="input" id="start-date" type="date" name="start_date" value="<?= e($values['start_date'] ?? '') ?>"<?= isset($errors['start_date']) ? ' aria-invalid="true" aria-describedby="start-date-error"' : '' ?>>
                <?php if (isset($errors['start_date'])): ?>
                    <span class="error" id="start-date-error"><?= e($errors['start_date']) ?></span>
                <?php endif; ?>
            </div>
            <div class="btn-row">
                <button class="btn btn-create btn-sm" type="submit"><?= $endorsement ? 'Update form' : 'Send to adviser' ?></button>
            </div>
        </form>
    <?php endif; ?>
</section>
<?php endif; ?>

<h2 class="section-title">Step 3 · Requirements</h2>
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
