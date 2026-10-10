const express = require('express');
const { changeAdviserPassword, endOtherSessions } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { homeFor } = require('../middleware/currentUser');
const { passwordProblem } = require('../lib/passwords');
const { audit } = require('../lib/audit'); 

const router = express.Router();

function showForm(req, res, status, errors) {
    res.status(status).render('account/change-password', {
        title: 'Change password',
        mustChange: req.session.mustChangePassword,
        errors,
    });
}

router.get('/account/password', requireAuth, (req, res) => {
    showForm(req, res, 200, {});
});

router.post('/account/password', requireAuth, async (req, res, next) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const problem = passwordProblem(newPassword);
    if (problem) {
        return showForm(req, res, 400, { newPassword: problem });
    }
    if (newPassword !== confirmPassword) {
        return showForm(req, res, 400, { confirmPassword: 'The two new passwords do not match.' });
    }

    try {
        const changed = await changeAdviserPassword(req.session.adviserID, currentPassword, newPassword);
        if (!changed) {
            return showForm(req, res, 400, { currentPassword: 'Your current password is wrong.' });
        }
        req.session.mustChangePassword = false;
        await endOtherSessions(req.session.adviserID, req.sessionID);
        await audit(req, 'password_changed');
        req.flash('success', 'Your password has been changed.');
        res.redirect(homeFor(req.session.role));
    } catch (error) {
        next(error);
    }
});

module.exports = router;