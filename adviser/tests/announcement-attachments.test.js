const fs = require('fs');
const os = require('os');
const path = require('path');

// a temporary folder instead of the Docker volume, so this also runs in CI
const FILES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'announcement-files-'));
process.env.ANNOUNCEMENT_FILES_DIR = FILES_DIR;

const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { fileTypeOf } = require('../lib/attachments');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const TAG = `test-file-${Date.now()}`;
const OTHER_ADVISER_ID = 1;
const PDF = Buffer.from('%PDF-1.4\ntest file\n');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let adviser;
let agent;
let csrfToken;

function postWithFile(subject, file, fileName) {
    return agent.post('/adviser/announcements')
        .field('csrf_token', csrfToken)
        .field('audience', '')
        .field('subject', subject)
        .field('message', 'see the file')
        .attach('attachment', file, fileName);
}

async function findAnnouncement(subject) {
    const [rows] = await pool.query('SELECT * FROM announcements WHERE subject = ?', [subject]);
    return rows[0];
}

function fileExists(filePath) {
    return fs.existsSync(path.join(FILES_DIR, filePath));
}

beforeAll(async () => {
    adviser = await createTestAdviser('attach');
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/announcements');
});

afterAll(async () => {
    await pool.query('DELETE FROM announcements WHERE subject LIKE ?', [`${TAG}%`]);
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
    fs.rmSync(FILES_DIR, { recursive: true, force: true });
});

test('the file type comes from the first bytes, not the name', () => {
    expect(fileTypeOf(PDF)).toBe('pdf');
    expect(fileTypeOf(PNG)).toBe('png');
    expect(fileTypeOf(Buffer.from('just text'))).toBeNull();
});

test('a post with a PDF saves the file under a random name and keeps the original name for the link', async () => {
    const subject = `${TAG} pdf`;

    const res = await postWithFile(subject, PDF, 'week 1 notes.pdf');

    expect(res.headers.location).toBe('/adviser/announcements');
    const row = await findAnnouncement(subject);
    expect(row.file_name).toBe('week 1 notes.pdf');
    expect(row.file_path).toMatch(/^announcement_[0-9a-f]{16}\.pdf$/);
    expect(fileExists(row.file_path)).toBe(true);
});

test('a text file renamed to .pdf is refused', async () => {
    const subject = `${TAG} fake pdf`;

    const res = await postWithFile(subject, Buffer.from('not really a pdf'), 'fake.pdf');

    expect(res.status).toBe(400);
    expect(res.text).toContain('This file type is not supported');
    expect(await findAnnouncement(subject)).toBeUndefined();
});

test('a file over 5 MB is refused with the size error', async () => {
    const subject = `${TAG} too big`;
    const big = Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]);

    const res = await postWithFile(subject, big, 'big.pdf');

    expect(res.status).toBe(400);
    expect(res.text).toContain('The file exceeds the 5 MB size limit');
    expect(await findAnnouncement(subject)).toBeUndefined();
});

test('a file form without the CSRF token is still refused', async () => {
    const res = await agent.post('/adviser/announcements')
        .field('audience', '')
        .field('subject', `${TAG} no token`)
        .field('message', 'hi')
        .attach('attachment', PDF, 'notes.pdf');

    expect(res.status).toBe(403);
});

test('the adviser can download the file with its original name', async () => {
    const subject = `${TAG} download`;
    await postWithFile(subject, PDF, 'guide.pdf');
    const row = await findAnnouncement(subject);

    const res = await agent.get(`/adviser/announcements/${row.announcementid}/file`).buffer(true);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment; filename="guide.pdf"');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
});

test("cannot download another adviser's file", async () => {
    const [result] = await pool.query(
        "INSERT INTO announcements (senderid, subject, message, file_path, file_name) VALUES (?, ?, 'hi', 'announcement_x.pdf', 'x.pdf')",
        [OTHER_ADVISER_ID, `${TAG} not mine`]
    );

    expect((await agent.get(`/adviser/announcements/${result.insertId}/file`)).status).toBe(404);
});

test('choosing a new file on edit replaces the old one', async () => {
    const subject = `${TAG} replace`;
    await postWithFile(subject, PDF, 'old.pdf');
    const before = await findAnnouncement(subject);

    await agent.post(`/adviser/announcements/${before.announcementid}/edit`)
        .field('csrf_token', csrfToken).field('audience', '').field('subject', subject).field('message', 'new file')
        .attach('attachment', PNG, 'new.png');

    const after = await findAnnouncement(subject);
    expect(after.file_name).toBe('new.png');
    expect(fileExists(after.file_path)).toBe(true);
    expect(fileExists(before.file_path)).toBe(false);
});

test('ticking "Remove this file" on edit removes it', async () => {
    const subject = `${TAG} remove`;
    await postWithFile(subject, PDF, 'remove-me.pdf');
    const before = await findAnnouncement(subject);

    await agent.post(`/adviser/announcements/${before.announcementid}/edit`)
        .field('csrf_token', csrfToken).field('audience', '').field('subject', subject).field('message', 'no file')
        .field('remove_attachment', '1');

    const after = await findAnnouncement(subject);
    expect(after.file_path).toBeNull();
    expect(fileExists(before.file_path)).toBe(false);
});

test('an edit without a new file keeps the current one', async () => {
    const subject = `${TAG} keep`;
    await postWithFile(subject, PDF, 'keep.pdf');
    const before = await findAnnouncement(subject);

    await agent.post(`/adviser/announcements/${before.announcementid}/edit`)
        .field('csrf_token', csrfToken).field('audience', '').field('subject', subject).field('message', 'edited text');

    const after = await findAnnouncement(subject);
    expect(after.file_path).toBe(before.file_path);
    expect(fileExists(after.file_path)).toBe(true);
});

test('deleting a post also deletes its file', async () => {
    const subject = `${TAG} delete`;
    await postWithFile(subject, PDF, 'gone.pdf');
    const row = await findAnnouncement(subject);

    await agent.post('/adviser/announcements/delete').type('form').send({ announcementid: row.announcementid, csrf_token: csrfToken });

    expect(await findAnnouncement(subject)).toBeUndefined();
    expect(fileExists(row.file_path)).toBe(false);
});
