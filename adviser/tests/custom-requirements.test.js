const app = require('../app');
const { closeDatabase, enrollIntern } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const SCHOOL_REQUIREMENTS = 7;
const FUTURE = '2099-01-15';
// [student id, section, status]: two still working in C1, one finished in C1, one in C2
const STUDENTS = [[9900081, 'C1', 'PENDING'], [9900082, 'C1', 'ACTIVE'], [9900083, 'C1', 'FINISHED'], [9900084, 'C2', 'ENROLLED']];
const LATE_ENROLLEE = 9900085;

let adviser;
let agent;
let csrfToken;
const interns = {};

beforeAll(async () => {
    adviser = await createTestAdviser('customreq');
    for (const [studentId, section, status] of STUDENTS) {
        await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, ?, 'BSCS', '4', ?)",
            [studentId, `Test Custom ${studentId}`, section]);
        const [result] = await pool.query('INSERT INTO interns (adviserid, studentid, status) VALUES (?, ?, ?)', [adviser.adviserID, studentId, status]);
        interns[studentId] = result.insertId;
    }
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/interns');
});

afterEach(async () => {
    await pool.query('DELETE ir FROM internrequirements ir JOIN requirements r ON r.reqid = ir.reqid WHERE r.created_by = ?', [adviser.adviserID]);
    await pool.query('DELETE FROM requirements WHERE created_by = ?', [adviser.adviserID]);
});

