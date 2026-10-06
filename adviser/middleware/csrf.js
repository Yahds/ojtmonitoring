const crypto = require('crypto');

// give each session random CSRF token and make it available to every page
function provideCsrfToken(req, res, next) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
}

// rejects any request that changes data unless it carries session's CSRF token
function verifyCsrf(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    const sent = req.body.csrf_token || req.get('X-CSRF-Token');
    if (!sent || !tokensMatch(sent, req.session.csrfToken)) {
        return res.status(403).send('Invalid CSRF token');
    }
    next();
}

// compares two tokens and takes same time
function tokensMatch(sent, expected) {
    const a = Buffer.from(String(sent));
    const b = Buffer.from(String(expected));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { provideCsrfToken, verifyCsrf };
