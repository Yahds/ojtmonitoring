const express = require('express');
const {
    OPEN_STATUSES, fetchInternForAdviser, fetchRequirementNames, addRequirement, fetchOwnRequirement, removeOwnRequirement,
} = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');
const { isRealDate, today } = require('../lib/dates');

const router = express.Router();

const AUDIENCES = ['INTERN', 'SECTION', 'ALL'];

function showForm(res, status, intern, values, errors) {
    res.status(status).render('ojt-dashboard/views/requirement-new', {
        title: 'Add requirement', intern, values, errors, today: today(),
    });
}

// the requirements page an intern id from the form or URL leads back to
const backTo = internId => (/^\d+$/.test(String(internId)) ? `/adviser/interns/${internId}/requirements` : '/adviser/interns');

router.get('/interns/:internId/requirements/new', requireAdviser, async (req, res, next) => {
    try {
        const intern = await fetchInternForAdviser(req.params.internId, req.session.adviserID);
        if (!intern) {
            return next();
        }
        showForm(res, 200, intern, { name: '', audience: 'INTERN', dueDate: '' }, {});
    } catch (error) {
        next(error);
    }
});

router.post('/interns/:internId/requirements/new', requireAdviser, async (req, res, next) => {
    const text = name => (typeof req.body[name] === 'string' ? req.body[name].trim() : '');
    const values = { name: text('name'), audience: text('audience'), dueDate: text('dueDate') };

    try {
        const intern = await fetchInternForAdviser(req.params.internId, req.session.adviserID);
        if (!intern) {
            return next();
        }

        const errors = {};
        if (values.name === '' || values.name.length > 100) {
            errors.name = 'Write the requirement name, up to 100 characters.';
        } else if ((await fetchRequirementNames(req.session.adviserID)).includes(values.name.toLowerCase())) {
            errors.name = 'A requirement with this name already exists. Use a different name.';
        }
        if (!AUDIENCES.includes(values.audience)) {
            errors.audience = 'Choose who needs to submit it.';
        } else if (values.audience === 'INTERN' && !OPEN_STATUSES.includes(intern.status)) {
            errors.audience = `${intern.studentName} is no longer doing their OJT. Choose a section or all sections.`;
        }
        if (values.dueDate !== '' && !isRealDate(values.dueDate)) {
            errors.dueDate = 'Enter a real date, or leave it empty.';
        } else if (values.dueDate !== '' && values.dueDate < today()) {
            errors.dueDate = 'Pick today or a later date.';
        }
        if (Object.keys(errors).length > 0) {
            return showForm(res, 400, intern, values, errors);
        }

        const added = await addRequirement(req.session.adviserID, {
            name: values.name,
            audience: values.audience,
            internID: intern.internid,
            classcode: intern.classcode,
            dueDate: values.dueDate || null,
        });
        const who = { INTERN: `intern ${intern.internid}`, SECTION: `section ${intern.classcode}`, ALL: 'all sections' }[values.audience];
        await audit(req, 'requirement_added', `requirement ${added.reqID} for ${who}`);
        req.flash('success', `Requirement added for ${added.interns} ${added.interns === 1 ? 'intern' : 'interns'}.`);
        res.redirect(backTo(intern.internid));
    } catch (error) {
        next(error);
    }
});

// a separate page asks first and says how many interns it affects
router.get('/requirements/:reqid/remove', requireAdviser, async (req, res, next) => {
    try {
        const requirement = await fetchOwnRequirement(req.params.reqid, req.session.adviserID);
        if (!requirement) {
            return next(); // a school requirement or another adviser's
        }
        res.render('ojt-dashboard/views/requirement-remove', {
            title: 'Remove requirement', requirement, from: req.query.from, back: backTo(req.query.from),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/requirements/remove', requireAdviser, async (req, res, next) => {
    const { reqid, from } = req.body;
    try {
        const requirement = await fetchOwnRequirement(reqid, req.session.adviserID);
        if (!requirement) {
            return next();
        }
        if (!(await removeOwnRequirement(reqid, req.session.adviserID))) {
            req.flash('error', 'This requirement can no longer be removed, because an intern already submitted it.');
            return res.redirect(backTo(from));
        }
        await audit(req, 'requirement_removed', `requirement ${reqid}: ${requirement.requirementname}`.slice(0, 100));
        req.flash('success', 'Requirement removed.');
        res.redirect(backTo(from));
    } catch (error) {
        next(error);
    }
});

module.exports = router;
