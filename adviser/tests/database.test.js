const { fetchInternsByAdviser, closeDatabase } = require('../database.js');

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
