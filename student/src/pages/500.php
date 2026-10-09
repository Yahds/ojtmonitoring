<?php
$title = 'Something went wrong';
$home = isset($_SESSION['internid']) ? '/student/' : '/student/login';
require __DIR__ . '/../views/head.php';
?>
<body>
<main id="main">
    <section class="card error-page">
        <img src="/assets/img/slu-logo.png" alt="">
        <h1>Something went wrong</h1>
        <p>Please try again. This error has been recorded.</p>
        <p class="muted">Error code: <?= e($errorId) ?></p>
        <a class="btn btn-primary" href="<?= $home ?>">Go to home page</a>
    </section>
</main>
</body>
</html>
