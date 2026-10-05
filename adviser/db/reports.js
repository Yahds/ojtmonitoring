const { pool } = require('./pool');

async function fetchWeeklyReportsForReview(internID, adviserID) {
    try {
        const [rows] = await pool.query(`
            SELECT 
                wr.reportid,
                wr.weeknumber,
                wr.hours,
                wr.workdescription,
                wr.file_path,
                wr.status,
                wr.remark,
                wr.datesubmitted,
                students.studentName
            FROM weeklyreports wr
            JOIN interns ON wr.internid = interns.internid
            JOIN students ON interns.studentid = students.studentID
            WHERE wr.internid = ? AND interns.adviserid = ?
            ORDER BY wr.weeknumber
        `, [internID, adviserID]);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchWeeklyReportFileForAdviser(reportID, adviserID) {
    try {
        const [rows] = await pool.query(
            `SELECT wr.file_path
             FROM weeklyreports wr
             JOIN interns i ON wr.internid = i.internid
             WHERE wr.reportid = ? AND i.adviserid = ?`,
             [reportID, adviserID]);
        return rows[0] ? rows[0].file_path : null;    
    } catch (error) {
        console.error('Error executing query ', error.message);
        throw error;
    }
}

async function updateWeeklyReportReview(reportID, adviserID, decision, remark) {
    try {
        const [result] = await pool.query(
            `UPDATE weeklyreports wr
             JOIN interns i ON wr.internid = i.internid
             SET wr.status = ?, wr.remark = ?
             WHERE wr.reportid = ? AND i.adviserid = ?`,
             [decision, remark, reportID, adviserID]);
        return result;
    } catch (error) {
        console.error('Error executing query: ', error.message);
        throw error;
    }
}

module.exports = {
    fetchWeeklyReportsForReview,
    fetchWeeklyReportFileForAdviser,
    updateWeeklyReportReview,
};
