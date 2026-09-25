const User = require('../models/User');
const Role = require('../models/Role');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { createNotification } = require('./notificationService');
const { sanitizeUser } = require('./authService');
const { sendEmail } = require('./mailService');
const { adminCreatedUserCredentialsTemplate } = require('../templates/emailTemplates');
const { ROLES } = require('../constants/roles');
const config = require('../config/env');
const logger = require('../utils/logger');
const { ensureCustomerProfileForUser } = require('./customerLinkService');

async function listUsers(query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = {};

  if (status) {
    filter.status = status.toUpperCase();
  }

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (query.role) {
    const role = await Role.findOne({ name: query.role.toUpperCase() });
    if (role) {
      filter.role = role._id;
    }
  }

  const [items, total] = await Promise.all([
    User.find(filter).populate('role').sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return buildPagedResult({
    items: items.map((u) => sanitizeUser(u)),
    total,
    page,
    limit,
  });
}

async function getUserById(id) {
  const user = await User.findById(id).populate('role');
  if (!user) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }
  return sanitizeUser(user);
}

async function createUser(payload, actor, req) {
  const email = payload.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    throw AppError.conflict('An account with this email already exists', 'EMAIL_EXISTS');
  }

  const role = await Role.findOne({ name: payload.roleName.toUpperCase(), isActive: true });
  if (!role) {
    throw AppError.badRequest('Role not found', 'ROLE_NOT_FOUND');
  }

  // Only SUPER_ADMIN can create SUPER_ADMIN; ADMIN cannot escalate to SUPER_ADMIN
  if (role.name === ROLES.SUPER_ADMIN && actor.role.name !== ROLES.SUPER_ADMIN) {
    throw AppError.forbidden('Only Super Admin can create Super Admin users', 'FORBIDDEN');
  }

  const plainPassword = payload.password;

  const user = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email,
    password: plainPassword,
    phone: payload.phone || '',
    role: role._id,
    status: payload.status || 'ACTIVE',
  });

  await user.populate('role');

  if (role.name === ROLES.CUSTOMER) {
    await ensureCustomerProfileForUser(user);
  }

  await writeAuditLog({
    userId: actor._id,
    action: 'USER_CREATED',
    module: 'USERS',
    recordId: user._id.toString(),
    metadata: {
      email: user.email,
      role: role.name,
      credentialsEmailed: true,
      customerProfileLinked: role.name === ROLES.CUSTOMER,
    },
    req,
  });

  await createNotification({
    userId: user._id,
    title: 'Welcome to Enterprise ERP',
    message:
      role.name === ROLES.CUSTOMER
        ? `Your customer portal account was created by ${actor.firstName} ${actor.lastName}. Check your email for login credentials.`
        : `Your account was created by ${actor.firstName} ${actor.lastName}. Check your email for login credentials.`,
    type: 'SUCCESS',
    module: 'USERS',
    link: role.name === ROLES.CUSTOMER ? '/customer/dashboard' : '/',
  });

  // Fire-and-forget: email login ID + temporary password (never log the password)
  sendEmail({
    to: user.email,
    subject: 'Your Enterprise ERP login credentials',
    html: adminCreatedUserCredentialsTemplate({
      name: user.fullName || `${user.firstName} ${user.lastName}`,
      email: user.email,
      password: plainPassword,
      roleName: role.displayName || role.name,
      loginUrl:
        role.name === ROLES.CUSTOMER
          ? `${config.clientUrl}/login`
          : `${config.clientUrl}/login`,
    }),
  }).then((result) => {
    if (result?.failed || result?.skipped) {
      logger.warn('Admin-created user credentials email not delivered', {
        email: user.email,
        skipped: Boolean(result?.skipped),
        failed: Boolean(result?.failed),
      });
    }
  });

  return sanitizeUser(user);
}

async function updateUser(id, payload, actor, req) {
  const user = await User.findById(id).populate('role');
  if (!user) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }

  if (payload.email && payload.email.toLowerCase() !== user.email) {
    const clash = await User.findOne({ email: payload.email.toLowerCase() });
    if (clash) {
      throw AppError.conflict('Email already in use', 'EMAIL_EXISTS');
    }
    user.email = payload.email.toLowerCase();
  }

  if (payload.firstName !== undefined) user.firstName = payload.firstName;
  if (payload.lastName !== undefined) user.lastName = payload.lastName;
  if (payload.phone !== undefined) user.phone = payload.phone;
  if (payload.status !== undefined) user.status = payload.status;

  if (payload.roleName) {
    const role = await Role.findOne({ name: payload.roleName.toUpperCase(), isActive: true });
    if (!role) {
      throw AppError.badRequest('Role not found', 'ROLE_NOT_FOUND');
    }
    if (role.name === ROLES.SUPER_ADMIN && actor.role.name !== ROLES.SUPER_ADMIN) {
      throw AppError.forbidden('Only Super Admin can assign Super Admin role', 'FORBIDDEN');
    }
    user.role = role._id;
  }

  if (payload.password) {
    user.password = payload.password;
  }

  await user.save();
  await user.populate('role');

  if (user.role?.name === ROLES.CUSTOMER) {
    await ensureCustomerProfileForUser(user);
  }

  await writeAuditLog({
    userId: actor._id,
    action: 'USER_UPDATED',
    module: 'USERS',
    recordId: user._id.toString(),
    metadata: { email: user.email, status: user.status, role: user.role?.name },
    req,
  });

  return sanitizeUser(user);
}

async function deleteUser(id, actor, req) {
  if (actor._id.toString() === id) {
    throw AppError.badRequest('You cannot delete your own account', 'CANNOT_DELETE_SELF');
  }

  const user = await User.findById(id).populate('role');
  if (!user) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }

  if (user.role?.name === ROLES.SUPER_ADMIN && actor.role.name !== ROLES.SUPER_ADMIN) {
    throw AppError.forbidden('Cannot delete a Super Admin account', 'FORBIDDEN');
  }

  await User.findByIdAndDelete(id);

  await writeAuditLog({
    userId: actor._id,
    action: 'USER_DELETED',
    module: 'USERS',
    recordId: id,
    metadata: { email: user.email },
    req,
  });

  return { id };
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
