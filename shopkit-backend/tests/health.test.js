const request = require('supertest');
const app = require('../src/app');

describe('Health Check — GET /api/health', () => {
    it('should return 200 with success true', async () => {
        const res = await request(app).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('message', 'OK');
        expect(res.body).toHaveProperty('timestamp');
    });
});

describe('404 Handler — Unknown routes', () => {
    it('should return 404 for an unknown route', async () => {
        const res = await request(app).get('/api/nonexistent');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body.message).toMatch(/not found/i);
    });
});

describe('Global Error Handler', () => {
    // We add a temporary route that throws to verify the error handler
    const express = require('express');
    const { errorHandler } = require('../src/middleware/errorHandler');
    const { AppError } = require('../src/utils/AppError');

    let errorApp;

    beforeAll(() => {
        errorApp = express();

        // Route that throws an operational AppError
        errorApp.get('/trigger-app-error', (_req, _res, next) => {
            next(new AppError('Something went wrong', 422));
        });

        // Route that throws an unexpected error
        errorApp.get('/trigger-unexpected', (_req, _res, _next) => {
            throw new Error('unexpected crash');
        });

        errorApp.use(errorHandler);
    });

    it('should return structured JSON for an AppError', async () => {
        const res = await request(errorApp).get('/trigger-app-error');

        expect(res.status).toBe(422);
        expect(res.body).toEqual({
            success: false,
            message: 'Something went wrong',
        });
    });

    it('should return 500 with generic message for unexpected errors', async () => {
        const res = await request(errorApp).get('/trigger-unexpected');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            success: false,
            message: 'Internal Server Error',
        });
    });
});
