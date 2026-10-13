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

// audience NULL means all of the adviser's sections
async function insertAnnouncement(adviserID, audience, subject, message) {
    const [result] = await pool.query(
        'INSERT INTO announcements (senderid, audience_classcode, subject, message) VALUES (?, ?, ?, ?)',
        [adviserID, audience, subject, message]
    );
    return result.insertId;
}

async function fetchAnnouncements(adviserID) {
    const [rows] = await pool.query(
        `SELECT announcementid, audience_classcode AS audience, subject, message,
                DATE_FORMAT(created_at, '%b %e, %Y') AS date, updated_at IS NOT NULL AS edited
         FROM announcements
         WHERE senderid = ?
         ORDER BY created_at DESC, announcementid DESC`,
        [adviserID]
    );
    return rows;
}

async function fetchAnnouncement(announcementID, adviserID) {
    const [rows] = await pool.query(
        `SELECT announcementid, audience_classcode AS audience, subject, message,
                DATE_FORMAT(created_at, '%b %e, %Y') AS date, updated_at IS NOT NULL AS edited
         FROM announcements
         WHERE announcementid = ? AND senderid = ?`,
        [announcementID, adviserID]
    );
    return rows[0] || null;
}

async function updateAnnouncement(announcementID, adviserID, audience, subject, message) {
    const [result] = await pool.query(
        `UPDATE announcements SET audience_classcode = ?, subject = ?, message = ?, updated_at = NOW()
         WHERE announcementid = ? AND senderid = ?`,
        [audience, subject, message, announcementID, adviserID]
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
