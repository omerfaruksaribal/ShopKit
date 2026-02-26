const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');

beforeAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
});

afterAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
});

// ──────────────────────────────────────────────
// Registration
// ──────────────────────────────────────────────
describe('POST /api/auth/register', () => {
    it('should register a SELLER successfully', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'seller@auth.com',
            password: 'password123',
            role: 'SELLER',
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe('seller@auth.com');
        expect(res.body.data.role).toBe('SELLER');
        expect(res.body.data.token).toBeDefined();
    });

    it('should register a CUSTOMER successfully', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'customer@auth.com',
            password: 'password123',
            role: 'CUSTOMER',
        });

        expect(res.status).toBe(201);
        expect(res.body.data.role).toBe('CUSTOMER');
        expect(res.body.data.token).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'seller@auth.com',
            password: 'password123',
            role: 'SELLER',
        });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/already registered/i);
    });

    it('should return 400 for missing fields', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'no-pass@auth.com',
        });

        expect(res.status).toBe(400);
    });

    it('should return 400 for invalid role', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'bad-role@auth.com',
            password: 'password123',
            role: 'ADMIN',
        });

        expect(res.status).toBe(400);
    });
});

// ──────────────────────────────────────────────
// Login
// ──────────────────────────────────────────────
describe('POST /api/auth/login', () => {
    it('should login and return a JWT with correct payload', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'seller@auth.com',
            password: 'password123',
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        expect(res.body.data.role).toBe('SELLER');

        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(res.body.data.token);
        expect(decoded.id).toBe(res.body.data.id);
        expect(decoded.role).toBe('SELLER');
    });

    it('should return 401 for wrong password', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'seller@auth.com',
            password: 'wrong-password',
        });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/invalid/i);
    });

    it('should return 401 for non-existent email', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'ghost@auth.com',
            password: 'password123',
        });

        expect(res.status).toBe(401);
    });

    it('should return 400 for missing fields', async () => {
        const res = await request(app).post('/api/auth/login').send({});

        expect(res.status).toBe(400);
    });
});

// ──────────────────────────────────────────────
// RBAC Middlewares
// ──────────────────────────────────────────────
describe('RBAC Middlewares', () => {
    let sellerToken;
    let customerToken;

    beforeAll(async () => {
        const sellerRes = await request(app).post('/api/auth/login').send({
            email: 'seller@auth.com',
            password: 'password123',
        });
        sellerToken = sellerRes.body.data.token;

        const customerRes = await request(app).post('/api/auth/login').send({
            email: 'customer@auth.com',
            password: 'password123',
        });
        customerToken = customerRes.body.data.token;
    });

    const express = require('express');
    const { verifyToken, isSeller, isCustomer } = require('../src/middleware/auth');
    const { errorHandler } = require('../src/middleware/errorHandler');

    let rbacApp;
    beforeAll(() => {
        rbacApp = express();
        rbacApp.use(express.json());

        rbacApp.get('/seller-only', verifyToken, isSeller, (_req, res) => {
            res.json({ success: true, message: 'seller zone' });
        });

        rbacApp.get('/customer-only', verifyToken, isCustomer, (_req, res) => {
            res.json({ success: true, message: 'customer zone' });
        });

        rbacApp.get('/authenticated', verifyToken, (req, res) => {
            res.json({ success: true, user: req.user });
        });

        rbacApp.use(errorHandler);
    });

    it('should deny access without a token', async () => {
        const res = await request(rbacApp).get('/authenticated');
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/no token/i);
    });

    it('should deny access with an invalid token', async () => {
        const res = await request(rbacApp)
            .get('/authenticated')
            .set('Authorization', 'Bearer invalid.token.here');
        expect(res.status).toBe(401);
    });

    it('should allow access with a valid token', async () => {
        const res = await request(rbacApp)
            .get('/authenticated')
            .set('Authorization', `Bearer ${sellerToken}`);
        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe('SELLER');
    });

    it('should allow SELLER to access seller-only routes', async () => {
        const res = await request(rbacApp)
            .get('/seller-only')
            .set('Authorization', `Bearer ${sellerToken}`);
        expect(res.status).toBe(200);
    });

    it('should deny CUSTOMER from seller-only routes (403)', async () => {
        const res = await request(rbacApp)
            .get('/seller-only')
            .set('Authorization', `Bearer ${customerToken}`);
        expect(res.status).toBe(403);
    });

    it('should allow CUSTOMER to access customer-only routes', async () => {
        const res = await request(rbacApp)
            .get('/customer-only')
            .set('Authorization', `Bearer ${customerToken}`);
        expect(res.status).toBe(200);
    });

    it('should deny SELLER from customer-only routes (403)', async () => {
        const res = await request(rbacApp)
            .get('/customer-only')
            .set('Authorization', `Bearer ${sellerToken}`);
        expect(res.status).toBe(403);
    });
});
