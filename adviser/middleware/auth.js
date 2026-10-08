// to block requests that are not logged in
function requireAuth(req, res, next) {
    if (req.session.isLoggedIn) {
        return next();
    }
    return res.redirect('/ojt-login-page');
}

function requireRole(role){
    return function(req, res, next){
        if (!req.session.isLoggedIn){
            return res.redirect('/ojt-login-page');
        }
        if (req.session.role !== role) {
            return res.status(403).render('error', {
                title: 'No access',
                heading: 'You do not have access to this page',
                message: 'Use the menu to go back to your own pages.',
            });
        }
        return next();
    }
}

module.exports = { requireAuth, requireRole };