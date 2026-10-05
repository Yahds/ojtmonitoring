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
});
