const { pool } = require('./pool');

// the deadline that applies: one set for this intern, else for their section, else for all the adviser's sections
const DEADLINE_JOINS = `
    LEFT JOIN requirement_deadlines ds ON ds.adviserid = i.adviserid AND ds.reqid = ir.reqid AND ds.classcode = s.classcode
    LEFT JOIN requirement_deadlines da ON da.adviserid = i.adviserid AND da.reqid = ir.reqid AND da.classcode = ''`;
const DUE_DATE = 'COALESCE(ir.due_date, ds.due_date, da.due_date)';
// overdue = not sent yet and the deadline has passed; late = first sent after the deadline
const DEADLINE_STATE = `CASE
    WHEN ${DUE_DATE} IS NULL THEN NULL
    WHEN ir.status = 'PENDING' AND CURDATE() > ${DUE_DATE} THEN 'OVERDUE'
    WHEN DATE((SELECT MIN(v.submitted_at) FROM requirement_versions v
               WHERE v.internid = ir.internid AND v.reqid = ir.reqid)) > ${DUE_DATE} THEN 'LATE'
END`;

async function fetchRequirementsForReview(internID, adviserID) {
    const [rows] = await pool.query(
        `SELECT r.reqid, r.requirementname, r.created_by IS NOT NULL AS custom, s.studentName, ir.datesubmitted, ir.intern_remarks, ir.file_path,
                ir.remarks, ir.status,
                (SELECT MAX(v.version_no) FROM requirement_versions v
                 WHERE v.internid = ir.internid AND v.reqid = ir.reqid) AS versions,
                DATE_FORMAT(${DUE_DATE}, '%b %e, %Y') AS due,
                ${DEADLINE_STATE} AS deadline
         FROM internrequirements ir
         JOIN requirements r ON r.reqid = ir.reqid
         JOIN interns i ON i.internid = ir.internid
         JOIN students s ON s.studentID = i.studentid
         ${DEADLINE_JOINS}
         WHERE ir.internid = ? AND i.adviserid = ?
         ORDER BY r.reqid`,
        [internID, adviserID]
    );
    return rows;
}

// the three deadlines that can apply to one intern's requirement, as YYYY-MM-DD for the date input
async function fetchDeadlines(internID, reqID, adviserID) {
    const [[row]] = await pool.query(
        `SELECT r.requirementname, s.studentName, s.classcode,
                DATE_FORMAT(ir.due_date, '%Y-%m-%d') AS intern,
                DATE_FORMAT(ds.due_date, '%Y-%m-%d') AS section,
                DATE_FORMAT(da.due_date, '%Y-%m-%d') AS everyone
         FROM internrequirements ir
         JOIN requirements r ON r.reqid = ir.reqid
         JOIN interns i ON i.internid = ir.internid
         JOIN students s ON s.studentID = i.studentid
         ${DEADLINE_JOINS}
         WHERE ir.internid = ? AND ir.reqid = ? AND i.adviserid = ?`,
        [internID, reqID, adviserID]
    );
    return row || null;
}

// scope is 'intern', 'section' or 'all'; a NULL date removes that deadline. Ownership is checked by the caller.
async function setDeadline(internID, reqID, adviserID, scope, classcode, dueDate) {
    if (scope === 'intern') {
        await pool.query('UPDATE internrequirements SET due_date = ? WHERE internid = ? AND reqid = ?', [dueDate, internID, reqID]);
        return;
    }
    const target = scope === 'section' ? classcode : '';
    if (dueDate === null) {
        await pool.query('DELETE FROM requirement_deadlines WHERE adviserid = ? AND reqid = ? AND classcode = ?', [adviserID, reqID, target]);
        return;
    }
    await pool.query(
        `INSERT INTO requirement_deadlines (adviserid, reqid, classcode, due_date) VALUES (?, ?, ?, ?) AS new
         ON DUPLICATE KEY UPDATE due_date = new.due_date`,
        [adviserID, reqID, target, dueDate]
    );
}

async function fetchRequirementFile(internID, reqID, adviserID) {
    const [rows] = await pool.query(
        `SELECT ir.file_path
            FROM internrequirements ir
            JOIN interns i ON ir.internid = i.internid
            WHERE ir.internid = ? AND ir.reqid = ? AND i.adviserid = ?`,
        [internID, reqID, adviserID]
    );
    return rows[0] ? rows[0].file_path : null; 
}

// newest first; a version with no decision was either replaced by a newer one or is still waiting
async function fetchRequirementVersions(internID, reqID, adviserID) {
    const [[requirement]] = await pool.query(
        `SELECT r.requirementname, s.studentName
         FROM internrequirements ir
         JOIN requirements r ON r.reqid = ir.reqid
         JOIN interns i ON i.internid = ir.internid
         JOIN students s ON s.studentID = i.studentid
         WHERE ir.internid = ? AND ir.reqid = ? AND i.adviserid = ?`,
        [internID, reqID, adviserID]
    );
    if (!requirement) {
        return null;
    }
    const [versions] = await pool.query(
        `SELECT version_no, file_path, intern_note, decision, remarks,
                DATE_FORMAT(submitted_at, '%b %e, %Y %l:%i %p') AS submitted,
                DATE_FORMAT(reviewed_at, '%b %e, %Y') AS reviewed
         FROM requirement_versions
         WHERE internid = ? AND reqid = ?
         ORDER BY version_no DESC`,
        [internID, reqID]
    );
    versions.forEach((version, i) => {
        version.state = version.decision || (i === 0 ? 'WAITING' : 'REPLACED');
    });
    return { ...requirement, versions };
}

