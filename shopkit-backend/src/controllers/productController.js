const prisma = require('../config/database');
const { AppError } = require('../utils/AppError');

/**
 * POST /api/products — Create a new product (Seller only)
 */
const createProduct = async (req, res, next) => {
    try {
        const { name, description, price, stock_quantity } = req.body;

        if (!name || price === undefined || stock_quantity === undefined) {
            throw new AppError('Name, price, and stock_quantity are required', 400);
        }

        if (price < 0 || stock_quantity < 0) {
            throw new AppError('Price and stock_quantity must be non-negative', 400);
        }

        const product = await prisma.product.create({
            data: {
                seller_id: req.user.id,
                name,
                description: description || null,
                price,
                stock_quantity,
            },
        });

        res.status(201).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/products — List all products (public)
 */
const getAllProducts = async (_req, res, next) => {
    try {
        const products = await prisma.product.findMany({
            include: { seller: { select: { id: true, email: true } } },
            orderBy: { created_at: 'desc' },
        });

        res.status(200).json({ success: true, data: products });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/products/:id — Get a single product (public)
 */
const getProduct = async (req, res, next) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: { seller: { select: { id: true, email: true } } },
        });

        if (!product) {
            throw new AppError('Product not found', 404);
        }

        res.status(200).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/products/:id — Update a product (Owner seller only)
 */
const updateProduct = async (req, res, next) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
        });

        if (!product) {
            throw new AppError('Product not found', 404);
        }

        // Only the product owner can update
        if (product.seller_id !== req.user.id) {
            throw new AppError('Forbidden. You can only edit your own products.', 403);
        }

        const { name, description, price, stock_quantity } = req.body;

        const updated = await prisma.product.update({
            where: { id: req.params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price }),
                ...(stock_quantity !== undefined && { stock_quantity }),
            },
        });

        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/products/:id — Delete a product (Owner seller only)
 */
const deleteProduct = async (req, res, next) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
        });

        if (!product) {
            throw new AppError('Product not found', 404);
        }

        if (product.seller_id !== req.user.id) {
            throw new AppError('Forbidden. You can only delete your own products.', 403);
        }

        await prisma.product.delete({ where: { id: req.params.id } });

        res.status(200).json({ success: true, message: 'Product deleted' });
    } catch (err) {
        next(err);
    }
};

module.exports = { createProduct, getAllProducts, getProduct, updateProduct, deleteProduct };
