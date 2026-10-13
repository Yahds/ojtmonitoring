const { pool } = require('./pool');

async function fetchUnassignedRequirements(internID) {
    const [requirements] = await pool.query(`
        SELECT
            r.reqid,
            r.requirementname
        FROM
            requirements r
        LEFT JOIN internrequirements ir ON ir.reqid = r.reqid AND ir.internid = ?
        WHERE
            ir.reqid IS NULL
    `, [internID]);
    return requirements;
}

async function fetchRequirementsForReview(internID, adviserID) {
    const [rows] = await pool.query(`
        SELECT
            requirements.reqid,    
            requirements.requirementname,
            students.studentName,
            internrequirements.datesubmitted,
            internrequirements.intern_remarks,
            internrequirements.file_path,
            internrequirements.remarks,
            internrequirements.status,
            (SELECT MAX(v.version_no) FROM requirement_versions v
             WHERE v.internid = internrequirements.internid AND v.reqid = internrequirements.reqid) AS versions
        FROM
            internrequirements
        JOIN
            requirements ON internrequirements.reqid = requirements.reqid
        JOIN
            interns ON internrequirements.internid = interns.internid
        JOIN
            students ON interns.studentid = students.studentID
        WHERE
            internrequirements.internid = ? AND interns.adviserid = ?
        ORDER by reqid
    `, [internID, adviserID]);
    return rows;
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

async function insertNewRequirement(requirementName) {
    const query = `INSERT INTO requirements (requirementname) VALUES (?);`;
    const [result] = await pool.query(query, [requirementName]);
    return result.insertId; // This should now return the auto-generated ID of the new requirement
}

async function insertInternRequirement(internid, reqid) {
    const query = `INSERT INTO internrequirements (internid, reqid, datesubmitted, status, remarks)
        VALUES (?, ?, NULL, 'PENDING', '')`;
    const [result] = await pool.query(query, [internid, reqid]);
    return result.insertId; 
}

module.exports = {
    fetchUnassignedRequirements,
    fetchRequirementsForReview,
    fetchRequirementFile,
    fetchRequirementVersions,
    fetchVersionFile,
    updateRequirementReview,
    insertNewRequirement,
    insertInternRequirement,
};