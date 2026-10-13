const { fetchInterns, closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser } = require('./helpers/auth');

const BSIT_STUDENT_ID = 9900010;
let adviser;
let internId;

beforeAll(async () => {
    adviser = await createTestAdviser('hours');
    await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Test Hours', 'BSIT', '4', 'T1')", [BSIT_STUDENT_ID]);
    const [result] = await pool.query("INSERT INTO interns (adviserid, studentid, status) VALUES (?, ?, 'ACTIVE')", [adviser.adviserID, BSIT_STUDENT_ID]);
    internId = result.insertId;
    await pool.query("INSERT INTO weeklyreports (internid, weeknumber, hours, workdescription, status, datesubmitted) VALUES (?, 1, 300, 'test', 'APPROVED', CURDATE())", [internId]);
});

afterAll(async () => {
    await pool.query('DELETE FROM weeklyreports WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM interns WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM students WHERE studentID = ?', [BSIT_STUDENT_ID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test('a BSIT intern with 300 approved hours is not finished, because BSIT needs 600', async () => {
    const [intern] = await fetchInterns(adviser.adviserID);

    expect(intern.target_hours).toBe(600);
    expect(intern.status).toBe('ON GOING');
});

test('reaching exactly the target counts as finished', async () => {
    await pool.query("INSERT INTO weeklyreports (internid, weeknumber, hours, workdescription, status, datesubmitted) VALUES (?, 2, 300, 'test', 'APPROVED', CURDATE())", [internId]);

    const [intern] = await fetchInterns(adviser.adviserID);

    expect(intern.status).toBe('FINISHED');
});
