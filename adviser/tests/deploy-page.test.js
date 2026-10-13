const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const STUDENT_ID = 9900030;
const DATA_PRIVACY_CERTIFICATE = 6;
let adviser;
let agent;
let csrfToken;
let internId;

beforeAll(async () => {
    adviser = await createTestAdviser('deploy');
    await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Test Deploy', 'BSCS', '4', 'T1')", [STUDENT_ID]);
    const [result] = await pool.query("INSERT INTO interns (adviserid, studentid, companyid, status) VALUES (?, ?, 2, 'PENDING')", [adviser.adviserID, STUDENT_ID]);
    internId = result.insertId;
    await pool.query("INSERT INTO internrequirements (internid, reqid, status) VALUES (?, ?, 'PENDING')", [internId, DATA_PRIVACY_CERTIFICATE]);
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/interns');
});

afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await pool.query('DELETE FROM endorsements WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM internrequirements WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM interns WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM students WHERE studentID = ?', [STUDENT_ID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

const pageUrl = () => `/adviser/interns/${internId}/deploy`;

test('the deploy page shows what is missing, without a deploy button', async () => {
    const res = await agent.get(pageUrl());

    expect(res.status).toBe(200);
    expect(res.text).toContain('Endorsement reply form received');
    expect(res.text).toContain('Missing');
    expect(res.text).not.toContain('Deploy intern</button>');
});

test('when everything is done, a start date that does not exist is refused', async () => {
    await pool.query(
        "INSERT INTO endorsements (internid, companyid, contact_name, contact_email, status, start_date) VALUES (?, 2, 'Ana Reyes', 'hr@company.test', 'ACCEPTED', '2026-11-03')",
        [internId]
    );
    await pool.query("UPDATE internrequirements SET status = 'APPROVED' WHERE internid = ? AND reqid = ?", [internId, DATA_PRIVACY_CERTIFICATE]);

    const res = await agent.post(pageUrl()).type('form').send({ startDate: '2026-02-31', csrf_token: csrfToken });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Enter a real date.');
});

test('the start date comes from the endorsement form, and deploying saves it with an audit row', async () => {
    expect((await agent.get(pageUrl())).text).toContain('value="2026-11-03"');

    const res = await agent.post(pageUrl()).type('form').send({ startDate: '2026-11-03', csrf_token: csrfToken });

    expect(res.headers.location).toBe('/adviser/interns');
    const [[intern]] = await pool.query("SELECT status, DATE_FORMAT(deployed_on, '%Y-%m-%d') AS deployedOn FROM interns WHERE internid = ?", [internId]);
    expect(intern).toEqual({ status: 'ACTIVE', deployedOn: '2026-11-03' });
    const [events] = await pool.query("SELECT target FROM audit_log WHERE actor_adviser_id = ? AND action = 'intern_deployed'", [adviser.adviserID]);
    expect(events.map(e => e.target)).toEqual([String(internId)]);
});
