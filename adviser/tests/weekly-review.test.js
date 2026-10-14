const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const STUDENT_ID = 9900095;

let adviser;
let agent;
let internId;
let reportId;
let csrfToken;

beforeAll(async () => {
    adviser = await createTestAdviser('weekly');
    await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Test Weekly', 'BSCS', '4', 'W1')", [STUDENT_ID]);
    const [result] = await pool.query("INSERT INTO interns (adviserid, studentid, status, deployed_on) VALUES (?, ?, 'ACTIVE', '2026-09-01')", [adviser.adviserID, STUDENT_ID]);
    internId = result.insertId;

    const [report] = await pool.query(
        `INSERT INTO weeklyreports (internid, weeknumber, week_start, hours, workdescription, supervisor_name, status, datesubmitted,
                                    due_at, submitted_at, late_letter_path)
         VALUES (?, 2, '2026-09-07', 11.5, 'Built the login page', 'Joel Bautista', 'PENDING', '2026-09-14',
                 '2026-09-14 12:00:00', '2026-09-14 15:00:00', 'missing-letter.pdf')`,
        [internId]
    );
    await pool.query(
        `INSERT INTO weeklyreport_days (reportid, work_date, am_in, am_out, pm_in, pm_out, hours) VALUES
         (?, '2026-09-07', '08:00', '12:00', '13:00', '17:00', 8), (?, '2026-09-08', '08:00', '11:30', NULL, NULL, 3.5)`,
        [report.insertId, report.insertId]
    );
    reportId = report.insertId;
    await pool.query(
        "INSERT INTO weeklyreport_absences (reportid, absent_date, part, reason, proof_type, proof_path) VALUES (?, '2026-09-09', 'DAY', 'Flu', 'MEDICAL', 'missing-proof.pdf')",
        [reportId]
    );
    await pool.query("INSERT INTO weeklyreports (internid, weeknumber, hours, status) VALUES (?, 1, 200, 'APPROVED'), (?, 3, 39.5, 'APPROVED')", [internId, internId]);
    await pool.query(
        `INSERT INTO weeklyreports (internid, weeknumber, kind, no_work_reason, hours, workdescription, status, datesubmitted)
         VALUES (?, 4, 'NO_WORK', 'CLOSED', 0, 'Office moved to a new building', 'PENDING', '2026-09-28')`,
        [internId]
    );

    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, `/adviser/interns/${internId}/weekly-reports`);
});

afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await pool.query('DELETE FROM weeklyreports WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM interns WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM students WHERE studentID = ?', [STUDENT_ID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test('the adviser sees each day with its morning and afternoon times', async () => {
    const page = await agent.get(`/adviser/interns/${internId}/weekly-reports`);

    expect(page.text).toContain('Mon, Sep 7');
    expect(page.text).toContain('8:00 AM – 12:00 PM');
    expect(page.text).toContain('>1:00 PM – 5:00 PM<');
    expect(page.text).toContain('3.5');
    expect(page.text).toContain('Supervisor: Joel Bautista');
    expect(page.text).toContain('Built the login page');
});

test('half hours are not rounded up when checking the target', async () => {
    const page = await agent.get(`/adviser/interns/${internId}/finish`);

    expect(page.text).toContain('239.5 of 240');
});

test('the adviser sees the absence report with a link to the proof', async () => {
    const page = await agent.get(`/adviser/interns/${internId}/weekly-reports`);

    expect(page.text).toContain('Absence report · 1 absence');
    expect(page.text).toContain('Wed, Sep 9');
    expect(page.text).toContain('Whole day');
    expect(page.text).toContain('Flu');
    expect(page.text).toContain(`href="/adviser/weekly-reports/${reportId}/absences/2026-09-09/proof">Medical certificate`);
});

test('a proof that is not on the report is not found', async () => {
    const res = await agent.get(`/adviser/weekly-reports/${reportId}/absences/2026-09-10/proof`);

    expect(res.status).toBe(404);
});

test('a no-work week shows why instead of hours and is in the review queue', async () => {
    const page = await agent.get(`/adviser/interns/${internId}/weekly-reports`);

    expect(page.text).toContain('Week 4 · No work this week');
    expect(page.text).toContain('Why: Company was closed.');
    expect(page.text).toContain('Office moved to a new building');

    const queue = await agent.get('/adviser/review');
    expect(queue.text).toContain('Week 4 · no work');
});

test('a report sent after its due time is tagged late with a link to the letter', async () => {
    const page = await agent.get(`/adviser/interns/${internId}/weekly-reports`);

    expect(page.text).toContain('tag-bad">Late');
    expect(page.text).toContain(`href="/adviser/weekly-reports/${reportId}/late-letter"`);
});

test('weeks that ended without a report are listed, overdue after their due time', async () => {
    const page = await agent.get(`/adviser/interns/${internId}/weekly-reports`);

    // deployed sep 1; weeks 1 to 4 were sent, week 5 (sep 28 – oct 2) was due oct 5
    expect(page.text).toContain('Week 5 · Sep 28 – Oct 2');
    expect(page.text).toContain('Due Monday, Oct 5, 12 noon');
    expect(page.text).toContain('Overdue');
    expect(page.text).not.toContain('Week 4 · Sep 21');
});

async function excuse(week, reason) {
    return agent.post(`/adviser/interns/${internId}/weekly-reports/excuse`).type('form').send({ csrf_token: csrfToken, week, reason });
}

async function excusedWeeks() {
    const [rows] = await pool.query("SELECT weeknumber, status, hours, remark FROM weeklyreports WHERE internid = ? AND kind = 'EXCUSED'", [internId]);
    return rows;
}

test('excusing a missing week counts it as done and records why', async () => {
    const res = await excuse('5', 'Company closed for the typhoon');

    expect(res.headers.location).toBe(`/adviser/interns/${internId}/weekly-reports`);
    expect(await excusedWeeks()).toEqual([{ weeknumber: 5, status: 'APPROVED', hours: 0, remark: 'Company closed for the typhoon' }]);
    const page = await agent.get(`/adviser/interns/${internId}/weekly-reports`);
    expect(page.text).toContain('Week 5 · Excused');
    expect(page.text).not.toContain('Week 5 · Sep 28');
    const [events] = await pool.query("SELECT target FROM audit_log WHERE actor_adviser_id = ? AND action = 'weekly_week_excused'", [adviser.adviserID]);
    expect(events.map(e => e.target)).toEqual([`intern ${internId} week 5`]);
});

test('a week that was sent, has not ended, or has no reason cannot be excused', async () => {
    await excuse('5', 'again');
    await excuse('2', 'already sent');
    await excuse('60', 'far in the future');
    await excuse('6', ' ');

    expect((await excusedWeeks()).map(row => row.weeknumber)).toEqual([5]);
});

test('a report without a late letter has nothing to download', async () => {
    const [[onTime]] = await pool.query('SELECT reportid FROM weeklyreports WHERE internid = ? AND weeknumber = 1', [internId]);

    expect((await agent.get(`/adviser/weekly-reports/${onTime.reportid}/late-letter`)).status).toBe(404);
});
