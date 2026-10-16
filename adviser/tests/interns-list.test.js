const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs } = require('./helpers/auth');

const DATA_PRIVACY_CERTIFICATE = 6;
const STUDENTS = [
    [9900301, 'List Busy', 'L1'],
    [9900302, 'List Ready', 'L1'],
    [9900303, 'List Calm', 'L2'],
];

let adviser;
let agent;
const internIds = {};

beforeAll(async () => {
    adviser = await createTestAdviser('interns-list');
    for (const [id, name, section] of STUDENTS) {
        await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, ?, 'BSCS', '4', ?)", [id, name, section]);
    }
    const [[company]] = await pool.query('SELECT companyid FROM company LIMIT 1');

    // deployed a month ago, week 1 waits for review and later weeks are missing
    let [row] = await pool.query("INSERT INTO interns (adviserid, studentid, status, deployed_on) VALUES (?, 9900301, 'ACTIVE', CURDATE() - INTERVAL 30 DAY)", [adviser.adviserID]);
    internIds.busy = row.insertId;
    await pool.query("INSERT INTO weeklyreports (internid, weeknumber, hours, status, datesubmitted) VALUES (?, 1, 8, 'PENDING', CURDATE() - INTERVAL 4 DAY)", [row.insertId]);

    [row] = await pool.query("INSERT INTO interns (adviserid, studentid, status, companyid) VALUES (?, 9900302, 'PENDING', ?)", [adviser.adviserID, company.companyid]);
    internIds.ready = row.insertId;
    await pool.query("INSERT INTO endorsements (internid, companyid, contact_name, contact_email, status) VALUES (?, ?, 'HR', 'hr@example.com', 'ACCEPTED')", [row.insertId, company.companyid]);
    await pool.query("INSERT INTO internrequirements (internid, reqid, status) VALUES (?, ?, 'APPROVED')", [row.insertId, DATA_PRIVACY_CERTIFICATE]);

    [row] = await pool.query("INSERT INTO interns (adviserid, studentid, status) VALUES (?, 9900303, 'ENROLLED')", [adviser.adviserID]);
    internIds.calm = row.insertId;

    agent = await loginAs(app, adviser.email);
});

afterAll(async () => {
    const ids = Object.values(internIds);
    await pool.query('DELETE FROM weeklyreports WHERE internid IN (?)', [ids]);
    await pool.query('DELETE FROM endorsements WHERE internid IN (?)', [ids]);
    await pool.query('DELETE FROM internrequirements WHERE internid IN (?)', [ids]);
    await pool.query('DELETE FROM interns WHERE internid IN (?)', [ids]);
    await pool.query('DELETE FROM students WHERE studentID IN (?)', [STUDENTS.map(([id]) => id)]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test('the list says what each intern needs and puts them first', async () => {
    const page = await agent.get('/adviser/interns');

    expect(page.status).toBe(200);
    expect(page.text).toMatch(/Week 1 report to review · weeks? 2.* missing/);
    expect(page.text).toContain('Ready to deploy');
    expect(page.text).toContain(`href="/adviser/interns/${internIds.ready}/deploy"`);
    expect(page.text.indexOf('List Ready')).toBeLessThan(page.text.indexOf('List Calm'));
});

test('search finds an intern by student ID or by part of the name', async () => {
    const byId = await agent.get('/adviser/interns?q=9900302');
    expect(byId.text).toContain('List Ready');
    expect(byId.text).not.toContain('List Busy');

    const byName = await agent.get('/adviser/interns?q=calm');
    expect(byName.text).toContain('List Calm');
    expect(byName.text).not.toContain('List Ready');
});

test('the status filter shows only interns with that status', async () => {
    const page = await agent.get('/adviser/interns?status=PENDING');

    expect(page.text).toContain('List Ready');
    expect(page.text).not.toContain('List Busy');
    expect(page.text).not.toContain('List Calm');
});

test('a section chip keeps the search that is already typed', async () => {
    const page = await agent.get('/adviser/interns?q=list&section=L2');

    expect(page.text).toContain('List Calm');
    expect(page.text).not.toContain('List Busy');
    expect(page.text).toContain('href="/adviser/interns?q=list&amp;section=L1"');
});

test('an unknown section or status is ignored', async () => {
    const page = await agent.get('/adviser/interns?section=NOPE&status=NOPE');

    expect(page.text).toContain('List Busy');
    expect(page.text).toContain('List Calm');
});
