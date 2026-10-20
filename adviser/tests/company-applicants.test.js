const fs = require('fs');
const os = require('os');
const path = require('path');
const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { emailBody, cvFileName } = require('../lib/company-email');
const { createTestAdviser, deleteTestAdviser, loginAs } = require('./helpers/auth');

const CURRICULUM_VITAE = 3;
// [student id, name, CV status, whose intern]
const STUDENTS = [
    [9900091, 'Applicant, Approved', 'APPROVED', 'mine'],
    [9900092, 'Applicant, Waiting', 'SUBMITTED', 'mine'],
    [9900093, 'Applicant, Other Adviser', 'APPROVED', 'other'],
];

let adviser;
let otherAdviser;
let agent;
let companyID;
let emptyCompanyID;
const interns = [];

// supertest gives back the raw bytes of the zip
function binary(res, done) {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => done(null, Buffer.concat(chunks)));
}

beforeAll(async () => {
    process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cvs-'));
    adviser = await createTestAdviser('appl');
    otherAdviser = await createTestAdviser('appl2');
    [{ insertId: companyID }] = await pool.query("INSERT INTO company (companyname, moa_on_file) VALUES ('Test Applicants Company', TRUE)");
    [{ insertId: emptyCompanyID }] = await pool.query("INSERT INTO company (companyname, moa_on_file) VALUES ('Test Nobody Company', TRUE)");

    for (const [studentID, name, cvStatus, whose] of STUDENTS) {
        const adviserID = whose === 'mine' ? adviser.adviserID : otherAdviser.adviserID;
        const cvFile = `test-cv-${studentID}.pdf`;
        fs.writeFileSync(path.join(process.env.UPLOADS_DIR, cvFile), `%PDF-1.4 CV of ${name}`);
        await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, ?, 'BSCS', '4', 'T1')", [studentID, name]);
        const [{ insertId }] = await pool.query("INSERT INTO interns (adviserid, studentid, status) VALUES (?, ?, 'ENROLLED')", [adviserID, studentID]);
        await pool.query('INSERT INTO internrequirements (internid, reqid, status, file_path) VALUES (?, ?, ?, ?)', [insertId, CURRICULUM_VITAE, cvStatus, cvFile]);
        await pool.query('INSERT INTO intern_company_choices (internid, choice_rank, companyid) VALUES (?, 1, ?)', [insertId, companyID]);
        interns.push(insertId);
    }
    agent = await loginAs(app, adviser.email);
});

afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await pool.query('DELETE FROM internrequirements WHERE internid IN (?)', [interns]);
    await pool.query('DELETE FROM interns WHERE internid IN (?)', [interns]);
    await pool.query('DELETE FROM students WHERE studentID IN (?)', [STUDENTS.map(([id]) => id)]);
    await pool.query('DELETE FROM company WHERE companyid IN (?)', [[companyID, emptyCompanyID]]);
    await deleteTestAdviser(adviser.adviserID);
    await deleteTestAdviser(otherAdviser.adviserID);
    fs.rmSync(process.env.UPLOADS_DIR, { recursive: true, force: true });
    delete process.env.UPLOADS_DIR;
    await closeDatabase();
});

test('the companies list counts only my interns who want the company', async () => {
    const res = await agent.get('/adviser/companies');

    expect(res.text).toMatch(new RegExp(`href="/adviser/companies/${companyID}">2</a>`));
});

test('the company page lists my interns who want it, with their CV status', async () => {
    const res = await agent.get(`/adviser/companies/${companyID}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Applicant, Approved');
    expect(res.text).toContain('Applicant, Waiting');
    expect(res.text).not.toContain('Applicant, Other Adviser');
    expect(res.text).toContain('<b>1</b> approved CV ready');
    expect(res.text).toContain('1. Applicant, Approved (BSCS)');
    expect(res.text).not.toContain('Applicant, Waiting (BSCS)');
});

test('the zip has only my approved CVs and is logged', async () => {
    const res = await agent.get(`/adviser/companies/${companyID}/cvs.zip`).buffer(true).parse(binary);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.headers['content-disposition']).toContain('CVs for Test Applicants Company.zip');
    expect(res.body.subarray(0, 2).toString()).toBe('PK');
    const content = res.body.toString('latin1');
    expect(content).toContain('Applicant Approved - CV.pdf');
    expect(content).not.toContain('Applicant Waiting');
    expect(content).not.toContain('Other Adviser');
    const [[logged]] = await pool.query("SELECT COUNT(*) AS n FROM audit_log WHERE actor_adviser_id = ? AND action = 'cvs_downloaded'", [adviser.adviserID]);
    expect(logged.n).toBe(1);
});

test('with no approved CVs the zip link goes back with a message', async () => {
    const res = await agent.get(`/adviser/companies/${emptyCompanyID}/cvs.zip`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/adviser/companies/${emptyCompanyID}`);
    expect((await agent.get(res.headers.location)).text).toContain('No approved CVs to download yet.');
});

test('an intern who already has a company is no longer listed', async () => {
    await pool.query("UPDATE interns SET status = 'PENDING', companyid = ? WHERE internid = ?", [companyID, interns[1]]);
    try {
        const res = await agent.get(`/adviser/companies/${companyID}`);
        expect(res.text).not.toContain('Applicant, Waiting');
    } finally {
        await pool.query("UPDATE interns SET status = 'ENROLLED', companyid = NULL WHERE internid = ?", [interns[1]]);
    }
});

test('a company that does not exist gives 404', async () => {
    expect((await agent.get('/adviser/companies/999999')).status).toBe(404);
    expect((await agent.get('/adviser/companies/999999/cvs.zip')).status).toBe(404);
});

test('the email lists the students in order and the CV file keeps its type', () => {
    const company = { companyname: 'Acme' };
    const body = emailBody(company, [{ studentName: 'Reyes, Ana', course: 'BSIT' }, { studentName: 'Cruz, Ben', course: 'BSCS' }], 'Amelia Stevens');

    expect(body).toContain('training at Acme:\n\n1. Reyes, Ana (BSIT)\n2. Cruz, Ben (BSCS)');
    expect(body).toContain('Amelia Stevens\nOJT Adviser, SAMCIS');
    expect(cvFileName({ studentName: 'Reyes, Ana / ../x', studentID: 1, cvFile: 'abc.PDF' })).toBe('Reyes Ana x - CV.pdf');
});
