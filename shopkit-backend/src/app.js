require('dotenv').config();

const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const sellerRoutes = require('./routes/seller');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const { errorHandler } = require('./middleware/errorHandler');
const { AppError } = require('./utils/AppError');

const app = express();

// --------------- Global Middleware ---------------
app.use(cors());
app.use(express.json());

// --------------- API Documentation ---------------
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --------------- Routes ---------------
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/seller', sellerRoutes);

// --------------- 404 Handler ---------------
app.all('*', (req, _res, next) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

// --------------- Global Error Handler ---------------
app.use(errorHandler);

module.exports = app;
