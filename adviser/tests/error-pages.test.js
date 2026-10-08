const request = require('supertest');
const app = require('../app');
const { closeDatabase } = require('../db');
const { handleErrors } = require('../middleware/errorHandler');
const { createTestAdviser, deleteTestAdviser, loginAs } = require('./helpers/auth');

let adviser;
let agent;

beforeAll(async () => {
    adviser = await createTestAdviser('errors');
    agent = await loginAs(app, adviser.email);
});

afterAll(async () => {
    await deleteTestAdviser(adviser.adviserID);
    await closeDatabase();
});

test('unknown page shows the 404 page', async () => {
    const res = await request(app).get('/no-such-page');
    expect(res.status).toBe(404);
    expect(res.text).toContain('Page not found');
});

test('adviser who opens a dept head page sees the 403 page', async () => {
    const res = await agent.get('/ojt-admin');
    expect(res.status).toBe(403);
    expect(res.text).toContain('You do not have access to this page');
});

describe('something breaks on the server', () => {
    const error = new Error('secret details from the database');
    const req = { method: 'GET', originalUrl: '/somewhere' };
    let res;

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        res = { headersSent: false, status: jest.fn().mockReturnThis(), render: jest.fn() };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('shows the 500 page with a short error code', () => {
        handleErrors(error, req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        const [view, data] = res.render.mock.calls[0];
        expect(view).toBe('error');
        expect(data.errorId).toMatch(/^[0-9a-f]{8}$/);
    });

    test('logs the real error with the same code, but never shows it to the user', () => {
        handleErrors(error, req, res, jest.fn());

        const [, data] = res.render.mock.calls[0];
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining(data.errorId), error);
        expect(JSON.stringify(data)).not.toContain('secret details');
    });

    test('hands the error to Express if the page was already half sent', () => {
        res.headersSent = true;
        const next = jest.fn();
        handleErrors(error, req, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.render).not.toHaveBeenCalled();
    });
});
