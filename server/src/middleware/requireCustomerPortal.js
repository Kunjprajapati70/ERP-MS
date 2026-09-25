const Customer = require('../models/Customer');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../constants/roles');
const { ensureCustomerProfileForUser } = require('../services/customerLinkService');

/**
 * Ensures the authenticated user is a CUSTOMER and attaches their Customer party record.
 * Auto-links / creates a Customer profile when missing so portal stays integrated.
 * Ownership for all portal queries must use req.customer._id — never trust client IDs.
 */
const requireCustomerPortal = asyncHandler(async (req, res, next) => {
  if (!req.user?.role || req.user.role.name !== ROLES.CUSTOMER) {
    throw AppError.forbidden('Customer portal access only', 'CUSTOMER_ONLY');
  }

  let customer = await Customer.findOne({ user: req.user._id });
  if (!customer) {
    customer = await ensureCustomerProfileForUser(req.user);
  }

  if (!customer) {
    throw AppError.forbidden('No customer profile linked to this account', 'CUSTOMER_PROFILE_MISSING');
  }
  if (customer.status !== 'ACTIVE') {
    throw AppError.forbidden('Your customer account is inactive', 'CUSTOMER_INACTIVE');
  }

  req.customer = customer;
  next();
});

module.exports = requireCustomerPortal;
