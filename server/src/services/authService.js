const User = require('../models/User');
const Role = require('../models/Role');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');
const { createPasswordResetToken, hashToken } = require('../utils/tokens');
const { sendEmail } = require('./mailService');
const { writeAuditLog } = require('./auditService');
const config = require('../config/env');
const logger = require('../utils/logger');
const {
  welcomeEmailTemplate,
  passwordResetEmailTemplate,
  securityAlertEmailTemplate,
} = require('../templates/emailTemplates');
const { ROLES } = require('../constants/roles');

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.__v;
  return obj;
}

function buildAuthPayload(user) {
  const token = signToken({
    sub: user._id.toString(),
    role: user.role?.name,
  });

  return {
    token,
    user: sanitizeUser(user),
  };
}

async function resolveDefaultRole(roleName) {
  const name = (roleName || ROLES.SALES_EXECUTIVE).toUpperCase();

  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(name)) {
    throw AppError.forbidden('Cannot self-register as an administrator', 'INVALID_ROLE');
  }

  if (name === ROLES.CUSTOMER) {
    throw AppError.forbidden(
      'Use the customer portal registration endpoint to create customer accounts',
      'INVALID_ROLE'
    );
  }

  const role = await Role.findOne({ name, isActive: true });
  if (!role) {
    throw AppError.badRequest(`Role ${name} is not available`, 'ROLE_NOT_FOUND');
  }
  return role;
}

async function registerUser(payload, req) {
  const existing = await User.findOne({ email: payload.email.toLowerCase() });
  if (existing) {
    throw AppError.conflict('An account with this email already exists', 'EMAIL_EXISTS');
  }

  const role = await resolveDefaultRole(payload.roleName);

  const user = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email.toLowerCase(),
    password: payload.password,
    phone: payload.phone || '',
    role: role._id,
    status: 'ACTIVE',
  });

  await user.populate('role');

  await writeAuditLog({
    userId: user._id,
    action: 'USER_REGISTERED',
    module: 'AUTH',
    recordId: user._id.toString(),
    req,
  });

  sendEmail({
    to: user.email,
    subject: 'Welcome to Enterprise ERP',
    html: welcomeEmailTemplate({
      name: user.fullName,
      loginUrl: `${config.clientUrl}/login`,
    }),
  }).catch((error) => logger.error('Welcome email failed', { message: error.message }));

  return buildAuthPayload(user);
}

async function loginUser({ email, password }, req) {
  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+password')
    .populate('role');

  if (!user) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (user.status !== 'ACTIVE') {
    throw AppError.forbidden('Your account is not active', 'ACCOUNT_INACTIVE');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  await writeAuditLog({
    userId: user._id,
    action: 'USER_LOGIN',
    module: 'AUTH',
    recordId: user._id.toString(),
    req,
  });

  return buildAuthPayload(user);
}

async function logoutUser(user, req) {
  await writeAuditLog({
    userId: user._id,
    action: 'USER_LOGOUT',
    module: 'AUTH',
    recordId: user._id.toString(),
    req,
  });

  return { message: 'Logged out successfully' };
}

async function getCurrentUser(userId) {
  const user = await User.findById(userId).populate('role');
  if (!user) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }
  return sanitizeUser(user);
}

async function changePassword(userId, { currentPassword, newPassword }, req) {
  const user = await User.findById(userId).select('+password').populate('role');
  if (!user) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }

  const valid = await user.comparePassword(currentPassword);
  if (!valid) {
    throw AppError.unauthorized('Current password is incorrect', 'INVALID_PASSWORD');
  }

  user.password = newPassword;
  await user.save();

  await writeAuditLog({
    userId: user._id,
    action: 'PASSWORD_CHANGED',
    module: 'AUTH',
    recordId: user._id.toString(),
    req,
  });

  sendEmail({
    to: user.email,
    subject: 'Your ERP password was changed',
    html: securityAlertEmailTemplate({
      name: user.fullName,
      action: 'Your account password was changed successfully.',
    }),
  });

  return buildAuthPayload(user);
}

async function forgotPassword(email, req) {
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return success message to avoid email enumeration
  const generic = {
    message: 'If an account exists for that email, a reset link has been sent.',
  };

  if (!user) {
    return generic;
  }

  const { rawToken, hashedToken } = createPasswordResetToken();
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${config.clientUrl}/reset-password?token=${rawToken}`;

  await writeAuditLog({
    userId: user._id,
    action: 'PASSWORD_RESET_REQUESTED',
    module: 'AUTH',
    recordId: user._id.toString(),
    req,
  });

  const result = await sendEmail({
    to: user.email,
    subject: 'Reset your ERP password',
    html: passwordResetEmailTemplate({
      name: user.fullName,
      resetUrl,
    }),
  });

  // In development without SMTP, return token so flow remains testable
  if (result.skipped && !config.isProduction) {
    return {
      ...generic,
      devResetToken: rawToken,
      resetUrl,
    };
  }

  return generic;
}

async function resetPassword({ token, password }, req) {
  const hashedToken = hashToken(token);
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  })
    .select('+resetPasswordToken +resetPasswordExpires')
    .populate('role');

  if (!user) {
    throw AppError.badRequest('Reset token is invalid or has expired', 'INVALID_RESET_TOKEN');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  await writeAuditLog({
    userId: user._id,
    action: 'PASSWORD_RESET_COMPLETED',
    module: 'AUTH',
    recordId: user._id.toString(),
    req,
  });

  sendEmail({
    to: user.email,
    subject: 'Your ERP password was reset',
    html: securityAlertEmailTemplate({
      name: user.fullName,
      action: 'Your account password was reset successfully.',
    }),
  });

  return buildAuthPayload(user);
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  changePassword,
  forgotPassword,
  resetPassword,
  sanitizeUser,
};
