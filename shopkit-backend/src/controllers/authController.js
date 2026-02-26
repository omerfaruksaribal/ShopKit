const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { AppError } = require('../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = '7d';

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        const { email, password, role } = req.body;

        // Validate input
        if (!email || !password || !role) {
            throw new AppError('Email, password, and role are required', 400);
        }

        // Validate role
        if (!['CUSTOMER', 'SELLER'].includes(role)) {
            throw new AppError('Role must be CUSTOMER or SELLER', 400);
        }

        // Check if email already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new AppError('Email already registered', 409);
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: { email, password_hash, role },
        });

        // Generate token
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });

        res.status(201).json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                role: user.role,
                token,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new AppError('Email and password are required', 400);
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new AppError('Invalid email or password', 401);
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new AppError('Invalid email or password', 401);
        }

        // Generate token
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });

        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                role: user.role,
                token,
            },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login };
