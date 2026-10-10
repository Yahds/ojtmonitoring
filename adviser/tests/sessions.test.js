const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { TEST_PASSWORD, createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const MINUTE = 60 * 1000;
const NEW_PASSWORD = 'blue tables walk slowly';

let adviser;

beforeEach(async () => {
    adviser = await createTestAdviser('sessions');
});

afterEach(async () => {
    jest.restoreAllMocks();
    await deleteTestAdviser(adviser.adviserID);
});

afterAll(async () => {
    await closeDatabase();
});

// pretends the clock moved forward, so the test does not wait 30 real minutes
function waitMinutes(minutes) {
    const later = Date.now() + minutes * MINUTE;
    jest.spyOn(Date, 'now').mockReturnValue(later);
}

test('sessions are kept in the database', async () => {
    await loginAs(app, adviser.email);

    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM sessions WHERE JSON_EXTRACT(data, '$.adviserID') = ?", [adviser.adviserID]);
    expect(rows[0].total).toBe(1);
});

test('30 minutes without activity logs the adviser out with a message', async () => {
    const agent = await loginAs(app, adviser.email);

    waitMinutes(31);
    const res = await agent.get('/adviser/dashboard');

    expect(res.headers.location).toBe('/adviser/login');
    const login = await agent.get('/adviser/login');
    expect(login.text).toContain('You were logged out after 30 minutes without activity.');
});

test('using the app keeps the session alive', async () => {
    const agent = await loginAs(app, adviser.email);

    waitMinutes(20);
    expect((await agent.get('/adviser/dashboard')).status).toBe(200);
    waitMinutes(20);
    expect((await agent.get('/adviser/dashboard')).status).toBe(200);
});

test('changing the password logs the adviser out everywhere else', async () => {
    const laptop = await loginAs(app, adviser.email);
    const phone = await loginAs(app, adviser.email);
    const csrfToken = await csrfTokenFrom(laptop, '/adviser/account/password');

    await laptop.post('/adviser/account/password').type('form')
        .send({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD, csrf_token: csrfToken });

    expect((await phone.get('/adviser/dashboard')).headers.location).toBe('/adviser/login');
    expect((await laptop.get('/adviser/dashboard')).status).toBe(200);
});

test('"Stay logged in" keeps the session alive', async () => {
    const agent = await loginAs(app, adviser.email);

    waitMinutes(29);
    expect((await agent.get('/adviser/session/keep-alive')).status).toBe(204);
    waitMinutes(29);

    expect((await agent.get('/adviser/dashboard')).status).toBe(200);
});

test('pages on the layout include the idle warning', async () => {
    const agent = await loginAs(app, adviser.email);

    const res = await agent.get('/adviser/interns');

    expect(res.text).toContain('id="idle-warning"');
});
