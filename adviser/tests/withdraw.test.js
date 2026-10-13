const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const STUDENT_ID = 9900050;
let adviser;
let agent;
let csrfToken;
let internId;

beforeAll(async () => {
    adviser = await createTestAdviser('withdraw');
    await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Test Withdraw', 'BSCS', '4', 'T1')", [STUDENT_ID]);
    const [result] = await pool.query("INSERT INTO interns (adviserid, studentid, companyid, status) VALUES (?, ?, 2, 'PENDING')", [adviser.adviserID, STUDENT_ID]);
    internId = result.insertId;
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/interns');
});

afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await pool.query('DELETE FROM interns WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM students WHERE studentID = ?', [STUDENT_ID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

const withdrawUrl = () => `/adviser/interns/${internId}/withdraw`;

async function intern() {
    const [[row]] = await pool.query('SELECT status, withdrawn_from, withdrawn_reason FROM interns WHERE internid = ?', [internId]);
    return row;
}

async function auditActions() {
    const [rows] = await pool.query('SELECT action FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    return rows.map(row => row.action);
}

test('"Other" without details is refused', async () => {
    const res = await agent.post(withdrawUrl()).type('form').send({ reason: 'Other', details: '', csrf_token: csrfToken });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Write the reason.');
    expect((await intern()).status).toBe('PENDING');
});

test('withdrawing saves the reason and the status from before', async () => {
    await agent.post(withdrawUrl()).type('form').send({ reason: 'Company withdrew the offer', details: 'Hiring freeze', csrf_token: csrfToken });

    expect(await intern()).toEqual({
        status: 'WITHDRAWN',
        withdrawn_from: 'PENDING',
        withdrawn_reason: 'Company withdrew the offer: Hiring freeze',
    });
    expect(await auditActions()).toContain('intern_withdrawn');
});

test('the interns list shows the withdrawn status, the reason and an undo button', async () => {
    const page = await agent.get('/adviser/interns');

    expect(page.text).toContain('Withdrawn');
    expect(page.text).toContain('Company withdrew the offer: Hiring freeze');
    expect(page.text).toContain('Undo withdraw');
});

test('undo puts the intern back to the status they had', async () => {
    await agent.post(`/adviser/interns/${internId}/undo-withdraw`).type('form').send({ csrf_token: csrfToken });

    expect(await intern()).toEqual({ status: 'PENDING', withdrawn_from: null, withdrawn_reason: null });
    expect(await auditActions()).toContain('withdraw_undone');
});
