<?php
// open to every status, so interns still onboarding see their adviser's posts too
requireLogin();
$search = substr(trim((string) ($_GET['q'] ?? '')), 0, 100);
$list = findAnnouncementsForIntern($_SESSION['internid'], $search, (int) ($_GET['page'] ?? 1));
// keeps the search when moving between pages
$pageHref = fn (int $page) => '/student/announcements?' . http_build_query($search !== '' ? ['q' => $search, 'page' => $page] : ['page' => $page]);
$title = 'Announcements';
require __DIR__ . '/../views/header.php';
?>
<h1 class="page-title">Announcements</h1>
<p class="muted">Posts from your adviser to your section.</p>

<section class="card">
    <div class="card-head">
        <h2>Posts <span class="sub"><?= $list['total'] ?> <?= $list['total'] === 1 ? 'post' : 'posts' ?><?= $search !== '' ? ' matching "' . e($search) . '"' : '' ?></span></h2>
    </div>
    <form class="search-row" action="/student/announcements" method="get" role="search">
        <div class="field">
            <label for="q">Search posts</label>
            <input class="input" id="q" type="search" name="q" value="<?= e($search) ?>" maxlength="100" placeholder="Subject or message">
        </div>
        <button class="btn btn-outline" type="submit">Search</button>
        <?php if ($search !== ''): ?>
            <a class="btn btn-outline" href="/student/announcements">Clear</a>
        <?php endif; ?>
    </form>
    <?php if (!$list['announcements'] && $search !== ''): ?>
        <div class="empty"><b>No posts match "<?= e($search) ?>"</b>Check the spelling or try fewer words.</div>
    <?php elseif (!$list['announcements']): ?>
        <div class="empty"><b>No announcements yet</b>Posts from your adviser will show up here.</div>
    <?php endif; ?>
    <?php foreach ($list['announcements'] as $announcement): ?>
        <article class="item">
            <h3><?= e($announcement['subject']) ?></h3>
            <p class="meta"><?= e((string) $announcement['date']) ?><?= $announcement['edited'] ? ' · Edited' : '' ?></p>
            <p><?= e($announcement['message']) ?></p>
            <?php if ($announcement['file_name']): ?>
                <p><a href="/student/announcements/file?id=<?= (int) $announcement['announcementid'] ?>"><?= e($announcement['file_name']) ?></a></p>
            <?php endif; ?>
        </article>
    <?php endforeach; ?>
    <?php if ($list['pages'] > 1): ?>
        <nav class="pager" aria-label="Pages">
            <?php if ($list['page'] > 1): ?>
                <a href="<?= e($pageHref($list['page'] - 1)) ?>" rel="prev">Previous</a>
            <?php else: ?>
                <span></span>
            <?php endif; ?>
            <span>Page <?= $list['page'] ?> of <?= $list['pages'] ?></span>
            <?php if ($list['page'] < $list['pages']): ?>
                <a href="<?= e($pageHref($list['page'] + 1)) ?>" rel="next">Next</a>
            <?php else: ?>
                <span></span>
            <?php endif; ?>
        </nav>
    <?php endif; ?>
</section>
<?php require __DIR__ . '/../views/footer.php'; ?>
