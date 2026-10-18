const express = require('express');
const path = require('path');
const {
    fetchWeeklyReportsForReview, fetchWeeklyReportDays, fetchWeeklyReportAbsences, fetchAbsenceProofForAdviser,
    updateWeeklyReportReview, fetchWeeklyReportFileForAdviser, fetchLateLetterForAdviser, fetchInternForAdviser,
    fetchWeeklyDueRules, excuseWeek,
} = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');
const { reviewHandler } = require('../lib/review-handler');
const { today } = require('../lib/dates');
const { missingWeeks, isPastNoon, weekLabel, dueLabel } = require('../lib/weeks');

const router = express.Router();

const ABSENCE_PARTS = { DAY: 'Whole day', AM: 'Morning', PM: 'Afternoon' };
const PROOF_TYPES = { MEDICAL: 'Medical certificate', LETTER: "Parent's letter" };
const NO_WORK_REASONS = { HOLIDAY: 'Holiday', CLOSED: 'Company was closed', SCHOOL: 'School activity', OTHER: 'Other' };

function sendUpload(res, fileName) {
    const safePath = path.join('/var/www/uploads', path.basename(fileName));
    res.sendFile(safePath, (err) => { if (err) { console.error('Error sending file:', err.message); if (!res.headersSent) res.status(404).send("File not found"); } });
}

function notSentWeeks(intern, weeklyReports, dueRules) {
    if (intern.status !== 'ACTIVE' || !intern.deployedOn) return [];
    return missingWeeks(intern.deployedOn, today(), weeklyReports.map(report => report.weeknumber), dueRules);
}

router.get("/interns/:internId/weekly-reports", requireAdviser, async (req, res, next) => {
    try {
        const internId = req.params.internId;
        const adviserID = req.session.adviserID;
        const [intern, weeklyReports, days, absences, dueRules] = await Promise.all([
            fetchInternForAdviser(internId, adviserID),
            fetchWeeklyReportsForReview(internId, adviserID),
            fetchWeeklyReportDays(internId, adviserID),
            fetchWeeklyReportAbsences(internId, adviserID),
            fetchWeeklyDueRules(adviserID),
        ]);
        if (!intern) return next();
        const notSent = notSentWeeks(intern, weeklyReports, dueRules).map(missing => ({
            ...missing, label: weekLabel(missing.range), dueLabel: dueLabel(missing.due), overdue: isPastNoon(missing.due),
        }));
        weeklyReports.forEach(report => {
            if (report.datesubmitted) report.datesubmitted = new Date(report.datesubmitted).toDateString();
            report.days = days.filter(day => day.reportid === report.reportid);
            report.noWorkReason = NO_WORK_REASONS[report.no_work_reason];
            report.absences = absences
                .filter(absence => absence.reportid === report.reportid)
                .map(absence => ({ ...absence, part: ABSENCE_PARTS[absence.part], proof: PROOF_TYPES[absence.proof_type] }));
        });
        res.render('pages/weekly-reports-review', { title: `Weekly reports · ${intern.studentName}`, intern, weeklyReports, notSent, internId });
    } catch (error) {
        next(error);
    }
});

router.post('/interns/:internId/weekly-reports', requireAdviser, reviewHandler({
    page: 'weekly-reports',
    idField: 'reportid',
    what: 'weekly report',
    update: updateWeeklyReportReview,
    fromStatuses: ['PENDING'],
    notAllowed: 'Only a report waiting for review can be approved or rejected.',
    auditAction: decision => (decision === 'APPROVED' ? 'weekly_report_approved' : 'weekly_report_rejected'),
    success: decision => (decision === 'APPROVED' ? 'Weekly report approved.' : 'Weekly report sent back for changes.'),
}));

router.post('/interns/:internId/weekly-reports/change', requireAdviser, reviewHandler({
    page: 'weekly-reports',
    idField: 'reportid',
    what: 'weekly report',
    update: updateWeeklyReportReview,
    fromStatuses: ['APPROVED', 'REJECTED'],
    notAllowed: 'Only an approved or rejected report can be changed. If the intern sent the week again, review that one.',
    auditAction: () => 'weekly_report_review_changed',
    success: () => 'Your decision and remark were saved.',
}));

router.post('/interns/:internId/weekly-reports/excuse', requireAdviser, async (req, res, next) => {
    try {
        const internId = req.params.internId;
        const adviserID = req.session.adviserID;
        const backTo = `/adviser/interns/${internId}/weekly-reports`;
        const week = Number(req.body.week);
        const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
        if (!reason || reason.length > 255) {
            req.flash('error', 'Write why you are excusing the week, up to 255 characters.');
            return res.redirect(backTo);
        }

        const [intern, weeklyReports, dueRules] = await Promise.all([
            fetchInternForAdviser(internId, adviserID),
            fetchWeeklyReportsForReview(internId, adviserID),
            fetchWeeklyDueRules(adviserID),
        ]);
        if (!intern) return next();
        const chosen = notSentWeeks(intern, weeklyReports, dueRules).find(missing => missing.week === week);
        if (!chosen || !await excuseWeek(internId, adviserID, week, chosen.range[0], reason)) {
            req.flash('error', 'That week was already sent or cannot be excused.');
            return res.redirect(backTo);
        }
        await audit(req, 'weekly_week_excused', `intern ${internId} week ${week}`);
        req.flash('success', `Week ${week} excused. ${intern.studentName} won't need to send it.`);
        res.redirect(backTo);
    } catch (error) {
        next(error);
    }
});

router.get('/weekly-reports/:reportId/late-letter', requireAdviser, async (req, res, next) => {
    try {
        const letterPath = await fetchLateLetterForAdviser(req.params.reportId, req.session.adviserID);
        if (!letterPath) return next();
        sendUpload(res, letterPath);
    } catch (error) {
        next(error);
    }
});

router.get("/weekly-reports/:reportId/file", requireAdviser, async (req, res, next) => {
    try {
        const reportId = req.params.reportId;
        const filePath = await fetchWeeklyReportFileForAdviser(reportId, req.session.adviserID);
        if (!filePath) return res.status(404).send("File not found");
        sendUpload(res, filePath);
    } catch (error) {
        next(error);
    }
});

router.get('/weekly-reports/:reportId/absences/:date/proof', requireAdviser, async (req, res, next) => {
    try {
        const proofPath = await fetchAbsenceProofForAdviser(req.params.reportId, req.params.date, req.session.adviserID);
        if (!proofPath) return next();
        sendUpload(res, proofPath);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
