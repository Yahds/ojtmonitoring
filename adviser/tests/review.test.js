const app = require('../app');
const { closeDatabase } = require('../db');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

let adviser;
let agent;
let csrfToken;

beforeAll(async () => {
    adviser = await createTestAdviser('review');
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/ojt-dashboard/enroll');
});

afterAll(async () => {
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test.each([
    ['requirements', '/ojt-dashboard/requirements-review/1'],
    ['weekly reports', '/ojt-dashboard/weekly-reports-review/1'],
    ['journals', '/ojt-dashboard/journals-review/1'],
])('%s: an invalid decision sends the adviser back with an error', async (_label, url) => {
    const res = await agent.post(url).type('form').send({ decision: 'MAYBE', csrf_token: csrfToken });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(url);

    const page = await agent.get(url);
    expect(page.text).toContain('Choose Approve or Reject.');
});
