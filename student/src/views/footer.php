    </main>
</div>
<?php
$icons = [
    'Dashboard' => '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    'Requirements' => '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
    'Weekly reports' => '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    'Journals' => '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
];
?>
<nav class="tabbar" aria-label="Main">
    <?php foreach ($nav as $link): ?>
        <a href="/student<?= e($link['href']) ?>"<?= $link['current'] ? ' aria-current="page"' : '' ?>>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><?= $icons[$link['label']] ?? '' ?></svg>
            <?= e($link['label']) ?>
        </a>
    <?php endforeach; ?>
</nav>
<dialog class="idle-dialog" id="idle-warning" aria-labelledby="idle-warning-title" data-keep-alive="/student/session/keep-alive">
    <h2 id="idle-warning-title">Are you still there?</h2>
    <p>You will be logged out in 2 minutes due to inactivity.</p>
    <div class="btn-row">
        <button class="btn btn-primary" type="button" data-stay-logged-in>Stay logged in</button>
    </div>
</dialog>
<script src="/assets/js/idle-warning.js" defer></script>
<script src="/assets/js/file-size.js" defer></script>
</body>
</html>
