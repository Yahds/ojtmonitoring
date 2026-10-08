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
    csrfToken = await csrfTokenFrom(agent, '/ojt-admin/advisers');
});

afterAll(async () => {
    await pool.query('DELETE FROM advisers WHERE adviserEmail = ?', [NEW_ADVISER_EMAIL]);
    await deleteTestAdviser(head.adviserID);
    await closeDatabase();
});

test('adding an adviser shows them in the list with a success message', async () => {
    const res = await agent
        .post('/ojt-admin/advisers')
        .type('form')
        .send({ name: 'Test, Added', email: NEW_ADVISER_EMAIL, password: 'temp-pass-123', csrf_token: csrfToken });
    expect(res.headers.location).toBe('/ojt-admin/advisers');

    const page = await agent.get('/ojt-admin/advisers');
    expect(page.text).toContain('Test, Added added.');
    expect(page.text).toContain(NEW_ADVISER_EMAIL);
});
