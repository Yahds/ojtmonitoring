require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');

const { sessionStore } = require('./db/sessionStore');
const { ssoEnabled } = require('./lib/sso');
const { statusOf } = require('./lib/statuses');
const { provideCsrfToken, verifyCsrf } = require('./middleware/csrf');
const { currentUser } = require('./middleware/currentUser');
const { flash } = require('./middleware/flash');
const { idleTimeout } = require('./middleware/idleTimeout');
const { requirePasswordChange } = require('./middleware/auth');
const { notFound, handleErrors } = require('./middleware/errorHandler');
const { parseAttachment } = require('./lib/attachments');
const { parseClassListUpload } = require('./lib/class-list');

const homeRoutes = require('./routes/home');
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const dashboardRoutes = require('./routes/dashboard');
const internRoutes = require('./routes/interns');
const classListRoutes = require('./routes/class-list');
const requirementRoutes = require('./routes/requirements');
const deadlineRoutes = require('./routes/deadlines');
const customRequirementRoutes = require('./routes/custom-requirements');
const reviewRoutes = require('./routes/review');
const settingsRoutes = require('./routes/settings');
const reportRoutes = require('./routes/reports');
const journalRoutes = require('./routes/journals');
const endorsementRoutes = require('./routes/endorsements');
const companyRoutes = require('./routes/companies');
const finishRoutes = require('./routes/finish');
const withdrawRoutes = require('./routes/withdraw');
const announcementRoutes = require('./routes/announcements');
const adminRoutes = require('./routes/admin');

const app = express();
const port = process.env.PORT || 8080;

// settings
app.disable('x-powered-by');
app.set('trust proxy', 1); // nginx sits in front, so the visitor's address comes from X-Forwarded-For
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'ojt-monitoring-files'));
app.locals.ssoEnabled = ssoEnabled();
app.locals.statusOf = statusOf;

// serve only stylesheets and images
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

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    name: 'adviser.sid',
    resave: false,
    saveUninitialized: false, // no session row for visitors who never log in
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS-only cookie once hosted
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000,
    },
}));
app.use(provideCsrfToken);
app.use('/adviser/announcements', parseAttachment); // file forms are multipart, so read them before the CSRF check
app.use('/adviser/interns/import', parseClassListUpload);
app.use(verifyCsrf);
app.use(currentUser);
app.use(flash);
app.use(idleTimeout);
app.use(requirePasswordChange);

// pages
app.use(homeRoutes);
app.use('/adviser', authRoutes, accountRoutes, settingsRoutes, dashboardRoutes, reviewRoutes, classListRoutes, internRoutes,
    customRequirementRoutes, requirementRoutes, deadlineRoutes, reportRoutes, journalRoutes, endorsementRoutes, companyRoutes, finishRoutes, withdrawRoutes, announcementRoutes, adminRoutes);

app.use(notFound);
app.use(handleErrors);

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running at port ${port}`);
    });
}

module.exports = app;
