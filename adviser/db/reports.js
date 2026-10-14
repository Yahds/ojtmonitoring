const { pool } = require('./pool');

async function fetchWeeklyReportsForReview(internID, adviserID) {
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
            wr.supervisor_name,
            students.studentName
        FROM weeklyreports wr
        JOIN interns ON wr.internid = interns.internid
        JOIN students ON interns.studentid = students.studentID
        WHERE wr.internid = ? AND interns.adviserid = ?
        ORDER BY wr.weeknumber
    `, [internID, adviserID]);
    return rows;
}

async function fetchWeeklyReportDays(internID, adviserID) {
    const [rows] = await pool.query(
        `SELECT d.reportid, DATE_FORMAT(d.work_date, '%a, %b %e') AS day,
                TIME_FORMAT(d.am_in, '%l:%i %p') AS am_in, TIME_FORMAT(d.am_out, '%l:%i %p') AS am_out,
                TIME_FORMAT(d.pm_in, '%l:%i %p') AS pm_in, TIME_FORMAT(d.pm_out, '%l:%i %p') AS pm_out, d.hours
         FROM weeklyreport_days d
         JOIN weeklyreports w ON w.reportid = d.reportid
         JOIN interns i ON i.internid = w.internid
         WHERE w.internid = ? AND i.adviserid = ?
         ORDER BY d.work_date`,
        [internID, adviserID]
    );
    return rows;
}

async function fetchWeeklyReportFileForAdviser(reportID, adviserID) {
    const [rows] = await pool.query(
        `SELECT wr.file_path
            FROM weeklyreports wr
            JOIN interns i ON wr.internid = i.internid
            WHERE wr.reportid = ? AND i.adviserid = ?`,
            [reportID, adviserID]);
    return rows[0] ? rows[0].file_path : null;    
}

async function updateWeeklyReportReview(reportID, adviserID, decision, remark) {
    const [result] = await pool.query(
        `UPDATE weeklyreports wr
            JOIN interns i ON wr.internid = i.internid
            SET wr.status = ?, wr.remark = ?
            WHERE wr.reportid = ? AND i.adviserid = ?`,
            [decision, remark, reportID, adviserID]);
    return result;
}

module.exports = {
    fetchWeeklyReportsForReview,
    fetchWeeklyReportDays,
    fetchWeeklyReportFileForAdviser,
    updateWeeklyReportReview,
};
