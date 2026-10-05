const { pool, closeDatabase } = require('./db/pool');
const students = require('./db/students');
const interns = require('./db/interns');
const requirements = require('./db/requirements');
const reports = require('./db/reports');
const journals = require('./db/journals');
const advisers = require('./db/advisers');

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

module.exports = {
    ...students,
    ...interns,
    ...requirements,
    ...reports,
    ...journals,
    ...advisers,
    fetchAnnouncements,
    deleteAnnouncement,
    insertAnnouncement,
    closeDatabase,
};
