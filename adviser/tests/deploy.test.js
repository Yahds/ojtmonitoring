const mysql = require('mysql2/promise');
const { deployIntern, closeDatabase } = require('../db');

let db;
const INTERN = 300;   
const ADVISER = 1;

beforeAll(async () => {
  db = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });
});

beforeEach(async () => {
  await db.query("UPDATE interns SET status = 'PENDING' WHERE internid = ?", [INTERN]);
  await db.query("UPDATE internrequirements SET status = 'APPROVED' WHERE internid = ? AND reqid = 4", [INTERN]);
});

afterAll(async () => {
  await db.query("UPDATE interns SET status = 'PENDING' WHERE internid = ?", [INTERN]);
  await db.query("UPDATE internrequirements SET status = 'APPROVED' WHERE internid = ? AND reqid = 4", [INTERN]);
  await db.end();
  await closeDatabase();
});

test('deploys a PENDING intern with an approved endorsement', async () => {
  const result = await deployIntern(INTERN, ADVISER);           
  expect(result.affectedRows).toBe(1);                         

  const [rows] = await db.query("SELECT status FROM interns WHERE internid = ?", [INTERN]);
  expect(rows[0].status).toBe('ACTIVE');                        
});

test('refuses to deploy when the endorsement is not approved', async () => {
  await db.query("UPDATE internrequirements SET status = 'PENDING' WHERE internid = ? AND reqid = 4", [INTERN]);

  const result = await deployIntern(INTERN, ADVISER);           
  expect(result.affectedRows).toBe(0);                          

  const [rows] = await db.query("SELECT status FROM interns WHERE internid = ?", [INTERN]);
  expect(rows[0].status).toBe('PENDING');                      
});
