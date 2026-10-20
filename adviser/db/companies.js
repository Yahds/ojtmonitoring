const { pool } = require('./pool');

// partners first, then by name; placed = interns of any adviser who work there now or did
async function fetchCompanies() {
    const [rows] = await pool.query(
        `SELECT c.companyid, c.companyname, c.companyaddress, c.contact_email, c.moa_on_file,
                COUNT(i.internid) AS placed
         FROM company c
         LEFT JOIN interns i ON i.companyid = c.companyid AND i.status <> 'WITHDRAWN'
         GROUP BY c.companyid
         ORDER BY c.moa_on_file DESC, c.companyname`
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

module.exports = { fetchCompanies, fetchCompany, companyNameTaken, addCompany, updateCompany };
