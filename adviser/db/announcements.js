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

async function fetchAnnouncements(adviserID) {
    const [rows] = await pool.query(
        `SELECT ${COLUMNS}
         FROM announcements
         WHERE senderid = ?
         ORDER BY created_at DESC, announcementid DESC`,
        [adviserID]
    );
    return rows;
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
