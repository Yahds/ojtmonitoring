
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt'); // bcrypt library for password hashing
dotenv.config()

// uses pool instead of connection, instead of creating a brand new connection for each query,
// there will be a pool of connections that can be reused
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
}).promise();

console.log('Database pool created');

// fetches all details of students from student table
async function fetchStudents() {
    try {
        const [rows] = await pool.query("SELECT * FROM students");
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

//  fetches all details of pending students from interns table
async function fetchPendingStudents(adviserID) {
    try {
        const [rows] = await pool.query(`
        SELECT s.studentid, s.studentName, s.classcode, c.companyname, c.companyaddress, i.worktype
        FROM interns i
            JOIN students s ON i.studentid = s.studentid
            LEFT JOIN company c ON i.companyid = c.companyid
            WHERE i.status = 'PENDING' AND i.adviserID = ?
        `, [adviserID]);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchPendingStudentsByName(adviserID) {
    try {
        const [rows] = await pool.query(`
            SELECT s.studentid, s.studentName, s.classcode, c.companyname, c.companyaddress
            FROM interns i
            JOIN students s ON i.studentid = s.studentid
            LEFT JOIN company c ON i.companyid = c.companyid
            WHERE i.status = 'PENDING' AND i.adviserID = ?
            ORDER BY s.studentName;
        `, [adviserID]);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchPendingStudentsByClassCode(adviserID) {
    try {
        const [rows] = await pool.query(`
            SELECT s.studentid, s.studentName, s.classcode, c.companyname, c.companyaddress
            FROM interns i
            JOIN students s ON i.studentid = s.studentid
            LEFT JOIN company c ON i.companyid = c.companyid
            WHERE i.status = 'PENDING' AND i.adviserID = ?
            ORDER BY s.classcode;
        `, [adviserID]);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchPendingStudentsByCompany(adviserID) {
    try {
        const [rows] = await pool.query(`
        SELECT s.studentid, s.studentName, s.classcode, c.companyname, c.companyaddress
        FROM interns i
            JOIN students s ON i.studentid = s.studentid
            LEFT JOIN company c ON i.companyid = c.companyid
            WHERE i.status = 'PENDING' AND i.adviserID = ?
            ORDER BY c.companyname;
        `, [adviserID]);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchPendingStudentsByAddress(adviserID) {
    try {
        const [rows] = await pool.query(`
        SELECT s.studentid, s.studentName, s.classcode, c.companyname, c.companyaddress
        FROM interns i
            JOIN students s ON i.studentid = s.studentid
            LEFT JOIN company c ON i.companyid = c.companyid
            WHERE i.status = 'PENDING' AND i.adviserID = ?
            ORDER BY c.companyaddress;
        `, [adviserID]);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchPendingStudentsByWorkType(adviserID) {
    try {
        const [rows] = await pool.query(`
        SELECT s.studentid, s.studentName, s.classcode, c.companyname, c.companyaddress, i.worktype
        FROM interns i
            JOIN students s ON i.studentid = s.studentid
            LEFT JOIN company c ON i.companyid = c.companyid
            WHERE i.status = 'PENDING' AND i.adviserID = ?
            ORDER BY i.worktype;
        `, [adviserID]);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

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


// query to check all requirements of pending students:
// SELECT
//     students.studentID,
//     students.studentName,
//     requirements.requirementname,
//     internrequirements.datesubmitted,
//     internrequirements.remarks,
//     internrequirements.status
// FROM
//     internrequirements
// JOIN
//     interns ON internrequirements.internid = interns.internid
// JOIN
//     students ON interns.studentid = students.studentID
// JOIN
//     requirements ON internrequirements.reqid = requirements.reqid
// WHERE
//     interns.status = 'PENDING';

async function fetchStudent(studentID) {
    try {
        const [rows] = await pool.query("SELECT * FROM students WHERE studentID = ?", [studentID]);
        return rows[0];
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

async function deployIntern(internID, adviserID) {
    try {
        const [result] = await pool.query(
            `UPDATE interns i
             JOIN internrequirements ir ON ir.internid = i.internid AND ir.reqid = 4
             SET i.status = 'ACTIVE'
             WHERE i.internid = ? AND i.adviserid = ? AND i.status = 'PENDING' AND ir.status = 'APPROVED'`,
            [internID, adviserID]
        );
        return result;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}


// updates the status in the interns table
async function updateStatus(studentID, newStatus) {
    try {
        const result = await pool.query('UPDATE interns SET status = ? WHERE studentid = ?', [newStatus, studentID]);
        console.log('Update Result:', result);
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

// updates the status in the interns table
async function updateInternRemarks(internId, remarks) {
    try {
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

async function insertStudent(studentID, name, course, year, classcode) {
    try {
        await pool.query(
            "INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, ?, ?, ?, ?)",
            [studentID, name, course, year, classcode]
        );
        return studentID;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function insertIntern(studentid, adviserid, password, status) {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            "INSERT INTO interns (password, adviserid, studentid, status) VALUES (?, ?, ?, ?)",
            [hashedPassword, adviserid, studentid, status]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error executing query:', error.message);
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

async function fetchInterns(adviserID) {
    try {
        const [rows] = await pool.query("SELECT students.studentid, studentname, classcode, companyname, companyaddress, COALESCE(subquery.totalhours, 0) AS totalhours, CASE WHEN COALESCE(subquery.totalhours, 0) < 240 THEN 'ON GOING' WHEN COALESCE(subquery.totalhours, 0) > 240 THEN 'FINISHED' ELSE 'ON GOING' END AS 'status' FROM students LEFT JOIN interns ON students.studentid = interns.studentid LEFT JOIN (SELECT interns.internid, SUM(weeklyreports.hours) AS totalhours FROM interns LEFT JOIN weeklyreports ON interns.internid = weeklyreports.internid AND weeklyreports.status = 'APPROVED' WHERE interns.status = 'ACTIVE' GROUP BY interns.internid) AS subquery ON interns.internid = subquery.internid LEFT JOIN company ON interns.companyid = company.companyid LEFT JOIN advisers ON advisers.adviserID = interns.adviserID WHERE advisers.adviserID = ? AND interns.status = 'ACTIVE'", [adviserID]);
        return rows;
    } catch (error) {
        console.error('Error executing qeury:', error.message);
        throw error;
    }
}

async function fetchInternsByAdviser(adviserid){
    try{
        const [rows] = await pool.query("SELECT i.internid, s.studentID, s.studentName, s.course, i.status, c.companyname FROM interns i JOIN students s ON i.studentid = s.studentID LEFT JOIN company c ON i.companyid = c.companyid WHERE i.adviserid = ? ORDER BY s.studentName", [adviserid]);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
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

async function fetchInternId(name) {
    try {
        const [rows] = await pool.query(`
            SELECT interns.internid
            FROM interns
            JOIN students ON interns.studentid = students.studentID
            WHERE students.studentName = ?
        `, [name]);

        return rows;
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


async function hashAdviserPasswords() {
    try {

        const [rows] = await pool.query("SELECT adviserID, password FROM advisers");
        console.log('\nSERVER: Checking all paswords if hashed..');
        for (const adviser of rows) {
            const plaintextPasswordFromDatabase = adviser.password;

            // check if pass is hashed
            if (plaintextPasswordFromDatabase.startsWith("$2")) {
                console.log(`Skipping adviser with ID ${adviser.adviserID}: Password is already hashed.`);
                continue; //repeat the for loop
            }

            //hash the password
            const hashedPassword = await bcrypt.hash(plaintextPasswordFromDatabase, 10);

            // Update the hashed password in the database
            await pool.query("UPDATE advisers SET password = ? WHERE adviserID = ?", [hashedPassword, adviser.adviserID]);
            console.log(`Password for adviser ${adviser.adviserID} has been hashed.`);
        }

        console.log('\nSERVER: Password checking finished');
    } catch (error) {
        console.error('Error hashing adviser passwords:', error.message);
        throw error;
    }
}

async function uploadPicture(picture) {
    try {
        if (picture) {
            await pool.query('INSERT INTO advisers (image) VALUES (?)', [picture]);
            return true;
        }
    } catch (error) {
        console.error('Error uploading image:', error.message);
        throw error;
    }
}




async function closeDatabase() {
    await pool.end();
}



module.exports = {
    fetchStudents,
    fetchStudent,
    fetchPendingStudents,
    fetchPendingStudentsByName,
    fetchPendingStudentsByClassCode,
    fetchPendingStudentsByCompany,
    fetchPendingStudentsByAddress,
    fetchPendingStudentsByWorkType,
    fetchRequirementsByStudentId,
    fetchRequirementsForReview,
    fetchRequirementFile,
    updateRequirementReview,
    updateWeeklyReportReview,
    updateRemarks,
    updateStatus,
    uploadPicture,
    authenticateAdviser,
    hashAdviserPasswords,
    deployIntern,
    fetchInterns,
    fetchInternsByAdviser,
    fetchAnnouncements,
    deleteAnnouncement,
    fetchAdviser,
    fetchAdvisersByDepartment,
    insertAdviser,
    insertStudent,
    insertIntern,
    insertAnnouncement,
    insertNewRequirement,
    insertInternRequirement,
    fetchUnassignedRequirements,
    fetchAllRequirements,
    fetchInternId,
    fetchWeeklyReportsForReview,
    fetchWeeklyReportFileForAdviser,
    fetchJournalsForReview,
    fetchJournalFileForAdviser,
    updateJournalReview,
    updateInternRemarks,
    closeDatabase,

};
