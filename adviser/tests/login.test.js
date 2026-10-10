const { pool } = require('../db/pool');
const db = require('../db');
const fetchStudentsCalls = jest.spyOn(db, 'fetchStudents');
const app = require('../app');
const request = require('supertest');
const { closeDatabase } = require('../db');
const { TEST_PASSWORD, createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

let adviser;
let head;

beforeAll(async () => {
    adviser = await createTestAdviser('login');
    head = await createTestAdviser('login-head');
    await pool.query("UPDATE advisers SET role = 'dept_head' WHERE adviserID = ?", [head.adviserID]);
});

afterAll(async () => {
    await deleteTestAdviser(adviser.adviserID);
    await deleteTestAdviser(head.adviserID);
    await closeDatabase();
});

test('a logged-in adviser can open the dashboard', async () => {
    const agent = await loginAs(app, adviser.email);
    const res = await agent.get('/adviser/dashboard');
    expect(res.status).toBe(200);
});

test.each(['/', '/adviser/login'])('logged-in GET %s redirects to the dashboard without loading the login page', async (url) => {
    const agent = await loginAs(app, adviser.email);
    fetchStudentsCalls.mockClear();

    const res = await agent.get(url);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/adviser/dashboard');
    expect(fetchStudentsCalls).not.toHaveBeenCalled();
});


test('logging again in the same browser starts a new session', async () => {
    const agent = request.agent(app);
    const form = { adviserEmail: adviser.email, password: TEST_PASSWORD };
    const sessionId = (res) => res.headers['set-cookie'][0].split(';')[0];

    const firstToken = await csrfTokenFrom(agent, '/adviser/login');
    const first = await agent.post('/adviser/login').type('form').send({ ...form, csrf_token: firstToken });

    const secondToken = await csrfTokenFrom(agent, '/adviser/dashboard');
    const second = await agent.post('/adviser/login').type('form').send({ ...form, csrf_token: secondToken });

    expect(second.headers['set-cookie']).toBeDefined();
    expect(sessionId(second)).not.toBe(sessionId(first));
});

test('dept head is sent to the overview, not the adviser dashboard', async () => {
    const agent = await loginAs(app, head.email);

    const res = await agent.get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/adviser/admin');
});

test('wrong password shows the login page again with a general error', async () => {
    const agent = request.agent(app);
    const csrfToken = await csrfTokenFrom(agent, '/adviser/login');

    const res = await agent
        .post('/adviser/login')
        .type('form')
        .send({ adviserEmail: adviser.email, password: 'wrong-password', csrf_token: csrfToken });

    expect(res.status).toBe(401);
    expect(res.text).toContain('Your email or password is wrong.');
    expect(res.text).toContain(`value="${adviser.email}"`);
    expect(res.text).not.toContain('wrong-password');
});

test('logout by GET does nothing', async () => {
    const agent = await loginAs(app, adviser.email);

    const res = await agent.get('/adviser/logout');

    expect(res.status).toBe(404);
    expect((await agent.get('/adviser/dashboard')).status).toBe(200);
});

test('logout by POST ends the session', async () => {
    const agent = await loginAs(app, adviser.email);
    const csrfToken = await csrfTokenFrom(agent, '/adviser/dashboard');

    await agent.post('/adviser/logout').type('form').send({ csrf_token: csrfToken });

    const res = await agent.get('/adviser/dashboard');
    expect(res.headers.location).toBe('/adviser/login');
});
