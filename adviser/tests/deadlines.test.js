const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const APPLICATION_LETTER = 1;
const FUTURE = '2099-01-15';
const LATER_FUTURE = '2099-02-20';
// three interns: two in section D1, one in D2
const STUDENTS = [[9900071, 'D1'], [9900072, 'D1'], [9900073, 'D2']];
const LATE_ENROLLEE = 9900074;

let adviser;
let agent;
let csrfToken;
let interns = [];

async function addIntern(studentId, section) {
    await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, ?, 'BSCS', '4', ?)",
        [studentId, `Test Deadline ${studentId}`, section]);
    const [result] = await pool.query("INSERT INTO interns (adviserid, studentid, status) VALUES (?, ?, 'PENDING')", [adviser.adviserID, studentId]);
    await pool.query("INSERT INTO internrequirements (internid, reqid, status) VALUES (?, ?, 'PENDING')", [result.insertId, APPLICATION_LETTER]);
    return result.insertId;
}

async function removeIntern(internId, studentId) {
    await pool.query('DELETE FROM internrequirements WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM interns WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM students WHERE studentID = ?', [studentId]);
}

beforeAll(async () => {
    adviser = await createTestAdviser('deadline');
    for (const [studentId, section] of STUDENTS) {
        interns.push(await addIntern(studentId, section));
    }
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/interns');
});

afterEach(async () => {
    await pool.query('DELETE FROM requirement_deadlines WHERE adviserid = ?', [adviser.adviserID]);
    await pool.query('UPDATE internrequirements SET due_date = NULL WHERE internid IN (?)', [interns]);
});

afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    for (const [i, [studentId]] of STUDENTS.entries()) {
        await removeIntern(interns[i], studentId);
    }
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

function setDeadline(internId, fields) {
    return agent.post(`/adviser/interns/${internId}/requirements/${APPLICATION_LETTER}/deadline`).type('form')
        .send({ csrf_token: csrfToken, action: 'save', ...fields });
}

// the "Due ..." line on the intern's review page, or null
async function dueShownFor(internId) {
    const page = await agent.get(`/adviser/interns/${internId}/requirements`);
    const match = page.text.match(/Due ([A-Z][a-z]{2} \d{1,2}, \d{4})/);
    return match ? match[1] : null;
}

test('a section deadline applies to everyone in that section and nobody else', async () => {
    const [first, second, otherSection] = interns;

    const res = await setDeadline(first, { scope: 'section', dueDate: FUTURE });

    expect(res.headers.location).toBe(`/adviser/interns/${first}/requirements`);
    expect(await dueShownFor(first)).toBe('Jan 15, 2099');
    expect(await dueShownFor(second)).toBe('Jan 15, 2099');
    expect(await dueShownFor(otherSection)).toBeNull();
});

test('an all-sections deadline applies to every section, but a section deadline wins over it', async () => {
    const [first, , otherSection] = interns;

    await setDeadline(first, { scope: 'all', dueDate: LATER_FUTURE });
    await setDeadline(first, { scope: 'section', dueDate: FUTURE });

    expect(await dueShownFor(otherSection)).toBe('Feb 20, 2099');
    expect(await dueShownFor(first)).toBe('Jan 15, 2099');
});

test('a deadline for one intern wins over the section one and leaves the others alone', async () => {
    const [first, second] = interns;
    await setDeadline(first, { scope: 'section', dueDate: FUTURE });

    await setDeadline(first, { scope: 'intern', dueDate: LATER_FUTURE });

    expect(await dueShownFor(first)).toBe('Feb 20, 2099');
    expect(await dueShownFor(second)).toBe('Jan 15, 2099');
});

test('an intern enrolled later in the section gets the section deadline too', async () => {
    await setDeadline(interns[0], { scope: 'section', dueDate: FUTURE });

    const lateIntern = await addIntern(LATE_ENROLLEE, 'D1');
    try {
        expect(await dueShownFor(lateIntern)).toBe('Jan 15, 2099');
    } finally {
        await removeIntern(lateIntern, LATE_ENROLLEE);
    }
});

test('removing a deadline takes it away', async () => {
    const [first] = interns;
    await setDeadline(first, { scope: 'section', dueDate: FUTURE });

    await setDeadline(first, { scope: 'section', action: 'remove' });

    expect(await dueShownFor(first)).toBeNull();
});

test('a requirement not sent by its deadline shows Overdue', async () => {
    const [first] = interns;
    await pool.query('UPDATE internrequirements SET due_date = CURDATE() - INTERVAL 1 DAY WHERE internid = ?', [first]);

    const page = await agent.get(`/adviser/interns/${first}/requirements`);

    expect(page.text).toContain('Overdue');
});

test('a requirement first sent after its deadline shows Sent late', async () => {
    const [first] = interns;
    await pool.query("UPDATE internrequirements SET due_date = CURDATE() - INTERVAL 3 DAY, status = 'SUBMITTED' WHERE internid = ?", [first]);
    await pool.query('INSERT INTO requirement_versions (internid, reqid, version_no) VALUES (?, ?, 1)', [first, APPLICATION_LETTER]);
    try {
        const page = await agent.get(`/adviser/interns/${first}/requirements`);

        expect(page.text).toContain('Sent late');
        expect(page.text).not.toContain('Overdue');
    } finally {
        await pool.query('DELETE FROM requirement_versions WHERE internid = ?', [first]);
        await pool.query("UPDATE internrequirements SET status = 'PENDING' WHERE internid = ?", [first]);
    }
});

test('a date in the past or a missing choice is refused with a message', async () => {
    const res = await setDeadline(interns[0], { scope: 'section', dueDate: '2020-01-01' });
    const noScope = await setDeadline(interns[0], { dueDate: FUTURE });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Pick today or a later date.');
    expect(noScope.status).toBe(400);
    expect(noScope.text).toContain('Choose who this deadline is for.');
});

test('saving a deadline adds an audit row', async () => {
    await setDeadline(interns[0], { scope: 'section', dueDate: FUTURE });

    const [events] = await pool.query("SELECT target FROM audit_log WHERE actor_adviser_id = ? AND action = 'deadline_set'", [adviser.adviserID]);
    expect(events.map(e => e.target)).toContain(`requirement ${APPLICATION_LETTER} for section D1`);
});

test("cannot open or set a deadline for another adviser's intern", async () => {
    const OTHER_ADVISERS_INTERN = 300;

    expect((await agent.get(`/adviser/interns/${OTHER_ADVISERS_INTERN}/requirements/${APPLICATION_LETTER}/deadline`)).status).toBe(404);
    const res = await setDeadline(OTHER_ADVISERS_INTERN, { scope: 'all', dueDate: FUTURE });

    expect(res.status).toBe(404);
    const [rows] = await pool.query('SELECT * FROM requirement_deadlines WHERE adviserid = ?', [adviser.adviserID]);
    expect(rows).toHaveLength(0);
});
