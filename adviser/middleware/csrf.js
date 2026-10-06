const crypto = require('crypto');

// give each session random CSRF token and make it available to every page
function provideCsrfToken(req, res, next) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
}

module.exports = { provideCsrfToken };
