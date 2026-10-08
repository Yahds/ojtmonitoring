<?php
// top of every logged-in student page; set $title before including this file
$nav = navFor($_SESSION['status'] ?? '', normalizePath($_SERVER['REQUEST_URI']));
$flash = takeFlash();
$name = displayName($_SESSION['studentName'] ?? '');
?>
<?php require __DIR__ . '/head.php'; ?>
<body class="has-tabbar">
<a class="skip-link" href="#main">Skip to content</a>
<header class="navbar">
    <a class="nav-logo" href="/student/">SLU OJT Portal</a>
    <div class="nav-user">
        <span class="nav-name"><?= e($name) ?><span class="nav-role"> · Intern</span></span>
        <details class="profile-menu">
            <summary aria-label="Profile menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>
            </summary>
            <div class="menu">
                <div class="who"><b><?= e($name) ?></b><span>Intern · <?= e((string) ($_SESSION['id'] ?? '')) ?></span></div>
                <form action="/student/logout" method="post">
                    <?= csrf_field() ?>
                    <button type="submit">Log out</button>
                </form>
            </div>
        </details>
    </div>
</header>
<div class="shell">
    <nav class="sidebar" aria-label="Main">
        <?php foreach ($nav as $link): ?>
            <a href="/student<?= e($link['href']) ?>"<?= $link['current'] ? ' aria-current="page"' : '' ?>><?= e($link['label']) ?></a>
        <?php endforeach; ?>
        <form class="logout-form" action="/student/logout" method="post">
            <?= csrf_field() ?>
            <button class="logout-btn" type="submit">Log out</button>
        </form>
    </nav>
    <main class="content" id="main">
        <?php if ($flash): ?>
            <div class="flash flash-<?= e($flash['type']) ?>" role="<?= $flash['type'] === 'error' ? 'alert' : 'status' ?>"><?= e($flash['text']) ?></div>
        <?php endif; ?>
