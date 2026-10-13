const express = require('express');
const { fetchDeadlines, setDeadline } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');
const { isRealDate, today } = require('../lib/dates');

const router = express.Router();

const SCOPES = ['intern', 'section', 'all'];

async function showDeadlinePage(req, res, next, status, values, errors) {
    const { internId, reqid } = req.params;
    const deadlines = await fetchDeadlines(internId, reqid, req.session.adviserID);
    if (!deadlines) {
        return next();
    }
    res.status(status).render('ojt-dashboard/views/requirement-deadline', {
        title: `${deadlines.requirementname} deadline`, deadlines, internId, reqid, values, errors, today: today(),
    });
}

router.get('/interns/:internId/requirements/:reqid/deadline', requireAdviser, async (req, res, next) => {
    try {
        await showDeadlinePage(req, res, next, 200, { scope: 'section', dueDate: '' }, {});
    } catch (error) {
        next(error);
    }
});

router.post('/interns/:internId/requirements/:reqid/deadline', requireAdviser, async (req, res, next) => {
    const { internId, reqid } = req.params;
    const remove = req.body.action === 'remove';
    const values = {
        scope: SCOPES.includes(req.body.scope) ? req.body.scope : '',
        dueDate: typeof req.body.dueDate === 'string' ? req.body.dueDate : '',
    };

    try {
        const deadlines = await fetchDeadlines(internId, reqid, req.session.adviserID);
        if (!deadlines) {
            return next(); // not this adviser's intern, so it ends on the 404 page
        }

        const errors = {};
        if (!values.scope) {
            errors.scope = 'Choose who this deadline is for.';
        }
        if (!remove && !isRealDate(values.dueDate)) {
            errors.dueDate = 'Enter a real date.';
        } else if (!remove && values.dueDate < today()) {
            errors.dueDate = 'Pick today or a later date.';
        }
        if (Object.keys(errors).length > 0) {
            return await showDeadlinePage(req, res, next, 400, values, errors);
        }

        await setDeadline(internId, reqid, req.session.adviserID, values.scope, deadlines.classcode, remove ? null : values.dueDate);
        const who = { intern: `intern ${internId}`, section: `section ${deadlines.classcode}`, all: 'all sections' }[values.scope];
        await audit(req, remove ? 'deadline_removed' : 'deadline_set', `requirement ${reqid} for ${who}`);
        req.flash('success', remove ? 'Deadline removed.' : 'Deadline saved.');
        res.redirect(`/adviser/interns/${internId}/requirements`);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
