const express = require('express');
const { fetchAdviser, fetchAdvisersByDepartment, insertAdviser } = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get("/ojt-admin", requireRole('dept_head'), async (req, res) => {
    try{
        const adviser = await fetchAdviser(req.session.adviserID);
        res.render('ojt-admin/index', { adviser });
    } catch (error) {
        console.error('Error: ', error.message);
        res.status(500).send('Warning: Internal Server Error')
    }
});

router.get("/ojt-admin/advisers", requireRole('dept_head'), async (req, res) => {
    try{
        const adviser = await fetchAdviser(req.session.adviserID);
        const advisers = await fetchAdvisersByDepartment(adviser.departmentid);
        res.render('ojt-admin/views/advisers', { adviser, advisers });
    } catch (error) {
        console.error('Error: ', error.message);
        res.status(500).send('Warning: Internal Server Error')
    }
});

router.post('/ojt-admin/advisers', requireRole('dept_head'), async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const adviser = await fetchAdviser(req.session.adviserID);
        await insertAdviser(name, email, password, adviser.departmentid);
        res.redirect('/ojt-admin/advisers');
    } catch (error) {
        console.error('Error', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

module.exports = router;
