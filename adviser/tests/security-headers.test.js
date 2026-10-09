const request = require('supertest');
const app = require('../app');
const { closeDatabase } = require('../db');

afterAll(async () => {
    await closeDatabase();
});

test('the adviser app does not say it runs on Express', async () => {
    const res = await request(app).get('/adviser/login');
    expect(res.headers['x-powered-by']).toBeUndefined();
});
