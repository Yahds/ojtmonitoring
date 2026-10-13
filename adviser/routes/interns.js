const express = require('express');
const { fetchInternsByAdviser, fetchCourses, enrollIntern,
    updateInternRemarks, deployIntern, isAdvisersIntern } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit')

const router = express.Router();

//GET REQUESTS

router.get('/interns', requireAdviser, async (req, res, next) => {
    try {
        const interns = await fetchInternsByAdviser(req.session.adviserID);
        res.render('ojt-dashboard/views/interns', { title: 'Interns', interns });
    } catch (error) {
        next(error);
    }
});

// errors go next to the form fields
async function showEnrollForm(res, status, values, errors) {
    const courses = await fetchCourses();
    res.status(status).render('ojt-dashboard/views/intern-new', { title: 'Enroll intern', courses, values, errors });
}

router.get('/interns/new', requireAdviser, async (req, res, next) => {
    try {
        await showEnrollForm(res, 200, {}, {});
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
    const { studentID, name, course, year, classcode } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const values = { studentID, name, course, year, classcode, email };

    try {
        const errors = {};
        if (!(await fetchCourses()).some(c => c.code === course)) {
            errors.course = 'Select a course from the list.';
        }
        if (!email.includes('@')) {
            errors.email = "Enter the student's SLU email, like 2299001@slu.edu.ph.";
        }
        if (Object.keys(errors).length > 0) {
            return await showEnrollForm(res, 400, values, errors);
        }

        await enrollIntern({ id: studentID, name, course, year, classcode, email }, req.session.adviserID);
        await audit(req, 'intern_enrolled', String(studentID));
        req.flash('success', `${name} enrolled. They can now sign in with their SLU account.`);
        res.redirect('/adviser/interns');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            const errors = error.sqlMessage.includes('uq_student_email')
                ? { email: 'That email is already used by another student.' }
                : { studentID: 'That student ID is already enrolled.' };
            return showEnrollForm(res, 400, values, errors).catch(next);
        }
        next(error);
    }
});

router.post('/interns/:internId/deploy', requireAdviser, async (req, res, next) => {
    try {
        const internID = req.params.internId;
        const result = await deployIntern(internID, req.session.adviserID);
        if (result.affectedRows === 0) {
            req.flash('error', 'Cannot deploy yet. The company has not sent back the endorsement reply form.');
            return res.redirect('/adviser/interns');
        }
        req.flash('success', 'Intern deployed.');
        res.redirect('/adviser/interns');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
