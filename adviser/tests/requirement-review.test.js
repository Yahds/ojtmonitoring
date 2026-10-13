const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const STUDENT_ID = 9900070;
const APPLICATION_LETTER = 1;
const CURRICULUM_VITAE = 3;

let adviser;
let agent;
let csrfToken;
let internId;

beforeAll(async () => {
    adviser = await createTestAdviser('reqreview');
    await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Test Review', 'BSCS', '4', 'T1')", [STUDENT_ID]);
    const [result] = await pool.query("INSERT INTO interns (adviserid, studentid, status) VALUES (?, ?, 'PENDING')", [adviser.adviserID, STUDENT_ID]);
    internId = result.insertId;
    await pool.query("INSERT INTO internrequirements (internid, reqid, status) VALUES (?, ?, 'PENDING'), (?, ?, 'PENDING')",
        [internId, APPLICATION_LETTER, internId, CURRICULUM_VITAE]);
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/interns');
});

afterEach(async () => {
    await pool.query('DELETE FROM requirement_versions WHERE internid = ?', [internId]);
    await pool.query("UPDATE internrequirements SET status = 'PENDING', remarks = NULL WHERE internid = ?", [internId]);
});

afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await pool.query('DELETE FROM internrequirements WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM interns WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM students WHERE studentID = ?', [STUDENT_ID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

// what the student app does on submit: the current state plus a new version
async function submit(reqid, versionNo) {
    await pool.query("UPDATE internrequirements SET status = 'SUBMITTED', datesubmitted = CURDATE() WHERE internid = ? AND reqid = ?", [internId, reqid]);
    await pool.query('INSERT INTO requirement_versions (internid, reqid, version_no) VALUES (?, ?, ?)', [internId, reqid, versionNo]);
}

function review(reqid, decision, remarks = '') {
    return agent.post(`/adviser/interns/${internId}/requirements`).type('form')
        .send({ csrf_token: csrfToken, reqid, decision, remarks });
}

async function requirement(reqid) {
    const [[row]] = await pool.query('SELECT status, remarks FROM internrequirements WHERE internid = ? AND reqid = ?', [internId, reqid]);
    return row;
}

async function versions(reqid) {
    const [rows] = await pool.query(
        'SELECT version_no, decision, remarks, reviewed_by FROM requirement_versions WHERE internid = ? AND reqid = ? ORDER BY version_no',
        [internId, reqid]
    );
    return rows;
}

test('approving saves the decision on the requirement and on its latest version only', async () => {
    await submit(APPLICATION_LETTER, 1);
    await submit(APPLICATION_LETTER, 2);

    await review(APPLICATION_LETTER, 'APPROVED', 'looks good');

    expect(await requirement(APPLICATION_LETTER)).toEqual({ status: 'APPROVED', remarks: 'looks good' });
    const [first, second] = await versions(APPLICATION_LETTER);
    expect(first.decision).toBeNull();
    expect(second).toEqual({ version_no: 2, decision: 'APPROVED', remarks: 'looks good', reviewed_by: adviser.adviserID });
});

test('a decision adds an audit row', async () => {
    await submit(APPLICATION_LETTER, 1);

    await review(APPLICATION_LETTER, 'REJECTED', 'wrong file');

    const [events] = await pool.query("SELECT target FROM audit_log WHERE actor_adviser_id = ? AND action = 'requirement_rejected'", [adviser.adviserID]);
    expect(events.map(e => e.target)).toContain(`intern ${internId} requirement ${APPLICATION_LETTER}: REJECTED`);
});

test('a requirement the intern has not submitted cannot be approved', async () => {
    const res = await review(CURRICULUM_VITAE, 'APPROVED');

    expect(res.headers.location).toBe(`/adviser/interns/${internId}/requirements`);
    expect((await requirement(CURRICULUM_VITAE)).status).toBe('PENDING');
    const page = await agent.get(res.headers.location);
    expect(page.text).toContain('Only a submitted requirement can be approved or rejected.');
});

test('a remark over 200 characters is refused', async () => {
    await submit(APPLICATION_LETTER, 1);

    await review(APPLICATION_LETTER, 'REJECTED', 'x'.repeat(201));

    expect((await requirement(APPLICATION_LETTER)).status).toBe('SUBMITTED');
});

test('the page shows the version number once the intern has resubmitted', async () => {
    await submit(APPLICATION_LETTER, 1);
    await submit(APPLICATION_LETTER, 2);

    const page = await agent.get(`/adviser/interns/${internId}/requirements`);

    expect(page.text).toContain('Version 2');
});

test('the versions page lists every version newest first with what happened to it', async () => {
    await submit(APPLICATION_LETTER, 1);
    await submit(APPLICATION_LETTER, 2);
    await review(APPLICATION_LETTER, 'REJECTED', 'still wrong');
    await submit(APPLICATION_LETTER, 3);

    const page = await agent.get(`/adviser/interns/${internId}/requirements/${APPLICATION_LETTER}/versions`);

    expect(page.status).toBe(200);
    const order = ['Version 3', 'Version 2', 'Version 1'].map(label => page.text.indexOf(label));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(page.text).toContain('Waiting for review');
    expect(page.text).toContain('still wrong');
    expect(page.text).toContain('Replaced');
});

test('the review page links to all versions once there is more than one', async () => {
    await submit(APPLICATION_LETTER, 1);
    await submit(APPLICATION_LETTER, 2);

    const page = await agent.get(`/adviser/interns/${internId}/requirements`);

    expect(page.text).toContain('All versions (2)');
});

test("cannot open another adviser's intern's versions or version files", async () => {
    const OTHER_ADVISERS_INTERN = 300;

    expect((await agent.get(`/adviser/interns/${OTHER_ADVISERS_INTERN}/requirements/${APPLICATION_LETTER}/versions`)).status).toBe(404);
    expect((await agent.get(`/adviser/interns/${OTHER_ADVISERS_INTERN}/requirements/${APPLICATION_LETTER}/versions/1/file`)).status).toBe(404);
});

function change(reqid, decision, remarks = '') {
    return agent.post(`/adviser/interns/${internId}/requirements/change`).type('form')
        .send({ csrf_token: csrfToken, reqid, decision, remarks });
}

test('an approval made by mistake can be changed to needs changes, which unlocks it', async () => {
    await submit(APPLICATION_LETTER, 1);
    await review(APPLICATION_LETTER, 'APPROVED', 'ok');

    await change(APPLICATION_LETTER, 'REJECTED', 'wrong intern, sorry');

    expect(await requirement(APPLICATION_LETTER)).toEqual({ status: 'REJECTED', remarks: 'wrong intern, sorry' });
    const [version] = await versions(APPLICATION_LETTER);
    expect(version.decision).toBe('REJECTED');
    const [events] = await pool.query("SELECT target FROM audit_log WHERE actor_adviser_id = ? AND action = 'requirement_review_changed'", [adviser.adviserID]);
    expect(events.map(e => e.target)).toContain(`intern ${internId} requirement ${APPLICATION_LETTER}: REJECTED`);
});

test('editing the remark changes only the latest version, older ones keep theirs', async () => {
    await submit(APPLICATION_LETTER, 1);
    await review(APPLICATION_LETTER, 'REJECTED', 'first remark');
    await submit(APPLICATION_LETTER, 2);
    await review(APPLICATION_LETTER, 'REJECTED', 'second remark');

    await change(APPLICATION_LETTER, 'REJECTED', 'second remark, reworded');

    const [first, second] = await versions(APPLICATION_LETTER);
    expect(first.remarks).toBe('first remark');
    expect(second.remarks).toBe('second remark, reworded');
});

test('a requirement that is waiting for review cannot be changed, only reviewed', async () => {
    await submit(APPLICATION_LETTER, 1);

    await change(APPLICATION_LETTER, 'APPROVED');

    expect((await requirement(APPLICATION_LETTER)).status).toBe('SUBMITTED');
});

test('a decided requirement shows the change form with the current decision picked', async () => {
    await submit(APPLICATION_LETTER, 1);
    await review(APPLICATION_LETTER, 'APPROVED', 'fine');

    const page = await agent.get(`/adviser/interns/${internId}/requirements`);

    expect(page.text).toContain('Change decision or remark');
    expect(page.text).toMatch(/value="APPROVED" checked/);
});
