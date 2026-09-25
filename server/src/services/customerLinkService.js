const Customer = require('../models/Customer');
const { nextDocumentNumber } = require('../utils/documentHelpers');
const logger = require('../utils/logger');

/**
 * Ensure a CUSTOMER-role User has a linked Customer party record.
 * - Reuses an existing Customer with the same email if unlinked
 * - Otherwise creates a new ACTIVE Customer linked to the user
 */
async function ensureCustomerProfileForUser(user) {
  if (!user?._id) return null;

  let customer = await Customer.findOne({ user: user._id });
  if (customer) return customer;

  const email = (user.email || '').toLowerCase();
  if (email) {
    customer = await Customer.findOne({
      email,
      $or: [{ user: null }, { user: { $exists: false } }],
    });
    if (customer) {
      customer.user = user._id;
      if (!customer.phone && user.phone) customer.phone = user.phone;
      if (customer.status !== 'ACTIVE') customer.status = 'ACTIVE';
      await customer.save();
      logger.info('Linked existing customer party to portal user', {
        email,
        customerCode: customer.code,
        userId: user._id.toString(),
      });
      return customer;
    }
  }

  const code = await nextDocumentNumber(Customer, 'code', 'CUST');
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || email || 'Customer';

  customer = await Customer.create({
    code,
    name,
    email,
    phone: user.phone || '',
    company: '',
    billingAddress: '',
    shippingAddress: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    gstin: '',
    status: 'ACTIVE',
    user: user._id,
  });

  logger.info('Created customer party for portal user', {
    email,
    customerCode: customer.code,
    userId: user._id.toString(),
  });

  return customer;
}

module.exports = {
  ensureCustomerProfileForUser,
};
