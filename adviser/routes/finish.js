const express = require('express');
const { fetchFinishCheck, markEvaluationReceived, finishIntern } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');
const { statusOf } = require('../lib/statuses');

const router = express.Router();

function finishChecklist(intern) {
    return [
        {
            label: `Approved hours reached the target (${intern.approvedHours} of ${intern.target_hours})`,
            done: intern.approvedHours >= intern.target_hours,
            hint: 'Approve the remaining weekly reports first.',
        },
        {
            label: 'Certificate of Completion approved',
            done: intern.certificateApproved === 1,
            hint: "The intern uploads it on their requirements page. Review it there.",
        },
        {
            label: "Company's evaluation received",
            done: Boolean(intern.evaluationDate),
            hint: 'Mark it below once the company sends it to you.',
        },
    ];
}

router.get('/interns/:internId/finish', requireAdviser, async (req, res, next) => {
    try {
        const intern = await fetchFinishCheck(req.params.internId, req.session.adviserID);
        if (!intern) {
            return next();
        }
        if (intern.status !== 'ACTIVE') {
            req.flash('info', `Only deployed interns can be marked finished. ${intern.studentName} is ${statusOf('intern', intern.status).label.toLowerCase()}.`);
            return res.redirect('/adviser/interns');
        }
        const checklist = finishChecklist(intern);
        res.render('ojt-dashboard/views/finish', {
            title: 'Mark finished',
            intern,
            checklist,
            ready: checklist.every(item => item.done),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/interns/:internId/finish/evaluation', requireAdviser, async (req, res, next) => {
    const { internId } = req.params;
    try {
        if (await markEvaluationReceived(internId, req.session.adviserID)) {
            await audit(req, 'evaluation_received', internId);
            req.flash('success', "Company's evaluation marked as received.");
        }
        res.redirect(`/adviser/interns/${internId}/finish`);
    } catch (error) {
        next(error);
    }
});

router.post('/interns/:internId/finish', requireAdviser, async (req, res, next) => {
    const { internId } = req.params;
    try {
        const result = await finishIntern(internId, req.session.adviserID);
        if (result.affectedRows === 0) {
            req.flash('error', 'Cannot mark finished yet. Finish the items marked as missing first.');
            return res.redirect(`/adviser/interns/${internId}/finish`);
        }
        await audit(req, 'intern_finished', internId);
        req.flash('success', 'Intern marked as finished.');
        res.redirect('/adviser/interns');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
