const app = require('../app');
const { closeDatabase, fetchReviewQueue } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs } = require('./helpers/auth');

const APPLICATION_LETTER = 1;
const CURRICULUM_VITAE = 3;
// [student id, section, status]
const STUDENTS = [[9900091, 'Q1', 'ACTIVE'], [9900092, 'Q2', 'ACTIVE'], [9900093, 'Q1', 'WITHDRAWN']];

let adviser;
let agent;
const interns = {};

beforeAll(async () => {
    adviser = await createTestAdviser('queue');
    for (const [studentId, section, status] of STUDENTS) {
        await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, ?, 'BSCS', '4', ?)",
            [studentId, `Queue ${studentId}`, section]);
        const [result] = await pool.query('INSERT INTO interns (adviserid, studentid, status) VALUES (?, ?, ?)', [adviser.adviserID, studentId, status]);
        interns[studentId] = result.insertId;
    }
    const [first, second, withdrawn] = STUDENTS.map(([id]) => interns[id]);

    // waiting: a requirement sent 5 days ago, a weekly report 3 days ago, a journal 1 day ago
    await pool.query("INSERT INTO internrequirements (internid, reqid, status, datesubmitted) VALUES (?, ?, 'SUBMITTED', CURDATE() - INTERVAL 5 DAY)", [first, APPLICATION_LETTER]);
    await pool.query("INSERT INTO requirement_versions (internid, reqid, version_no, submitted_at) VALUES (?, ?, 1, NOW() - INTERVAL 5 DAY)", [first, APPLICATION_LETTER]);
    await pool.query("INSERT INTO weeklyreports (internid, weeknumber, hours, status, datesubmitted) VALUES (?, 2, 40, 'PENDING', CURDATE() - INTERVAL 3 DAY)", [second]);
    await pool.query("INSERT INTO journals (internid, monthnumber, status, datesubmitted) VALUES (?, 1, 'PENDING', CURDATE() - INTERVAL 1 DAY)", [first]);
    // not waiting: already approved, or from a withdrawn intern
    await pool.query("INSERT INTO internrequirements (internid, reqid, status) VALUES (?, ?, 'APPROVED')", [first, CURRICULUM_VITAE]);
    await pool.query("INSERT INTO internrequirements (internid, reqid, status, datesubmitted) VALUES (?, ?, 'SUBMITTED', CURDATE())", [withdrawn, APPLICATION_LETTER]);

    agent = await loginAs(app, adviser.email);
});

afterAll(async () => {
    const ids = Object.values(interns);
    await pool.query('DELETE FROM requirement_versions WHERE internid IN (?)', [ids]);
    await pool.query('DELETE FROM internrequirements WHERE internid IN (?)', [ids]);
    await pool.query('DELETE FROM weeklyreports WHERE internid IN (?)', [ids]);
    await pool.query('DELETE FROM journals WHERE internid IN (?)', [ids]);
    await pool.query('DELETE FROM interns WHERE internid IN (?)', [ids]);
    await pool.query('DELETE FROM students WHERE studentID IN (?)', [STUDENTS.map(([id]) => id)]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test('requirements, weekly reports and journals waiting for review come in one list, oldest first', async () => {
    const queue = await fetchReviewQueue(adviser.adviserID);

    expect(queue.map(item => [item.kind, item.item, item.days])).toEqual([
        ['requirement', 'Application Letter', 5],
        ['weekly', 'Week 2 report', 3],
        ['journal', 'Month 1 journal', 1],
    ]);
});

test('the section filter keeps only that section', async () => {
    const queue = await fetchReviewQueue(adviser.adviserID, 'Q2');

    expect(queue.map(item => item.item)).toEqual(['Week 2 report']);
});

test('the page links each item to where it is reviewed', async () => {
    const res = await agent.get('/adviser/review');

    expect(res.status).toBe(200);
    expect(res.text).toContain('3 items');
    expect(res.text).toContain(`href="/adviser/interns/${interns[9900091]}/requirements"`);
    expect(res.text).toContain(`href="/adviser/interns/${interns[9900092]}/weekly-reports"`);
    expect(res.text).toContain(`href="/adviser/interns/${interns[9900091]}/journals"`);
    expect(res.text).toContain('Waiting 5 days');
});

test('a section that is not one of theirs is ignored and shows everything', async () => {
    const res = await agent.get('/adviser/review').query({ section: 'CS401' });

    expect(res.text).toContain('3 items');
});

test("another adviser's interns are never in the list", async () => {
    const queue = await fetchReviewQueue(adviser.adviserID);

    expect(queue.every(item => Object.values(interns).includes(item.internid))).toBe(true);
});
