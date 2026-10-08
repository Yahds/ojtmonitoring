// to block requests that are not logged in
function requireAuth(req, res, next) {
    if (req.session.isLoggedIn) {
        return next();
    }
    return res.redirect('/adviser/login');
}

// allows one role or a list of roles
function requireRole(roles) {
    const allowed = [].concat(roles);
    return function (req, res, next) {
        if (!req.session.isLoggedIn) {
            return res.redirect('/adviser/login');
        }
        if (!allowed.includes(req.session.role)) {
            return res.status(403).render('error', {
                title: 'No access',
                heading: 'You do not have access to this page',
                message: 'Use the menu to go back to your own pages.',
            });
        }
        return next();
    };
}

// adviser pages: advisers, and dept heads who also handle interns
const requireAdviser = requireRole(['adviser', 'dept_head']);

module.exports = { requireAuth, requireRole, requireAdviser };