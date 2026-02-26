const prisma = require('../config/database');
const { AppError } = require('../utils/AppError');
const { processPayment } = require('../services/paymentService');

/**
 * POST /api/orders — Create an order (Customer only)
 *
 * Body: { items: [{ product_id, quantity }] }
 *
 * All logic runs inside a Prisma interactive transaction:
 *   1. Verify stock for each item
 *   2. Snapshot unit_price from the product
 *   3. Deduct stock
 *   4. Calculate total_amount
 *   5. Process dummy payment
 *   6. If payment succeeds → commit (order PAID, transaction SUCCESS)
 *   7. If payment fails   → throw to rollback everything
 */
const createOrder = async (req, res, next) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new AppError('Items array is required and must not be empty', 400);
        }

        const result = await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const orderItemsData = [];

            for (const item of items) {
                const { product_id, quantity } = item;

                if (!product_id || !quantity || quantity <= 0) {
                    throw new AppError('Each item must have a valid product_id and positive quantity', 400);
                }

                // 1. Find product and lock row (SELECT ... FOR UPDATE via Prisma raw)
                const product = await tx.product.findUnique({
                    where: { id: product_id },
                });

                if (!product) {
                    throw new AppError(`Product ${product_id} not found`, 404);
                }

                // 2. Verify stock
                if (product.stock_quantity < quantity) {
                    throw new AppError(
                        `Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, Requested: ${quantity}`,
                        409
                    );
                }

                // 3. Deduct stock
                await tx.product.update({
                    where: { id: product_id },
                    data: { stock_quantity: { decrement: quantity } },
                });

                // 4. Snapshot unit_price and accumulate total
                const unitPrice = Number(product.price);
                totalAmount += unitPrice * quantity;

                orderItemsData.push({
                    product_id,
                    quantity,
                    unit_price: product.price, // exact snapshot
                });
            }

            // 5. Create the order with items
            const order = await tx.order.create({
                data: {
                    customer_id: req.user.id,
                    total_amount: totalAmount,
                    status: 'PENDING',
                    items: {
                        create: orderItemsData,
                    },
                },
                include: { items: true },
            });

            // 6. Process payment
            // Allow overriding payment outcome via req._paymentOutcome (for testing)
            let paymentResult;
            if (req._paymentOutcome !== undefined) {
                const { processPaymentWithOutcome } = require('../services/paymentService');
                paymentResult = processPaymentWithOutcome(totalAmount, req._paymentOutcome);
            } else {
                paymentResult = processPayment(totalAmount);
            }

            if (paymentResult.success) {
                // Payment succeeded — mark order as PAID
                const paidOrder = await tx.order.update({
                    where: { id: order.id },
                    data: { status: 'PAID' },
                    include: { items: true },
                });

                // Create SUCCESS transaction record
                await tx.transaction.create({
                    data: {
                        order_id: order.id,
                        amount: totalAmount,
                        status: 'SUCCESS',
                        provider: paymentResult.provider,
                    },
                });

                return paidOrder;
            } else {
                // Payment failed — throw to trigger transaction rollback
                throw new AppError('Payment failed. Order has been cancelled.', 402);
            }
        });

        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/orders — List current customer's orders
 */
const getMyOrders = async (req, res, next) => {
    try {
        const orders = await prisma.order.findMany({
            where: { customer_id: req.user.id },
            include: {
                items: {
                    include: { product: { select: { id: true, name: true } } },
                },
                transactions: true,
            },
            orderBy: { created_at: 'desc' },
        });

        res.status(200).json({ success: true, data: orders });
    } catch (err) {
        next(err);
    }
};

module.exports = { createOrder, getMyOrders };
