const Customer = require('../models/Customer');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { nextDocumentNumber } = require('../utils/documentHelpers');

async function listCustomers(query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.status = status.toUpperCase();
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Customer.find(filter)
      .populate('user', 'firstName lastName email status')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Customer.countDocuments(filter),
  ]);
  return buildPagedResult({ items, total, page, limit });
}

async function getCustomer(id) {
  const customer = await Customer.findById(id)
    .populate('user', 'firstName lastName email status')
    .lean();
  if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  return customer;
}

async function createCustomer(payload, actor, req) {
  const code = payload.code
    ? payload.code.toUpperCase()
    : await nextDocumentNumber(Customer, 'code', 'CUST');

  const exists = await Customer.findOne({ code });
  if (exists) throw AppError.conflict('Customer code already exists', 'CUSTOMER_EXISTS');

  const customer = await Customer.create({ ...payload, code });
  await writeAuditLog({
    userId: actor._id,
    action: 'CUSTOMER_CREATED',
    module: 'CUSTOMERS',
    recordId: customer._id.toString(),
    metadata: { code },
    req,
  });
  return customer;
}

async function updateCustomer(id, payload, actor, req) {
  const customer = await Customer.findById(id);
  if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  const fields = [
    'name',
    'email',
    'phone',
    'company',
    'gstin',
    'billingAddress',
    'shippingAddress',
    'city',
    'state',
    'country',
    'pincode',
    'creditLimit',
    'status',
    'notes',
  ];
  fields.forEach((f) => {
    if (payload[f] !== undefined) customer[f] = payload[f];
  });
  if (payload.code) customer.code = payload.code.toUpperCase();

  await customer.save();
  await writeAuditLog({
    userId: actor._id,
    action: 'CUSTOMER_UPDATED',
    module: 'CUSTOMERS',
    recordId: id,
    metadata: { code: customer.code },
    req,
  });
  return customer;
}

async function deleteCustomer(id, actor, req) {
  const customer = await Customer.findById(id);
  if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  await customer.deleteOne();
  await writeAuditLog({
    userId: actor._id,
    action: 'CUSTOMER_DELETED',
    module: 'CUSTOMERS',
    recordId: id,
    metadata: { code: customer.code },
    req,
  });
  return { id };
}

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
