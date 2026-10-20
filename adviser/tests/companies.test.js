const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom } = require('./helpers/auth');

const NAME = 'Test Company Partner';
const OTHER_NAME = 'Test Company Renamed';

let adviser;
let agent;
let csrfToken;

beforeAll(async () => {
    adviser = await createTestAdviser('companies');
    agent = await loginAs(app, adviser.email);
    csrfToken = await csrfTokenFrom(agent, '/adviser/companies/new');
});

afterEach(async () => {
    await pool.query('DELETE FROM company WHERE companyname IN (?)', [[NAME, OTHER_NAME]]);
});

afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE actor_adviser_id = ?', [adviser.adviserID]);
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

function send(url, fields) {
    return agent.post(url).type('form').send({ csrf_token: csrfToken, ...fields });
}

async function companyNamed(name) {
    const [[row]] = await pool.query('SELECT * FROM company WHERE companyname = ?', [name]);
    return row;
}

test('the companies page lists partners and shows the sidebar link', async () => {
    const res = await agent.get('/adviser/companies');

    expect(res.status).toBe(200);
    expect(res.text).toContain('SLU partners');
    expect(res.text).toContain('Accenture');
    expect(res.text).toContain('href="/adviser/companies"');
});

test('adding a company saves it with a new id and logs it', async () => {
    const res = await send('/adviser/companies/new', { name: NAME, address: 'Baguio City', email: 'hr@partner.test', moaOnFile: 'yes' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/adviser/companies');
    const company = await companyNamed(NAME);
    expect(company).toMatchObject({ companyaddress: 'Baguio City', contact_email: 'hr@partner.test', moa_on_file: 1 });
    const [[logged]] = await pool.query("SELECT COUNT(*) AS n FROM audit_log WHERE actor_adviser_id = ? AND action = 'company_added'", [adviser.adviserID]);
    expect(logged.n).toBe(1);
});

test('an unticked MOA box saves the company as not a partner', async () => {
    await send('/adviser/companies/new', { name: NAME, address: '', email: '' });

    const company = await companyNamed(NAME);
    expect(company).toMatchObject({ companyaddress: null, contact_email: null, moa_on_file: 0 });
});

test.each([
    [{ name: '' }, 'Write the company name'],
    [{ name: 'x'.repeat(101) }, 'Write the company name'],
    [{ name: 'accenture' }, 'already on the list'],
    [{ name: NAME, email: 'not-an-email' }, 'Enter an email address'],
    [{ name: NAME, address: 'x'.repeat(151) }, 'Keep the address'],
])('a bad form %o is shown again with an error', async (fields, message) => {
    const res = await send('/adviser/companies/new', fields);

    expect(res.status).toBe(400);
    expect(res.text).toContain(message);
    expect(await companyNamed(NAME)).toBeUndefined();
});

test('editing a company changes it, and it can keep its own name', async () => {
    await send('/adviser/companies/new', { name: NAME, moaOnFile: 'yes' });
    const { companyid } = await companyNamed(NAME);

    const same = await send(`/adviser/companies/${companyid}/edit`, { name: NAME, email: 'new@partner.test', moaOnFile: 'yes' });
    expect(same.status).toBe(302);
    expect((await companyNamed(NAME)).contact_email).toBe('new@partner.test');

    await send(`/adviser/companies/${companyid}/edit`, { name: OTHER_NAME });
    expect(await companyNamed(OTHER_NAME)).toMatchObject({ companyid, moa_on_file: 0 });
});

test('a company that does not exist gives 404', async () => {
    expect((await agent.get('/adviser/companies/999999/edit')).status).toBe(404);
    expect((await send('/adviser/companies/999999/edit', { name: NAME })).status).toBe(404);
});
