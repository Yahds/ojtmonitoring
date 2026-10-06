const express = require('express');
const { insertInternRequirement, fetchInternsByAdviser, fetchAllRequirements, fetchAdviser,
    updateInternRemarks, insertStudent, insertIntern, deployIntern } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

//GET REQUESTS

router.get('/ojt-dashboard/enroll', requireAuth, async (req, res) => {
    try{
        const adviser = await fetchAdviser(req.session.adviserID);
        const interns = await fetchInternsByAdviser(req.session.adviserID);
        if(adviser){
            res.render('ojt-dashboard/views/interns', {adviser, interns})
        } else {
            res.redirect('/ojt-login-page');
        }
    } catch (error) {
        console.error('Error loading enroll advisers page:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

//POST REQUESTS

router.post('/update-intern-remarks', requireAuth, async (req, res) => {
    const { internId, remarks } = req.body;
    console.log(req.body)
    console.log('Received Update Intern Remarks Request - Intern ID:', internId, 'Remarks:', remarks);

    try {
        await updateInternRemarks(internId, remarks);
        res.json({ message: 'Remarks updated successfully' });
    } catch (error) {
        console.error('Error updating intern remarks:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

router.post('/ojt-dashboard/enroll', requireAuth, async (req, res) => {
    const studentID = req.body['studentID'];
    const name = req.body['name'];
    const course = req.body['course'];
    const year = req.body['year'];
    const classcode = req.body['classcode'];
    const password = req.body['password'];

    try {
        await insertStudent(studentID, name, course, year, classcode);
        const internid = await insertIntern(studentID, req.session.adviserID, password, "ENROLLED")
        const requirements = await fetchAllRequirements();
        for (const requirement of requirements){
            await insertInternRequirement(internid, requirement.reqid);
        }
        res.redirect('/ojt-dashboard');
    } catch (error){
        console.error('Error enrolling student: ', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

router.post('/ojt-dashboard/deploy', requireAuth, async (req, res) => {
    try {
        const internID = req.body.internID;
        const result = await deployIntern(internID, req.session.adviserID);
        if (result.affectedRows == 0) {
            return res.status(400).send('Cannot deploy: the intern must have a chosen company and an approved endorsement');
        }
        res.redirect('/ojt-dashboard/enroll');
    } catch (error) {
        console.error('Error deploying intern:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

module.exports = router;
