const express = require('express');
const { fetchWeeklyDueDays, setWeeklyDueDays } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');

const router = express.Router();

const DUE_CHOICES = [
    { days: 3, label: 'The Monday after the week, 12 noon' },
    { days: 5, label: 'The Wednesday after the week, 12 noon' },
    { days: 10, label: 'The Monday a week later, 12 noon' },
];

router.get('/settings', requireAdviser, async (req, res, next) => {
    try {
        const weeklyDueDays = await fetchWeeklyDueDays(req.session.adviserID);
        res.render('ojt-dashboard/views/settings', { title: 'OJT settings', weeklyDueDays, dueChoices: DUE_CHOICES });
    } catch (error) {
        next(error);
    }
});

router.post('/settings', requireAdviser, async (req, res, next) => {
    try {
        const weeklyDueDays = Number(req.body.weeklyDueDays);
        if (!DUE_CHOICES.some(choice => choice.days === weeklyDueDays)) {
            req.flash('error', 'Choose when weekly reports are due.');
            return res.redirect('/adviser/settings');
        }
        if (weeklyDueDays !== await fetchWeeklyDueDays(req.session.adviserID)) {
            await setWeeklyDueDays(req.session.adviserID, weeklyDueDays);
            await audit(req, 'settings_changed', `weekly reports due ${weeklyDueDays} days after the week`);
        }
        req.flash('success', 'Settings saved. If you changed the due date, consider posting an announcement so your interns know.');
        res.redirect('/adviser/settings');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
