const express = require('express');

const router = express.Router();

/**
 * GET /api/health
 * Simple health-check endpoint.
 */
router.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'OK',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
