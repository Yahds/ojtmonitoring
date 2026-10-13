const request = require('supertest');
const app = require('../app');
const { closeDatabase } = require('../db');
const { TEST_PASSWORD, createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

let adviser;
let agent;

beforeAll(async () => {
    adviser = await createTestAdviser('csrf');
    agent = await loginAs(app, adviser.email);
});

afterAll(async () => {
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test('logging in without a CSRF token is rejected', async () => {
    const res = await request(app)
        .post('/adviser/login')
        .type('form')
        .send({ adviserEmail: adviser.email, password: TEST_PASSWORD });
    expect(res.status).toBe(403);
});

test.each([
    ['no', {}],
    ['a wrong', { csrf_token: 'a'.repeat(64) }],
])('a form sent with %s CSRF token is rejected', async (_label, body) => {
    const res = await agent.post('/adviser/interns/0/deploy').type('form').send(body);
    expect(res.status).toBe(403);
});

test('a form sent with the right CSRF token gets past the check', async () => {
    const csrfToken = await csrfTokenFrom(agent, '/adviser/dashboard');
    const res = await agent.post('/adviser/interns/0/deploy').type('form').send({ startDate: '2026-11-03', csrf_token: csrfToken });
    // only the deploy route itself sends this redirect, so the CSRF check let the form through
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/adviser/interns/0/deploy');
});
