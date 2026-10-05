const express = require('express');
const { fetchStudents, authenticateAdviser } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// run node app.js then access http://localhost:8080/ojt-login-page/
router.get("/", async (req, res) => {
    try {
        if (req.session.isLoggedIn) {

            res.redirect('/ojt-dashboard');
        }

        const students = await fetchStudents();
        res.render('ojt-login-page/', { students })
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

// run node app.js then access http://localhost:8080/ojt-login-page/
router.get("/ojt-login-page", async (req, res) => {
    try {
        if (req.session.isLoggedIn) {

            res.redirect('/ojt-dashboard');
        }

        const students = await fetchStudents();
        res.render('ojt-login-page/index', { students })
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

router.get('/logout', requireAuth, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log("A problem occured while logging out: " + err.message)
        }
        console.log("pakilog out")
        res.redirect('/ojt-login-page');
    });
});

// handling of the post requst (authenticating advisor in login)
router.post("/ojt-login-page", async (req, res) => {
    const { adviserEmail, password } = req.body;

    try {
        const adviser = await authenticateAdviser(adviserEmail, password);
        if (adviser) {
            req.session.adviserID = adviser.adviserID;
            req.session.isLoggedIn = true;
            req.session.role = adviser.role;
            if (adviser.role === 'dept_head'){
                res.redirect('/ojt-admin');
            } else {
                res.redirect('/ojt-dashboard');
            }
        } else {
            res.status(401).send('false'); // Send back a simple 'false' string
        }
    } catch (error) {
        console.error('Error authenticating adviser:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

module.exports = router;
