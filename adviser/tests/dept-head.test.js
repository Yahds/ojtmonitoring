const request = require('supertest');
const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const NEW_ADVISER_EMAIL = `test-added-${Date.now()}@example.com`;

let head;
let agent;
let csrfToken;

beforeAll(async () => {
    head = await createTestAdviser('head');
    await pool.query("UPDATE advisers SET role = 'dept_head' WHERE adviserID = ?", [head.adviserID]);
    agent = await loginAs(app, head.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/admin/advisers');
});

afterAll(async () => {
    await pool.query('DELETE FROM advisers WHERE adviserEmail = ?', [NEW_ADVISER_EMAIL]);
    await pool.query('DELETE FROM advisers WHERE adviserEmail = ?', [head.email]);
    await deleteTestAdviser(head.adviserID);
    await closeDatabase();
});

test('adding an adviser lists them, with no portal password', async () => {
    const res = await agent
        .post('/adviser/admin/advisers')
        .type('form')
        .send({ name: 'Test, Added', email: NEW_ADVISER_EMAIL, csrf_token: csrfToken });
    expect(res.headers.location).toBe('/adviser/admin/advisers');

    const page = await agent.get('/adviser/admin/advisers');
    expect(page.text).toContain('They can now sign in with their SLU account.');
    expect(page.text).toContain(NEW_ADVISER_EMAIL);
    const [rows] = await pool.query('SELECT password FROM advisers WHERE adviserEmail = ?', [NEW_ADVISER_EMAIL]);
    expect(rows[0].password).toBeNull();
});

test('an adviser with no portal password cannot log in with a password', async () => {
    const loginAgent = request.agent(app);
    const token = await csrfTokenFrom(loginAgent, '/adviser/login');

    const res = await loginAgent.post('/adviser/login').type('form').send({ adviserEmail: NEW_ADVISER_EMAIL, password: 'anything-at-all-123', csrf_token: token });

    expect(res.status).toBe(401);
});

test('adding an adviser with an email that is already used shows an error', async () => {
    const res = await agent
        .post('/adviser/admin/advisers')
        .type('form')
        .send({ name: 'Test, Copy', email: head.email.toUpperCase(), csrf_token: csrfToken });

    expect(res.status).toBe(400);
    expect(res.text).toContain('That email is already used by another account.');
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM advisers WHERE adviserEmail = ?', [head.email]);
    expect(rows[0].total).toBe(1);
});

describe('dept head can also handle their own interns', () => {
    test('opens the interns page', async () => {
        const res = await agent.get('/adviser/interns');
        expect(res.status).toBe(200);
    });

    test("does not see another adviser's interns", async () => {
        const res = await agent.get('/adviser/interns');
        expect(res.text).not.toContain('Maria Santos');
    });
});

