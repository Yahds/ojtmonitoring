<?php
// due date of one requirement, with Overdue or Sent late; expects $requirement
$deadlineTags = ['OVERDUE' => ['tag-bad', 'Overdue'], 'LATE' => ['tag-warn', 'Sent late']];
?>
<?php if ($requirement->dueLabel): ?>
    <p class="meta">
        Due <?= e($requirement->dueLabel) ?>
        <?php if (isset($deadlineTags[$requirement->deadline])): ?>
            <span class="tag <?= $deadlineTags[$requirement->deadline][0] ?>"><?= $deadlineTags[$requirement->deadline][1] ?></span>
        <?php endif; ?>
    </p>
<?php endif; ?>