afterAll(async () => {
    const ids = Object.values(interns);
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await pool.query('DELETE FROM internrequirements WHERE internid IN (?)', [ids]);
    await pool.query('DELETE FROM interns WHERE internid IN (?)', [ids]);
    await pool.query('DELETE FROM students WHERE studentID IN (?)', [STUDENTS.map(([id]) => id)]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

const first = () => interns[9900081];

function add(fields, fromIntern = first()) {
    return agent.post(`/adviser/interns/${fromIntern}/requirements/new`).type('form').send({ csrf_token: csrfToken, ...fields });
}

// student ids of the interns who got the requirement
async function whoHas(name) {
    const [rows] = await pool.query(
        `SELECT s.studentID FROM internrequirements ir
         JOIN requirements r ON r.reqid = ir.reqid JOIN interns i ON i.internid = ir.internid JOIN students s ON s.studentID = i.studentid
         WHERE r.requirementname = ? AND r.created_by = ? ORDER BY s.studentID`,
        [name, adviser.adviserID]
    );
    return rows.map(row => row.studentID);
}

async function reqidOf(name) {
    const [[row]] = await pool.query('SELECT reqid FROM requirements WHERE requirementname = ? AND created_by = ?', [name, adviser.adviserID]);
    return row.reqid;
}

test('a requirement for one intern goes to that intern only, with its due date', async () => {
    const res = await add({ name: 'Medical certificate', audience: 'INTERN', dueDate: FUTURE });

    expect(res.headers.location).toBe(`/adviser/interns/${first()}/requirements`);
    expect(await whoHas('Medical certificate')).toEqual([9900081]);
    const [[row]] = await pool.query("SELECT DATE_FORMAT(due_date, '%Y-%m-%d') AS due FROM internrequirements WHERE internid = ? AND reqid = ?",
        [first(), await reqidOf('Medical certificate')]);
    expect(row.due).toBe(FUTURE);
});

test('a requirement for a section skips finished interns and other sections', async () => {
    await add({ name: 'Company ID copy', audience: 'SECTION' });

    expect(await whoHas('Company ID copy')).toEqual([9900081, 9900082]);
});

test('a requirement for all sections reaches every intern still doing their OJT and keeps its deadline as a rule', async () => {
    await add({ name: 'Exit survey', audience: 'ALL', dueDate: FUTURE });

    expect(await whoHas('Exit survey')).toEqual([9900081, 9900082, 9900084]);
    const [rules] = await pool.query('SELECT classcode FROM requirement_deadlines WHERE adviserid = ? AND reqid = ?',
        [adviser.adviserID, await reqidOf('Exit survey')]);
    expect(rules).toEqual([{ classcode: '' }]);
});

test("an intern enrolled later gets the school's requirements plus the matching section and all-sections ones", async () => {
    await add({ name: 'Only for one', audience: 'INTERN' });
    await add({ name: 'For section C1', audience: 'SECTION' });
    await add({ name: 'For everyone', audience: 'ALL' });

    const lateIntern = await enrollIntern(
        { id: LATE_ENROLLEE, name: 'Test Late Enrollee', course: 'BSCS', year: '4', classcode: 'C1', email: null },
        adviser.adviserID
    );
    try {
        const [rows] = await pool.query(
            'SELECT r.requirementname, r.created_by FROM internrequirements ir JOIN requirements r ON r.reqid = ir.reqid WHERE ir.internid = ?',
            [lateIntern]
        );
        const own = rows.filter(row => row.created_by !== null).map(row => row.requirementname).sort();
        expect(rows.length - own.length).toBe(SCHOOL_REQUIREMENTS);
        expect(own).toEqual(['For everyone', 'For section C1']);
    } finally {
        await pool.query('DELETE FROM internrequirements WHERE internid = ?', [lateIntern]);
        await pool.query('DELETE FROM interns WHERE internid = ?', [lateIntern]);
        await pool.query('DELETE FROM students WHERE studentID = ?', [LATE_ENROLLEE]);
    }
});

test("a school requirement's name can't be added again, whatever the letter case", async () => {
    const res = await add({ name: 'curriculum vitae', audience: 'INTERN' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('A requirement with this name already exists.');
});

test('a requirement nobody has submitted can be removed, with an audit row', async () => {
    await add({ name: 'Remove me', audience: 'SECTION' });
    const reqid = await reqidOf('Remove me');

    const confirm = await agent.get(`/adviser/requirements/${reqid}/remove?from=${first()}`);
    const res = await agent.post('/adviser/requirements/remove').type('form').send({ csrf_token: csrfToken, reqid, from: first() });

    expect(confirm.text).toContain('It will be removed from 2 interns');
    expect(res.headers.location).toBe(`/adviser/interns/${first()}/requirements`);
    expect(await whoHas('Remove me')).toEqual([]);
    const [events] = await pool.query("SELECT target FROM audit_log WHERE actor_adviser_id = ? AND action = 'requirement_removed'", [adviser.adviserID]);
    expect(events.map(e => e.target)).toContain(`requirement ${reqid}: Remove me`);
});

test('a requirement an intern already submitted cannot be removed', async () => {
    await add({ name: 'Already sent', audience: 'SECTION' });
    const reqid = await reqidOf('Already sent');
    await pool.query("UPDATE internrequirements SET status = 'SUBMITTED' WHERE internid = ? AND reqid = ?", [first(), reqid]);

    const confirm = await agent.get(`/adviser/requirements/${reqid}/remove`);
    await agent.post('/adviser/requirements/remove').type('form').send({ csrf_token: csrfToken, reqid });

    expect(confirm.text).toContain("can't be removed");
    expect(await whoHas('Already sent')).toEqual([9900081, 9900082]);
});

test("a school requirement or another adviser's requirement has no remove page", async () => {
    const CURRICULUM_VITAE = 3;

    expect((await agent.get(`/adviser/requirements/${CURRICULUM_VITAE}/remove`)).status).toBe(404);
    expect((await agent.post('/adviser/requirements/remove').type('form').send({ csrf_token: csrfToken, reqid: CURRICULUM_VITAE })).status).toBe(404);
});

test("cannot add a requirement from another adviser's intern", async () => {
    const OTHER_ADVISERS_INTERN = 300;

    expect((await agent.get(`/adviser/interns/${OTHER_ADVISERS_INTERN}/requirements/new`)).status).toBe(404);
    expect((await add({ name: 'Sneaky', audience: 'ALL' }, OTHER_ADVISERS_INTERN)).status).toBe(404);
});
