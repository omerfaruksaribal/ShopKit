const { AppError } = require('../utils/AppError');

/**
 * Global error-handling middleware.
 * Must have 4 parameters so Express recognises it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
    // Default to 500 if no status code was set
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Internal Server Error';

    // Log unexpected errors in non-test environments
    if (!err.isOperational && process.env.NODE_ENV !== 'test') {
        console.error('💥 UNEXPECTED ERROR:', err);
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
};

module.exports = { errorHandler };
