const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs } = require('./helpers/auth');

const STUDENTS = [
    [9900401, 'Page Active'],
    [9900402, 'Page Withdrawn'],
];
const OTHER_ADVISERS_INTERN = 300;

let adviser;
let agent;
const internIds = {};

beforeAll(async () => {
    adviser = await createTestAdviser('intern-page');
    for (const [id, name] of STUDENTS) {
        await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, ?, 'BSCS', '4', 'P1')", [id, name]);
    }
    let [row] = await pool.query("INSERT INTO interns (adviserid, studentid, status, deployed_on) VALUES (?, 9900401, 'ACTIVE', '2026-09-01')", [adviser.adviserID]);
    internIds.active = row.insertId;
    [row] = await pool.query("INSERT INTO interns (adviserid, studentid, status, withdrawn_from) VALUES (?, 9900402, 'WITHDRAWN', 'ENROLLED')", [adviser.adviserID]);
    internIds.withdrawn = row.insertId;

    agent = await loginAs(app, adviser.email);
});

afterAll(async () => {
    await pool.query('DELETE FROM interns WHERE internid IN (?)', [Object.values(internIds)]);
    await pool.query('DELETE FROM students WHERE studentID IN (?)', [STUDENTS.map(([id]) => id)]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test.each(['requirements', 'weekly-reports', 'journals'])('the %s tab shows the intern header with that tab open', async (tab) => {
    const page = await agent.get(`/adviser/interns/${internIds.active}/${tab}`);

    expect(page.status).toBe(200);
    expect(page.text).toContain('<h1>Page Active</h1>');
    expect(page.text).toContain('9900401 · BSCS · Section P1');
    expect(page.text).toContain('Deployed since Sep 1');
    expect(page.text).toContain(`href="/adviser/interns/${internIds.active}/${tab}" aria-current="page"`);
});

test('the menu of a deployed intern offers finish and withdraw, not deploy', async () => {
    const page = await agent.get(`/adviser/interns/${internIds.active}/requirements`);

    expect(page.text).toContain(`/interns/${internIds.active}/finish`);
    expect(page.text).toContain(`/interns/${internIds.active}/withdraw`);
    expect(page.text).not.toContain(`/interns/${internIds.active}/deploy`);
});

test('the menu of a withdrawn intern offers only undo', async () => {
    const page = await agent.get(`/adviser/interns/${internIds.withdrawn}/requirements`);

    expect(page.text).toContain('Undo withdraw');
    expect(page.text).not.toContain(`/interns/${internIds.withdrawn}/withdraw"`);
});

test.each(['requirements', 'weekly-reports', 'journals'])('the %s tab of another adviser\'s intern is not found', async (tab) => {
    const page = await agent.get(`/adviser/interns/${OTHER_ADVISERS_INTERN}/${tab}`);

    expect(page.status).toBe(404);
});
