const app = require('../app');
const { closeDatabase } = require('../db');
const { createTestAdviser, deleteTestAdviser, loginAs } = require('./helpers/auth');

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
