const express = require('express');
const path = require('path');
const { fetchWeeklyReportsForReview, updateWeeklyReportReview, fetchWeeklyReportFileForAdviser } = require('../db');
const { requireAdviser } = require('../middleware/auth');

const router = express.Router();

router.get("/interns/:internId/weekly-reports", requireAdviser, async (req, res, next) => {
    try {
        const internId = req.params.internId;
        const weeklyReports = await fetchWeeklyReportsForReview(internId, req.session.adviserID);
        weeklyReports.forEach(report => {
            if (report.datesubmitted) report.datesubmitted = new Date(report.datesubmitted).toDateString();
        });
        res.render('ojt-dashboard/views/weekly-reports-review', { weeklyReports, internId });
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
        const safePath = path.join('/var/www/uploads', path.basename(filePath));
        res.sendFile(safePath, (err) => { if (err) { console.error('Error sending file:', err.message); if (!res.headersSent) res.status(404).send("File not found"); } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
