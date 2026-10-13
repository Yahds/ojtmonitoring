const express = require('express');
const { fetchInternsByAdviser, fetchCourses, enrollIntern,
    updateInternRemarks, deployIntern, isAdvisersIntern, fetchDeployCheck } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit')
const { statusOf } = require('../lib/statuses');
const { isRealDate, today } = require('../lib/dates');

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

const DEPLOYABLE = ['ENROLLED', 'PENDING'];

function deployChecklist(intern) {
    return [
        { label: 'Company chosen', done: Boolean(intern.companyname), hint: 'The intern selects it on their own page.' },
        { label: 'Endorsement reply form received', done: intern.replyReceived === 1, hint: 'Mark it on the Endorsements page once the company replies.' },
        { label: 'Data Privacy Certificate approved', done: intern.privacyApproved === 1, hint: "Review it on the intern's requirements page." },
    ];
}

async function showDeployPage(req, res, next, status, startDate, errors) {
    const intern = await fetchDeployCheck(req.params.internId, req.session.adviserID);
    if (!intern) {
        return next(); 
    }
    if (!DEPLOYABLE.includes(intern.status)) {
        req.flash('info', `${intern.studentName} is already ${statusOf('intern', intern.status).label.toLowerCase()}.`);
        return res.redirect('/adviser/interns');
    }
    const checklist = deployChecklist(intern);
    res.status(status).render('ojt-dashboard/views/deploy', {
        title: 'Deploy intern',
        intern,
        checklist,
        ready: checklist.every(item => item.done),
        startDate: startDate || intern.plannedStart || today(),
        errors,
    });
}

router.get('/interns/:internId/deploy', requireAdviser, async (req, res, next) => {
    try {
        await showDeployPage(req, res, next, 200, null, {});
    } catch (error) {
        next(error);
    }
});

router.post('/interns/:internId/deploy', requireAdviser, async (req, res, next) => {
    const { internId } = req.params;
    const startDate = typeof req.body.startDate === 'string' ? req.body.startDate : '';
    try {
        if (!isRealDate(startDate)) {
            return await showDeployPage(req, res, next, 400, startDate, { startDate: 'Enter a real date.' });
        }
        const result = await deployIntern(internId, req.session.adviserID, startDate);
        if (result.affectedRows === 0) {
            req.flash('error', 'Cannot deploy yet. Finish the items marked as missing first.');
            return res.redirect(`/adviser/interns/${internId}/deploy`);
        }
        await audit(req, 'intern_deployed', internId);
        req.flash('success', 'Intern deployed.');
        res.redirect('/adviser/interns');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
