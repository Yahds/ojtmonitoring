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

    test('GET / serves the login page (public)', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
    });

    test('POST /ojt-login-page with wrong credentials is rejected', async () => {
        const res = await request(app)
            .post('/ojt-login-page')
            .type('form')
            .send({ adviserEmail: 'nobody@example.com', password: 'wrong' });
        expect(res.status).toBe(401);
    });

    // every protected route sends logged-out user to login page
    const protectedRoutes = [
        ['get', '/ojt-admin'],
        ['get', '/ojt-admin/advisers'],
        ['post', '/ojt-admin/advisers'],
        ['get', '/ojt-dashboard/enroll'],
        ['post', '/ojt-dashboard/enroll'],
        ['post', '/ojt-dashboard/deploy'],
        ['get', '/ojt-pending/'],
        ['get', '/ojt-pending/sort'],
        ['post', '/update-remarks'],
        ['post', '/update-intern-remarks'],
        ['post', '/update-status'],    
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
        ['post', '/ojt-dashboard/postannouncement'],
        ['post', '/ojt-dashboard/deleteannouncement'],
        ['get', '/ojt-about-us/'],
        ['get', '/logout'],
    ];

    test.each(protectedRoutes)('%s %s redirects to login when not authenticated', async (method, url) => {
        const res = await request(app)[method](url);
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/ojt-login-page');
    });
});
