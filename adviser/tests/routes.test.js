const request = require('supertest');
const app = require('../app');
const { csrfTokenFrom } = require('./helpers/auth');
const { closeDatabase } = require('../db');

afterAll(async () => {
    await closeDatabase();
});

describe('route smoke tests', () => {
    test('GET /adviser/login serves the login page (public)', async () => {
        const res = await request(app).get('/adviser/login');
        expect(res.status).toBe(200);
    });

    test('GET /ojt-dashboard redirects to login when not authenticated (protected)', async () => {
        const res = await request(app).get('/ojt-dashboard/');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/adviser/login');
    });

    test('GET / shows the landing page with both logins (public)', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.text).toContain('href="/student/"');
        expect(res.text).toContain('href="/adviser/login"');
    });

    test('POST /adviser/login with wrong credentials is rejected', async () => {
        const agent = request.agent(app);
        const csrfToken = await csrfTokenFrom(agent, '/adviser/login');
        const res = await agent
            .post('/adviser/login')
            .type('form')
            .send({ adviserEmail: 'nobody@example.com', password: 'wrong', csrf_token: csrfToken });
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
        ['post', '/update-intern-remarks'],   
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
        ['post', '/ojt-dashboard/postannouncement'],
        ['post', '/ojt-dashboard/deleteannouncement'],
        ['get', '/ojt-about-us/'],
        ['get', '/adviser/logout'],
    ];

    test.each(protectedRoutes)('%s %s redirects to login when not authenticated', async (method, url) => {
        const agent = request.agent(app);
        const csrfToken = await csrfTokenFrom(agent, '/adviser/login');
        const res = await agent[method](url).set('X-CSRF-Token', csrfToken);
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/adviser/login');
    });

    // static folders should serve stylesheets and images only
    test.each([
        '/ojt-login-page/styles.css',
        '/ojt-dashboard/styles.css',
        '/ojt-images/slu-logo.png',
        '/ojt-about-us/images/a.png',
    ])('serves the asset %s', async (url) => {
        const res = await request(app).get(url);
        expect(res.status).toBe(200);
    });

    test.each([
        '/ojt-dashboard/index.pug',
        '/ojt-dashboard/views/interns.pug',
        '/ojt-login-page/index.pug',
        '/ojt-about-us/index.pug',
        '/ojt-login-page/hash.js',
        '/ojt-dashboard/upload.js',
        '/ojt-dashboard/postannouncement.js',
        '/ojt-about-us/about-us.html',
    ])('does not serve the file %s', async (url) => {
        const res = await request(app).get(url);
        expect(res.status).toBe(404);
    });

    test('the login page form includes a CSRF token', async () => {
        const res = await request(app).get('/adviser/login');
        expect(res.text).toMatch(/name="csrf_token" value="[0-9a-f]{64}"/);
    });

});
