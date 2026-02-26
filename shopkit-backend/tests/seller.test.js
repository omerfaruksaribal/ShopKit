const request = require('supertest');
const express = require('express');
const prisma = require('../src/config/database');

// Helper to inject payment outcome
const buildTestApp = (paymentOutcome) => {
    const baseApp = require('../src/app');
    const wrapper = express();
    wrapper.use((req, _res, next) => {
        req._paymentOutcome = paymentOutcome;
        next();
    });
    wrapper.use(baseApp);
    return wrapper;
};

let seller1Token;
let seller2Token;
let customerToken;
let productId;
let orderId;

beforeAll(async () => {
    // Clean slate
    await prisma.transaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    const app = require('../src/app');

    // Create Seller 1
    const s1 = await request(app).post('/api/auth/register').send({
        email: 'seller1@fulfillment.com',
        password: 'password123',
        role: 'SELLER',
    });
    seller1Token = s1.body.data.token;

    // Create Seller 2 (has no products in the order)
    const s2 = await request(app).post('/api/auth/register').send({
        email: 'seller2@fulfillment.com',
        password: 'password123',
        role: 'SELLER',
    });
    seller2Token = s2.body.data.token;

    // Create Customer
    const c = await request(app).post('/api/auth/register').send({
        email: 'customer@fulfillment.com',
        password: 'password123',
        role: 'CUSTOMER',
    });
    customerToken = c.body.data.token;

    // Seller 1 creates a product
    const prod = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${seller1Token}`)
        .send({ name: 'Ship Widget', price: 30.00, stock_quantity: 20 });
    productId = prod.body.data.id;

    // Customer places a PAID order
    const successApp = buildTestApp(true);
    const order = await request(successApp)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ product_id: productId, quantity: 2 }] });
    orderId = order.body.data.id;
});

afterAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
});

// ──────────────────────────────────────────────
// GET /api/seller/orders
// ──────────────────────────────────────────────
describe('GET /api/seller/orders', () => {
    it('should return orders containing the seller\'s products', async () => {
        const app = require('../src/app');

        const res = await request(app)
            .get('/api/seller/orders')
            .set('Authorization', `Bearer ${seller1Token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);

        // The order should contain the seller's product
        const order = res.body.data.find((o) => o.id === orderId);
        expect(order).toBeDefined();
        expect(order.status).toBe('PAID');
    });

    it('should return empty array for a seller with no orders', async () => {
        const app = require('../src/app');

        const res = await request(app)
            .get('/api/seller/orders')
            .set('Authorization', `Bearer ${seller2Token}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });

    it('should return 403 for customers', async () => {
        const app = require('../src/app');

        const res = await request(app)
            .get('/api/seller/orders')
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(403);
    });
});

// ──────────────────────────────────────────────
// PATCH /api/seller/orders/:id/ship
// ──────────────────────────────────────────────
describe('PATCH /api/seller/orders/:id/ship', () => {
    it('should allow the correct seller to ship a PAID order', async () => {
        const app = require('../src/app');

        const res = await request(app)
            .patch(`/api/seller/orders/${orderId}/ship`)
            .set('Authorization', `Bearer ${seller1Token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('SHIPPED');
    });

    it('should return 400 when trying to ship an already SHIPPED order', async () => {
        const app = require('../src/app');

        const res = await request(app)
            .patch(`/api/seller/orders/${orderId}/ship`)
            .set('Authorization', `Bearer ${seller1Token}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/cannot ship/i);
    });

    it('should return 403 when a different seller tries to ship', async () => {
        const app = require('../src/app');

        const res = await request(app)
            .patch(`/api/seller/orders/${orderId}/ship`)
            .set('Authorization', `Bearer ${seller2Token}`);

        expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent order', async () => {
        const app = require('../src/app');

        const res = await request(app)
            .patch('/api/seller/orders/00000000-0000-0000-0000-000000000000/ship')
            .set('Authorization', `Bearer ${seller1Token}`);

        expect(res.status).toBe(404);
    });
});
