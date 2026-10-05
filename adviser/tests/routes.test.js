const request = require('supertest');
const app = require('../app');
const { closeDatabase } = require('../db');

afterAll(async () => {
    await closeDatabase();
});

describe('route smoke tests', () => {
    test('GET /ojt-login-page serves the login page (public)', async () => {
        const res = await request(app).get('/ojt-login-page/');
        expect(res.status).toBe(200);
    });

    test('GET /ojt-dashboard redirects to login when not authenticated (protected)', async () => {
        const res = await request(app).get('/ojt-dashboard/');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/ojt-login-page');
    });

    // every protected route sends logged-out user to login page
    const protectedRoutes = [
        ['get', '/ojt-dashboard/journals-review/1'],
        ['post', '/ojt-dashboard/journals-review/1'],
        ['get', '/ojt-dashboard/journal-file/1'],
        ['get', '/ojt-dashboard/weekly-reports-review/1'],
        ['post', '/ojt-dashboard/weekly-reports-review/1'],
        ['get', '/ojt-dashboard/weekly-report-file/1'],
        ['get', '/ojt-dashboard/requirements-reports/someone'],
        ['get', '/ojt-dashboard/requirements-review/1'],
        ['post', '/ojt-dashboard/requirements-review/1'],
        ['get', '/ojt-dashboard/requirement-file/1/1'],
        ['get', '/fetch-unassigned-requirements/1'],
        ['post', '/ojt-dashboard/postrequirement'],
        ['get', '/ojt-pending/requirements'],
    ];

    test.each(protectedRoutes)('%s %s redirects to login when not authenticated', async (method, url) => {
        const res = await request(app)[method](url);
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/ojt-login-page');
    });
});
