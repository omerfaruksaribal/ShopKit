const express = require('express');
const { verifyToken, isSeller } = require('../middleware/auth');
const { getSellerOrders, shipOrder } = require('../controllers/sellerController');

const router = express.Router();

// All seller routes require authentication + SELLER role
router.get('/orders', verifyToken, isSeller, getSellerOrders);
router.patch('/orders/:id/ship', verifyToken, isSeller, shipOrder);

module.exports = router;
