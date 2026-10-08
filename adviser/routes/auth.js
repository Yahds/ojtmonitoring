const express = require('express');
const { authenticateAdviser } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { homeFor } = require('../middleware/currentUser');

const router = express.Router();

// the login page, logged-in users go straight to their home page
router.get(["/", "/ojt-login-page"], (req, res) => {
    if (req.session.isLoggedIn) {
        return res.redirect(homeFor(req.session.role));
    }
    res.render('ojt-login-page/index', { title: 'Log in' });
});

router.get('/logout', requireAuth, (req, res, next) => {
    req.session.destroy(err => {
        if (err) {
            return next(err);
        }
        res.redirect('/ojt-login-page');
    });
});

// handling of the post requst (authenticating advisor in login)
router.post("/ojt-login-page", async (req, res, next) => {
    const { adviserEmail, password } = req.body;

    try {
        const adviser = await authenticateAdviser(adviserEmail, password);
        if (adviser) {
            req.session.regenerate((err) => {
                if (err) {
                    return next(err);
                }
                req.session.adviserID = adviser.adviserID;
                req.session.isLoggedIn = true;
                req.session.role = adviser.role;
                req.session.name = adviser.adviserName;
                return res.redirect(homeFor(adviser.role));
            });
        } else {
            res.status(401).render('ojt-login-page/index', {
                title: 'Log in',
                error: 'Your email or password is wrong. Try again.',
                email: adviserEmail,
            });
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
