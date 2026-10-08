const express = require('express');
const { fetchInternsByAdviser, fetchAdviser, enrollIntern,
    updateInternRemarks, deployIntern, isAdvisersIntern } = require('../db');
const { requireAdviser } = require('../middleware/auth');

const router = express.Router();

//GET REQUESTS

router.get('/interns', requireAdviser, async (req, res, next) => {
    try{
        const adviser = await fetchAdviser(req.session.adviserID);
        const interns = await fetchInternsByAdviser(req.session.adviserID);
        if(adviser){
            res.render('ojt-dashboard/views/interns', { title: 'Interns', interns })
        } else {
            res.redirect('/adviser/login');
        }
    } catch (error) {
        next(error);
    }
});

//POST REQUESTS

router.post('/intern-remarks', requireAdviser, async (req, res, next) => {
    const { internId, remarks } = req.body;

    try {
        if (!(await isAdvisersIntern(internId, req.session.adviserID))) {
            return res.status(404).json({ message: 'Intern not found' });
        }
        await updateInternRemarks(internId, remarks);
        res.json({ message: 'Remarks updated successfully' });
    } catch (error) {
        next(error);
    }
});

router.post('/interns', requireAdviser, async (req, res, next) => {
    const studentID = req.body['studentID'];
    const name = req.body['name'];
    const course = req.body['course'];
    const year = req.body['year'];
    const classcode = req.body['classcode'];
    const password = req.body['password'];

    try {
        const student = { id: studentID, name, course, year, classcode };
        await enrollIntern(student, req.session.adviserID, password);
        req.flash('success', `${name} enrolled.`);
        res.redirect('/adviser/interns');
    } catch (error){
        next(error);
    }
});

router.post('/interns/:internId/deploy', requireAdviser, async (req, res, next) => {
    try {
        const internID = req.params.internId;
        const result = await deployIntern(internID, req.session.adviserID);
        if (result.affectedRows === 0) {
            req.flash('error', 'Cannot deploy yet. The intern needs a chosen company and an approved endorsement letter.');
            return res.redirect('/adviser/interns');
        }
        req.flash('success', 'Intern deployed.');
        res.redirect('/adviser/interns');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
