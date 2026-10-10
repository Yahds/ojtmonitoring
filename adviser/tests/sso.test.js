jest.mock('../lib/sso', () => ({
    ssoEnabled: () => true,
    startLogin: jest.fn(),
    finishLogin: jest.fn(),
}));

const request = require('supertest');
const sso = require('../lib/sso');
const app = require('../app');
const { closeDatabase } = require('../db');
const { createTestAdviser, deleteTestAdviser } = require('./helpers/auth');

let adviser;

beforeAll(async () => {
    adviser = await createTestAdviser('sso');
});

afterAll(async () => {
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

beforeEach(() => {
    jest.clearAllMocks();
    sso.startLogin.mockResolvedValue({ url: 'http://sso.test/login', pending: { state: 'test-state' } });
});

async function signInWith(email) {
    sso.finishLogin.mockResolvedValue(email);
    const agent = request.agent(app);
    const start = await agent.get('/adviser/sso/start');
    expect(start.headers.location).toBe('http://sso.test/login');
    const res = await agent.get('/adviser/sso/callback?code=abc&state=test-state');
    return { agent, res };
}

test('the login page shows the SLU sign-in button', async () => {
    const res = await request(app).get('/adviser/login');
    expect(res.text).toContain('Sign in with SLU account');
});

test('a registered adviser who signs in with SLU is logged in', async () => {
    const { agent, res } = await signInWith(adviser.email);

    expect(res.headers.location).toBe('/adviser/dashboard');
    expect((await agent.get('/adviser/dashboard')).status).toBe(200);
});

test('an SLU account that is not an adviser is refused', async () => {
    const { res } = await signInWith('stranger@example.com');

    expect(res.status).toBe(403);
    expect(res.text).toContain('not registered in the OJT Portal');
});

test('a callback without a started sign-in is refused', async () => {
    const res = await request(app).get('/adviser/sso/callback?code=abc&state=forged');

    expect(res.status).toBe(400);
    expect(sso.finishLogin).not.toHaveBeenCalled();
});
