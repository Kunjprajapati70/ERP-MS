const config = require('../config/env');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

function mapMongooseError(err) {
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return AppError.validation('Validation failed', details);
  }

  if (err.name === 'CastError') {
    return AppError.badRequest(`Invalid ${err.path}: ${err.value}`, 'INVALID_ID');
  }

  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    const fieldList = fields.length ? fields.join(', ') : 'field';
    return AppError.conflict(
      `Duplicate value for ${fieldList}`,
      'DUPLICATE_KEY',
      { fields }
    );
  }

  return null;
}

function mapJwtError(err) {
  if (err.name === 'JsonWebTokenError') {
    return AppError.unauthorized('Invalid token', 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return AppError.unauthorized('Token has expired', 'TOKEN_EXPIRED');
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (!(error instanceof AppError)) {
    error =
      mapMongooseError(err) ||
      mapJwtError(err) ||
      new AppError(
        err.message || 'Something went wrong',
        err.statusCode || 500,
        err.errorCode || 'INTERNAL_ERROR'
      );
  }

  const statusCode = error.statusCode || 500;
  const payload = {
    success: false,
    message: error.message || 'Internal server error',
    errorCode: error.errorCode || 'INTERNAL_ERROR',
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (!config.isProduction && err.stack) {
    payload.stack = err.stack;
  }

  if (statusCode >= 500) {
    if (config.isProduction) {
      payload.message = 'An unexpected error occurred. Please try again later.';
      delete payload.details;
      delete payload.stack;
    }
    logger.error(error.message, {
      errorCode: payload.errorCode,
      path: req.originalUrl,
      method: req.method,
      stack: config.isProduction ? undefined : err.stack,
    });
  } else {
    logger.warn(error.message, {
      errorCode: payload.errorCode,
      path: req.originalUrl,
      method: req.method,
      statusCode,
    });
  }

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
