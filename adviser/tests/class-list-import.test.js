const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const IDS = [9900501, 9900502, 9900503, 9900504];
const HEADER = 'student_id,name,course,year,section,email';
const row = (id, name, email = `import.${id}@example.com`) => `${id},"${name}",BSCS,4,IMP1,${email}`;

let adviser;
let agent;
let csrfToken;

beforeAll(async () => {
    adviser = await createTestAdviser('class-list');
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/interns/import');
});

afterAll(async () => {
    await pool.query('DELETE ir FROM internrequirements ir JOIN interns i ON i.internid = ir.internid WHERE i.studentid IN (?)', [IDS]);
    await pool.query('DELETE FROM interns WHERE studentid IN (?)', [IDS]);
    await pool.query('DELETE FROM students WHERE studentID IN (?)', [IDS]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

const upload = (lines) => agent
    .post('/adviser/interns/import')
    .field('csrf_token', csrfToken)
    .attach('file', Buffer.from([HEADER, ...lines].join('\n')), 'class-list.csv');

const confirm = () => agent.post('/adviser/interns/import/confirm').type('form').send({ csrf_token: csrfToken });

const savedStudents = async () => {
    const [rows] = await pool.query('SELECT studentID FROM students WHERE studentID IN (?) ORDER BY studentID', [IDS]);
    return rows.map(r => r.studentID);
};

test('a file with a wrong row shows what to fix and saves nothing', async () => {
    const res = await upload([row(9900501, 'Reyes, Ana'), '9900502,"Cruz, Ben",BSCS,9,IMP1,not-an-email']);

    expect(res.status).toBe(400);
    expect(res.text).toContain('1 of 2 rows have errors');
    expect(res.text).toContain('Year must be a number from 1 to 5.');
    expect(res.text).not.toContain('Enroll 2 interns');

    const enroll = await confirm();
    expect(enroll.headers.location).toBe('/adviser/interns/import');
    expect(await savedStudents()).toEqual([]);
});

test('a good file shows a preview first, and enrolling saves everyone with their requirements', async () => {
    const preview = await upload([row(9900501, 'Reyes, Ana'), row(9900502, 'Cruz, Ben')]);

    expect(preview.status).toBe(200);
    expect(preview.text).toContain('2 students ready to enroll');
    expect(preview.text).toContain('Reyes, Ana');
    expect(await savedStudents()).toEqual([]);

    const enroll = await confirm();
    expect(enroll.headers.location).toBe('/adviser/interns');
    expect(await savedStudents()).toEqual([9900501, 9900502]);

    const [[counts]] = await pool.query(
        `SELECT COUNT(DISTINCT i.internid) AS interns, COUNT(ir.reqid) AS requirements
         FROM interns i LEFT JOIN internrequirements ir ON ir.internid = i.internid
         WHERE i.studentid IN (9900501, 9900502) AND i.adviserid = ? AND i.status = 'ENROLLED'`,
        [adviser.adviserID]
    );
    expect(counts.interns).toBe(2);
    expect(counts.requirements).toBeGreaterThan(0);

    const page = await agent.get('/adviser/interns');
    expect(page.text).toContain('2 interns enrolled.');
});

test('students who are already enrolled are marked', async () => {
    const res = await upload([row(9900501, 'Reyes, Ana', 'other@example.com'), row(9900503, 'Dela Cruz, Carla', 'import.9900502@example.com')]);

    expect(res.text).toContain('This student ID is already enrolled.');
    expect(res.text).toContain('This email is already used by another student.');
});

test('if one student gets enrolled between the preview and the confirm, nobody is saved', async () => {
    await upload([row(9900503, 'Dela Cruz, Carla'), row(9900504, 'Santos, Dan')]);
    await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (9900504, 'Santos, Dan', 'BSCS', '4', 'IMP1')");

    const enroll = await confirm();

    expect(enroll.headers.location).toBe('/adviser/interns/import');
    expect(await savedStudents()).toEqual([9900501, 9900502, 9900504]);
});

test('checking without a file asks for one', async () => {
    const res = await agent.post('/adviser/interns/import').field('csrf_token', csrfToken);

    expect(res.status).toBe(400);
    expect(res.text).toContain('Choose a CSV file to upload.');
});
