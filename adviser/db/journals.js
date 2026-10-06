const { pool } = require('./pool');

async function fetchJournalsForReview(internID, adviserID) {
    const [rows] = await pool.query(`
        SELECT 
            j.journalid,
            j.monthnumber,
            j.notes,
            j.file_path,
            j.status,
            j.remark,
            j.datesubmitted,
            students.studentName
        FROM journals j
        JOIN interns ON j.internid = interns.internid
        JOIN students ON interns.studentid = students.studentID
        WHERE j.internid = ? AND interns.adviserid = ?
        ORDER BY j.monthnumber
    `, [internID, adviserID]);
    return rows;
}

async function fetchJournalFileForAdviser(journalID, adviserID) {
    const [rows] = await pool.query(
        `SELECT j.file_path
            FROM journals j
            JOIN interns i ON j.internid = i.internid
            WHERE j.journalid = ? AND i.adviserid = ?`,
            [journalID, adviserID]);
    return rows[0] ? rows[0].file_path : null;
}

async function updateJournalReview(journalID, adviserID, decision, remark) {
    const [result] = await pool.query(
        `UPDATE journals j
            JOIN interns i ON j.internid = i.internid
            SET j.status = ?, j.remark = ?
            WHERE j.journalid = ? AND i.adviserid = ?`,
            [decision, remark, journalID, adviserID]);
    return result;
}

module.exports = {
    fetchJournalsForReview,
    fetchJournalFileForAdviser,
    updateJournalReview,
};
