const express = require('express');
const { fetchReviewQueue, fetchAdviserSections } = require('../db');
const { requireAdviser } = require('../middleware/auth');

const router = express.Router();

// where each kind of item is reviewed
const REVIEW_PAGES = { requirement: 'requirements', weekly: 'weekly-reports', journal: 'journals' };
const KIND_LABELS = { requirement: 'Requirement', weekly: 'Weekly report', journal: 'Journal' };

router.get('/review', requireAdviser, async (req, res, next) => {
    try {
        const sections = await fetchAdviserSections(req.session.adviserID);
        const section = sections.includes(req.query.section) ? req.query.section : '';
        const items = await fetchReviewQueue(req.session.adviserID, section);
        res.render('ojt-dashboard/views/review-queue', {
            title: 'To review',
            sections,
            section,
            items: items.map(item => ({
                ...item,
                kindLabel: KIND_LABELS[item.kind],
                href: `/adviser/interns/${item.internid}/${REVIEW_PAGES[item.kind]}`,
            })),
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
