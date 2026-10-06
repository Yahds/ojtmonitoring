const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const TAG = `test-${Date.now()}`;
const OTHER_ADVISER_ID = 1;           // Amelia in the seed
const OTHER_INTERN_ID = 300;          // Maria Santos, Amelia's intern
const OTHER_INTERN_NAME = 'Maria Santos';

let adviser;
let agent;
let csrfToken;

async function createAnnouncement(senderId, subject) {
    const [result] = await pool.query(
        'INSERT INTO announcements (date, senderid, recipientid, subject, message) VALUES (CURDATE(), ?, 0, ?, ?)',
        [senderId, subject, 'test message']
    );
    return result.insertId;
}

async function findAnnouncements(subject) {
    const [rows] = await pool.query('SELECT * FROM announcements WHERE subject = ?', [subject]);
    return rows;
}

beforeAll(async () => {
    adviser = await createTestAdviser('announce');
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/ojt-dashboard/');
});

afterAll(async () => {
    await pool.query('DELETE FROM announcements WHERE subject LIKE ?', [`${TAG}%`]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test('a new announcement is saved under the logged-in adviser, even if the form says otherwise', async () => {
    const subject = `${TAG} fake sender`;

    await agent
        .post('/ojt-dashboard/postannouncement')
        .type('form')
        .send({ sender: OTHER_ADVISER_ID, recipient: '0', 'subject-text': subject, 'description-text': 'hi', csrf_token: csrfToken });

    const rows = await findAnnouncements(subject);
    expect(rows).toHaveLength(1);
    expect(rows[0].senderid).toBe(adviser.adviserID);
});

test("cannot delete another adviser's announcement", async () => {
    const subject = `${TAG} not mine`;
    const id = await createAnnouncement(OTHER_ADVISER_ID, subject);

    const res = await agent.post('/ojt-dashboard/deleteannouncement').type('form').send({ announcementid: id, csrf_token: csrfToken });

    expect(res.status).toBe(404);
    expect(await findAnnouncements(subject)).toHaveLength(1);
});

test('can delete their own announcement', async () => {
    const subject = `${TAG} mine`;
    const id = await createAnnouncement(adviser.adviserID, subject);

    const res = await agent.post('/ojt-dashboard/deleteannouncement').type('form').send({ announcementid: id, csrf_token: csrfToken });

    expect(res.status).toBe(302);
    expect(await findAnnouncements(subject)).toHaveLength(0);
});

test("cannot send an announcement to another adviser's intern", async () => {
    const subject = `${TAG} other intern`;

    const res = await agent
        .post('/ojt-dashboard/postannouncement')
        .type('form')
        .send({ sender: adviser.adviserID, recipient: ['0', OTHER_INTERN_NAME], 'subject-text': subject, 'description-text': 'testing', csrf_token: csrfToken });

    expect(res.status).toBe(302);
    const rows = await findAnnouncements(subject);
    expect(rows.filter((row) => row.recipientid === OTHER_INTERN_ID)).toHaveLength(0);
});
