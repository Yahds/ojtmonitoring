const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

let adviser;
let agent;
let csrfToken;

beforeAll(async () => {
    adviser = await createTestAdviser('settings');
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/settings');
});

afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

async function rules() {
    const [rows] = await pool.query(
        "SELECT starts_on = CURDATE() + INTERVAL 1 DAY AS startsTomorrow, due_days FROM weekly_due_rules WHERE adviserid = ? ORDER BY starts_on",
        [adviser.adviserID]
    );
    return rows;
}

test('weekly reports are due the Monday after by default', async () => {
    const page = await agent.get('/adviser/settings');

    expect(page.status).toBe(200);
    expect(page.text).toMatch(/value="3" checked/);
});

test('a new due rule starts tomorrow, so weeks that already ended keep their due date', async () => {
    const res = await agent.post('/adviser/settings').type('form').send({ csrf_token: csrfToken, weeklyDueDays: '10' });

    expect(res.headers.location).toBe('/adviser/settings');
    expect(await rules()).toEqual([{ startsTomorrow: 1, due_days: 10 }]);
    const [events] = await pool.query("SELECT target FROM audit_log WHERE actor_adviser_id = ? AND action = 'settings_changed'", [adviser.adviserID]);
    expect(events.map(e => e.target)).toContain('weekly reports due 10 days after the week');
});

test('saving the same rule again or a value that is not a choice adds nothing', async () => {
    await agent.post('/adviser/settings').type('form').send({ csrf_token: csrfToken, weeklyDueDays: '10' });
    await agent.post('/adviser/settings').type('form').send({ csrf_token: csrfToken, weeklyDueDays: '400' });

    expect(await rules()).toEqual([{ startsTomorrow: 1, due_days: 10 }]);
    const page = await agent.get('/adviser/settings');
    expect(page.text).toMatch(/value="10" checked/);
});
