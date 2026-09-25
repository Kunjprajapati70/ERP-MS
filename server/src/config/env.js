const path = require('path');
const dotenv = require('dotenv');

// Load root then server .env (later files do not override existing keys by default)
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

const requiredInProduction = ['MONGODB_URI', 'JWT_SECRET'];

function getEnv(key, fallback) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}

const config = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: Number(getEnv('PORT', 5000)),
  mongodbUri: getEnv('MONGODB_URI', ''),
  jwt: {
    secret: getEnv('JWT_SECRET', 'dev-only-insecure-secret-change-me'),
    expiresIn: getEnv('JWT_EXPIRES_IN', '30d'),
  },
  clientUrl: getEnv('CLIENT_URL', 'http://localhost:5173'),
  corsOrigin: getEnv('CORS_ORIGIN', getEnv('CLIENT_URL', 'http://localhost:5173')),
  corsAllowVercelPreviews: getEnv('CORS_ALLOW_VERCEL_PREVIEWS', 'true') !== 'false',
  appTimezone: getEnv('APP_TIMEZONE', 'Asia/Kolkata'),
  apiPublicUrl: getEnv('API_PUBLIC_URL', ''),
  smtp: {
    host: getEnv('SMTP_HOST', ''),
    port: Number(getEnv('SMTP_PORT', 587)),
    user: getEnv('SMTP_USER', ''),
    password: getEnv('SMTP_PASSWORD', ''),
    from: getEnv('MAIL_FROM', getEnv('SMTP_USER', 'ERP System <noreply@example.com>')),
  },
  payment: {
    keyId: getEnv('PAYMENT_KEY_ID', ''),
    keySecret: getEnv('PAYMENT_KEY_SECRET', ''),
    webhookSecret: getEnv('PAYMENT_WEBHOOK_SECRET', ''),
  },
  fileStorage: getEnv('FILE_STORAGE', 'local'),
  uploadDir: getEnv('UPLOAD_DIR', 'uploads'),
  rateLimit: {
    windowMs: Number(getEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000)),
    max: Number(getEnv('RATE_LIMIT_MAX', 200)),
  },
  isProduction: getEnv('NODE_ENV', 'development') === 'production',
};

function validateConfig() {
  const missing = [];

  if (!config.mongodbUri || config.mongodbUri.includes('<user>')) {
    missing.push('MONGODB_URI');
  }

  if (config.isProduction) {
    for (const key of requiredInProduction) {
      if (!process.env[key] || String(process.env[key]).includes('change-me')) {
        missing.push(key);
      }
    }
  }

  if (missing.length) {
    const message = `Missing or invalid environment variables: ${[...new Set(missing)].join(', ')}`;
    if (config.isProduction) {
      throw new Error(message);
    }
    // eslint-disable-next-line no-console
    console.warn(`[config] Warning: ${message}. Server may fail to connect to MongoDB Atlas.`);
  }
}

validateConfig();

module.exports = config;
