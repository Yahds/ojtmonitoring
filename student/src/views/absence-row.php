<?php
$date = $day['date'];
$absence = is_array($form['absences'][$date] ?? null) ? $form['absences'][$date] : [];
$picked = fn (string $field, string $value) => ($absence[$field] ?? '') === $value ? ' selected' : '';
$label = e(dayLabel($date));
?>
<tr>
    <th scope="row"><?= $label ?></th>
    <td data-label="Absent">
        <select class="input" name="absences[<?= $date ?>][part]" aria-label="<?= $label ?> absent">
            <option value="">Not absent</option>
            <?php foreach (ABSENCE_PARTS as $value => $text): ?>
                <option value="<?= $value ?>"<?= $picked('part', $value) ?>><?= e($text) ?></option>
            <?php endforeach; ?>
        </select>
    </td>
    <td data-label="Reason">
        <input class="input" type="text" name="absences[<?= $date ?>][reason]" maxlength="200" value="<?= e((string) ($absence['reason'] ?? '')) ?>" aria-label="<?= $label ?> reason">
    </td>
    <td class="time-pair" data-label="Proof">
        <?php if ($acceptsLetter): ?>
            <select class="input" name="absences[<?= $date ?>][proof_type]" aria-label="<?= $label ?> proof type">
                <option value="">Proof type</option>
                <?php foreach (PROOF_TYPES as $value => $text): ?>
                    <option value="<?= $value ?>"<?= $picked('proof_type', $value) ?>><?= e($text) ?></option>
                <?php endforeach; ?>
            </select>
        <?php endif; ?>
        <input class="input" type="file" name="absence_proof[<?= $date ?>]" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" aria-label="<?= $label ?> proof">
    </td>
</tr>
