<?php
requireLogin();
$profile = getInternProfile($_SESSION['internid']);
$endorsement = getEndorsement($_SESSION['internid']);
$current = currentOjtStep($_SESSION['status'], $profile['companyid'] !== null, getCompanyChoices($_SESSION['internid']) !== [], $endorsement['status'] ?? null);
$title = 'How OJT works';
require __DIR__ . '/../views/header.php';
?>
<h1 class="page-title">How OJT works</h1>
<p class="muted">The steps from enrolling to finishing your OJT. Ask your adviser, <?= e(displayName($profile['adviserName'])) ?>, if you get stuck.</p>

<section class="card">
    <ol class="steps">
        <?php foreach (OJT_STEPS as $index => $step): ?>
            <?php $number = $index + 1; ?>
            <li class="card-pad"<?= $number === $current ? ' aria-current="step"' : '' ?>>
                <div class="item-head">
                    <p><b><?= $number ?>. <?= e($step['title']) ?></b></p>
                    <?php if ($number < $current): ?>
                        <span class="tag tag-ok">Done</span>
                    <?php elseif ($number === $current): ?>
                        <span class="tag tag-warn">You are here</span>
                    <?php endif; ?>
                </div>
                <p class="muted"><?= e($step['text']) ?></p>
                <?php if ($number === $current): ?>
                    <div class="btn-row">
                        <a class="btn btn-create btn-sm" href="/student<?= e($step['href']) ?>">Go to this step</a>
                    </div>
                <?php endif; ?>
            </li>
        <?php endforeach; ?>
    </ol>
</section>
<?php require __DIR__ . '/../views/footer.php'; ?>
