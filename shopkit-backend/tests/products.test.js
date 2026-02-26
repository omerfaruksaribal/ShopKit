const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');

let sellerToken;
let sellerToken2;
let customerToken;
let productId;

beforeAll(async () => {
    // Clean slate
    await prisma.transaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // Create Seller 1
    const s1 = await request(app).post('/api/auth/register').send({
        email: 'seller1@products.com',
        password: 'password123',
        role: 'SELLER',
    });
    sellerToken = s1.body.data.token;

    // Create Seller 2
    const s2 = await request(app).post('/api/auth/register').send({
        email: 'seller2@products.com',
        password: 'password123',
        role: 'SELLER',
    });
    sellerToken2 = s2.body.data.token;

    // Create Customer
    const c = await request(app).post('/api/auth/register').send({
        email: 'customer@products.com',
        password: 'password123',
        role: 'CUSTOMER',
    });
    customerToken = c.body.data.token;
});

afterAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
});

// ──────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────
describe('POST /api/products', () => {
    it('should allow a seller to create a product', async () => {
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({
                name: 'Widget Pro',
                description: 'Premium widget',
                price: 49.99,
                stock_quantity: 50,
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Widget Pro');
        expect(Number(res.body.data.price)).toBe(49.99);
        expect(res.body.data.stock_quantity).toBe(50);
        productId = res.body.data.id;
    });

    it('should return 403 for a customer trying to create a product', async () => {
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ name: 'Nope', price: 10, stock_quantity: 5 });

        expect(res.status).toBe(403);
    });

    it('should return 401 without a token', async () => {
        const res = await request(app)
            .post('/api/products')
            .send({ name: 'No Auth', price: 10, stock_quantity: 5 });

        expect(res.status).toBe(401);
    });

    it('should return 400 for missing required fields', async () => {
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({ description: 'missing name and price' });

        expect(res.status).toBe(400);
    });
});

// ──────────────────────────────────────────────
// READ
// ──────────────────────────────────────────────
describe('GET /api/products', () => {
    it('should list all products (public, no token needed)', async () => {
        const res = await request(app).get('/api/products');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
});

describe('GET /api/products/:id', () => {
    it('should return a single product by id', async () => {
        const res = await request(app).get(`/api/products/${productId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(productId);
        expect(res.body.data.seller).toBeDefined();
    });

    it('should return 404 for non-existent product', async () => {
        const res = await request(app).get(
            '/api/products/00000000-0000-0000-0000-000000000000'
        );

        expect(res.status).toBe(404);
    });
});

// ──────────────────────────────────────────────
// UPDATE
// ──────────────────────────────────────────────
describe('PUT /api/products/:id', () => {
    it('should allow the owner seller to update their product', async () => {
        const res = await request(app)
            .put(`/api/products/${productId}`)
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({ name: 'Widget Pro v2', price: 59.99 });

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Widget Pro v2');
        expect(Number(res.body.data.price)).toBe(59.99);
    });

    it('should return 403 when another seller tries to update', async () => {
        const res = await request(app)
            .put(`/api/products/${productId}`)
            .set('Authorization', `Bearer ${sellerToken2}`)
            .send({ name: 'Hacked Name' });

        expect(res.status).toBe(403);
    });

    it('should return 403 when a customer tries to update', async () => {
        const res = await request(app)
            .put(`/api/products/${productId}`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ name: 'Nope' });

        expect(res.status).toBe(403);
    });
});

// ──────────────────────────────────────────────
// DELETE
// ──────────────────────────────────────────────
describe('DELETE /api/products/:id', () => {
    it('should return 403 when another seller tries to delete', async () => {
        const res = await request(app)
            .delete(`/api/products/${productId}`)
            .set('Authorization', `Bearer ${sellerToken2}`);

        expect(res.status).toBe(403);
    });

    it('should return 403 when a customer tries to delete', async () => {
        const res = await request(app)
            .delete(`/api/products/${productId}`)
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(403);
    });

    it('should allow the owner seller to delete their product', async () => {
        const res = await request(app)
            .delete(`/api/products/${productId}`)
            .set('Authorization', `Bearer ${sellerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/deleted/i);

        // Verify it's gone
        const check = await request(app).get(`/api/products/${productId}`);
        expect(check.status).toBe(404);
    });
});
