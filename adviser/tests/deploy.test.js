const { deployIntern, closeDatabase } = require('../db');
const { pool } = require('../db/pool');

const INTERN = 300; // Maria Santos, adviser 1, company 2
const ADVISER = 1;
const DATA_PRIVACY_CERTIFICATE = 6;

async function setEndorsement(companyID, status) {
    await pool.query(
        `REPLACE INTO endorsements (internid, companyid, contact_name, contact_email, status)
         VALUES (?, ?, 'Test Contact', 'hr@company.test', ?)`,
        [INTERN, companyID, status]
    );
}

async function internStatus() {
    const [[row]] = await pool.query('SELECT status FROM interns WHERE internid = ?', [INTERN]);
    return row.status;
}

beforeEach(async () => {
    await pool.query("UPDATE interns SET status = 'PENDING', companyid = 2 WHERE internid = ?", [INTERN]);
    await pool.query("UPDATE internrequirements SET status = 'APPROVED' WHERE internid = ? AND reqid = ?", [INTERN, DATA_PRIVACY_CERTIFICATE]);
});

afterAll(async () => {
    await pool.query('DELETE FROM endorsements WHERE internid = ?', [INTERN]);
    await pool.query("UPDATE interns SET status = 'PENDING' WHERE internid = ?", [INTERN]);
    await pool.query("UPDATE internrequirements SET status = 'PENDING' WHERE internid = ? AND reqid = ?", [INTERN, DATA_PRIVACY_CERTIFICATE]);
    await closeDatabase();
});

test('deploys an intern whose company sent back the reply form', async () => {
    await setEndorsement(2, 'ACCEPTED');

    expect((await deployIntern(INTERN, ADVISER, '2026-11-03')).affectedRows).toBe(1);
    expect(await internStatus()).toBe('ACTIVE');
});

test('refuses while the letter is sent but no reply form came back', async () => {
    await setEndorsement(2, 'SENT');

    expect((await deployIntern(INTERN, ADVISER, '2026-11-03')).affectedRows).toBe(0);
    expect(await internStatus()).toBe('PENDING');
});

test('refuses when the accepted endorsement is for a different company', async () => {
    await setEndorsement(3, 'ACCEPTED');

    expect((await deployIntern(INTERN, ADVISER, '2026-11-03')).affectedRows).toBe(0);
});

test('refuses when the data privacy certificate is not approved', async () => {
    await setEndorsement(2, 'ACCEPTED');
    await pool.query("UPDATE internrequirements SET status = 'SUBMITTED' WHERE internid = ? AND reqid = ?", [INTERN, DATA_PRIVACY_CERTIFICATE]);

    expect((await deployIntern(INTERN, ADVISER, '2026-11-03')).affectedRows).toBe(0);
});
