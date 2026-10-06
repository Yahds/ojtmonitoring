const express = require('express');
const { fetchStudents, authenticateAdviser } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// run node app.js then access http://localhost:8080/ojt-login-page/
router.get("/", async (req, res, next) => {
    try {
        if (req.session.isLoggedIn) {
            return res.redirect('/ojt-dashboard');
        }

        const students = await fetchStudents();
        res.render('ojt-login-page/', { students })
    } catch (error) {
        next(error);
    }
});

// run node app.js then access http://localhost:8080/ojt-login-page/
router.get("/ojt-login-page", async (req, res, next) => {
    try {
        if (req.session.isLoggedIn) {
            return res.redirect('/ojt-dashboard');
        }

        const students = await fetchStudents();
        res.render('ojt-login-page/index', { students })
    } catch (error) {
        next(error);
    }
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
                if (adviser.role === 'dept_head') {
                    return res.redirect('/ojt-admin');
                }
                return res.redirect('/ojt-dashboard');
            });
        } else {
            res.status(401).send('false'); // Send back a simple 'false' string
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
