const crypto = require('crypto');

// any URL that no route answered
function notFound(req, res) {
    res.status(404).render('error', {
        title: 'Page not found',
        heading: 'Page not found',
        message: 'The page you are looking for does not exist or was moved.',
    });
}

// any error a route passed to next(error)
function handleErrors(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }
    const errorId = crypto.randomBytes(4).toString('hex');
    console.error(`[${errorId}] ${req.method} ${req.originalUrl} failed:`, err);
    res.status(500).render('error', {
        title: 'Something went wrong',
        heading: 'Something went wrong',
        message: 'Please try again. If it keeps happening, send this error code to your OJT coordinator.',
        errorId,
    });
}

module.exports = { notFound, handleErrors };
