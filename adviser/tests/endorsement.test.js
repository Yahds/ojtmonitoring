const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const STUDENT_IDS = [9900020, 9900021];
let adviser;
let other;
let agent;
let otherAgent;
let csrfToken;
let internIds = [];

beforeAll(async () => {
    adviser = await createTestAdviser('endorse');
    other = await createTestAdviser('endorse-other');
    for (const studentId of STUDENT_IDS) {
        await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, ?, 'BSCS', '4', 'T1')", [studentId, `Test Endorse ${studentId}`]);
        const [result] = await pool.query("INSERT INTO interns (adviserid, studentid, companyid, status) VALUES (?, ?, 2, 'PENDING')", [adviser.adviserID, studentId]);
        internIds.push(result.insertId);
        await pool.query("INSERT INTO endorsements (internid, companyid, contact_name, contact_email) VALUES (?, 2, 'Ana Reyes', 'hr@company.test')", [result.insertId]);
    }
    agent = await loginAs(app, adviser.email);
    otherAgent = await loginAs(app, other.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/endorsements');
});

afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id IN (?, ?)', [adviser.adviserID, other.adviserID]);
    await pool.query('DELETE FROM endorsements WHERE internid IN (?)', [internIds]);
    await pool.query('DELETE FROM interns WHERE internid IN (?)', [internIds]);
    await pool.query('DELETE FROM students WHERE studentID IN (?)', [STUDENT_IDS]);
    await deleteTestAdviser(adviser.adviserID);
    await deleteTestAdviser(other.adviserID);
    await closeDatabase();
});

async function statuses() {
    const [rows] = await pool.query('SELECT status FROM endorsements WHERE internid IN (?) ORDER BY internid', [internIds]);
    return rows.map(row => row.status);
}

test('the adviser sees the forms their interns sent', async () => {
    const res = await agent.get('/adviser/endorsements');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Test Endorse 9900020');
    expect(res.text).toContain('hr@company.test');
});

test("another adviser does not see them and cannot move them", async () => {
    const page = await otherAgent.get('/adviser/endorsements');
    expect(page.text).not.toContain('Test Endorse 9900020');

    const otherToken = await csrfTokenFrom(otherAgent, '/adviser/endorsements');
    await otherAgent.post('/adviser/endorsements/sent').type('form').send({ internIds, csrf_token: otherToken });

    expect(await statuses()).toEqual(['REQUESTED', 'REQUESTED']);
});

test('pressing the button with nothing ticked shows a message', async () => {
    await agent.post('/adviser/endorsements/sent').type('form').send({ csrf_token: csrfToken });

    expect((await agent.get('/adviser/endorsements')).text).toContain('Select at least one intern first.');
});

test('a reply form cannot be marked before the letter is sent', async () => {
    await agent.post('/adviser/endorsements/reply-received').type('form').send({ internIds, csrf_token: csrfToken });

    expect(await statuses()).toEqual(['REQUESTED', 'REQUESTED']);
});

test('several interns move forward with one click, each with an audit row', async () => {
    await agent.post('/adviser/endorsements/sent').type('form').send({ internIds, csrf_token: csrfToken });
    expect(await statuses()).toEqual(['SENT', 'SENT']);

    await agent.post('/adviser/endorsements/reply-received').type('form').send({ internIds, csrf_token: csrfToken });
    expect(await statuses()).toEqual(['ACCEPTED', 'ACCEPTED']);

    const [events] = await pool.query("SELECT COUNT(*) AS total FROM audit_log WHERE actor_adviser_id = ? AND action LIKE 'endorsement_%'", [adviser.adviserID]);
    expect(events[0].total).toBe(4);
});
