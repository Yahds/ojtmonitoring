const express = require('express');
const {
    fetchAdviserSections, insertAnnouncement, fetchAnnouncements, fetchAnnouncement, updateAnnouncement, deleteAnnouncement,
} = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');

const router = express.Router();

const MAX_MESSAGE = 5000;

async function showAnnouncements(req, res, status, values, errors) {
    const [sections, announcements] = await Promise.all([
        fetchAdviserSections(req.session.adviserID),
        fetchAnnouncements(req.session.adviserID),
    ]);
    res.status(status).render('ojt-dashboard/views/announcements', {
        title: 'Announcements', sections, announcements, values, errors,
    });
}

async function showEdit(req, res, status, announcement, values, errors) {
    const sections = await fetchAdviserSections(req.session.adviserID);
    // an old post can stay on a section the adviser no longer has
    if (announcement.audience && !sections.includes(announcement.audience)) {
        sections.push(announcement.audience);
    }
    res.status(status).render('ojt-dashboard/views/announcement-edit', {
        title: 'Edit announcement', announcement, sections, values, errors,
    });
}

async function checkAnnouncementForm(req, currentAudience = null) {
    const text = name => (typeof req.body[name] === 'string' ? req.body[name].trim() : '');
    const values = { audience: text('audience'), subject: text('subject'), message: text('message') };
    const errors = {};

    // an empty audience means all sections; anything else must be one of this adviser's sections
    if (values.audience !== '' && values.audience !== currentAudience
        && !(await fetchAdviserSections(req.session.adviserID)).includes(values.audience)) {
        errors.audience = 'Select one of your sections, or all of them.';
    }
    if (values.subject === '' || values.subject.length > 255) {
        errors.subject = 'Write a subject, up to 255 characters.';
    }
    if (values.message === '' || values.message.length > MAX_MESSAGE) {
        errors.message = `Write the message, up to ${MAX_MESSAGE} characters.`;
    }
    return { values, errors, ok: Object.keys(errors).length === 0 };
}

router.get('/announcements', requireAdviser, async (req, res, next) => {
    try {
        await showAnnouncements(req, res, 200, {}, {});
    } catch (error) {
        next(error);
    }
});

router.post('/announcements', requireAdviser, async (req, res, next) => {
    try {
        const { values, errors, ok } = await checkAnnouncementForm(req);
        if (!ok) {
            return await showAnnouncements(req, res, 400, values, errors);
        }

        const id = await insertAnnouncement(req.session.adviserID, values.audience || null, values.subject, values.message);
        await audit(req, 'announcement_posted', String(id));
        req.flash('success', 'Announcement posted.');
        res.redirect('/adviser/announcements');
    } catch (error) {
        next(error);
    }
});

router.get('/announcements/:announcementId/edit', requireAdviser, async (req, res, next) => {
    try {
        const announcement = await fetchAnnouncement(req.params.announcementId, req.session.adviserID);
        if (!announcement) {
            return next();
        }
        const values = { audience: announcement.audience || '', subject: announcement.subject, message: announcement.message };
        await showEdit(req, res, 200, announcement, values, {});
    } catch (error) {
        next(error);
    }
});

router.post('/announcements/:announcementId/edit', requireAdviser, async (req, res, next) => {
    try {
        const announcement = await fetchAnnouncement(req.params.announcementId, req.session.adviserID);
        if (!announcement) {
            return next(); // not this adviser's post, so it ends on the 404 page
        }
        const { values, errors, ok } = await checkAnnouncementForm(req, announcement.audience);
        if (!ok) {
            return await showEdit(req, res, 400, announcement, values, errors);
        }

        await updateAnnouncement(announcement.announcementid, req.session.adviserID, values.audience || null, values.subject, values.message);
        await audit(req, 'announcement_edited', String(announcement.announcementid));
        req.flash('success', 'Announcement updated.');
        res.redirect('/adviser/announcements');
    } catch (error) {
        next(error);
    }
});

// a separate page asks before deleting, so a stray click cannot remove a post
router.get('/announcements/:announcementId/delete', requireAdviser, async (req, res, next) => {
    try {
        const announcement = await fetchAnnouncement(req.params.announcementId, req.session.adviserID);
        if (!announcement) {
            return next();
        }
        res.render('ojt-dashboard/views/announcement-delete', { title: 'Delete announcement', announcement });
    } catch (error) {
        next(error);
    }
});

router.post('/announcements/delete', requireAdviser, async (req, res, next) => {
    const announcementId = req.body.announcementid;
    try {
        if (await deleteAnnouncement(announcementId, req.session.adviserID) === 0) {
            return next(); // not this adviser's post, so it ends on the 404 page
        }
        await audit(req, 'announcement_deleted', String(announcementId));
        req.flash('success', 'Announcement deleted.');
        res.redirect('/adviser/announcements');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
