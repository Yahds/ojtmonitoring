const express = require('express');
const { fetchAdviser, fetchInterns, fetchAnnouncements, insertAnnouncement, deleteAnnouncement } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get("/ojt-dashboard", requireAuth, async (req, res) => {
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
            res.redirect('/ojt-login-page');
        }

    } catch (error) {
        console.error('Error', error);
        res.status(500).send("Warning: Internal Server Error")
    }
});

router.post('/ojt-dashboard/postannouncement', requireAuth, async (req, res) => {
    const sender = req.body['sender'];
    const recipient = req.body.recipient;
    const subject = req.body['subject-text'];
    const description = req.body['description-text'];
    console.log("Inserting announcement");

    try {
        await insertAnnouncement(sender, recipient, subject, description);
        res.redirect('/ojt-dashboard');
    } catch (error) {
        console.error('Error inserting announcement: ', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

router.post('/ojt-dashboard/deleteannouncement', requireAuth, async (req, res) => {
    const announcementid = req.body['announcementid'];

    try {
        await deleteAnnouncement(announcementid);
        res.redirect('/ojt-dashboard');
    } catch (error) {
        console.error('Error deleting announcement: ', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
})

// note: added it here for now since it only needs adviser info like dashboard 
router.get("/ojt-about-us", requireAuth, async (req, res) => {
    try {
        const adviser = await fetchAdviser(req.session.adviserID);
        if (adviser) {
           
            res.render('ojt-about-us/index', { adviser })
        } else {
            res.redirect('/ojt-login-page');
        }
    } catch (error) {
        console.error('Error loading about-us page:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

module.exports = router;
