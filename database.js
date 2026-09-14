
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt'); // bcrypt library for password hashing
const { format } = require('path');
dotenv.config()

// uses pool instead of connection, instead of creating a brand new connection for each query,
// there will be a pool of connections that can be reused
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
}).promise();

console.log('Database connection successful');

// fetches all details of students from student table
async function fetchStudents() {
    try {
        const [rows] = await pool.query("SELECT * FROM students");
        console.log('Fetch Students Query Result:', rows);
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
            JOIN company c ON i.companyid = c.companyid
            WHERE i.status = 'PENDING' AND i.adviserID = ?
        `, [adviserID]);
        console.log('Fetch Pending Students Query Result:', rows);
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
            JOIN company c ON i.companyid = c.companyid
            WHERE i.status = 'PENDING' AND i.adviserID = ?
            ORDER BY s.studentName;
        `, [adviserID]);
        console.log('Fetch Pending Students Query Result:', rows);
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
            JOIN company c ON i.companyid = c.companyid
            WHERE i.status = 'PENDING' AND i.adviserID = ?
            ORDER BY s.classcode;
        `, [adviserID]);
        console.log('Fetch Pending Students Query Result:', rows);
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
            JOIN company c ON i.companyid = c.companyid
            WHERE i.status = 'PENDING' AND i.adviserID = ?
            ORDER BY c.companyname;
        `, [adviserID]);
        console.log('Fetch Pending Students Query Result:', rows);
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
            JOIN company c ON i.companyid = c.companyid
            WHERE i.status = 'PENDING' AND i.adviserID = ?
            ORDER BY c.companyaddress;
        `, [adviserID]);
        console.log('Fetch Pending Students Query Result:', rows);
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
            JOIN company c ON i.companyid = c.companyid
            WHERE i.status = 'PENDING' AND i.adviserID = ?
            ORDER BY i.worktype;
        `, [adviserID]);
        console.log('Fetch Pending Students Query Result:', rows);
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
                interns.status = 'ACCEPTED' AND students.studentID = ?
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

async function fetchRequirementsByInternId(internID) {
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
                requirements ON internrequirements.reqid = requirements.reqid
            WHERE
                internrequirements.internid = ?
        `, [internID]);
        return rows;
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
        const [rows] = await pool.query("SELECT adviserID, adviserEmail, password FROM advisers WHERE adviserEmail = ? LIMIT 1", [adviserEmail]);

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
            console.log(adviser)
            return adviser
        }
        return null
    } catch (error) {
        console.error('Error executing qeury:', error.message);
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



async function fetchSupervisor(supervisorId) {
    try {
        const [rows] = await pool.query("SELECT supervisorname FROM supervisors WHERE supervisorid = ?", [supervisorId]);

        if (rows.length === 1) {
            const supervisor = rows[0];
            console.log(supervisor);
            return supervisor;
        }
        return null;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}



async function fetchInterns(adviserID) {
    try {
        const [rows] = await pool.query("SELECT students.studentid, studentname, classcode, companyname, companyaddress, COALESCE(subquery.totalhours, 0) AS totalhours, CASE WHEN COALESCE(subquery.totalhours, 0) < 240 THEN 'ON GOING' WHEN COALESCE(subquery.totalhours, 0) > 240 THEN 'FINISHED' ELSE 'ON GOING' END AS 'status' FROM students LEFT JOIN interns ON students.studentid = interns.studentid LEFT JOIN (SELECT interns.internid, SUM(hours) AS totalhours FROM interns LEFT JOIN dailyreports ON interns.internid = dailyreports.internid WHERE interns.status = 'ACCEPTED' GROUP BY interns.internid) AS subquery ON interns.internid = subquery.internid LEFT JOIN company ON interns.companyid = company.companyid LEFT JOIN advisers ON advisers.adviserID = interns.adviserID WHERE advisers.adviserID = ? AND interns.status = 'ACCEPTED'", [adviserID]);
        console.log('Fetch Interns Query Result:', rows);
        return rows;
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
    } catch (er) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchDailyReports() {
    try {
        const [rows] = await pool.query(`
            SELECT 
            supervisorid, date, timeIn, timeOut, hours, workdescription, 
                verificationstatus, remark 
            FROM 
                dailyreports 
           
        `,);

        return rows;
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
async function fetchInternDailyReports(internID) {
    try {
        const [rows] = await pool.query(`
        SELECT 
        supervisors.supervisorid, supervisors.supervisoremail, date, timeIn, timeOut, hours, workdescription, 
            verificationstatus, remark 
        FROM 
            dailyreports 
        JOIN
            supervisors
        ON 
            supervisors.supervisorid = dailyreports.supervisorid
        WHERE 
            internid = ?
        `, [internID]);

        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchWeeklyReports(internID) {
    try {
        // Find out the earliest and latest date for the intern's reports
        const [minMaxDates] = await pool.query(`
            SELECT 
                MIN(date) as minDate,
                MAX(date) as maxDate
            FROM 
                dailyreports 
            WHERE 
                internid = ?
        `, [internID]);

        // Calculate the number of full weeks
        const minDate = minMaxDates[0].minDate;
        const maxDate = minMaxDates[0].maxDate;
        const fullWeeks = Math.floor((new Date(maxDate) - new Date(minDate)) / (7 * 24 * 60 * 60 * 1000));

        // Retrieve only the rows that fall within the full week range
        const [rows] = await pool.query(`
            SELECT 
                DAYNAME(date) as dayOfWeek,
                date,
                workdescription as description,
                hours
            FROM 
                dailyreports
            WHERE 
                internid = ? AND
                date >= ? AND
                date < ADDDATE(?, INTERVAL ?*7 DAY)
            ORDER BY
                date;
        `, [internID, minDate, minDate, fullWeeks]);

        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
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
    fetchRequirementsByInternId,
    updateRemarks,
    updateStatus,
    uploadPicture,
    authenticateAdviser,
    hashAdviserPasswords,
    fetchInterns,
    fetchAnnouncements,
    deleteAnnouncement,
    fetchAdviser,
    insertAnnouncement,
    insertNewRequirement,
    insertInternRequirement,
    fetchDailyReports,
    fetchInternDailyReports,
    fetchUnassignedRequirements,
    fetchAllRequirements,
    fetchInternId,
    fetchSupervisor,
    fetchWeeklyReports,
    updateInternRemarks,
    closeDatabase,

};
