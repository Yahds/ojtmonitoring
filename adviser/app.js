require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 8080;

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

app.use('/ojt-images', express.static(path.join(__dirname, 'ojt-images')));
app.use('/ojt-about-us', express.static(path.join(__dirname, 'ojt-monitoring-files', 'ojt-about-us')))
app.use('/ojt-login-page', express.static(path.join(__dirname, 'ojt-monitoring-files', 'ojt-login-page')));
app.use('/ojt-dashboard', express.static(path.join(__dirname, 'ojt-monitoring-files', 'ojt-dashboard')))

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'ojt-monitoring-files'));

const adminRoutes = require('./routes/admin');
const internRoutes = require('./routes/interns');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const journalRoutes = require('./routes/journals');
const reportRoutes = require('./routes/reports');
const requirementRoutes = require('./routes/requirements');

app.use(adminRoutes);
app.use(internRoutes);
app.use(authRoutes);
app.use(dashboardRoutes);
app.use(journalRoutes);
app.use(reportRoutes);
app.use(requirementRoutes);

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running at port ${port}`);
    });
}

module.exports = app;
