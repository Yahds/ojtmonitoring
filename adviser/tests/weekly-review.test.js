const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs } = require('./helpers/auth');

const STUDENT_ID = 9900095;

let adviser;
let agent;
let internId;

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
    await pool.query("INSERT INTO weeklyreports (internid, weeknumber, hours, status) VALUES (?, 1, 200, 'APPROVED'), (?, 3, 39.5, 'APPROVED')", [internId, internId]);

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
