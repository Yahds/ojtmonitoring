const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const TAG = `test-${Date.now()}`;
const OTHER_ADVISER_ID = 1;           // Amelia in the seed
const OTHER_ADVISERS_SECTION = 'CS401'; // Maria Santos's section, Amelia's intern
const STUDENT_ID = 9900060;

let adviser;
let agent;
let csrfToken;
let internId;

async function createAnnouncement(senderId, subject, audience = null) {
    const [result] = await pool.query(
        'INSERT INTO announcements (senderid, audience_classcode, subject, message) VALUES (?, ?, ?, ?)',
        [senderId, audience, subject, 'test message']
    );
    return result.insertId;
}

function edit(id, fields) {
    return agent.post(`/adviser/announcements/${id}/edit`).type('form').send({ csrf_token: csrfToken, ...fields });
}

async function findAnnouncements(subject) {
    const [rows] = await pool.query('SELECT * FROM announcements WHERE subject = ?', [subject]);
    return rows;
}

function post(fields) {
    return agent.post('/adviser/announcements').type('form').send({ csrf_token: csrfToken, ...fields });
}

beforeAll(async () => {
    adviser = await createTestAdviser('announce');
    // one intern in section T9, so this adviser has a section to post to
    await pool.query("INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, 'Test Announce', 'BSCS', '4', 'T9')", [STUDENT_ID]);
    const [result] = await pool.query("INSERT INTO interns (adviserid, studentid, status) VALUES (?, ?, 'ENROLLED')", [adviser.adviserID, STUDENT_ID]);
    internId = result.insertId;
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/announcements');
});

afterAll(async () => {
    await pool.query('DELETE FROM announcements WHERE subject LIKE ?', [`${TAG}%`]);
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await pool.query('DELETE FROM interns WHERE internid = ?', [internId]);
    await pool.query('DELETE FROM students WHERE studentID = ?', [STUDENT_ID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test('the announcements page lets the adviser pick one of their sections', async () => {
    const res = await agent.get('/adviser/announcements');

    expect(res.status).toBe(200);
    expect(res.text).toContain('All my sections');
    expect(res.text).toContain('Section T9');
});

test('a post to all sections is saved once, under the logged-in adviser, even if the form says otherwise', async () => {
    const subject = `${TAG} to all`;

    const res = await post({ sender: OTHER_ADVISER_ID, audience: '', subject, message: 'hi' });

    expect(res.headers.location).toBe('/adviser/announcements');
    const rows = await findAnnouncements(subject);
    expect(rows).toHaveLength(1);
    expect(rows[0].senderid).toBe(adviser.adviserID);
    expect(rows[0].audience_classcode).toBeNull();
});

test('a post to one section saves that section and an audit row', async () => {
    const subject = `${TAG} to T9`;

    await post({ audience: 'T9', subject, message: 'hi section' });

    const rows = await findAnnouncements(subject);
    expect(rows[0].audience_classcode).toBe('T9');
    const [events] = await pool.query("SELECT target FROM audit_log WHERE actor_adviser_id = ? AND action = 'announcement_posted'", [adviser.adviserID]);
    expect(events.map(e => e.target)).toContain(String(rows[0].announcementid));
});

test("cannot post to another adviser's section", async () => {
    const subject = `${TAG} other section`;

    const res = await post({ audience: OTHER_ADVISERS_SECTION, subject, message: 'hi' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Select one of your sections');
    expect(await findAnnouncements(subject)).toHaveLength(0);
});

test('an empty subject or message shows errors next to the fields', async () => {
    const res = await post({ audience: '', subject: '', message: '' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Write a subject');
    expect(res.text).toContain('Write the message');
});

test('deleting asks first on its own page', async () => {
    const id = await createAnnouncement(adviser.adviserID, `${TAG} confirm`);

    const res = await agent.get(`/adviser/announcements/${id}/delete`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Delete announcement?');
});

test("cannot open the delete page or delete another adviser's announcement", async () => {
    const subject = `${TAG} not mine`;
    const id = await createAnnouncement(OTHER_ADVISER_ID, subject);

    expect((await agent.get(`/adviser/announcements/${id}/delete`)).status).toBe(404);
    const res = await agent.post('/adviser/announcements/delete').type('form').send({ announcementid: id, csrf_token: csrfToken });

    expect(res.status).toBe(404);
    expect(await findAnnouncements(subject)).toHaveLength(1);
});

test('can delete their own announcement', async () => {
    const subject = `${TAG} mine`;
    const id = await createAnnouncement(adviser.adviserID, subject);

    const res = await agent.post('/adviser/announcements/delete').type('form').send({ announcementid: id, csrf_token: csrfToken });

    expect(res.headers.location).toBe('/adviser/announcements');
    expect(await findAnnouncements(subject)).toHaveLength(0);
});

test('the edit page is filled in with the post', async () => {
    const id = await createAnnouncement(adviser.adviserID, `${TAG} edit page`, 'T9');

    const res = await agent.get(`/adviser/announcements/${id}/edit`);

    expect(res.status).toBe(200);
    expect(res.text).toContain(`${TAG} edit page`);
    expect(res.text).toContain('<option value="T9" selected');
});

test('saving an edit changes the post, marks it edited and adds an audit row', async () => {
    const id = await createAnnouncement(adviser.adviserID, `${TAG} before edit`);

    const res = await edit(id, { audience: 'T9', subject: `${TAG} after edit`, message: 'new text' });

    expect(res.headers.location).toBe('/adviser/announcements');
    const [[row]] = await pool.query('SELECT * FROM announcements WHERE announcementid = ?', [id]);
    expect(row.subject).toBe(`${TAG} after edit`);
    expect(row.message).toBe('new text');
    expect(row.audience_classcode).toBe('T9');
    expect(row.updated_at).not.toBeNull();
    const [events] = await pool.query("SELECT target FROM audit_log WHERE actor_adviser_id = ? AND action = 'announcement_edited'", [adviser.adviserID]);
    expect(events.map(e => e.target)).toContain(String(id));
});

test('an empty subject on edit shows the error and keeps the post as it was', async () => {
    const subject = `${TAG} keep me`;
    const id = await createAnnouncement(adviser.adviserID, subject);

    const res = await edit(id, { audience: '', subject: '', message: 'changed' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Write a subject');
    expect((await findAnnouncements(subject))[0].message).toBe('test message');
});

test('an old post can keep a section the adviser no longer has', async () => {
    const id = await createAnnouncement(adviser.adviserID, `${TAG} old section`, 'OLD1');

    const res = await edit(id, { audience: 'OLD1', subject: `${TAG} old section`, message: 'still there' });

    expect(res.headers.location).toBe('/adviser/announcements');
    const [[row]] = await pool.query('SELECT audience_classcode FROM announcements WHERE announcementid = ?', [id]);
    expect(row.audience_classcode).toBe('OLD1');
});

test("cannot open or save another adviser's announcement", async () => {
    const subject = `${TAG} not mine to edit`;
    const id = await createAnnouncement(OTHER_ADVISER_ID, subject);

    expect((await agent.get(`/adviser/announcements/${id}/edit`)).status).toBe(404);
    const res = await edit(id, { audience: '', subject: `${TAG} hacked`, message: 'hacked' });

    expect(res.status).toBe(404);
    expect(await findAnnouncements(subject)).toHaveLength(1);
});
