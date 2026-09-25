const AppError = require('../utils/AppError');

const notFound = (req, res, next) => {
  next(
    AppError.notFound(
      `Cannot ${req.method} ${req.originalUrl}`,
      'ROUTE_NOT_FOUND'
    )
  );
};

module.exports = notFound;
