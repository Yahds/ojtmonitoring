<?php
requireLogin();
$hasPassword = internHasPassword($_SESSION['internid']);
$errors = $errors ?? [];
$title = 'Change password';
require __DIR__ . '/../views/header.php';
?>
<h1 class="page-title">Change password</h1>
<?php if (!$hasPassword): ?>
    <p class="muted">To change your SLU password, use your SLU account settings.</p>
<?php else: ?>
<section class="card card-pad">
    <form class="form" action="/student/account/password" method="post">
        <?= csrf_field() ?>
        <div class="field">
            <label for="current-password">Current password</label>
            <input class="input" id="current-password" type="password" name="currentPassword" autocomplete="current-password" required<?= isset($errors['currentPassword']) ? ' aria-invalid="true" aria-describedby="current-password-error"' : '' ?>>
            <?php if (isset($errors['currentPassword'])): ?>
                <span class="error" id="current-password-error"><?= e($errors['currentPassword']) ?></span>
            <?php endif; ?>
        </div>
        <div class="field">
            <label for="new-password">New password</label>
            <input class="input" id="new-password" type="password" name="newPassword" autocomplete="new-password" required aria-describedby="new-password-help<?= isset($errors['newPassword']) ? ' new-password-error' : '' ?>"<?= isset($errors['newPassword']) ? ' aria-invalid="true"' : '' ?>>
            <span class="help" id="new-password-help">At least 15 characters.</span>
            <?php if (isset($errors['newPassword'])): ?>
                <span class="error" id="new-password-error"><?= e($errors['newPassword']) ?></span>
            <?php endif; ?>
        </div>
        <div class="field">
            <label for="confirm-password">Type the new password again</label>
            <input class="input" id="confirm-password" type="password" name="confirmPassword" autocomplete="new-password" required<?= isset($errors['confirmPassword']) ? ' aria-invalid="true" aria-describedby="confirm-password-error"' : '' ?>>
            <?php if (isset($errors['confirmPassword'])): ?>
                <span class="error" id="confirm-password-error"><?= e($errors['confirmPassword']) ?></span>
            <?php endif; ?>
        </div>
        <div class="btn-row">
            <button class="btn btn-primary" type="submit">Change password</button>
        </div>
    </form>
</section>
<?php endif; ?>
<?php require __DIR__ . '/../views/footer.php'; ?>
