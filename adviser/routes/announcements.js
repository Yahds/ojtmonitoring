const express = require('express');
const {
    fetchAdviserSections, insertAnnouncement, fetchAnnouncements, fetchAnnouncement, updateAnnouncement, deleteAnnouncement,
} = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');
const { attachmentError, saveAttachment, removeAttachment, attachmentPath } = require('../lib/attachments');

const router = express.Router();

const MAX_MESSAGE = 5000;

async function showAnnouncements(req, res, status, values, errors) {
    const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const page = Number.parseInt(req.query.page, 10) || 1;
    const [sections, list] = await Promise.all([
        fetchAdviserSections(req.session.adviserID),
        fetchAnnouncements(req.session.adviserID, search, page),
    ]);
    // keeps the search when moving between pages
    const pageHref = n => `/adviser/announcements?${new URLSearchParams(search ? { q: search, page: n } : { page: n })}`;
    res.status(status).render('pages/announcements', {
        title: 'Announcements', sections, values, errors, search, pageHref, ...list,
    });
}

async function showEdit(req, res, status, announcement, values, errors) {
    const sections = await fetchAdviserSections(req.session.adviserID);
    // an old post can stay on a section the adviser no longer has
    if (announcement.audience && !sections.includes(announcement.audience)) {
        sections.push(announcement.audience);
    }
    res.status(status).render('pages/announcement-edit', {
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
    const fileError = attachmentError(req);
    if (fileError) {
        errors.attachment = fileError;
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

        const file = req.file ? await saveAttachment(req.file) : { filePath: null, fileName: null };
        const id = await insertAnnouncement(req.session.adviserID, {
            audience: values.audience || null, subject: values.subject, message: values.message, ...file,
        });
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

        let file = { filePath: announcement.file_path, fileName: announcement.file_name };
        if (req.file) {
            file = await saveAttachment(req.file);
        } else if (req.body.remove_attachment === '1') {
            file = { filePath: null, fileName: null };
        }
        await updateAnnouncement(announcement.announcementid, req.session.adviserID, {
            audience: values.audience || null, subject: values.subject, message: values.message, ...file,
        });
        // the old file is only removed after the post no longer points to it
        if (announcement.file_path && file.filePath !== announcement.file_path) {
            await removeAttachment(announcement.file_path);
        }
        await audit(req, 'announcement_edited', String(announcement.announcementid));
        req.flash('success', 'Announcement updated.');
        res.redirect('/adviser/announcements');
    } catch (error) {
        next(error);
    }
});

router.get('/announcements/:announcementId/file', requireAdviser, async (req, res, next) => {
    try {
        const announcement = await fetchAnnouncement(req.params.announcementId, req.session.adviserID);
        if (!announcement || !announcement.file_path) {
            return next();
        }
        res.download(attachmentPath(announcement.file_path), announcement.file_name, {
            headers: { 'X-Content-Type-Options': 'nosniff' },
        }, error => {
            if (error && !res.headersSent) {
                next(); // the row is there but the file is gone
            }
        });
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
        res.render('pages/announcement-delete', { title: 'Delete announcement', announcement });
    } catch (error) {
        next(error);
    }
});

router.post('/announcements/delete', requireAdviser, async (req, res, next) => {
    try {
        const announcement = await fetchAnnouncement(req.body.announcementid, req.session.adviserID);
        if (!announcement) {
            return next(); // not this adviser's post, so it ends on the 404 page
        }
        await deleteAnnouncement(announcement.announcementid, req.session.adviserID);
        await removeAttachment(announcement.file_path);
        await audit(req, 'announcement_deleted', String(announcement.announcementid));
        req.flash('success', 'Announcement deleted.');
        res.redirect('/adviser/announcements');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
