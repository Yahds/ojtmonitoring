<?php
$title = 'Withdrawn from OJT';
require __DIR__ . '/../views/head.php';
?>
<body>
<main id="main">
    <section class="card error-page">
        <img src="/assets/img/slu-logo.png" alt="">
        <h1>You were withdrawn from the OJT</h1>
        <p>Your records are kept. If you think this is a mistake, contact your OJT adviser.</p>
        <form action="/student/logout" method="post">
            <?= csrf_field() ?>
            <button class="btn btn-primary" type="submit">Log out</button>
        </form>
    </section>
</main>
</body>
</html>
