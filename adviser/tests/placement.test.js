const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const STUDENT = 9900095;
const OTHER_STUDENT = 9900096;

let adviser;
let otherAdviser;
let agent;
let csrfToken;
let internID;
let otherInternID;

beforeAll(async () => {
    adviser = await createTestAdviser('place');
    otherAdviser = await createTestAdviser('place2');
    for (const studentID of [STUDENT, OTHER_STUDENT]) {
        await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Test Placement', 'BSCS', '4', 'T1')", [studentID]);
    }
    [{ insertId: internID }] = await pool.query("INSERT INTO interns (adviserid, studentid, status) VALUES (?, ?, 'ENROLLED')", [adviser.adviserID, STUDENT]);
    [{ insertId: otherInternID }] = await pool.query("INSERT INTO interns (adviserid, studentid, status) VALUES (?, ?, 'ENROLLED')", [otherAdviser.adviserID, OTHER_STUDENT]);
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, `/adviser/interns/${internID}/placement`);
});

afterEach(async () => {
    await pool.query('DELETE FROM endorsements WHERE internid IN (?)', [[internID, otherInternID]]);
    await pool.query("UPDATE interns SET status = 'ENROLLED', companyid = NULL WHERE internid IN (?)", [[internID, otherInternID]]);
});

afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await pool.query('DELETE FROM interns WHERE internid IN (?)', [[internID, otherInternID]]);
    await pool.query('DELETE FROM students WHERE studentID IN (?)', [[STUDENT, OTHER_STUDENT]]);
    await deleteTestAdviser(adviser.adviserID);
    await deleteTestAdviser(otherAdviser.adviserID);
    await closeDatabase();
});

function place(intern, companyId) {
    return agent.post(`/adviser/interns/${intern}/placement`).type('form').send({ csrf_token: csrfToken, companyId: String(companyId) });
}

async function internRow(id) {
    const [[row]] = await pool.query('SELECT status, companyid FROM interns WHERE internid = ?', [id]);
    return row;
}

test('the intern menu links to Record placement', async () => {
    const res = await agent.get(`/adviser/interns/${internID}/requirements`);

    expect(res.text).toContain(`href="/adviser/interns/${internID}/placement">Record placement`);
});

test('recording a placement sets the company and waits for deployment', async () => {
    const res = await place(internID, 2);

    expect(res.headers.location).toBe(`/adviser/interns/${internID}/requirements`);
    expect(await internRow(internID)).toEqual({ status: 'PENDING', companyid: 2 });
    const [[logged]] = await pool.query("SELECT COUNT(*) AS n FROM audit_log WHERE actor_adviser_id = ? AND action = 'placement_recorded'", [adviser.adviserID]);
    expect(logged.n).toBe(1);
});

test('changing the company removes the endorsement for the old one', async () => {
    await place(internID, 2);
    await pool.query("INSERT INTO endorsements (internid, companyid, contact_name, contact_email) VALUES (?, 2, 'HR', 'hr@test.test')", [internID]);

    await place(internID, 3);

    expect(await internRow(internID)).toEqual({ status: 'PENDING', companyid: 3 });
    const [rows] = await pool.query('SELECT * FROM endorsements WHERE internid = ?', [internID]);
    expect(rows).toHaveLength(0);
});

test('a company that does not exist is refused', async () => {
    const res = await place(internID, 999999);

    expect(res.status).toBe(400);
    expect(res.text).toContain('Choose the company that accepted the intern.');
    expect(await internRow(internID)).toEqual({ status: 'ENROLLED', companyid: null });
});

test('a deployed intern keeps their company', async () => {
    await pool.query("UPDATE interns SET status = 'ACTIVE', companyid = 2 WHERE internid = ?", [internID]);

    const res = await place(internID, 3);

    expect(res.headers.location).toBe(`/adviser/interns/${internID}/requirements`);
    expect(await internRow(internID)).toEqual({ status: 'ACTIVE', companyid: 2 });
});

test("another adviser's intern gives 404 and stays unchanged", async () => {
    expect((await agent.get(`/adviser/interns/${otherInternID}/placement`)).status).toBe(404);
    expect((await place(otherInternID, 2)).status).toBe(404);
    expect(await internRow(otherInternID)).toEqual({ status: 'ENROLLED', companyid: null });
});
