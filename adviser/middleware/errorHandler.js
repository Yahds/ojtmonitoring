// eslint-disable-next-line no-unused-vars
function handleErrors(err, req, res, next) {
    console.error(`${req.method} ${req.originalUrl} failed:`, err);
    res.status(500).send('Warning: Internal Server Error');
}

module.exports = { handleErrors };
