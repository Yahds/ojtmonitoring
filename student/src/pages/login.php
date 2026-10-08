<?php
// the student login page; actions/login.php shows it again after a failed login
if (isset($_SESSION['internid'])) {
    redirect('/');
}
$title = 'Log in';
require __DIR__ . '/../views/head.php';
?>
<body>
<div class="login-wrap">
    <section class="login-art">
        <div class="brand"><img src="/assets/img/slu-logo.png" alt="" width="40">SLU OJT Portal</div>
        <div>
            <p class="art-title">Track your OJT from start to finish.</p>
            <p>Submit requirements, log your weekly hours, upload monthly journals and see your adviser's remarks.</p>
        </div>
        <p class="art-foot">Saint Louis University · School of Accountancy, Management, Computing and Information Studies</p>
    </section>

    <main class="login-form" id="main">
        <img class="login-logo" src="/assets/img/slu-logo.png" alt="Saint Louis University">
        <h1>Log in</h1>
        <p class="lead">For interns</p>
        <?php if (!empty($error)): ?>
            <div class="flash flash-error" role="alert"><?= e($error) ?></div>
        <?php endif; ?>
        <form class="form" action="/student/login" method="post">
            <?= csrf_field() ?>
            <div class="field">
                <label for="student-id">Student ID</label>
                <input class="input" id="student-id" name="id" inputmode="numeric" autocomplete="username" value="<?= e($studentId ?? '') ?>" required autofocus>
            </div>
            <div class="field">
                <label for="password">Password</label>
                <div class="pw">
                    <input class="input" id="password" type="password" name="password" autocomplete="current-password" required<?= !empty($error) ? ' aria-invalid="true"' : '' ?>>
                    <button class="btn btn-outline btn-sm" type="button" data-toggle-password="password" aria-pressed="false">Show</button>
                </div>
            </div>
            <button class="btn btn-primary big-btn" type="submit">Log in</button>
        </form>
        <p class="muted"><a href="/">Not an intern? Go back</a></p>
    </main>
</div>
<script src="/assets/js/show-password.js" defer></script>
</body>
</html>
