const express = require('express');
const { homeFor } = require('../middleware/currentUser');

const router = express.Router();

// landing page: choose student or adviser login; logged-in advisers go to their home page
router.get('/', (req, res) => {
    if (req.session.isLoggedIn) {
        return res.redirect(homeFor(req.session.role));
    }
    res.render('home', { title: 'Welcome' });
});

module.exports = router;
