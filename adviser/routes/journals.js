const express = require('express');
const path = require('path');
const { fetchJournalsForReview, updateJournalReview, fetchJournalFileForAdviser } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get("/ojt-dashboard/journals-review/:internId", requireAuth, async (req, res, next) => {
    try {
        const internId = req.params.internId;
        const journals = await fetchJournalsForReview(internId, req.session.adviserID);
        journals.forEach(journal => {
            if (journal.datesubmitted) journal.datesubmitted = new Date(journal.datesubmitted).toDateString();
        });
        res.render('ojt-dashboard/views/review-journals', { journals, internId });
    } catch (error) {
        next(error);
    }
});

router.post("/ojt-dashboard/journals-review/:internId", requireAuth, async (req, res, next) => {
    try {
        const internId = req.params.internId;
        const { journalid, decision, remark } = req.body;
        const backTo = `/ojt-dashboard/journals-review/${internId}`;

        if (decision !== 'APPROVED' && decision !== 'REJECTED') {
            req.flash('error', 'Choose Approve or Reject.');
            return res.redirect(backTo);
        }

        const result = await updateJournalReview(journalid, req.session.adviserID, decision, remark);
        if (result.affectedRows === 0) {
            req.flash('error', 'That journal was not found.');
        } else {
            req.flash('success', decision === 'APPROVED' ? 'Journal approved.' : 'Journal rejected.');
        }
        res.redirect(backTo);
    } catch (error) {
        next(error);
    }
});

router.get("/ojt-dashboard/journal-file/:journalId", requireAuth, async (req, res, next) => {
    try {
        const journalId = req.params.journalId;
        const filePath = await fetchJournalFileForAdviser(journalId, req.session.adviserID);
        if (!filePath) return res.status(404).send("File not found");
        const safePath = path.join('/var/www/uploads', path.basename(filePath));
        res.sendFile(safePath, (err) => { if (err) { console.error('Error sending file:', err.message); if (!res.headersSent) res.status(404).send("File not found"); } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
