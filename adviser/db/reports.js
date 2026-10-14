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
            wr.kind,
            wr.no_work_reason,
            wr.submitted_at > wr.due_at AS late,
            wr.late_letter_path,
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

async function fetchWeeklyReportAbsences(internID, adviserID) {
    const [rows] = await pool.query(
        `SELECT a.reportid, DATE_FORMAT(a.absent_date, '%Y-%m-%d') AS date, DATE_FORMAT(a.absent_date, '%a, %b %e') AS day,
                a.part, a.reason, a.proof_type
         FROM weeklyreport_absences a
         JOIN weeklyreports w ON w.reportid = a.reportid
         JOIN interns i ON i.internid = w.internid
         WHERE w.internid = ? AND i.adviserid = ?
         ORDER BY a.absent_date`,
        [internID, adviserID]
    );
    return rows;
}

async function fetchAbsenceProofForAdviser(reportID, date, adviserID) {
    const [rows] = await pool.query(
        `SELECT a.proof_path
         FROM weeklyreport_absences a
         JOIN weeklyreports w ON w.reportid = a.reportid
         JOIN interns i ON i.internid = w.internid
         WHERE a.reportid = ? AND a.absent_date = ? AND i.adviserid = ?`,
        [reportID, date, adviserID]
    );
    return rows[0] ? rows[0].proof_path : null;
}

async function fetchLateLetterForAdviser(reportID, adviserID) {
    const [rows] = await pool.query(
        `SELECT wr.late_letter_path
         FROM weeklyreports wr
         JOIN interns i ON wr.internid = i.internid
         WHERE wr.reportid = ? AND i.adviserid = ?`,
        [reportID, adviserID]
    );
    return rows[0] ? rows[0].late_letter_path : null;
}

// the week counts as done, so the intern doesn't need to send it
async function excuseWeek(internID, adviserID, week, weekStart, reason) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[intern]] = await connection.query(
            "SELECT internid FROM interns WHERE internid = ? AND adviserid = ? AND status = 'ACTIVE' FOR UPDATE",
            [internID, adviserID]
        );
        const [sent] = await connection.query('SELECT reportid FROM weeklyreports WHERE internid = ? AND weeknumber = ?', [internID, week]);
        if (!intern || sent.length) {
            await connection.rollback();
            return false;
        }
        await connection.query(
            `INSERT INTO weeklyreports (internid, weeknumber, week_start, kind, hours, status, remark)
             VALUES (?, ?, ?, 'EXCUSED', 0, 'APPROVED', ?)`,
            [internID, week, weekStart, reason]
        );
        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
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

// excused weeks were decided when they were excused, so they can't be reviewed
async function updateWeeklyReportReview(reportID, internID, adviserID, decision, remark, fromStatuses) {
    const [result] = await pool.query(
        `UPDATE weeklyreports wr
         JOIN interns i ON wr.internid = i.internid
         SET wr.status = ?, wr.remark = ?
         WHERE wr.reportid = ? AND wr.internid = ? AND i.adviserid = ? AND wr.status IN (?) AND wr.kind <> 'EXCUSED'`,
        [decision, remark, reportID, internID, adviserID, fromStatuses]
    );
    return result.affectedRows;
}

module.exports = {
    fetchWeeklyReportsForReview,
    fetchWeeklyReportDays,
    fetchWeeklyReportAbsences,
    fetchAbsenceProofForAdviser,
    fetchLateLetterForAdviser,
    excuseWeek,
    fetchWeeklyReportFileForAdviser,
    updateWeeklyReportReview,
};
