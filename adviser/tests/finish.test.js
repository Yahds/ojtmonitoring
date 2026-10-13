const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const STUDENT_ID = 9900040;
const CERTIFICATE_OF_COMPLETION = 8;
let adviser;
let agent;
let csrfToken;
let internId;

beforeAll(async () => {
    adviser = await createTestAdviser('finish');
    await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Test Finish', 'BSCS', '4', 'T1')", [STUDENT_ID]);
    const [result] = await pool.query("INSERT INTO interns (adviserid, studentid, companyid, status) VALUES (?, ?, 2, 'ACTIVE')", [adviser.adviserID, STUDENT_ID]);
    internId = result.insertId;
    await pool.query("INSERT INTO internrequirements (internid, reqid, status) VALUES (?, ?, 'PENDING')", [internId, CERTIFICATE_OF_COMPLETION]);
    await pool.query("INSERT INTO weeklyreports (internid, weeknumber, hours, workdescription, status, datesubmitted) VALUES (?, 1, 200, 'test', 'APPROVED', CURDATE())", [internId]);
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/interns');
});

afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await pool.query('DELETE FROM weeklyreports WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM internrequirements WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM interns WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM students WHERE studentID = ?', [STUDENT_ID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

const pageUrl = () => `/adviser/interns/${internId}/finish`;

async function intern() {
    const [[row]] = await pool.query(
        `SELECT status, evaluation_received_on IS NOT NULL AS evaluationReceived,
                finished_on = CURDATE() AS finishedToday
         FROM interns WHERE internid = ?`,
        [internId]
    );
    return row;
}

async function auditActions() {
    const [rows] = await pool.query('SELECT action FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    return rows.map(row => row.action);
}

test('the finish page shows the hours and what is missing', async () => {
    const res = await agent.get(pageUrl());

    expect(res.status).toBe(200);
    expect(res.text).toContain('200 of 240');
    expect(res.text).toContain('Missing');
    expect(res.text).not.toContain('Mark finished</button>');
});

test('an intern cannot be marked finished before everything is done', async () => {
    const res = await agent.post(pageUrl()).type('form').send({ csrf_token: csrfToken });

    expect(res.headers.location).toBe(pageUrl());
    expect((await intern()).status).toBe('ACTIVE');
});

test("marking the company's evaluation as received saves the date and an audit row", async () => {
    await agent.post(`${pageUrl()}/evaluation`).type('form').send({ csrf_token: csrfToken });

    expect((await intern()).evaluationReceived).toBe(1);
    expect(await auditActions()).toContain('evaluation_received');
});

test('with the hours, the certificate and the evaluation done, the intern is marked finished', async () => {
    await pool.query("INSERT INTO weeklyreports (internid, weeknumber, hours, workdescription, status, datesubmitted) VALUES (?, 2, 40, 'test', 'APPROVED', CURDATE())", [internId]);
    await pool.query("UPDATE internrequirements SET status = 'APPROVED' WHERE internid = ? AND reqid = ?", [internId, CERTIFICATE_OF_COMPLETION]);

    const res = await agent.post(pageUrl()).type('form').send({ csrf_token: csrfToken });

    expect(res.headers.location).toBe('/adviser/interns');
    expect(await intern()).toEqual({ status: 'FINISHED', evaluationReceived: 1, finishedToday: 1 });
    expect(await auditActions()).toContain('intern_finished');
});
