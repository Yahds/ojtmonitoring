const express = require('express');
const { authenticateAdviser, findAdviserByEmail } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { homeFor } = require('../middleware/currentUser');
const { startLogin, finishLogin } = require('../lib/sso');
const { audit } = require('../lib/audit');

const router = express.Router();

function showLogin(res, status, error, email) {
    res.status(status).render('ojt-login-page/index', { title: 'Log in', error, email });
}

// a new session id on every login, so an old one cannot be reused
function startSession(req, res, next, adviser, how) {
    req.session.regenerate(async (err) => {
        if (err) {
            return next(err);
        }
        req.session.adviserID = adviser.adviserID;
        req.session.isLoggedIn = true;
        req.session.role = adviser.role;
        req.session.name = adviser.adviserName;
        req.session.mustChangePassword = adviser.must_change_password === 1;
        req.session.lastSeen = Date.now();
        try {
            await audit(req, 'login', how);
        } catch (error) {
            return next(error);
        }
        res.redirect(homeFor(adviser.role));
    });
}

// the login page, logged-in users go straight to their home page
router.get('/login', (req, res) => {
    if (req.session.isLoggedIn) {
        return res.redirect(homeFor(req.session.role));
    }
    res.render('ojt-login-page/index', { title: 'Log in' });
});

router.post('/logout', requireAuth, async (req, res, next) => {
    try {
        await audit(req, 'logout');
    } catch (error) {
        return next(error);
    }
    req.session.destroy(err => {
        if (err) {
            return next(err);
        }
        res.redirect('/adviser/login');
    });
});

router.post('/login', async (req, res, next) => {
    const { adviserEmail, password } = req.body;
    try {
        const adviser = await authenticateAdviser(adviserEmail, password);
        if (!adviser) {
            await audit(req, 'login_failed', adviserEmail);
            return showLogin(res, 401, 'Your email or password is wrong. After 5 wrong tries, please wait for 15 minutes and try again.', adviserEmail);
        }
        startSession(req, res, next, adviser, 'password');
    } catch (error) {
        next(error);
    }
});

router.get('/sso/start', async (req, res) => {
    try {
        const { url, pending } = await startLogin();
        req.session.ssoPending = pending;
        res.redirect(url);
    } catch (error) {
        console.warn('SLU sign-in is not available:', error.message);
        showLogin(res, 503, 'SLU sign-in is not available right now. Log in with your portal password instead.');
    }
});

router.get('/sso/callback', async (req, res, next) => {
    const pending = req.session.ssoPending;
    delete req.session.ssoPending;
    if (!pending) {
        return showLogin(res, 400, 'Your SLU sign-in expired or was not started here. Please try again.');
    }

    let email;
    try {
        email = await finishLogin(req.originalUrl, pending);
    } catch (error) {
        console.warn('SLU sign-in failed:', error.message);
        return showLogin(res, 400, 'Sign-in with your SLU account did not finish. Please try again.');
    }

    try {
        const adviser = email ? await findAdviserByEmail(email) : null;
        if (!adviser) {
            await audit(req, 'login_refused', email);
            return showLogin(res, 403, 'Your SLU account is not registered in the OJT Portal. Ask your department head to add you.');
        }
        startSession(req, res, next, adviser, 'slu');
    } catch (error) {
        next(error);
    }
});

// the idle warning calls this when the adviser clicks "Stay logged in"
router.get('/session/keep-alive', requireAuth, (req, res) => {
    res.status(204).end();
});

module.exports = router;
