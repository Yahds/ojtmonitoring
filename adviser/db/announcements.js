const { pool } = require('./pool');

// the sections an adviser can post to: the class codes of their current interns
async function fetchAdviserSections(adviserID) {
    const [rows] = await pool.query(
        `SELECT DISTINCT s.classcode
         FROM interns i JOIN students s ON s.studentID = i.studentid
         WHERE i.adviserid = ? AND i.status <> 'WITHDRAWN'
         ORDER BY s.classcode`,
        [adviserID]
    );
    return rows.map(row => row.classcode);
}

const COLUMNS = `announcementid, audience_classcode AS audience, subject, message, file_path, file_name,
                 DATE_FORMAT(created_at, '%b %e, %Y') AS date, updated_at IS NOT NULL AS edited`;

// post.audience NULL means all of the adviser's sections
async function insertAnnouncement(adviserID, post) {
    const [result] = await pool.query(
        `INSERT INTO announcements (senderid, audience_classcode, subject, message, file_path, file_name)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [adviserID, post.audience, post.subject, post.message, post.filePath, post.fileName]
    );
    return result.insertId;
}

const PAGE_SIZE = 10;

// % and _ are wildcards in LIKE, so a search for "100%" must match the text "100%"
function likePattern(search) {
    return `%${search.replace(/[\\%_]/g, '\\$&')}%`;
}

// one page of posts, newest first, optionally only those whose subject or message has the search text
async function fetchAnnouncements(adviserID, search = '', page = 1) {
    const filter = search ? 'AND (subject LIKE ? OR message LIKE ?)' : '';
    const params = search ? [adviserID, likePattern(search), likePattern(search)] : [adviserID];

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM announcements WHERE senderid = ? ${filter}`, params);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const current = Math.min(Math.max(1, page), pages);

    const [rows] = await pool.query(
        `SELECT ${COLUMNS}
         FROM announcements
         WHERE senderid = ? ${filter}
         ORDER BY created_at DESC, announcementid DESC
         LIMIT ? OFFSET ?`,
        [...params, PAGE_SIZE, (current - 1) * PAGE_SIZE]
    );
    return { announcements: rows, total, page: current, pages };
}

async function fetchAnnouncement(announcementID, adviserID) {
    const [rows] = await pool.query(
        `SELECT ${COLUMNS} FROM announcements WHERE announcementid = ? AND senderid = ?`,
        [announcementID, adviserID]
    );
    return rows[0] || null;
}

async function updateAnnouncement(announcementID, adviserID, post) {
    const [result] = await pool.query(
        `UPDATE announcements
         SET audience_classcode = ?, subject = ?, message = ?, file_path = ?, file_name = ?, updated_at = NOW()
         WHERE announcementid = ? AND senderid = ?`,
        [post.audience, post.subject, post.message, post.filePath, post.fileName, announcementID, adviserID]
    );
    return result.affectedRows;
}

async function deleteAnnouncement(announcementID, adviserID) {
    const [result] = await pool.query(
        'DELETE FROM announcements WHERE announcementid = ? AND senderid = ?',
        [announcementID, adviserID]
    );
    return result.affectedRows;
}

module.exports = {
    fetchAdviserSections,
    insertAnnouncement,
    fetchAnnouncements,
    fetchAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
};
