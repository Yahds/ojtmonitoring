const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const STUDENT_ID = 9900096;

let adviser;
let agent;
let csrfToken;
let internId;

beforeAll(async () => {
    adviser = await createTestAdviser('rules');
    await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Test Rules', 'BSCS', '4', 'R1')", [STUDENT_ID]);
    const [intern] = await pool.query("INSERT INTO interns (adviserid, studentid, status, deployed_on) VALUES (?, ?, 'ACTIVE', '2026-09-01')", [adviser.adviserID, STUDENT_ID]);
    internId = intern.insertId;
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, `/adviser/interns/${internId}/weekly-reports`);
});

afterEach(async () => {
    await pool.query('DELETE FROM weeklyreports WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM journals WHERE internid = ?', [internId]);
});

afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await pool.query('DELETE FROM interns WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM students WHERE studentID = ?', [STUDENT_ID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

async function addReport(status, kind = 'WORK') {
    const [report] = await pool.query(
        'INSERT INTO weeklyreports (internid, weeknumber, kind, hours, status) VALUES (?, 1, ?, 8, ?)',
        [internId, kind, status]
    );
    return report.insertId;
}

async function addJournal(status) {
    const [journal] = await pool.query('INSERT INTO journals (internid, monthnumber, status) VALUES (?, 1, ?)', [internId, status]);
    return journal.insertId;
}

async function reportRow(reportId) {
    const [[row]] = await pool.query('SELECT status, remark FROM weeklyreports WHERE reportid = ?', [reportId]);
    return row;
}

function decide(path, fields) {
    return agent.post(`/adviser/interns/${internId}/${path}`).type('form').send({ csrf_token: csrfToken, ...fields });
}

test('a report waiting for review can be decided once, and the decision is logged', async () => {
    const reportId = await addReport('PENDING');

    await decide('weekly-reports', { reportid: reportId, decision: 'APPROVED', remark: ' Good week ' });
    await decide('weekly-reports', { reportid: reportId, decision: 'REJECTED', remark: 'second click' });

    expect(await reportRow(reportId)).toEqual({ status: 'APPROVED', remark: 'Good week' });
    const [events] = await pool.query("SELECT action, target FROM audit_log WHERE actor_adviser_id = ? AND action LIKE 'weekly_report%'", [adviser.adviserID]);
    expect(events).toEqual([{ action: 'weekly_report_approved', target: `intern ${internId} weekly report ${reportId}: APPROVED` }]);
});

test('an approved report only changes through the change form', async () => {
    const reportId = await addReport('APPROVED');

    const res = await decide('weekly-reports/change', { reportid: reportId, decision: 'REJECTED', remark: 'Hours do not match the signed copy' });

    expect(res.headers.location).toBe(`/adviser/interns/${internId}/weekly-reports`);
    expect(await reportRow(reportId)).toEqual({ status: 'REJECTED', remark: 'Hours do not match the signed copy' });
});

test('the change form is not for reports still waiting, and an excused week cannot be reviewed', async () => {
    const waiting = await addReport('PENDING');
    await decide('weekly-reports/change', { reportid: waiting, decision: 'APPROVED' });
    expect((await reportRow(waiting)).status).toBe('PENDING');

    await pool.query('DELETE FROM weeklyreports WHERE reportid = ?', [waiting]);
    const excused = await addReport('APPROVED', 'EXCUSED');
    await decide('weekly-reports/change', { reportid: excused, decision: 'REJECTED' });
    expect((await reportRow(excused)).status).toBe('APPROVED');
});

test('a remark longer than the column is refused', async () => {
    const reportId = await addReport('PENDING');

    await decide('weekly-reports', { reportid: reportId, decision: 'REJECTED', remark: 'x'.repeat(256) });

    expect(await reportRow(reportId)).toEqual({ status: 'PENDING', remark: null });
    expect((await agent.get(`/adviser/interns/${internId}/weekly-reports`)).text).toContain('Keep your remark to 255 characters or fewer.');
});

test('a report is only changed through its own intern', async () => {
    const reportId = await addReport('PENDING');

    await agent.post('/adviser/interns/1/weekly-reports').type('form').send({ csrf_token: csrfToken, reportid: reportId, decision: 'APPROVED' });

    expect((await reportRow(reportId)).status).toBe('PENDING');
});

test('journals follow the same rules', async () => {
    const journalId = await addJournal('PENDING');

    await decide('journals', { journalid: journalId, decision: 'REJECTED', remark: 'Add your week 3 notes' });
    await decide('journals', { journalid: journalId, decision: 'APPROVED' });
    let [[row]] = await pool.query('SELECT status, remark FROM journals WHERE journalid = ?', [journalId]);
    expect(row).toEqual({ status: 'REJECTED', remark: 'Add your week 3 notes' });

    await decide('journals/change', { journalid: journalId, decision: 'APPROVED', remark: '' });
    [[row]] = await pool.query('SELECT status, remark FROM journals WHERE journalid = ?', [journalId]);
    expect(row).toEqual({ status: 'APPROVED', remark: null });
});

test('the page shows the change form once a report is decided', async () => {
    await addReport('APPROVED');

    const page = await agent.get(`/adviser/interns/${internId}/weekly-reports`);

    expect(page.text).toContain('Change decision or remark');
    expect(page.text).not.toContain('value="APPROVED">Approve');
});
