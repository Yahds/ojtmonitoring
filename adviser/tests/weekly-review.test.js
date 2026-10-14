const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs } = require('./helpers/auth');

const STUDENT_ID = 9900095;

let adviser;
let agent;
let internId;
let reportId;

beforeAll(async () => {
    adviser = await createTestAdviser('weekly');
    await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Test Weekly', 'BSCS', '4', 'W1')", [STUDENT_ID]);
    const [result] = await pool.query("INSERT INTO interns (adviserid, studentid, status, deployed_on) VALUES (?, ?, 'ACTIVE', '2026-09-01')", [adviser.adviserID, STUDENT_ID]);
    internId = result.insertId;

    const [report] = await pool.query(
        `INSERT INTO weeklyreports (internid, weeknumber, week_start, hours, workdescription, supervisor_name, status, datesubmitted)
         VALUES (?, 2, '2026-09-07', 11.5, 'Built the login page', 'Joel Bautista', 'PENDING', '2026-09-14')`,
        [internId]
    );
    await pool.query(
        `INSERT INTO weeklyreport_days (reportid, work_date, am_in, am_out, pm_in, pm_out, hours) VALUES
         (?, '2026-09-07', '08:00', '12:00', '13:00', '17:00', 8), (?, '2026-09-08', '08:00', '11:30', NULL, NULL, 3.5)`,
        [report.insertId, report.insertId]
    );
    reportId = report.insertId;
    await pool.query(
        "INSERT INTO weeklyreport_absences (reportid, absent_date, part, reason, proof_type, proof_path) VALUES (?, '2026-09-09', 'DAY', 'Flu', 'MEDICAL', 'missing-proof.pdf')",
        [reportId]
    );
    await pool.query("INSERT INTO weeklyreports (internid, weeknumber, hours, status) VALUES (?, 1, 200, 'APPROVED'), (?, 3, 39.5, 'APPROVED')", [internId, internId]);
    await pool.query(
        `INSERT INTO weeklyreports (internid, weeknumber, kind, no_work_reason, hours, workdescription, status, datesubmitted)
         VALUES (?, 4, 'NO_WORK', 'CLOSED', 0, 'Office moved to a new building', 'PENDING', '2026-09-28')`,
        [internId]
    );

    agent = await loginAs(app, adviser.email);
});

afterAll(async () => {
    await pool.query('DELETE FROM weeklyreports WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM interns WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM students WHERE studentID = ?', [STUDENT_ID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test('the adviser sees each day with its morning and afternoon times', async () => {
    const page = await agent.get(`/adviser/interns/${internId}/weekly-reports`);

    expect(page.text).toContain('Mon, Sep 7');
    expect(page.text).toContain('8:00 AM – 12:00 PM');
    expect(page.text).toContain('>1:00 PM – 5:00 PM<');
    expect(page.text).toContain('3.5');
    expect(page.text).toContain('Supervisor: Joel Bautista');
    expect(page.text).toContain('Built the login page');
});

test('half hours are not rounded up when checking the target', async () => {
    const page = await agent.get(`/adviser/interns/${internId}/finish`);

    expect(page.text).toContain('239.5 of 240');
});

test('the adviser sees the absence report with a link to the proof', async () => {
    const page = await agent.get(`/adviser/interns/${internId}/weekly-reports`);

    expect(page.text).toContain('Absence report · 1 absence');
    expect(page.text).toContain('Wed, Sep 9');
    expect(page.text).toContain('Whole day');
    expect(page.text).toContain('Flu');
    expect(page.text).toContain(`href="/adviser/weekly-reports/${reportId}/absences/2026-09-09/proof">Medical certificate`);
});

test('a proof that is not on the report is not found', async () => {
    const res = await agent.get(`/adviser/weekly-reports/${reportId}/absences/2026-09-10/proof`);

    expect(res.status).toBe(404);
});

test('a no-work week shows why instead of hours and is in the review queue', async () => {
    const page = await agent.get(`/adviser/interns/${internId}/weekly-reports`);

    expect(page.text).toContain('Week 4 · No work this week');
    expect(page.text).toContain('Why: Company was closed.');
    expect(page.text).toContain('Office moved to a new building');

    const queue = await agent.get('/adviser/review');
    expect(queue.text).toContain('Week 4 · no work');
});
