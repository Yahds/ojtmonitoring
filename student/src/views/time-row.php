<?php
$date = $day['date'];
$value = fn (string $field) => e((string) ($form['days'][$date][$field] ?? ''));
$label = e(dayLabel($date));
?>
<tr data-day>
    <th scope="row"><?= $label ?></th>
    <td class="time-pair" data-label="Morning">
        <input class="input" type="time" name="days[<?= $date ?>][am_in]" value="<?= $value('am_in') ?>" aria-label="<?= $label ?> morning start">
        <span aria-hidden="true">–</span>
        <input class="input" type="time" name="days[<?= $date ?>][am_out]" value="<?= $value('am_out') ?>" aria-label="<?= $label ?> morning end">
    </td>
    <td class="time-pair" data-label="Afternoon">
        <input class="input" type="time" name="days[<?= $date ?>][pm_in]" value="<?= $value('pm_in') ?>" aria-label="<?= $label ?> afternoon start">
        <span aria-hidden="true">–</span>
        <input class="input" type="time" name="days[<?= $date ?>][pm_out]" value="<?= $value('pm_out') ?>" aria-label="<?= $label ?> afternoon end">
    </td>
    <td class="num" data-label="Hours" data-day-hours>–</td>
</tr>
