<?php // the review status of a weekly report or journal; expects $status ?>
<?php if ($status === 'APPROVED'): ?>
    <span class="tag tag-ok">Approved</span>
<?php elseif ($status === 'REJECTED'): ?>
    <span class="tag tag-bad">Needs changes</span>
<?php else: ?>
    <span class="tag tag-warn">Waiting for review</span>
<?php endif; ?>
