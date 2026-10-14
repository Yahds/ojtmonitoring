const express = require('express');
const { fetchWeeklyDueDays, setWeeklyDueDays, fetchAcceptsParentLetter, setAcceptsParentLetter } = require('../db');
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
        const [weeklyDueDays, acceptsParentLetter] = await Promise.all([
            fetchWeeklyDueDays(req.session.adviserID),
            fetchAcceptsParentLetter(req.session.adviserID),
        ]);
        res.render('ojt-dashboard/views/settings', { title: 'OJT settings', weeklyDueDays, acceptsParentLetter, dueChoices: DUE_CHOICES });
    } catch (error) {
        next(error);
    }
});

router.post('/settings', requireAdviser, async (req, res, next) => {
    try {
        const adviserID = req.session.adviserID;
        const weeklyDueDays = Number(req.body.weeklyDueDays);
        const { absenceProof } = req.body;
        if (!DUE_CHOICES.some(choice => choice.days === weeklyDueDays)) {
            req.flash('error', 'Choose when weekly reports are due.');
            return res.redirect('/adviser/settings');
        }
        if (absenceProof !== 'MEDICAL' && absenceProof !== 'LETTER') {
            req.flash('error', 'Choose which proof you accept for absences.');
            return res.redirect('/adviser/settings');
        }
        if (weeklyDueDays !== await fetchWeeklyDueDays(adviserID)) {
            await setWeeklyDueDays(adviserID, weeklyDueDays);
            await audit(req, 'settings_changed', `weekly reports due ${weeklyDueDays} days after the week`);
        }
        const acceptsParentLetter = absenceProof === 'LETTER';
        if (acceptsParentLetter !== await fetchAcceptsParentLetter(adviserID)) {
            await setAcceptsParentLetter(adviserID, acceptsParentLetter);
            await audit(req, 'settings_changed', acceptsParentLetter ? "absences: medical certificate or parent's letter" : 'absences: medical certificate only');
        }
        req.flash('success', 'Settings saved. If you changed something, consider posting an announcement so your interns know.');
        res.redirect('/adviser/settings');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
