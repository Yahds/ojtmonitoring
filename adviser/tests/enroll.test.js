const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const NEW_STUDENT_ID = 9900001;
const FAILED_STUDENT_ID = 9900002;
const FLASH_STUDENT_ID = 9900003;
const DUP_EMAIL_STUDENT_ID = 9900004;
const NO_EMAIL_STUDENT_ID = 9900005;
const BAD_COURSE_STUDENT_ID = 9900006;

let adviser;
let agent;
let csrfToken;

beforeAll(async () => {
    adviser = await createTestAdviser('enroll');
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/interns');
});

afterAll(async () => {
    const ids = [NEW_STUDENT_ID, FAILED_STUDENT_ID, FLASH_STUDENT_ID, DUP_EMAIL_STUDENT_ID, NO_EMAIL_STUDENT_ID];
    await pool.query('DELETE ir FROM internrequirements ir JOIN interns i ON i.internid = ir.internid WHERE i.studentid IN (?)', [ids]);
    await pool.query('DELETE FROM interns WHERE studentid IN (?)', [ids]);
    await pool.query('DELETE FROM students WHERE studentID IN (?)', [ids]);
    await pool.query("DELETE FROM audit_log WHERE action = 'intern_enrolled' AND actor_adviser_id = ?", [adviser.adviserID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test('enrolling saves the student with their email, the intern without a password, and all 6 requirements', async () => {
    const res = await agent
        .post('/adviser/interns')
        .type('form')
        .send({ studentID: NEW_STUDENT_ID, name: 'Test Enroll', course: 'BSCS', year: '4', classcode: 'T1', email: 'test.enroll@example.com', csrf_token: csrfToken });

    expect(res.status).toBe(302);
    const [[student]] = await pool.query('SELECT email FROM students WHERE studentID = ?', [NEW_STUDENT_ID]);
    expect(student.email).toBe('test.enroll@example.com');
    const [interns] = await pool.query('SELECT internid, password FROM interns WHERE studentid = ?', [NEW_STUDENT_ID]);
    expect(interns).toHaveLength(1);
    expect(interns[0].password).toBeNull();
    const [requirements] = await pool.query('SELECT reqid FROM internrequirements WHERE internid = ?', [interns[0].internid]);
    expect(requirements).toHaveLength(7);
    const [events] = await pool.query("SELECT target FROM audit_log WHERE action = 'intern_enrolled' AND actor_adviser_id = ?", [adviser.adviserID]);
    expect(events.map(e => e.target)).toContain(String(NEW_STUDENT_ID));
});

test('a failed enroll saves nothing', async () => {
    // the adviser is removed while still logged in, so saving the intern fails after the student row is in
    const gone = await createTestAdviser('enroll-gone');
    const goneAgent = await loginAs(app, gone.email);
    const token = await csrfTokenFrom(goneAgent, '/adviser/interns');
    await deleteTestAdviser(gone.adviserID);

    const res = await goneAgent
        .post('/adviser/interns')
        .type('form')
        .send({ studentID: FAILED_STUDENT_ID, name: 'Test Failed', course: 'BSCS', year: '4', classcode: 'T1', email: 'test.failed@example.com', csrf_token: token });

    expect(res.status).toBe(500);
    expect(res.text).toContain('Something went wrong');
    const [students] = await pool.query('SELECT * FROM students WHERE studentID = ?', [FAILED_STUDENT_ID]);
    expect(students).toHaveLength(0);
});

test('enrolling without an email shows an error next to the field', async () => {
    const res = await agent
        .post('/adviser/interns')
        .type('form')
        .send({ studentID: NO_EMAIL_STUDENT_ID, name: 'Test No Email', course: 'BSCS', year: '4', classcode: 'T1', email: '', csrf_token: csrfToken });

    expect(res.status).toBe(400);
    expect(res.text).toContain("Enter the student's SLU email");
    expect(res.text).toContain('value="Test No Email"');
});

test('enrolling a student ID twice shows an error instead of a crash', async () => {
    const res = await agent
        .post('/adviser/interns')
        .type('form')
        .send({ studentID: NEW_STUDENT_ID, name: 'Test Again', course: 'BSCS', year: '4', classcode: 'T1', email: 'test.again@example.com', csrf_token: csrfToken });

    expect(res.status).toBe(400);
    expect(res.text).toContain('That student ID is already enrolled.');
});

test('enrolling with an email another student has shows an error', async () => {
    const res = await agent
        .post('/adviser/interns')
        .type('form')
        .send({ studentID: DUP_EMAIL_STUDENT_ID, name: 'Test Dup Email', course: 'BSCS', year: '4', classcode: 'T1', email: 'test.enroll@example.com', csrf_token: csrfToken });

    expect(res.status).toBe(400);
    expect(res.text).toContain('That email is already used by another student.');
});

test('after enrolling, the interns page shows a success message once', async () => {
    const res = await agent
        .post('/adviser/interns')
        .type('form')
        .send({ studentID: FLASH_STUDENT_ID, name: 'Test Flash', course: 'BSIT', year: '4', classcode: 'T1', email: 'test.flash@example.com', csrf_token: csrfToken });
    expect(res.headers.location).toBe('/adviser/interns');

    const page = await agent.get('/adviser/interns');
    expect(page.text).toContain('Test Flash enrolled.');
    expect(page.text).toContain('Choosing company');

    const again = await agent.get('/adviser/interns');
    expect(again.text).not.toContain('class="flash');
});

test('deploying an intern who is not ready goes back to the checklist with a message', async () => {
    const [[intern]] = await pool.query('SELECT internid FROM interns WHERE studentid = ?', [FLASH_STUDENT_ID]);
    const deployUrl = `/adviser/interns/${intern.internid}/deploy`;

    const res = await agent
        .post(deployUrl)
        .type('form')
        .send({ startDate: '2026-11-03', csrf_token: csrfToken });
    expect(res.headers.location).toBe(deployUrl);

    const page = await agent.get(deployUrl);
    expect(page.text).toContain('Cannot deploy yet.');
    expect(page.text).toContain('Missing');
});

test('the enroll page lists the courses from the database', async () => {
    const res = await agent.get('/adviser/interns/new');

    expect(res.status).toBe(200);
    expect(res.text).toContain('BS Information Technology');
});

test('enrolling with a course that does not exist shows an error', async () => {
    const res = await agent
        .post('/adviser/interns')
        .type('form')
        .send({ studentID: BAD_COURSE_STUDENT_ID, name: 'Test Bad Course', course: 'BSXX', year: '4', classcode: 'T1', email: 'test.badcourse@example.com', csrf_token: csrfToken });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Select a course from the list.');
});

