<?php
requireDeployed();
$supervisor = getSupervisor($_SESSION['internid']);
$values = $form ?? [
    'name' => $supervisor['supervisorname'] ?? '',
    'email' => $supervisor['supervisoremail'] ?? '',
    'position' => $supervisor['position'] ?? '',
];
$errors = $errors ?? [];
$title = 'Supervisor';
require __DIR__ . '/../views/header.php';
?>
<p class="crumb"><a href="/student/dashboard">Dashboard</a> / Supervisor</p>
<h1 class="page-title">Your supervisor</h1>
<p class="muted">The person at the company who checks your work and signs your weekly reports. Update this if your supervisor changes.</p>

<section class="card card-pad">
    <form class="form" action="/student/supervisor" method="post">
        <?= csrf_field() ?>
        <div class="field">
            <label for="supervisor-name">Full name</label>
            <input class="input" id="supervisor-name" name="name" maxlength="100" value="<?= e($values['name']) ?>" required<?= isset($errors['name']) ? ' aria-invalid="true" aria-describedby="supervisor-name-error"' : '' ?>>
            <?php if (isset($errors['name'])): ?>
                <span class="error" id="supervisor-name-error"><?= e($errors['name']) ?></span>
            <?php endif; ?>
        </div>
        <div class="field">
            <label for="supervisor-email">Email</label>
            <input class="input" id="supervisor-email" type="email" name="email" maxlength="255" value="<?= e($values['email']) ?>" required<?= isset($errors['email']) ? ' aria-invalid="true" aria-describedby="supervisor-email-error"' : '' ?>>
            <?php if (isset($errors['email'])): ?>
                <span class="error" id="supervisor-email-error"><?= e($errors['email']) ?></span>
            <?php endif; ?>
        </div>
        <div class="field">
            <label for="supervisor-position">Position <span class="muted">(optional)</span></label>
            <input class="input" id="supervisor-position" name="position" maxlength="100" value="<?= e($values['position']) ?>"<?= isset($errors['position']) ? ' aria-invalid="true" aria-describedby="supervisor-position-error"' : '' ?>>
            <?php if (isset($errors['position'])): ?>
                <span class="error" id="supervisor-position-error"><?= e($errors['position']) ?></span>
            <?php endif; ?>
        </div>
        <div class="btn-row">
            <button class="btn btn-create" type="submit">Save supervisor</button>
            <a class="btn btn-outline" href="/student/dashboard">Cancel</a>
        </div>
    </form>
</section>
<?php require __DIR__ . '/../views/footer.php'; ?>
