const IDLE_LIMIT_MS = 30 * 60 * 1000;

// logs people out after 30 minutes without a request
function idleTimeout(req, res, next) {
    if (!req.session.isLoggedIn) {
        return next();
    }
    const now = Date.now();
    if (now - req.session.lastSeen > IDLE_LIMIT_MS) {
        return req.session.regenerate((err) => {
            if (err) {
                return next(err);
            }
            req.flash('info', 'You were logged out after 30 minutes without activity. Please log in again.');
            res.redirect('/adviser/login');
        });
    }
    req.session.lastSeen = now;
    next();
}

module.exports = { idleTimeout };
