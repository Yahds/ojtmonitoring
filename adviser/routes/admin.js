const express = require('express');
const { fetchAdviser, fetchAdvisersByDepartment, insertAdviser } = require('../db');
const { requireRole } = require('../middleware/auth');
const { audit } = require('../lib/audit');  

const router = express.Router();

router.get("/admin", requireRole('dept_head'), (req, res) => {
    res.render('ojt-admin/index', { title: 'Overview' });
});

router.get("/admin/advisers", requireRole('dept_head'), async (req, res, next) => {
    try{
        const adviser = await fetchAdviser(req.session.adviserID);
        const advisers = await fetchAdvisersByDepartment(adviser.departmentid);
        res.render('ojt-admin/views/advisers', { title: 'Advisers', advisers });
    } catch (error) {
        next(error);
    }
});

function showAddForm(res, status, values, errors) {
    res.status(status).render('ojt-admin/views/adviser-new', { title: 'Add adviser', values, errors });
}

router.get('/admin/advisers/new', requireRole('dept_head'), (req, res) => {
    showAddForm(res, 200, {}, {});
});

router.post('/admin/advisers', requireRole('dept_head'), async (req, res, next) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const errors = {};
    if (!name) {
        errors.name = 'Enter their full name.';
    }
    if (!email.includes('@')) {
        errors.email = 'Enter an email address, like name@slu.edu.ph.';
    }
    if (Object.keys(errors).length > 0) {
        return showAddForm(res, 400, { name, email }, errors);
    }

    try {
        const adviser = await fetchAdviser(req.session.adviserID);
        await insertAdviser(name, email, null, adviser.departmentid);
        await audit(req, 'adviser_added', email);
        req.flash('success', `${name} added. They can now sign in with their SLU account.`);
        res.redirect('/adviser/admin/advisers');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return showAddForm(res, 400, { name, email }, { email: 'That email is already used by another account.' });
        }
        next(error);
    }
});

module.exports = router;
