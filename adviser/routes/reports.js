const express = require('express');
const path = require('path');
const { fetchWeeklyReportsForReview, updateWeeklyReportReview, fetchWeeklyReportFileForAdviser } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get("/ojt-dashboard/weekly-reports-review/:internId", requireAuth, async (req, res, next) => {
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

router.post("/ojt-dashboard/weekly-reports-review/:internId", requireAuth, async (req, res, next) => {
    try {
        const internId = req.params.internId;
        const { reportid, decision, remark } = req.body;
        if (decision !== 'APPROVED' && decision !== 'REJECTED') return res.status(400).send("Invalid decision");
        await updateWeeklyReportReview(reportid, req.session.adviserID, decision, remark);
        res.redirect(`/ojt-dashboard/weekly-reports-review/${internId}`);
    } catch (error) {
        next(error);
    }
});

router.get("/ojt-dashboard/weekly-report-file/:reportId", requireAuth, async (req, res, next) => {
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
