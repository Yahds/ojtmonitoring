const express = require('express');
const path = require('path');
const {
    fetchWeeklyReportsForReview, fetchWeeklyReportDays, fetchWeeklyReportAbsences, fetchAbsenceProofForAdviser,
    updateWeeklyReportReview, fetchWeeklyReportFileForAdviser,
} = require('../db');
const { requireAdviser } = require('../middleware/auth');

const router = express.Router();

const ABSENCE_PARTS = { DAY: 'Whole day', AM: 'Morning', PM: 'Afternoon' };
const PROOF_TYPES = { MEDICAL: 'Medical certificate', LETTER: "Parent's letter" };
const NO_WORK_REASONS = { HOLIDAY: 'Holiday', CLOSED: 'Company was closed', SCHOOL: 'School activity', OTHER: 'Other' };

function sendUpload(res, fileName) {
    const safePath = path.join('/var/www/uploads', path.basename(fileName));
    res.sendFile(safePath, (err) => { if (err) { console.error('Error sending file:', err.message); if (!res.headersSent) res.status(404).send("File not found"); } });
}

router.get("/interns/:internId/weekly-reports", requireAdviser, async (req, res, next) => {
    try {
        const internId = req.params.internId;
        const [weeklyReports, days, absences] = await Promise.all([
            fetchWeeklyReportsForReview(internId, req.session.adviserID),
            fetchWeeklyReportDays(internId, req.session.adviserID),
            fetchWeeklyReportAbsences(internId, req.session.adviserID),
        ]);
        weeklyReports.forEach(report => {
            if (report.datesubmitted) report.datesubmitted = new Date(report.datesubmitted).toDateString();
            report.days = days.filter(day => day.reportid === report.reportid);
            report.noWorkReason = NO_WORK_REASONS[report.no_work_reason];
            report.absences = absences
                .filter(absence => absence.reportid === report.reportid)
                .map(absence => ({ ...absence, part: ABSENCE_PARTS[absence.part], proof: PROOF_TYPES[absence.proof_type] }));
        });
        res.render('ojt-dashboard/views/weekly-reports-review', { title: 'Weekly reports', weeklyReports, internId });
    } catch (error) {
        next(error);
    }
});

router.post("/interns/:internId/weekly-reports", requireAdviser, async (req, res, next) => {
    try {
        const internId = req.params.internId;
        const { reportid, decision, remark } = req.body;
        const backTo = `/adviser/interns/${internId}/weekly-reports`;

        if (decision !== 'APPROVED' && decision !== 'REJECTED') {
            req.flash('error', 'Choose Approve or Reject.');
            return res.redirect(backTo);
        }

        const result = await updateWeeklyReportReview(reportid, req.session.adviserID, decision, remark);
        if (result.affectedRows === 0) {
            req.flash('error', 'That weekly report was not found.');
        } else {
            req.flash('success', decision === 'APPROVED' ? 'Weekly report approved.' : 'Weekly report rejected.');
        }
        res.redirect(backTo);
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
