const db = require('../db');
const fetchStudentsCalls = jest.spyOn(db, 'fetchStudents');
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


test.each(['/', '/ojt-login-page/'])('logged-in GET %s redirects to the dashboard without loading the login page', async (url) => {
    const agent = await loginAs(app, adviser.email);
    fetchStudentsCalls.mockClear();

    const res = await agent.get(url);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/ojt-dashboard');
    expect(fetchStudentsCalls).not.toHaveBeenCalled();
});

