const express = require('express');
const { fetchAdviser, fetchAdvisersByDepartment, insertAdviser } = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get("/ojt-admin", requireRole('dept_head'), (req, res) => {
    res.render('ojt-admin/index', { title: 'Overview' });
});

router.get("/ojt-admin/advisers", requireRole('dept_head'), async (req, res, next) => {
    try{
        const adviser = await fetchAdviser(req.session.adviserID);
        const advisers = await fetchAdvisersByDepartment(adviser.departmentid);
        res.render('ojt-admin/views/advisers', { title: 'Advisers', advisers });
    } catch (error) {
        next(error);
    }
});

router.post('/ojt-admin/advisers', requireRole('dept_head'), async (req, res, next) => {
    const { name, email, password } = req.body;

    try {
        const adviser = await fetchAdviser(req.session.adviserID);
        await insertAdviser(name, email, password, adviser.departmentid);
        req.flash('success', `${name} added.`);
        res.redirect('/ojt-admin/advisers');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
