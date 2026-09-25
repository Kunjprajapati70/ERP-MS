const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { getDatabaseStatus } = require('../config/db');
const config = require('../config/env');
const { getSmtpStatus } = require('../services/mailService');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = getDatabaseStatus();

    const status = db.connected ? 'ok' : 'degraded';

    res.status(200).json({
      success: true,
      message: db.connected
        ? 'ERP API is healthy'
        : 'ERP API is running but database is unavailable',
      data: {
        status,
        service: 'erp-api',
        version: '0.1.0',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: db,
        smtp: getSmtpStatus(),
      },
    });
  })
);

module.exports = router;
