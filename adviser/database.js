const { pool, closeDatabase } = require('./db/pool');
const students = require('./db/students');
const interns = require('./db/interns');
const requirements = require('./db/requirements');
const bcrypt = require('bcrypt'); // bcrypt library for password hashing

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


async function authenticateAdviser(adviserEmail, password) {
    try {
        const [rows] = await pool.query("SELECT adviserID, adviserEmail, password, role FROM advisers WHERE adviserEmail = ? LIMIT 1", [adviserEmail]);

        if (rows.length === 1) {
            const adviser = rows[0];
            const hashedPasswordFromDatabase = adviser.password;

            // ccompare the provided password with the hashed password from the database
            const passwordMatch = await bcrypt.compare(password, hashedPasswordFromDatabase);

            if (passwordMatch) {
                return adviser;
            }
        }
        return null;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchAdviser(adviserID) {
    try {
        console.log(adviserID);
        const [rows] = await pool.query("SELECT * FROM advisers where adviserID=?", [adviserID]);

        if (rows.length == 1) {
            const adviser = rows[0]
            return adviser
        }
        return null
    } catch (error) {
        console.error('Error executing qeury:', error.message);
        throw error;
    }
}

async function fetchAdvisersByDepartment(departmentid) {
    try {
        const [rows] = await pool.query("SELECT adviserID, adviserName, adviserEmail FROM advisers WHERE departmentid = ? AND role = 'adviser' ORDER BY adviserName", [departmentid]);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function insertAdviser(name, email, password, departmentid){
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query("INSERT INTO advisers (adviserName, adviserEmail, password, departmentid, role) VALUES (?, ?, ?, ?, 'adviser')", [name, email, hashedPassword, departmentid]);
        return result.insertId;
    } catch (error) {
        console.error('Error executing query', error.message);
        throw error;
    }
}

async function insertAnnouncement(sender, recipient, subject, announcement) {

    // Get the current date
    const now = new Date();

    // Format the date as YYYY-MM-DD
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    try {
        if (recipient.length == 1) {
            await pool.query("INSERT INTO announcements(date, senderid, recipientid, subject, message) values (?,?,?,?,?)", [date, sender, recipient[0], subject, announcement]);
        } else {
            for (let i = 0; i < recipient.length; i++) {
                if (recipient[i] == 0)
                    continue;
                const [rs] = await pool.query("select internid from interns i inner join students s on i.studentid = s.studentID where s.studentName = ?", [recipient[i]]);
                await pool.query("INSERT INTO announcements(date, senderid, recipientid, subject, message) values (?,?,?,?,?)", [date, sender, rs[0].internid, subject, announcement]);
            }
        }
    } catch (error) {
        console.error('Error executing qeury:', error.message);
        throw error;
    }
}


async function fetchAnnouncements(senderid) {
    try {
        const [rows] = await pool.query("SELECT a.announcementid, a.date, a.recipientid, a.subject, a.message, CASE WHEN a.recipientid = 0 THEN 'All Students' ELSE s.studentName END AS studentName FROM announcements a LEFT JOIN interns i ON a.recipientid = i.internid LEFT JOIN students s ON i.studentID = s.studentid WHERE a.senderid = ? ORDER BY a.announcementid desc", [senderid]);

        // Reformat the date for each row
        const formattedRows = rows.map(row => {
            // Assuming row.date is a JavaScript Date object
            const formattedDate = `${String(row.date.getDate()).padStart(2, '0')}/${String(row.date.getMonth() + 1).padStart(2, '0')}/${row.date.getFullYear()}`;
            return {
                ...row,
                date: formattedDate
            };
        });

        return formattedRows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function deleteAnnouncement(announcementid) {
    try {
        await pool.query('DELETE from announcements where announcementid = ?', [announcementid]);
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

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

async function fetchJournalsForReview(internID, adviserID) {
    try {
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
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function updateJournalReview(journalID, adviserID, decision, remark) {
    try {
        const [result] = await pool.query(
            `UPDATE journals j
             JOIN interns i ON j.internid = i.internid
             SET j.status = ?, j.remark = ?
             WHERE j.journalid = ? AND i.adviserid = ?`,
             [decision, remark, journalID, adviserID]);
        return result;
    } catch (error) {
        console.error('Error executing query: ', error.message);
        throw error;
    }
}

async function fetchJournalFileForAdviser(journalID, adviserID) {
    try {
        const [rows] = await pool.query(
            `SELECT j.file_path
             FROM journals j
             JOIN interns i ON j.internid = i.internid
             WHERE j.journalid = ? AND i.adviserid = ?`,
             [journalID, adviserID]);
        return rows[0] ? rows[0].file_path : null;
    } catch (error) {
        console.error('Error executing query ', error.message);
        throw error;
    }
}


module.exports = {
    ...students,
    ...interns,
    ...requirements,
    updateWeeklyReportReview,
    authenticateAdviser,
    fetchAnnouncements,
    deleteAnnouncement,
    fetchAdviser,
    fetchAdvisersByDepartment,
    insertAdviser,
    insertAnnouncement,
    fetchWeeklyReportsForReview,
    fetchWeeklyReportFileForAdviser,
    fetchJournalsForReview,
    fetchJournalFileForAdviser,
    updateJournalReview,
    closeDatabase,
};
