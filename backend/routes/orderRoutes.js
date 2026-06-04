const express = require('express');
const { query } = require('../config/db');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/orders', async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, customer_name, product_name, status, updated_at
       FROM orders
       ORDER BY id ASC`
    );

    res.json({
      data: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch orders', error);
    res.status(500).json({
      error: 'Failed to fetch orders'
    });
  }
});

router.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected'
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'error',
      database: 'unavailable'
    });
  }
});

module.exports = router;
