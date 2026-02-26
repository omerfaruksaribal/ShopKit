const prisma = require('../config/database');
const { AppError } = require('../utils/AppError');

/**
 * GET /api/seller/orders
 * List all orders that contain the current seller's products.
 */
const getSellerOrders = async (req, res, next) => {
    try {
        const sellerId = req.user.id;

        // Find orders that have at least one item from this seller's products
        const orders = await prisma.order.findMany({
            where: {
                items: {
                    some: {
                        product: { seller_id: sellerId },
                    },
                },
            },
            include: {
                customer: { select: { id: true, email: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, seller_id: true } },
                    },
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

/**
 * PATCH /api/seller/orders/:id/ship
 * Update order status to SHIPPED. Only if the order contains this seller's products
 * and the order is currently PAID.
 */
const shipOrder = async (req, res, next) => {
    try {
        const sellerId = req.user.id;
        const orderId = req.params.id;

        // Find the order
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: { select: { seller_id: true } },
                    },
                },
            },
        });

        if (!order) {
            throw new AppError('Order not found', 404);
        }

        // Verify this seller has products in this order
        const hasSellerProducts = order.items.some(
            (item) => item.product.seller_id === sellerId
        );

        if (!hasSellerProducts) {
            throw new AppError('Forbidden. This order does not contain your products.', 403);
        }

        // Only PAID orders can be shipped
        if (order.status !== 'PAID') {
            throw new AppError(
                `Cannot ship order with status "${order.status}". Only PAID orders can be shipped.`,
                400
            );
        }

        const updated = await prisma.order.update({
            where: { id: orderId },
            data: { status: 'SHIPPED' },
            include: {
                items: {
                    include: { product: { select: { id: true, name: true } } },
                },
            },
        });

        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        next(err);
    }
};

module.exports = { getSellerOrders, shipOrder };
