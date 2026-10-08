// lets a route save a message before a redirect and next page shows it once
function flash(req, res, next) {
    req.flash = (type, text) => {
        req.session.flash = { type, text };
    };
    res.locals.flash = req.session.flash;
    delete req.session.flash;
    next();
}

module.exports = { flash };
