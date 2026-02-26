const express = require('express');
const { verifyToken, isSeller } = require('../middleware/auth');
const {
    createProduct,
    getAllProducts,
    getProduct,
    updateProduct,
    deleteProduct,
} = require('../controllers/productController');

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/:id', getProduct);

// Seller-only routes
router.post('/', verifyToken, isSeller, createProduct);
router.put('/:id', verifyToken, isSeller, updateProduct);
router.delete('/:id', verifyToken, isSeller, deleteProduct);

module.exports = router;