async function fetchVersionFile(internID, reqID, versionNo, adviserID) {
    const [rows] = await pool.query(
        `SELECT v.file_path
         FROM requirement_versions v
         JOIN interns i ON i.internid = v.internid
         WHERE v.internid = ? AND v.reqid = ? AND v.version_no = ? AND i.adviserid = ?`,
        [internID, reqID, versionNo, adviserID]
    );
    return rows[0] ? rows[0].file_path : null;
}

// interns a new requirement goes to: still doing their OJT, not finished or withdrawn
const OPEN_STATUSES = ['ENROLLED', 'PENDING', 'ACTIVE'];

// school requirement names and the adviser's own, lowercased, so the same name isn't added twice
async function fetchRequirementNames(adviserID) {
    const [rows] = await pool.query(
        'SELECT LOWER(requirementname) AS name FROM requirements WHERE created_by IS NULL OR created_by = ?',
        [adviserID]
    );
    return rows.map(row => row.name);
}

// audience is INTERN (internID), SECTION (classcode) or ALL; the deadline, if any, uses the same audience
async function addRequirement(adviserID, { name, audience, internID, classcode, dueDate }) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [created] = await connection.query(
            'INSERT INTO requirements (requirementname, created_by, audience, audience_classcode) VALUES (?, ?, ?, ?)',
            [name, adviserID, audience, audience === 'SECTION' ? classcode : null]
        );
        const reqID = created.insertId;

        let added;
        if (audience === 'INTERN') {
            [added] = await connection.query(
                `INSERT INTO internrequirements (internid, reqid, status, due_date)
                 SELECT internid, ?, 'PENDING', ? FROM interns WHERE internid = ? AND adviserid = ?`,
                [reqID, dueDate, internID, adviserID]
            );
        } else {
            [added] = await connection.query(
                `INSERT INTO internrequirements (internid, reqid, status)
                 SELECT i.internid, ?, 'PENDING'
                 FROM interns i JOIN students s ON s.studentID = i.studentid
                 WHERE i.adviserid = ? AND i.status IN (?) AND (? = 'ALL' OR s.classcode = ?)`,
                [reqID, adviserID, OPEN_STATUSES, audience, classcode]
            );
            if (dueDate) {
                await connection.query(
                    'INSERT INTO requirement_deadlines (adviserid, reqid, classcode, due_date) VALUES (?, ?, ?, ?)',
                    [adviserID, reqID, audience === 'SECTION' ? classcode : '', dueDate]
                );
            }
        }
        await connection.commit();
        return { reqID, interns: added.affectedRows };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// an adviser's own requirement, with how many interns have it and how many already sent something
async function fetchOwnRequirement(reqID, adviserID) {
    const [[row]] = await pool.query(
        `SELECT r.reqid, r.requirementname, r.audience, r.audience_classcode,
                COUNT(ir.internid) AS interns, CAST(COALESCE(SUM(ir.status <> 'PENDING'), 0) AS UNSIGNED) AS sent
         FROM requirements r
         LEFT JOIN internrequirements ir ON ir.reqid = r.reqid
         WHERE r.reqid = ? AND r.created_by = ?
         GROUP BY r.reqid`,
        [reqID, adviserID]
    );
    return row || null;
}

// removable only while no intern has sent anything for it; the rows are locked so a submit can't slip in between
async function removeOwnRequirement(reqID, adviserID) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[owned]] = await connection.query(
            'SELECT reqid FROM requirements WHERE reqid = ? AND created_by = ? FOR UPDATE',
            [reqID, adviserID]
        );
        const [rows] = await connection.query('SELECT status FROM internrequirements WHERE reqid = ? FOR UPDATE', [reqID]);
        if (!owned || rows.some(row => row.status !== 'PENDING')) {
            await connection.rollback();
            return false;
        }
        await connection.query('DELETE FROM internrequirements WHERE reqid = ?', [reqID]);
        await connection.query('DELETE FROM requirements WHERE reqid = ?', [reqID]);
        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// a first decision needs a SUBMITTED requirement, a change needs an APPROVED or REJECTED one;
// the decision is also kept on the latest version, so older versions keep their own remark
async function updateRequirementReview(internID, reqID, adviserID, decision, remarks, fromStatuses = ['SUBMITTED']) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(
            `UPDATE internrequirements ir
                JOIN interns i ON ir.internid = i.internid
                SET ir.status = ?, ir.remarks = ?
                WHERE ir.internid = ? AND ir.reqid = ? AND i.adviserid = ? AND ir.status IN (?)`,
            [decision, remarks, internID, reqID, adviserID, fromStatuses]
        );
        if (result.affectedRows === 1) {
            await connection.query(
                `UPDATE requirement_versions
                    SET decision = ?, remarks = ?, reviewed_at = NOW(), reviewed_by = ?
                    WHERE internid = ? AND reqid = ?
                    ORDER BY version_no DESC LIMIT 1`,
                [decision, remarks, adviserID, internID, reqID]
            );
        }
        await connection.commit();
        return result.affectedRows;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    OPEN_STATUSES,
    fetchRequirementsForReview,
    fetchRequirementFile,
    fetchRequirementVersions,
    fetchVersionFile,
    fetchDeadlines,
    setDeadline,
    fetchRequirementNames,
    addRequirement,
    fetchOwnRequirement,
    removeOwnRequirement,
    updateRequirementReview,
};