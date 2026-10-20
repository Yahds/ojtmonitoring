const express = require('express');
const { fetchInternForAdviser, fetchCompanies, recordPlacement } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');
const { statusOf } = require('../lib/statuses');

const router = express.Router();

const PLACEABLE = ['ENROLLED', 'PENDING'];

async function showPage(req, res, next, status, values, errors) {
    const intern = await fetchInternForAdviser(req.params.internId, req.session.adviserID);
    if (!intern) {
        return next();
    }
    if (!PLACEABLE.includes(intern.status)) {
        req.flash('info', `${intern.studentName} is ${statusOf('intern', intern.status).label.toLowerCase()}, so the company can no longer change.`);
        return res.redirect(`/adviser/interns/${intern.internid}/requirements`);
    }
    const companies = await fetchCompanies(req.session.adviserID);
    res.status(status).render('pages/placement', {
        title: 'Record placement',
        intern,
        partners: companies.filter(company => company.moa_on_file),
        others: companies.filter(company => !company.moa_on_file),
        values: values || { companyId: String(intern.companyid || '') },
        errors,
    });
}

router.get('/interns/:internId/placement', requireAdviser, async (req, res, next) => {
    try {
        await showPage(req, res, next, 200, null, {});
    } catch (error) {
        next(error);
    }
});

router.post('/interns/:internId/placement', requireAdviser, async (req, res, next) => {
    const companyId = typeof req.body.companyId === 'string' ? req.body.companyId : '';
    try {
        const companies = await fetchCompanies(req.session.adviserID);
        const company = companies.find(item => String(item.companyid) === companyId);
        if (!company) {
            return await showPage(req, res, next, 400, { companyId }, { companyId: 'Choose the company that accepted the intern.' });
        }
        if (!(await recordPlacement(req.params.internId, req.session.adviserID, company.companyid))) {
            return await showPage(req, res, next, 400, { companyId }, {});
        }
        await audit(req, 'placement_recorded', `intern ${req.params.internId}: company ${company.companyid}`);
        req.flash('success', `Placement saved: ${company.companyname}. Next, the intern sends the endorsement form.`);
        res.redirect(`/adviser/interns/${req.params.internId}/requirements`);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
