<?php
$invalid = fn (string $field) => isset($errors[$field]) ? " aria-invalid=\"true\" aria-describedby=\"$field-error\"" : '';
$error = fn (string $field) => isset($errors[$field]) ? '<span class="error" id="' . $field . '-error">' . e($errors[$field]) . '</span>' : '';
?>
<form class="form" action="/student/weekly-reports/no-work" method="post" enctype="multipart/form-data">
    <?= csrf_field() ?>
    <fieldset class="field"<?= isset($errors['no_work_reason']) ? ' aria-describedby="no_work_reason-error"' : '' ?>>
        <legend class="label">Why</legend>
        <?= $error('no_work_reason') ?>
        <?php foreach (NO_WORK_REASONS as $value => $text): ?>
            <label class="check-row">
                <input type="radio" name="no_work_reason" value="<?= $value ?>" required<?= ($form['no_work_reason'] ?? '') === $value ? ' checked' : '' ?>>
                <?= e($text) ?>
            </label>
        <?php endforeach; ?>
    </fieldset>
    <div class="field">
        <label for="details">Details</label>
        <textarea class="input" id="details" name="details" rows="3" maxlength="500" required<?= $invalid('details') ?>><?= e($form['details'] ?? '') ?></textarea>
        <?= $error('details') ?>
    </div>
    <div class="field">
        <label for="proof_file">Proof (optional)</label>
        <input class="input" id="proof_file" type="file" name="proof_file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" aria-describedby="<?= isset($errors['proof_file']) ? 'proof_file-error' : 'proof_file-help' ?>">
        <?php if (isset($errors['proof_file'])): ?>
            <?= $error('proof_file') ?>
        <?php else: ?>
            <span class="help" id="proof_file-help">For example, a notice from the company. Up to 5 MB.</span>
        <?php endif; ?>
    </div>
    <p class="note">Your adviser checks it. Absences on work days still go in a normal report with proof.</p>
    <div class="btn-row">
        <button class="btn btn-create" type="submit">Send for week <?= (int) $now['week'] ?></button>
    </div>
</form>
