const express = require('express');
const { fetchAdviser, fetchDashboardInterns, fetchReviewQueue, fetchWeeklyDueRules, fetchAnnouncements } = require('../db');
const { requireAuth, requireAdviser } = require('../middleware/auth');
const { today } = require('../lib/dates');
const { missingWeeks, isPastNoon } = require('../lib/weeks');

const router = express.Router();

const REVIEW_PAGES = { requirement: 'requirements', weekly: 'weekly-reports', journal: 'journals' };
const SHOWN_IN_LISTS = 5;
const SHOWN_IN_TABLE = 8;

// weeks that ended without a report and are past their due time
function overdueWeeks(intern, dueRules) {
    if (intern.status !== 'ACTIVE' || !intern.deployedOn) return [];
    return missingWeeks(intern.deployedOn, today(), intern.reportedWeeks, dueRules)
        .filter(missing => isPastNoon(missing.due))
        .map(missing => missing.week);
}

router.get('/dashboard', requireAdviser, async (req, res, next) => {
    try {
        const adviserID = req.session.adviserID;
        const [everyone, dueRules, { announcements }] = await Promise.all([
            fetchDashboardInterns(adviserID),
            fetchWeeklyDueRules(adviserID),
            fetchAnnouncements(adviserID),
        ]);
        const sections = [...new Set(everyone.map(intern => intern.classcode))].sort()
            .map(code => ({ code, count: everyone.filter(intern => intern.classcode === code).length }));
        const section = sections.some(({ code }) => code === req.query.section) ? req.query.section : '';
        const interns = everyone.filter(intern => !section || intern.classcode === section);

        const queue = (await fetchReviewQueue(adviserID, section)).map(item => ({
            ...item, href: `/adviser/interns/${item.internid}/${REVIEW_PAGES[item.kind]}`,
        }));
        const missing = interns
            .map(intern => ({ intern, weeks: overdueWeeks(intern, dueRules) }))
            .filter(({ weeks }) => weeks.length);
        const ready = interns.filter(intern => intern.readyToDeploy);

        res.render('ojt-dashboard/views/dashboard', {
            title: 'Dashboard',
            everyoneCount: everyone.length,
            sections,
            section,
            queue: queue.slice(0, SHOWN_IN_LISTS),
            queueCount: queue.length,
            oldestDays: queue.length ? queue[0].days : 0,
            missing,
            ready,
            interns: interns.slice(0, SHOWN_IN_TABLE),
            internCount: interns.length,
            announcements: announcements.slice(0, 3),
        });
    } catch (error) {
        next(error);
    }
});

// note: added it here for now since it only needs adviser info like dashboard
router.get("/about", requireAuth, async (req, res, next) => {
    try {
        const adviser = await fetchAdviser(req.session.adviserID);
        if (adviser) {

            res.render('ojt-about-us/index', { adviser })
        } else {
            res.redirect('/adviser/login');
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
