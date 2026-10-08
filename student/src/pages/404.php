<?php
$title = 'Page not found';
$home = isset($_SESSION['internid']) ? '/student/' : '/student/login';
require __DIR__ . '/../views/head.php';
?>
<body>
<main id="main">
    <section class="card error-page">
        <img src="/assets/img/slu-logo.png" alt="">
        <h1>Page not found</h1>
        <p>The page or file you are looking for does not exist, or you do not have access to it.</p>
        <a class="btn btn-primary" href="<?= $home ?>">Go to home page</a>
    </section>
</main>
</body>
</html>
