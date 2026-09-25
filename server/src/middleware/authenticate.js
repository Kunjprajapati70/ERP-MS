const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/jwt');

const authenticateUser = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized('Authentication required', 'UNAUTHORIZED');
  }

  const token = header.split(' ')[1];
  let decoded;

  try {
    decoded = verifyToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Token has expired', 'TOKEN_EXPIRED');
    }
    throw AppError.unauthorized('Invalid token', 'INVALID_TOKEN');
  }

  const user = await User.findById(decoded.sub).populate('role');
  if (!user) {
    throw AppError.unauthorized('User no longer exists', 'USER_NOT_FOUND');
  }

  if (user.status !== 'ACTIVE') {
    throw AppError.forbidden('Your account is not active', 'ACCOUNT_INACTIVE');
  }

  if (user.changedPasswordAfter(decoded.iat)) {
    throw AppError.unauthorized('Password was changed recently. Please sign in again.', 'PASSWORD_CHANGED');
  }

  if (!user.role || !user.role.isActive) {
    throw AppError.forbidden('Your role is inactive', 'ROLE_INACTIVE');
  }

  req.user = user;
  req.token = token;
  next();
});

module.exports = authenticateUser;
