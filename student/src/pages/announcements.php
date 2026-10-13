<?php
// open to every status, so interns still onboarding see their adviser's posts too
requireLogin();
$announcements = getAnnouncementsForIntern($_SESSION['internid']);
$title = 'Announcements';
require __DIR__ . '/../views/header.php';
?>
<h1 class="page-title">Announcements</h1>
<p class="muted">Posts from your adviser to your section.</p>

<section class="card">
    <?php if (!$announcements): ?>
        <div class="empty"><b>No announcements yet</b>Posts from your adviser will show up here.</div>
    <?php endif; ?>
    <?php foreach ($announcements as $announcement): ?>
        <article class="item">
            <h3><?= e($announcement['subject']) ?></h3>
            <p class="meta"><?= e((string) $announcement['date']) ?><?= $announcement['edited'] ? ' · Edited' : '' ?></p>
            <p><?= e($announcement['message']) ?></p>
        </article>
    <?php endforeach; ?>
</section>
<?php require __DIR__ . '/../views/footer.php'; ?>
