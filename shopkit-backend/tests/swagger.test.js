const request = require('supertest');
const app = require('../src/app');

describe('API Documentation — GET /api-docs', () => {
    it('should serve Swagger UI with 200 status', async () => {
        const res = await request(app).get('/api-docs/').redirects(1);

        expect(res.status).toBe(200);
        expect(res.text).toContain('swagger-ui');
    });

    it('should contain the swagger-ui-init script with the spec', async () => {
        const res = await request(app).get('/api-docs/').redirects(1);

        expect(res.status).toBe(200);
        // The init script embeds the spec JSON
        expect(res.text).toContain('swagger-ui-init.js');
    });
});
