require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 8080;

app.disable('x-powered-by');
app.use(bodyParser.urlencoded({ extended: true }));
// for session handling
app.use(session({
    secret: process.env.SESSION_SECRET, // A secret key for signing the session ID cookie
    resave: false,              // Forces the session to be saved back to the session store
    saveUninitialized: false,    // set to false so it doesn't save empty sessions for users who never login
    cookie: { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }   // Set true if using HTTPS, false otherwise
}));

// this is so static folders only serve stylesheets and images, not page templates or code
const PUBLIC_FILE = /\.(css|png|jpe?g)$/i;

function publicFiles(folder) {
    const serveFolder = express.static(folder);
    return (req, res, next) => {
        if (PUBLIC_FILE.test(req.path)) {
            return serveFolder(req, res, next);
        }
        return next();
    };
}

app.use('/ojt-images', publicFiles(path.join(__dirname, 'ojt-images')));
app.use('/ojt-about-us', publicFiles(path.join(__dirname, 'ojt-monitoring-files', 'ojt-about-us')));
app.use('/ojt-login-page', publicFiles(path.join(__dirname, 'ojt-monitoring-files', 'ojt-login-page')));
app.use('/ojt-dashboard', publicFiles(path.join(__dirname, 'ojt-monitoring-files', 'ojt-dashboard')));

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'ojt-monitoring-files'));

const { provideCsrfToken, verifyCsrf } = require('./middleware/csrf');
const { currentUser } = require('./middleware/currentUser');
const { flash } = require('./middleware/flash');
const homeRoutes = require('./routes/home');
const adminRoutes = require('./routes/admin');
const internRoutes = require('./routes/interns');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const journalRoutes = require('./routes/journals');
const reportRoutes = require('./routes/reports');
const requirementRoutes = require('./routes/requirements');
const { notFound, handleErrors } = require('./middleware/errorHandler');

app.use(provideCsrfToken);
app.use(verifyCsrf);
app.use(currentUser);
app.use(flash);
app.use(homeRoutes);
app.use('/adviser', adminRoutes);
app.use('/adviser', internRoutes);
app.use('/adviser', authRoutes);
app.use('/adviser', dashboardRoutes);
app.use('/adviser', journalRoutes);
app.use('/adviser', reportRoutes);
app.use('/adviser', requirementRoutes);
app.use(notFound);
app.use(handleErrors);

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running at port ${port}`);
    });
}

module.exports = app;
