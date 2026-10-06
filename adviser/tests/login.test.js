const db = require('../db');
const fetchStudentsCalls = jest.spyOn(db, 'fetchStudents');
const app = require('../app');
const request = require('supertest');
const { closeDatabase } = require('../db');
const { TEST_PASSWORD, createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

let adviser;

beforeAll(async () => {
    adviser = await createTestAdviser('login');
});

afterAll(async () => {
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test('a logged-in adviser can open the dashboard', async () => {
    const agent = await loginAs(app, adviser.email);
    const res = await agent.get('/ojt-dashboard/');
    expect(res.status).toBe(200);
});

test.each(['/', '/ojt-login-page/'])('logged-in GET %s redirects to the dashboard without loading the login page', async (url) => {
    const agent = await loginAs(app, adviser.email);
    fetchStudentsCalls.mockClear();

    const res = await agent.get(url);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/ojt-dashboard');
    expect(fetchStudentsCalls).not.toHaveBeenCalled();
});


test('logging again in the same browser starts a new session', async () => {
    const agent = request.agent(app);
    const form = { adviserEmail: adviser.email, password: TEST_PASSWORD };
    const sessionId = (res) => res.headers['set-cookie'][0].split(';')[0];

    const firstToken = await csrfTokenFrom(agent, '/ojt-login-page/');
    const first = await agent.post('/ojt-login-page').type('form').send({ ...form, csrf_token: firstToken });

    const secondToken = await csrfTokenFrom(agent, '/ojt-dashboard/');
    const second = await agent.post('/ojt-login-page').type('form').send({ ...form, csrf_token: secondToken });

    expect(second.headers['set-cookie']).toBeDefined();
    expect(sessionId(second)).not.toBe(sessionId(first));
});


