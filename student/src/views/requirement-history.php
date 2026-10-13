<?php
// earlier versions of one requirement; expects $requirement and $versions (from getRequirementVersions)
$earlier = array_slice($versions[$requirement->reqID] ?? [], 1);
$labels = ['APPROVED' => 'Approved', 'REJECTED' => 'Needs changes'];
?>
<?php if ($earlier): ?>
    <details>
        <summary class="link-btn">Earlier versions (<?= count($earlier) ?>)</summary>
        <?php foreach ($earlier as $version): ?>
            <p class="meta">
                Version <?= (int) $version['version_no'] ?> · <?= e($version['submitted']) ?> · <?= e($labels[$version['decision']] ?? 'Replaced') ?>
                <?php if ($version['has_file']): ?>
                    · <a href="/student/requirements/version-file?reqid=<?= (int) $requirement->reqID ?>&amp;version=<?= (int) $version['version_no'] ?>">View file</a>
                <?php endif; ?>
            </p>
            <?php if ($version['remarks']): ?>
                <div class="remark"><?= e($adviser) ?>: “<?= e($version['remarks']) ?>”</div>
            <?php endif; ?>
        <?php endforeach; ?>
    </details>
<?php endif; ?>
