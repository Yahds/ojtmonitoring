const express = require('express');
const { fetchCourses, fetchTakenStudents, enrollInterns } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');
const { readClassList, COLUMNS, MAX_ROWS } = require('../lib/class-list');

const router = express.Router();

const PAGE = 'pages/intern-import';
const pageLocals = { title: 'Import class list', columns: COLUMNS, maxRows: MAX_ROWS };

router.get('/interns/import', requireAdviser, (req, res) => {
    res.render(PAGE, pageLocals);
});

router.post('/interns/import', requireAdviser, async (req, res, next) => {
    try {
        delete req.session.classList;
        if (req.uploadError || !req.file) {
            return res.status(400).render(PAGE, { ...pageLocals, fileError: req.uploadError || 'Choose a CSV file to upload.' });
        }

        const text = req.file.buffer.toString('utf8');
        const courses = (await fetchCourses()).map(course => course.code);
        // the first read finds the IDs and emails in the file, so the second one can mark those already enrolled
        const firstRead = readClassList(text, { courses });
        const taken = await fetchTakenStudents(firstRead.rows.map(row => row.id), firstRead.rows.map(row => row.email));
        const { rows, fileError } = readClassList(text, { courses, ...taken });
        const withErrors = rows.filter(row => row.errors.length);

        if (!fileError && !withErrors.length) {
            req.session.classList = rows.map(({ id, name, course, year, classcode, email }) => ({ id, name, course, year, classcode, email }));
        }
        res.status(fileError || withErrors.length ? 400 : 200).render(PAGE, {
            ...pageLocals, fileName: req.file.originalname, fileError, rows, withErrors,
        });
    } catch (error) {
        next(error);
    }
});

router.post('/interns/import/confirm', requireAdviser, async (req, res, next) => {
    const students = req.session.classList;
    if (!students || !students.length) {
        req.flash('error', 'Upload the class list again, then enroll.');
        return res.redirect('/adviser/interns/import');
    }

    try {
        await enrollInterns(students, req.session.adviserID);
        delete req.session.classList;
        await audit(req, 'class_list_imported', `${students.length} interns`);
        req.flash('success', `${students.length} ${students.length === 1 ? 'intern' : 'interns'} enrolled. They can now sign in with their SLU account.`);
        res.redirect('/adviser/interns');
    } catch (error) {
        // someone enrolled one of these students after the file was checked
        if (error.code === 'ER_DUP_ENTRY') {
            delete req.session.classList;
            req.flash('error', 'Some of these students were enrolled after you checked the file, so nothing was saved. Upload the file again to see which ones.');
            return res.redirect('/adviser/interns/import');
        }
        next(error);
    }
});

module.exports = router;
