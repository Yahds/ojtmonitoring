const express = require('express');
const path = require('path');
const { fetchJournalsForReview, updateJournalReview, fetchJournalFileForAdviser } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get("/ojt-dashboard/journals-review/:internId", requireAuth, async (req, res) => {
    try {
        const internId = req.params.internId;
        const journals = await fetchJournalsForReview(internId, req.session.adviserID);
        journals.forEach(journal => {
            if (journal.datesubmitted) journal.datesubmitted = new Date(journal.datesubmitted).toDateString();
        });
        res.render('ojt-dashboard/views/review-journals', { journals, internId });
    } catch (error) {
        console.error('Error', error);
        res.status(500).send("Warning: Internal Server Error");
    }
});

router.post("/ojt-dashboard/journals-review/:internId", requireAuth, async (req, res) => {
    try {
        const internId = req.params.internId;
        const { journalid, decision, remark } = req.body;
        if (decision !== 'APPROVED' && decision !== 'REJECTED') return res.status(400).send("Invalid decision");
        await updateJournalReview(journalid, req.session.adviserID, decision, remark);
        res.redirect(`/ojt-dashboard/journals-review/${internId}`);
    } catch (error) {
        console.error('Error', error);
        res.status(500).send("Warning: Internal Server Error");
    }
});

router.get("/ojt-dashboard/journal-file/:journalId", requireAuth, async (req, res) => {
    try {
        const journalId = req.params.journalId;
        const filePath = await fetchJournalFileForAdviser(journalId, req.session.adviserID);
        if (!filePath) return res.status(404).send("File not found");
        const safePath = path.join('/var/www/uploads', path.basename(filePath));
        res.sendFile(safePath, (err) => { if (err) { console.error('Error sending file:', err.message); if (!res.headersSent) res.status(404).send("File not found"); } });
    } catch (error) {
        console.error('Error', error);
        res.status(500).send("Warning: Internal Server Error");
    }
});

module.exports = router;
