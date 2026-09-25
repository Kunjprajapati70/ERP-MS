const config = require('../config/env');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function formatMessage(level, message, meta) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  };

  if (config.isProduction) {
    return JSON.stringify(entry);
  }

  const metaStr = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${entry.timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
}

function log(level, message, meta = {}) {
  // Never log secrets
  const safeMeta = { ...meta };
  delete safeMeta.password;
  delete safeMeta.token;
  delete safeMeta.authorization;

  const line = formatMessage(level, message, safeMeta);
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => {
    if (!config.isProduction) {
      log('debug', message, meta);
    }
  },
  levels,
};

module.exports = logger;
