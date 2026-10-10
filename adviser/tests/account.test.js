const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { TEST_PASSWORD, createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const NEW_PASSWORD = 'blue tables walk slowly';

let adviser;

beforeEach(async () => {
    adviser = await createTestAdviser('account');
});

afterEach(async () => {
    await deleteTestAdviser(adviser.adviserID);
});

afterAll(async () => {
    await closeDatabase();
});

async function changePassword(agent, fields) {
    const csrfToken = await csrfTokenFrom(agent, '/adviser/account/password');
    return agent.post('/adviser/account/password').type('form').send({ ...fields, csrf_token: csrfToken });
}

test('the right current password and a good new one changes the password', async () => {
    const agent = await loginAs(app, adviser.email);

    const res = await changePassword(agent, { currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });

    expect(res.status).toBe(302);
    const again = await loginAs(app, adviser.email, NEW_PASSWORD);
    expect((await again.get('/adviser/dashboard')).status).toBe(200);
});

test('a wrong current password changes nothing', async () => {
    const agent = await loginAs(app, adviser.email);

    const res = await changePassword(agent, { currentPassword: 'not-my-password', newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Your current password is wrong.');
    const again = await loginAs(app, adviser.email);
    expect((await again.get('/adviser/dashboard')).status).toBe(200);
});

test('a short new password is refused with the reason', async () => {
    const agent = await loginAs(app, adviser.email);

    const res = await changePassword(agent, { currentPassword: TEST_PASSWORD, newPassword: 'short', confirmPassword: 'short' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Use at least 15 characters.');
});

test('an adviser with a temporary password must change it before anything else', async () => {
    await pool.query('UPDATE advisers SET must_change_password = 1 WHERE adviserID = ?', [adviser.adviserID]);
    const agent = await loginAs(app, adviser.email);

    expect((await agent.get('/adviser/dashboard')).headers.location).toBe('/adviser/account/password');

    await changePassword(agent, { currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    expect((await agent.get('/adviser/dashboard')).status).toBe(200);
});
