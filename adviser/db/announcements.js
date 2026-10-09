const { pool } = require('./pool');

async function insertAnnouncement(sender, recipient, subject, announcement) {
    const now = new Date();
    // YYYY-MM-DD
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const recipients = [].concat(recipient);

    // "0" = all of my interns
    if (recipients.length === 1 && recipients[0] === '0') {
        await pool.query("INSERT INTO announcements(date, senderid, recipientid, subject, message) values (?,?,?,?,?)", [date, sender, 0, subject, announcement]);
        return;
    }

    for (const name of recipients) {
        if (name === '0')
            continue;
        // only find adviser/sender's own interns
        const [rs] = await pool.query("select internid from interns i inner join students s on i.studentid = s.studentID where s.studentName = ? and i.adviserid = ?", [name, sender]);
        if (rs.length === 0)
            continue;
        await pool.query("INSERT INTO announcements(date, senderid, recipientid, subject, message) values (?,?,?,?,?)", [date, sender, rs[0].internid, subject, announcement]);
    }
}

async function fetchAnnouncements(senderid) {
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
}

async function deleteAnnouncement(announcementid, senderid) {
    const [result] = await pool.query(
        'DELETE FROM announcements WHERE announcementid = ? AND senderid = ?',
        [announcementid, senderid]
    );
    return result.affectedRows;
}


module.exports = {
    insertAnnouncement,
    fetchAnnouncements,
    deleteAnnouncement,
};
