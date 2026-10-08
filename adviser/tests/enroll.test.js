const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const NEW_STUDENT_ID = 9900001;
const FAILED_STUDENT_ID = 9900002;
const FLASH_STUDENT_ID = 9900003;

let adviser;
let agent;
let csrfToken;

beforeAll(async () => {
    adviser = await createTestAdviser('enroll');
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/ojt-dashboard/enroll');
});

afterAll(async () => {
    const ids = [NEW_STUDENT_ID, FAILED_STUDENT_ID, FLASH_STUDENT_ID];
    await pool.query('DELETE ir FROM internrequirements ir JOIN interns i ON i.internid = ir.internid WHERE i.studentid IN (?)', [ids]);
    await pool.query('DELETE FROM interns WHERE studentid IN (?)', [ids]);
    await pool.query('DELETE FROM students WHERE studentID IN (?)', [ids]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test('enrolling saves the student, the intern and all 7 requirements', async () => {
    const res = await agent
        .post('/ojt-dashboard/enroll')
        .type('form')
        .send({ studentID: NEW_STUDENT_ID, name: 'Test Enroll', course: 'BSCS', year: '4', classcode: 'T1', password: 'pw123', csrf_token: csrfToken });

    expect(res.status).toBe(302);
    const [interns] = await pool.query('SELECT internid FROM interns WHERE studentid = ?', [NEW_STUDENT_ID]);
    expect(interns).toHaveLength(1);
    const [requirements] = await pool.query('SELECT reqid FROM internrequirements WHERE internid = ?', [interns[0].internid]);
    expect(requirements).toHaveLength(7);
});

test('a failed enroll saves nothing', async () => {
    const res = await agent
        .post('/ojt-dashboard/enroll')
        .type('form')
        .send({ studentID: FAILED_STUDENT_ID, name: 'Test Failed', course: 'BSCS', year: '4', classcode: 'T1', csrf_token: csrfToken });

    expect(res.status).toBe(500);
    expect(res.text).toContain('Something went wrong');
    expect(res.text).not.toContain('salt');
    const [students] = await pool.query('SELECT * FROM students WHERE studentID = ?', [FAILED_STUDENT_ID]);
    expect(students).toHaveLength(0);
});

test('after enrolling, the interns page shows a success message once', async () => {
    const res = await agent
        .post('/ojt-dashboard/enroll')
        .type('form')
        .send({ studentID: FLASH_STUDENT_ID, name: 'Test Flash', course: 'BSIT', year: '4', classcode: 'T1', password: 'pw123', csrf_token: csrfToken });
    expect(res.headers.location).toBe('/ojt-dashboard/enroll');

    const page = await agent.get('/ojt-dashboard/enroll');
    expect(page.text).toContain('Test Flash enrolled.');

    const again = await agent.get('/ojt-dashboard/enroll');
    expect(again.text).not.toContain('class="flash');
});

test('deploying an intern who is not ready shows an error instead of a blank page', async () => {
    const [[intern]] = await pool.query('SELECT internid FROM interns WHERE studentid = ?', [FLASH_STUDENT_ID]);

    const res = await agent
        .post('/ojt-dashboard/deploy')
        .type('form')
        .send({ internID: intern.internid, csrf_token: csrfToken });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/ojt-dashboard/enroll');

    const page = await agent.get('/ojt-dashboard/enroll');
    expect(page.text).toContain('Cannot deploy yet.');
});

