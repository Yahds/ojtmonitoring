const { parse } = require('csv-parse/sync');

const COLUMNS = ['student_id', 'name', 'course', 'year', 'section', 'email'];
const MAX_ROWS = 200;
const MAX_TEXT = 45; // students.studentName, year and classcode are VARCHAR(45)

// reads an uploaded class list and checks every row. `taken` holds the student IDs and emails
// already in the database. Each row keeps its line number in the file so errors can point to it.
function readClassList(text, { courses, takenIds = new Set(), takenEmails = new Set() }) {
    let lines;
    try {
        lines = parse(text, { bom: true, trim: true, skip_empty_lines: true, relax_column_count: true, info: true });
    } catch {
        return { rows: [], fileError: 'This file could not be read. In Excel, save it as "CSV UTF-8" and upload it again.' };
    }

    const [header, ...body] = lines;
    const names = header ? header.record.map(cell => cell.toLowerCase()) : [];
    const missing = COLUMNS.filter(column => !names.includes(column));
    if (missing.length) {
        return { rows: [], fileError: `The first row must name the columns: ${COLUMNS.join(', ')}. Missing: ${missing.join(', ')}.` };
    }
    if (!body.length) return { rows: [], fileError: 'The file has no students in it.' };
    if (body.length > MAX_ROWS) return { rows: [], fileError: `The file has ${body.length} students. Upload at most ${MAX_ROWS} at a time.` };

    const idsInFile = new Set();
    const emailsInFile = new Set();
    const rows = body.map(({ record, info }) => {
        const cell = column => record[names.indexOf(column)] || '';
        const row = {
            line: info.lines,
            id: cell('student_id'),
            name: cell('name'),
            course: cell('course').toUpperCase(),
            year: cell('year'),
            classcode: cell('section'),
            email: cell('email').toLowerCase(),
            errors: [],
        };

        if (!/^\d{1,9}$/.test(row.id)) row.errors.push('Student ID must be a number.');
        else if (takenIds.has(row.id)) row.errors.push('This student ID is already enrolled.');
        else if (idsInFile.has(row.id)) row.errors.push('This student ID is in the file twice.');
        if (!row.name) row.errors.push('Name is empty.');
        if (row.name.length > MAX_TEXT) row.errors.push(`Name is longer than ${MAX_TEXT} characters.`);
        if (!courses.includes(row.course)) row.errors.push(`Course must be one of: ${courses.join(', ')}.`);
        if (!/^[1-5]$/.test(row.year)) row.errors.push('Year must be a number from 1 to 5.');
        if (!row.classcode) row.errors.push('Section is empty.');
        if (row.classcode.length > MAX_TEXT) row.errors.push(`Section is longer than ${MAX_TEXT} characters.`);
        if (!row.email.includes('@')) row.errors.push('Email must be an email address.');
        else if (takenEmails.has(row.email)) row.errors.push('This email is already used by another student.');
        else if (emailsInFile.has(row.email)) row.errors.push('This email is in the file twice.');

        idsInFile.add(row.id);
        emailsInFile.add(row.email);
        return row;
    });
    return { rows, fileError: '' };
}

module.exports = { readClassList, COLUMNS, MAX_ROWS };
