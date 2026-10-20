const { pool } = require('./pool');

const CURRICULUM_VITAE = 3;

// interns who chose companies but don't have one yet
const STILL_CHOOSING = "i.status = 'ENROLLED' AND i.companyid IS NULL";

// partners first, then by name; placed = interns of any adviser, wanted = this adviser's interns still choosing
async function fetchCompanies(adviserID) {
    const [rows] = await pool.query(
        `SELECT c.companyid, c.companyname, c.companyaddress, c.contact_email, c.moa_on_file,
                (SELECT COUNT(*) FROM interns i WHERE i.companyid = c.companyid AND i.status <> 'WITHDRAWN') AS placed,
                (SELECT COUNT(*) FROM intern_company_choices ch JOIN interns i ON i.internid = ch.internid
                 WHERE ch.companyid = c.companyid AND i.adviserid = ? AND ${STILL_CHOOSING}) AS wanted
         FROM company c
         ORDER BY c.moa_on_file DESC, c.companyname`,
        [adviserID]
    );
    return rows;
}

// this adviser's interns who want the company, with their CV
async function fetchCompanyApplicants(companyID, adviserID) {
    const [rows] = await pool.query(
        `SELECT i.internid, s.studentName, s.studentID, s.course, s.classcode, ch.choice_rank,
                COALESCE(ir.status, 'PENDING') AS cvStatus, ir.file_path AS cvFile
         FROM intern_company_choices ch
         JOIN interns i ON i.internid = ch.internid
         JOIN students s ON s.studentID = i.studentid
         LEFT JOIN internrequirements ir ON ir.internid = i.internid AND ir.reqid = ?
         WHERE ch.companyid = ? AND i.adviserid = ? AND ${STILL_CHOOSING}
         ORDER BY ch.choice_rank, s.studentName`,
        [CURRICULUM_VITAE, companyID, adviserID]
    );
    return rows;
}

async function fetchCompany(companyID) {
    const [[row]] = await pool.query(
        'SELECT companyid, companyname, companyaddress, contact_email, moa_on_file FROM company WHERE companyid = ?',
        [companyID]
    );
    return row || null;
}

// true when another company already has this name (names are compared without case)
async function companyNameTaken(name, exceptID = 0) {
    const [rows] = await pool.query('SELECT 1 FROM company WHERE companyname = ? AND companyid <> ?', [name, exceptID]);
    return rows.length > 0;
}

async function addCompany({ name, address, email, moaOnFile }) {
    const [result] = await pool.query(
        'INSERT INTO company (companyname, companyaddress, contact_email, moa_on_file) VALUES (?, ?, ?, ?)',
        [name, address || null, email || null, moaOnFile]
    );
    return result.insertId;
}

async function updateCompany(companyID, { name, address, email, moaOnFile }) {
    await pool.query(
        'UPDATE company SET companyname = ?, companyaddress = ?, contact_email = ?, moa_on_file = ? WHERE companyid = ?',
        [name, address || null, email || null, moaOnFile, companyID]
    );
}

module.exports = { fetchCompanies, fetchCompanyApplicants, fetchCompany, companyNameTaken, addCompany, updateCompany };
