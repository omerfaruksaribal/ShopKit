const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

/**
 * Verify JWT token from Authorization header.
 * Attaches decoded payload (id, role) to req.user.
 */
const verifyToken = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Access denied. No token provided.', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = { id: decoded.id, role: decoded.role };
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return next(new AppError('Invalid or expired token', 401));
        }
        next(err);
    }
};

/**
 * Allow only SELLER role.
 * Must be used after verifyToken.
 */
const isSeller = (req, _res, next) => {
    if (req.user.role !== 'SELLER') {
        return next(new AppError('Forbidden. Seller access only.', 403));
    }
    next();
};

/**
 * Allow only CUSTOMER role.
 * Must be used after verifyToken.
 */
const isCustomer = (req, _res, next) => {
    if (req.user.role !== 'CUSTOMER') {
        return next(new AppError('Forbidden. Customer access only.', 403));
    }
    next();
};

module.exports = { verifyToken, isSeller, isCustomer };
