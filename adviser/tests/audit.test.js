const request = require('supertest');
const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { TEST_PASSWORD, createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const NEW_PASSWORD = 'blue tables walk slowly';

let adviser;

beforeEach(async () => {
    adviser = await createTestAdviser('audit');
});

afterEach(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ? OR target = ?', [adviser.adviserID, adviser.email]);
    await deleteTestAdviser(adviser.adviserID);
});

afterAll(async () => {
    await closeDatabase();
});

async function actionsBy(adviserID) {
    const [rows] = await pool.query('SELECT action FROM audit_log WHERE actor_adviser_id = ? ORDER BY id', [adviserID]);
    return rows.map(row => row.action);
}

test('a login is recorded with how they logged in', async () => {
    await loginAs(app, adviser.email);

    const [rows] = await pool.query('SELECT action, target FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    expect(rows).toEqual([{ action: 'login', target: 'password' }]);
});

test('a wrong password is recorded, but never the password itself', async () => {
    const agent = request.agent(app);
    const token = await csrfTokenFrom(agent, '/adviser/login');

    await agent.post('/adviser/login').type('form').send({ adviserEmail: adviser.email, password: 'my-secret-guess', csrf_token: token });

    const [rows] = await pool.query('SELECT action, actor_adviser_id FROM audit_log WHERE target = ?', [adviser.email]);
    expect(rows).toEqual([{ action: 'login_failed', actor_adviser_id: null }]);
    const [leaks] = await pool.query("SELECT COUNT(*) AS total FROM audit_log WHERE target LIKE '%my-secret-guess%'");
    expect(leaks[0].total).toBe(0);
});

test('a password change and a logout are recorded', async () => {
    const agent = await loginAs(app, adviser.email);
    const token = await csrfTokenFrom(agent, '/adviser/account/password');

    await agent.post('/adviser/account/password').type('form')
        .send({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD, csrf_token: token });
    await agent.post('/adviser/logout').type('form').send({ csrf_token: token });

    expect(await actionsBy(adviser.adviserID)).toEqual(['login', 'password_changed', 'logout']);
});

test('the real visitor address from nginx is recorded', async () => {
    const agent = request.agent(app);
    const token = await csrfTokenFrom(agent, '/adviser/login');

    await agent.post('/adviser/login').set('X-Forwarded-For', '203.0.113.7').type('form')
        .send({ adviserEmail: adviser.email, password: 'wrong-password-123', csrf_token: token });

    const [rows] = await pool.query('SELECT ip FROM audit_log WHERE target = ?', [adviser.email]);
    expect(rows[0].ip).toBe('203.0.113.7');
});
