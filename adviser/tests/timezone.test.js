const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');

afterAll(async () => {
    await closeDatabase();
});

test('the adviser app runs on Philippine time', () => {
    // -480 minutes = 8 hours ahead of UTC
    expect(new Date().getTimezoneOffset()).toBe(-480);
});

test('the database runs on Philippine time', async () => {
    const [[row]] = await pool.query('SELECT TIMESTAMPDIFF(HOUR, UTC_TIMESTAMP(), NOW()) AS offset');
    expect(row.offset).toBe(8);
});
