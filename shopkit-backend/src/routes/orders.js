const express = require('express');
const { verifyToken, isCustomer } = require('../middleware/auth');
const { createOrder, getMyOrders } = require('../controllers/orderController');

const router = express.Router();

// Customer-only routes
router.post('/', verifyToken, isCustomer, createOrder);
router.get('/', verifyToken, isCustomer, getMyOrders);

module.exports = router;
