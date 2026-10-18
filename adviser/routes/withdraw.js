const express = require('express');
const { WITHDRAWABLE, fetchInternForAdviser, withdrawIntern, undoWithdraw } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');
const { statusOf } = require('../lib/statuses');

const router = express.Router();

const REASONS = [
    'No endorsement reply form from the company',
    'Not enrolled in the OJT course',
    'Company withdrew the offer',
    'Student stopped the OJT',
    'Other',
];

async function showWithdrawForm(req, res, next, status, values, errors) {
    const intern = await fetchInternForAdviser(req.params.internId, req.session.adviserID);
    if (!intern) {
        return next();
    }
    if (!WITHDRAWABLE.includes(intern.status)) {
        req.flash('info', `${intern.studentName} is ${statusOf('intern', intern.status).label.toLowerCase()}, so they cannot be withdrawn.`);
        return res.redirect('/adviser/interns');
    }
    res.status(status).render('pages/withdraw', { title: 'Withdraw intern', intern, reasons: REASONS, values, errors });
}

router.get('/interns/:internId/withdraw', requireAdviser, async (req, res, next) => {
    try {
        await showWithdrawForm(req, res, next, 200, {}, {});
    } catch (error) {
        next(error);
    }
});

router.post('/interns/:internId/withdraw', requireAdviser, async (req, res, next) => {
    const { internId } = req.params;
    const reason = typeof req.body.reason === 'string' ? req.body.reason : '';
    const details = typeof req.body.details === 'string' ? req.body.details.trim() : '';
    const values = { reason, details };

    try {
        const errors = {};
        if (!REASONS.includes(reason)) {
            errors.reason = 'Select a reason.';
        }
        if (reason === 'Other' && details === '') {
            errors.details = 'Write the reason.';
        }
        if (details.length > 200) {
            errors.details = 'Use 200 characters or fewer.';
        }
        if (Object.keys(errors).length > 0) {
            return await showWithdrawForm(req, res, next, 400, values, errors);
        }

        const fullReason = details ? `${reason}: ${details}` : reason;
        if (!(await withdrawIntern(internId, req.session.adviserID, fullReason))) {
            req.flash('error', 'This intern can no longer be withdrawn.');
            return res.redirect('/adviser/interns');
        }
        await audit(req, 'intern_withdrawn', internId);
        req.flash('success', 'Intern withdrawn. You can undo this from the interns list.');
        res.redirect('/adviser/interns');
    } catch (error) {
        next(error);
    }
});

router.post('/interns/:internId/undo-withdraw', requireAdviser, async (req, res, next) => {
    const { internId } = req.params;
    try {
        if (await undoWithdraw(internId, req.session.adviserID)) {
            await audit(req, 'withdraw_undone', internId);
            req.flash('success', 'Withdrawal undone. The intern is back where they were.');
        } else {
            req.flash('error', 'This intern is not withdrawn.');
        }
        res.redirect('/adviser/interns');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
