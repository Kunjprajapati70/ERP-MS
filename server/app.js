const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./src/config/env');
const apiRoutes = require('./src/routes');
const notFound = require('./src/middleware/notFound');
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');

function parseAllowedOrigins() {
  return String(config.corsOrigin || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  const allowed = parseAllowedOrigins();
  if (allowed.includes('*')) return true;
  if (allowed.includes(origin)) return true;
  if (origin === config.clientUrl) return true;
  if (config.corsAllowVercelPreviews) {
    try {
      const { hostname } = new URL(origin);
      if (hostname.endsWith('.vercel.app')) return true;
    } catch (_) {
      return false;
    }
  }
  return false;
}

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

if (!config.isProduction) {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}

app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/' || req.originalUrl.startsWith('/api/v1/health'),
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    },
  })
);

const uploadPath = path.resolve(__dirname, config.uploadDir);
app.use('/uploads', express.static(uploadPath));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Enterprise ERP API',
    data: {
      docs: '/api/v1/health',
      version: '0.1.0',
    },
  });
});

app.use('/api/v1', apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
