const app = require('../app');
const { closeDatabase } = require('../db');
const { pool } = require('../db/pool');
const { createTestAdviser, deleteTestAdviser, loginAs } = require('./helpers/auth');

// in the seed, intern 300 (Maria Santos) belongs to adviser 1, not the test adviser
const OTHER_INTERN_ID = 300;
const OTHER_INTERN_NAME = 'Maria Santos';

let adviser;
let agent;

async function requirementsOf(internId) {
    const [rows] = await pool.query(
        'SELECT reqid, remarks FROM internrequirements WHERE internid = ? ORDER BY reqid',
        [internId]
    );
    return rows;
}

beforeAll(async () => {
    adviser = await createTestAdviser('owner');
    agent = await loginAs(app, adviser.email);
});

afterAll(async () => {
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

describe("an adviser cannot use another adviser's intern", () => {
    test('cannot change their requirement remarks', async () => {
        const before = await requirementsOf(OTHER_INTERN_ID);

        const res = await agent
            .post('/update-intern-remarks')
            .type('form')
            .send({ internId: OTHER_INTERN_ID, remarks: Array(7).fill('changed by another adviser') });

        expect(res.status).toBe(404);
        expect(await requirementsOf(OTHER_INTERN_ID)).toEqual(before);
    });

    test('cannot assign them a requirement', async () => {
        const before = await requirementsOf(OTHER_INTERN_ID);

        const res = await agent
            .post('/ojt-dashboard/postrequirement')
            .type('form')
            .send({ 'intern-id': OTHER_INTERN_ID, 'existing-requirement-dropdown': 1 });

        expect(res.status).toBe(404);
        expect(await requirementsOf(OTHER_INTERN_ID)).toEqual(before);
    });

    test.each([
        '/fetch-unassigned-requirements/',
        '/ojt-dashboard/requirements-reports/',
    ])('cannot look them up by name at %s', async (path) => {
        const res = await agent.get(path + encodeURIComponent(OTHER_INTERN_NAME));
        expect(res.status).toBe(404);
    });
});
