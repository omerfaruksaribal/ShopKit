const request = require('supertest');
const express = require('express');
const prisma = require('../src/config/database');

// We build a custom app that injects _paymentOutcome into req
// so we can deterministically test payment success/failure.
const buildTestApp = (paymentOutcome) => {
    const testApp = require('../src/app');

    // We need to insert middleware BEFORE the routes process.
    // Since app is already built, we use a workaround:
    // We create a wrapper app that sets req._paymentOutcome.
    const wrapper = express();
    wrapper.use((req, _res, next) => {
        req._paymentOutcome = paymentOutcome;
        next();
    });
    wrapper.use(testApp);

    return wrapper;
};

let customerToken;
let sellerToken;
let productId;

beforeAll(async () => {
    // Clean slate
    await prisma.transaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // Register seller
    const sellerRes = await request(require('../src/app'))
        .post('/api/auth/register')
        .send({ email: 'seller@orders.com', password: 'password123', role: 'SELLER' });
    sellerToken = sellerRes.body.data.token;

    // Register customer
    const customerRes = await request(require('../src/app'))
        .post('/api/auth/register')
        .send({ email: 'customer@orders.com', password: 'password123', role: 'CUSTOMER' });
    customerToken = customerRes.body.data.token;

    // Create a product with stock of 10
    const prodRes = await request(require('../src/app'))
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ name: 'Order Widget', price: 25.00, stock_quantity: 10 });
    productId = prodRes.body.data.id;
});

afterAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
});

// ──────────────────────────────────────────────
// Successful Order
// ──────────────────────────────────────────────
describe('POST /api/orders — Successful order', () => {
    it('should create an order, deduct stock, and snapshot price', async () => {
        const app = buildTestApp(true); // force payment success

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product_id: productId, quantity: 3 }],
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('PAID');
        expect(Number(res.body.data.total_amount)).toBe(75.00); // 25 * 3
        expect(res.body.data.items).toHaveLength(1);
        expect(Number(res.body.data.items[0].unit_price)).toBe(25.00); // snapshot
        expect(res.body.data.items[0].quantity).toBe(3);

        // Verify stock was deducted: 10 - 3 = 7
        const product = await prisma.product.findUnique({ where: { id: productId } });
        expect(product.stock_quantity).toBe(7);

        // Verify transaction record was created
        const txn = await prisma.transaction.findFirst({
            where: { order_id: res.body.data.id },
        });
        expect(txn).toBeDefined();
        expect(txn.status).toBe('SUCCESS');
        expect(txn.provider).toBe('DummyPay');
    });
});

// ──────────────────────────────────────────────
// Out of Stock
// ──────────────────────────────────────────────
describe('POST /api/orders — Out of stock', () => {
    it('should return 409 when requesting more than available stock', async () => {
        const app = buildTestApp(true);

        // Stock is now 7, request 20
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product_id: productId, quantity: 20 }],
            });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/insufficient stock/i);

        // Stock should remain unchanged at 7
        const product = await prisma.product.findUnique({ where: { id: productId } });
        expect(product.stock_quantity).toBe(7);
    });
});

// ──────────────────────────────────────────────
// Payment Failure (Rollback)
// ──────────────────────────────────────────────
describe('POST /api/orders — Payment failure rollback', () => {
    it('should rollback stock when payment fails', async () => {
        const app = buildTestApp(false); // force payment failure

        const stockBefore = await prisma.product.findUnique({ where: { id: productId } });

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product_id: productId, quantity: 2 }],
            });

        expect(res.status).toBe(402);
        expect(res.body.message).toMatch(/payment failed/i);

        // Stock should be unchanged (transaction rolled back)
        const stockAfter = await prisma.product.findUnique({ where: { id: productId } });
        expect(stockAfter.stock_quantity).toBe(stockBefore.stock_quantity);

        // No new orders should exist for this failed attempt
        // (the order was created inside the transaction, so it should be rolled back)
    });
});

// ──────────────────────────────────────────────
// Authorization
// ──────────────────────────────────────────────
describe('POST /api/orders — Authorization', () => {
    it('should return 403 for a seller trying to place an order', async () => {
        const app = buildTestApp(true);

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({
                items: [{ product_id: productId, quantity: 1 }],
            });

        expect(res.status).toBe(403);
    });

    it('should return 400 for empty items array', async () => {
        const app = buildTestApp(true);

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ items: [] });

        expect(res.status).toBe(400);
    });
});

// ──────────────────────────────────────────────
// Get My Orders
// ──────────────────────────────────────────────
describe('GET /api/orders', () => {
    it('should return the customer\'s orders', async () => {
        const app = require('../src/app');

        const res = await request(app)
            .get('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
});
