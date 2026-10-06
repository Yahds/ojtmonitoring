const express = require('express');
const { fetchInternsByAdviser, fetchAdviser, enrollIntern,
    updateInternRemarks, deployIntern, isAdvisersIntern } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

//GET REQUESTS

router.get('/ojt-dashboard/enroll', requireAuth, async (req, res, next) => {
    try{
        const adviser = await fetchAdviser(req.session.adviserID);
        const interns = await fetchInternsByAdviser(req.session.adviserID);
        if(adviser){
            res.render('ojt-dashboard/views/interns', {adviser, interns})
        } else {
            res.redirect('/ojt-login-page');
        }
    } catch (error) {
        next(error);
    }
});

//POST REQUESTS

router.post('/update-intern-remarks', requireAuth, async (req, res, next) => {
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

router.post('/ojt-dashboard/enroll', requireAuth, async (req, res, next) => {
    const studentID = req.body['studentID'];
    const name = req.body['name'];
    const course = req.body['course'];
    const year = req.body['year'];
    const classcode = req.body['classcode'];
    const password = req.body['password'];

    try {
        const student = { id: studentID, name, course, year, classcode };
        await enrollIntern(student, req.session.adviserID, password);
        res.redirect('/ojt-dashboard');
    } catch (error){
        next(error);
    }
});

router.post('/ojt-dashboard/deploy', requireAuth, async (req, res, next) => {
    try {
        const internID = req.body.internID;
        const result = await deployIntern(internID, req.session.adviserID);
        if (result.affectedRows == 0) {
            return res.status(400).send('Cannot deploy: the intern must have a chosen company and an approved endorsement');
        }
        res.redirect('/ojt-dashboard/enroll');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
