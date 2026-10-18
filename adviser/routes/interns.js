const express = require('express');
const { fetchInternSummaries, fetchReviewQueue, fetchWeeklyDueRules, fetchCourses, enrollIntern,
    deployIntern, fetchDeployCheck } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit')
const { statusOf } = require('../lib/statuses');
const { isRealDate, today } = require('../lib/dates');
const { overdueWeeks } = require('../lib/weeks');

const router = express.Router();

const INTERN_STATUSES = ['ENROLLED', 'PENDING', 'ACTIVE', 'FINISHED', 'WITHDRAWN'];

// short list of what the adviser has to do for this intern, e.g. "2 to review · week 5 missing"
function needsOf(intern, waiting, dueRules) {
    const needs = [];
    if (waiting.length === 1) needs.push(`${waiting[0].item} to review`);
    if (waiting.length > 1) needs.push(`${waiting.length} to review`);
    const weeks = overdueWeeks(intern, dueRules);
    if (weeks.length) needs.push(`${weeks.length === 1 ? 'week' : 'weeks'} ${weeks.join(', ')} missing`);
    if (intern.readyToDeploy) needs.push('ready to deploy');
    const text = needs.join(' · ');
    return text && text[0].toUpperCase() + text.slice(1);
}

//GET REQUESTS

router.get('/interns', requireAdviser, async (req, res, next) => {
    try {
        const adviserID = req.session.adviserID;
        const [everyone, queue, dueRules] = await Promise.all([
            fetchInternSummaries(adviserID),
            fetchReviewQueue(adviserID),
            fetchWeeklyDueRules(adviserID),
        ]);
        const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
        const status = INTERN_STATUSES.includes(req.query.status) ? req.query.status : '';
        const sections = [...new Set(everyone.map(intern => intern.classcode))].sort()
            .map(code => ({ code, count: everyone.filter(intern => intern.classcode === code).length }));
        const section = sections.some(({ code }) => code === req.query.section) ? req.query.section : '';

        const words = search.toLowerCase();
        const interns = everyone
            .filter(intern => !section || intern.classcode === section)
            .filter(intern => !status || intern.status === status)
            .filter(intern => !words || intern.studentName.toLowerCase().includes(words) || String(intern.studentID).includes(words))
            .map(intern => ({ ...intern, needs: needsOf(intern, queue.filter(item => item.internid === intern.internid), dueRules) }))
            .sort((a, b) => Boolean(b.needs) - Boolean(a.needs));

        // a chip link keeps the search and status that are already picked
        const linkTo = changes => {
            const query = new URLSearchParams(Object.entries({ q: search, section, status, ...changes }).filter(([, value]) => value)).toString();
            return `/adviser/interns${query ? `?${query}` : ''}`;
        };

        res.render('ojt-dashboard/views/interns', {
            title: 'Interns', interns, everyoneCount: everyone.length, sections, section, search, status,
            statuses: INTERN_STATUSES.map(code => ({ code, label: statusOf('intern', code).label })), linkTo,
        });
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
