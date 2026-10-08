const express = require('express');
const { fetchAdviser, fetchInterns, fetchAnnouncements, insertAnnouncement, deleteAnnouncement } = require('../db');
const { requireAuth, requireAdviser } = require('../middleware/auth');

const router = express.Router();

router.get("/ojt-dashboard", requireAdviser, async (req, res, next) => {
    try {
        const adviser = await fetchAdviser(req.session.adviserID);
        const interns = await fetchInterns(req.session.adviserID);
        let pendingcount = 0, total = interns.length, finished = 0;

        // Prepare a map or object to hold the unassigned requirements for each intern


        for (let i = 0; i < interns.length; i++) {
            let intern = interns[i];
            switch (intern.status) {
                case 'ON GOING':
                    pendingcount++;
                    break;
                case 'FINISHED':
                    finished++;
                    break;
            }


        }

        let unassignedRequirementsMap = {};
        const reports = {}; // Temporary still doing

        if (adviser) {
            const announcements = await fetchAnnouncements(adviser.adviserID)

            res.render('ojt-dashboard/index', {
                adviser,
                interns,
                announcements,
                pendingcount,
                finished,
                reports,
                total,
                unassignedRequirementsMap
            });
        } else {
            res.redirect('/adviser/login');
        }

    } catch (error) {
        next(error);
    }
});

router.post('/ojt-dashboard/postannouncement', requireAdviser, async (req, res, next) => {
    const sender = req.session.adviserID;
    const recipient = req.body.recipient;
    const subject = req.body['subject-text'];
    const description = req.body['description-text'];

    try {
        await insertAnnouncement(sender, recipient, subject, description);
        res.redirect('/ojt-dashboard');
    } catch (error) {
        next(error);
    }
});

router.post('/ojt-dashboard/deleteannouncement', requireAdviser, async (req, res, next) => {
    const announcementid = req.body['announcementid'];

    try {
        const deleted = await deleteAnnouncement(announcementid, req.session.adviserID);
        if (deleted === 0) {
            return res.status(404).send('Announcement not found');
        }
        res.redirect('/ojt-dashboard');
    } catch (error) {
        next(error);
    }
})

// note: added it here for now since it only needs adviser info like dashboard 
router.get("/ojt-about-us", requireAuth, async (req, res, next) => {
    try {
        const adviser = await fetchAdviser(req.session.adviserID);
        if (adviser) {
           
            res.render('ojt-about-us/index', { adviser })
        } else {
            res.redirect('/adviser/login');
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
