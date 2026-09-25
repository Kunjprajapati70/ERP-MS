class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errorCode = 'BAD_REQUEST', details = null) {
    return new AppError(message, 400, errorCode, details);
  }

  static unauthorized(message = 'Authentication required', errorCode = 'UNAUTHORIZED') {
    return new AppError(message, 401, errorCode);
  }

  static forbidden(message = 'You do not have permission to perform this action', errorCode = 'FORBIDDEN') {
    return new AppError(message, 403, errorCode);
  }

  static notFound(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    return new AppError(message, 404, errorCode);
  }

  static conflict(message, errorCode = 'CONFLICT', details = null) {
    return new AppError(message, 409, errorCode, details);
  }

  static validation(message, details = null) {
    return new AppError(message, 422, 'VALIDATION_ERROR', details);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable', errorCode = 'SERVICE_UNAVAILABLE') {
    return new AppError(message, 503, errorCode);
  }
}

module.exports = AppError;
