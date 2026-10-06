const { fetchInternsByAdviser, closeDatabase } = require('../db');
const { pool } = require('../db/pool');

afterAll(async () => {
  await closeDatabase();
});

test('fetchInternsByAdviser returns the adviser\'s interns with their company', async () => {
  const interns = await fetchInternsByAdviser(1);

  const maria = interns.find(i => i.internid === 300);

  expect(maria).toBeDefined();           
  expect(maria.status).toBe('PENDING');  
  expect(maria.companyname).toBe('Microsoft'); 
});

test('database rejects non existing intern requirement', async () => {
  await expect(
    pool.query("INSERT INTO internrequirements (internid, reqid, status) VALUES (999999, 1, 'PENDING')")
  ).rejects.toThrow(/foreign key constraint fails/);
});
