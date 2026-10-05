const { pool } = require('./pool');

async function fetchAllRequirements() {
    try {
        const [rows] = await pool.query(`SELECT * FROM requirements;`);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}


async function fetchRequirementsByStudentId(studentId) {
    try {
        const [rows] = await pool.query(`
            SELECT
                requirements.requirementname,
                internrequirements.datesubmitted,
                internrequirements.remarks,
                internrequirements.status
            FROM
                internrequirements
            JOIN
                interns ON internrequirements.internid = interns.internid
            JOIN
                students ON interns.studentid = students.studentID
            JOIN
                requirements ON internrequirements.reqid = requirements.reqid
            WHERE
                interns.status = 'ACTIVE' AND students.studentID = ?
        `, [studentId]);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchUnassignedRequirements(internID) {
    try {
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
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchRequirementsForReview(internID, adviserID) {
    try {
        const [rows] = await pool.query(`
            SELECT
                requirements.reqid,    
                requirements.requirementname,
                students.studentName,
                internrequirements.datesubmitted,
                internrequirements.intern_remarks,
                internrequirements.file_path,
                internrequirements.remarks,
                internrequirements.status
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
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchRequirementFile(internID, reqID, adviserID) {
    try {
        const [rows] = await pool.query(
            `SELECT ir.file_path
             FROM internrequirements ir
             JOIN interns i ON ir.internid = i.internid
             WHERE ir.internid = ? AND ir.reqid = ? AND i.adviserid = ?`,
            [internID, reqID, adviserID]
        );
        return rows[0] ? rows[0].file_path : null;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function updateRequirementReview(internID, reqID, adviserID, decision, remarks) {
    try {
        const [result] = await pool.query(
            `UPDATE internrequirements ir
             JOIN interns i ON ir.internid = i.internid
             SET ir.status = ?, ir.remarks = ?
             WHERE ir.internid = ? AND ir.reqid = ? AND i.adviserid = ?`,
            [decision, remarks, internID, reqID, adviserID]
        );
        return result;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

// updates the status in the interns table
async function updateRemarks(studentId, remarks) {
    try {
        // Fetch the intern ID using the student ID
        const [internResult] = await pool.query('SELECT internid FROM interns WHERE studentid = ?', [studentId]);
        const internId = internResult[0]?.internid;

        if (!internId) {
            console.error('No intern ID found for student ID:', studentId);
            return;
        }

        console.log('Updating remarks for Intern ID:', internId, 'Remarks:', remarks);

        // Loop through the remarks and update each one in the database
        for (let i = 0; i < remarks.length; i++) {
            await pool.query('UPDATE internrequirements SET remarks = ? WHERE internid = ? AND reqid = ?',
                [remarks[i], internId, i + 1]); // Assuming reqid starts from 1
        }

        console.log('Remarks updated successfully');
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function insertNewRequirement(requirementName) {
    try {
        const query = `INSERT INTO requirements (requirementname) VALUES (?);`;
        const [result] = await pool.query(query, [requirementName]);
        return result.insertId; // This should now return the auto-generated ID of the new requirement
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function insertInternRequirement(internid, reqid) {
    try {
        const query = `INSERT INTO internrequirements (internid, reqid, datesubmitted, status, remarks)
         VALUES (?, ?, '', 'PENDING', '')`;
        const [result] = await pool.query(query, [internid, reqid]);
        return result.insertId;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

module.exports = {
    fetchAllRequirements,
    fetchRequirementsByStudentId,
    fetchUnassignedRequirements,
    fetchRequirementsForReview,
    fetchRequirementFile,
    updateRequirementReview,
    updateRemarks,
    insertNewRequirement,
    insertInternRequirement,
};