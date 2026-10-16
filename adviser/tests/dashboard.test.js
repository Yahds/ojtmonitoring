const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs } = require('./helpers/auth');

const DATA_PRIVACY_CERTIFICATE = 6;
const STUDENTS = [
    [9900201, 'Dash Active', 'D1'],
    [9900202, 'Dash Ready', 'D1'],
    [9900203, 'Dash Other', 'D2'],
];

let adviser;
let agent;
const internIds = {};

beforeAll(async () => {
    adviser = await createTestAdviser('dashboard');
    for (const [id, name, section] of STUDENTS) {
        await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, ?, 'BSCS', '4', ?)", [id, name, section]);
    }
    const [[company]] = await pool.query('SELECT companyid FROM company LIMIT 1');

    // deployed a month ago and only sent week 1, so later weeks are missing
    let [row] = await pool.query("INSERT INTO interns (adviserid, studentid, status, deployed_on) VALUES (?, 9900201, 'ACTIVE', CURDATE() - INTERVAL 30 DAY)", [adviser.adviserID]);
    internIds.active = row.insertId;
    await pool.query("INSERT INTO weeklyreports (internid, weeknumber, hours, status, datesubmitted) VALUES (?, 1, 8, 'PENDING', CURDATE() - INTERVAL 4 DAY)", [row.insertId]);

    [row] = await pool.query("INSERT INTO interns (adviserid, studentid, status, companyid) VALUES (?, 9900202, 'PENDING', ?)", [adviser.adviserID, company.companyid]);
    internIds.ready = row.insertId;
    await pool.query("INSERT INTO endorsements (internid, companyid, contact_name, contact_email, status) VALUES (?, ?, 'HR', 'hr@example.com', 'ACCEPTED')", [row.insertId, company.companyid]);
    await pool.query("INSERT INTO internrequirements (internid, reqid, status) VALUES (?, ?, 'APPROVED')", [row.insertId, DATA_PRIVACY_CERTIFICATE]);

    [row] = await pool.query("INSERT INTO interns (adviserid, studentid, status) VALUES (?, 9900203, 'ENROLLED')", [adviser.adviserID]);
    internIds.other = row.insertId;

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

test('the dashboard shows what needs the adviser: reviews, missing weeks and who can be deployed', async () => {
    const page = await agent.get('/adviser/dashboard');

    expect(page.status).toBe(200);
    expect(page.text).toContain('Week 1 report');
    expect(page.text).toContain('Oldest waiting 4 days');
    expect(page.text).toMatch(/No week 2(, 3)?.* reports? yet/);
    expect(page.text).toContain(`href="/adviser/interns/${internIds.ready}/deploy"`);
    expect(page.text).toContain('Dash Other');
});

test('picking a section shows only that section', async () => {
    const page = await agent.get('/adviser/dashboard?section=D2');

    expect(page.text).toContain('Dash Other');
    expect(page.text).not.toContain('Dash Ready');
    expect(page.text).not.toContain('Week 1 report');
    expect(page.text).toMatch(/aria-current="page">D2/);
});

test('a section the adviser does not have is ignored', async () => {
    const page = await agent.get('/adviser/dashboard?section=NOPE');

    expect(page.text).toContain('Dash Ready');
    expect(page.text).toContain('Dash Other');
});
