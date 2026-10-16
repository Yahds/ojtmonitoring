const express = require('express');
const path = require('path');
const { fetchJournalsForReview, updateJournalReview, fetchJournalFileForAdviser, fetchInternForAdviser } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { reviewHandler } = require('../lib/review-handler');

const router = express.Router();

router.get("/interns/:internId/journals", requireAdviser, async (req, res, next) => {
    try {
        const internId = req.params.internId;
        const [intern, journals] = await Promise.all([
            fetchInternForAdviser(internId, req.session.adviserID),
            fetchJournalsForReview(internId, req.session.adviserID),
        ]);
        if (!intern) return next();
        journals.forEach(journal => {
            if (journal.datesubmitted) journal.datesubmitted = new Date(journal.datesubmitted).toDateString();
        });
        res.render('ojt-dashboard/views/review-journals', { title: `Journals · ${intern.studentName}`, intern, journals, internId });
    } catch (error) {
        next(error);
    }
});

router.post('/interns/:internId/journals', requireAdviser, reviewHandler({
    page: 'journals',
    idField: 'journalid',
    what: 'journal',
    update: updateJournalReview,
    fromStatuses: ['PENDING'],
    notAllowed: 'Only a journal waiting for review can be approved or rejected.',
    auditAction: decision => (decision === 'APPROVED' ? 'journal_approved' : 'journal_rejected'),
    success: decision => (decision === 'APPROVED' ? 'Journal approved.' : 'Journal sent back for changes.'),
}));

router.post('/interns/:internId/journals/change', requireAdviser, reviewHandler({
    page: 'journals',
    idField: 'journalid',
    what: 'journal',
    update: updateJournalReview,
    fromStatuses: ['APPROVED', 'REJECTED'],
    notAllowed: 'Only an approved or rejected journal can be changed. If the intern sent the month again, review that one.',
    auditAction: () => 'journal_review_changed',
    success: () => 'Your decision and remark were saved.',
}));

router.get("/journals/:journalId/file", requireAdviser, async (req, res, next) => {
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
