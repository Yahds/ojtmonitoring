const { pool } = require('./pool');

// sorted by company
async function fetchEndorsements(adviserID) {
    const [rows] = await pool.query(
        `SELECT e.internid, s.studentName, c.companyname, e.contact_name, e.contact_email, e.position, e.status,
                DATE_FORMAT(e.start_date, '%b %e, %Y') AS startDate,
                DATE_FORMAT(e.sent_at, '%b %e, %Y') AS sentDate
         FROM endorsements e
         JOIN interns i ON i.internid = e.internid
         JOIN students s ON s.studentID = i.studentid
         JOIN company c ON c.companyid = e.companyid
         WHERE i.adviserid = ?
         ORDER BY c.companyname, s.studentName`,
        [adviserID]
    );
    return rows;
}

async function moveEndorsements(internIDs, adviserID, from, to, dateColumn) {
    if (internIDs.length === 0) {
        return [];
    }
    const [rows] = await pool.query(
        `SELECT e.internid FROM endorsements e JOIN interns i ON i.internid = e.internid
         WHERE e.internid IN (?) AND i.adviserid = ? AND e.status = ?`,
        [internIDs, adviserID, from]
    );
    const moved = rows.map(row => row.internid);
    if (moved.length > 0) {
        await pool.query(
            `UPDATE endorsements SET status = ?, ${dateColumn} = NOW() WHERE internid IN (?) AND status = ?`,
            [to, moved, from]
        );
    }
    return moved;
}

const markEndorsementsSent = (internIDs, adviserID) => moveEndorsements(internIDs, adviserID, 'REQUESTED', 'SENT', 'sent_at');
const markRepliesReceived = (internIDs, adviserID) => moveEndorsements(internIDs, adviserID, 'SENT', 'ACCEPTED', 'accepted_at');

module.exports = { fetchEndorsements, markEndorsementsSent, markRepliesReceived };
