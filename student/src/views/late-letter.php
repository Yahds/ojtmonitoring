<?php if ($late): ?>
    <div class="field">
        <label for="late_letter">Late letter (optional)</label>
        <input class="input" id="late_letter" type="file" name="late_letter" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" aria-describedby="<?= isset($errors['late_letter']) ? 'late_letter-error' : 'late_letter-help' ?>">
        <?php if (isset($errors['late_letter'])): ?>
            <span class="error" id="late_letter-error"><?= e($errors['late_letter']) ?></span>
        <?php else: ?>
            <span class="help" id="late_letter-help">A letter explaining why the report is late, up to 5 MB.</span>
        <?php endif; ?>
    </div>
<?php endif; ?>
