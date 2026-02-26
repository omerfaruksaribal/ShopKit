const prisma = require('../src/config/database');

/**
 * Step 2 — Database Schema Integration Tests
 *
 * Verifies Prisma models and relationships against a real PostgreSQL database.
 */

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

describe('Database Schema — User model', () => {
    it('should create a SELLER user', async () => {
        const seller = await prisma.user.create({
            data: {
                email: 'seller@test.com',
                password_hash: 'hashed_password_123',
                role: 'SELLER',
            },
        });

        expect(seller.id).toBeDefined();
        expect(seller.email).toBe('seller@test.com');
        expect(seller.role).toBe('SELLER');
    });

    it('should create a CUSTOMER user', async () => {
        const customer = await prisma.user.create({
            data: {
                email: 'customer@test.com',
                password_hash: 'hashed_password_456',
                role: 'CUSTOMER',
            },
        });

        expect(customer.id).toBeDefined();
        expect(customer.role).toBe('CUSTOMER');
    });

    it('should enforce unique email constraint', async () => {
        await expect(
            prisma.user.create({
                data: {
                    email: 'seller@test.com',
                    password_hash: 'xyz',
                    role: 'CUSTOMER',
                },
            })
        ).rejects.toThrow();
    });
});

describe('Database Schema — Product model', () => {
    it('should create a product linked to a seller', async () => {
        const seller = await prisma.user.findUnique({
            where: { email: 'seller@test.com' },
        });

        const product = await prisma.product.create({
            data: {
                seller_id: seller.id,
                name: 'Test Widget',
                description: 'A fine widget',
                price: 29.99,
                stock_quantity: 100,
            },
            include: { seller: true },
        });

        expect(product.id).toBeDefined();
        expect(product.seller.id).toBe(seller.id);
        expect(Number(product.price)).toBe(29.99);
        expect(product.stock_quantity).toBe(100);
    });
});

describe('Database Schema — Order & OrderItem relationships', () => {
    it('should create an order with order items that snapshot product price', async () => {
        const customer = await prisma.user.findUnique({
            where: { email: 'customer@test.com' },
        });
        const product = await prisma.product.findFirst({
            where: { name: 'Test Widget' },
        });

        const order = await prisma.order.create({
            data: {
                customer_id: customer.id,
                total_amount: 59.98,
                status: 'PENDING',
                tax_rate: 0.18,
                items: {
                    create: [
                        {
                            product_id: product.id,
                            quantity: 2,
                            unit_price: product.price,
                        },
                    ],
                },
            },
            include: { items: true, customer: true },
        });

        expect(order.id).toBeDefined();
        expect(order.customer.id).toBe(customer.id);
        expect(order.status).toBe('PENDING');
        expect(order.items).toHaveLength(1);
        expect(Number(order.items[0].unit_price)).toBe(29.99);
        expect(order.items[0].quantity).toBe(2);
    });
});

describe('Database Schema — Transaction model', () => {
    it('should create a transaction linked to an order', async () => {
        const order = await prisma.order.findFirst();

        const txn = await prisma.transaction.create({
            data: {
                order_id: order.id,
                amount: order.total_amount,
                status: 'SUCCESS',
                provider: 'DummyPay',
            },
            include: { order: true },
        });

        expect(txn.id).toBeDefined();
        expect(txn.order.id).toBe(order.id);
        expect(txn.status).toBe('SUCCESS');
        expect(txn.provider).toBe('DummyPay');
    });
});

describe('Database Schema — Cascade deletes', () => {
    it('should cascade delete products when a seller is deleted', async () => {
        const seller = await prisma.user.findUnique({
            where: { email: 'seller@test.com' },
        });

        await prisma.orderItem.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.order.deleteMany();

        await prisma.user.delete({ where: { id: seller.id } });

        const products = await prisma.product.findMany({
            where: { seller_id: seller.id },
        });
        expect(products).toHaveLength(0);
    });
});
