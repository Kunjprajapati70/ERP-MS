const customerService = require('../services/customerService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await customerService.listCustomers(req.query);
  res.json({ success: true, message: 'Customers retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomer(req.params.id);
  res.json({ success: true, message: 'Customer retrieved', data: { customer } });
});

const create = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Customer created', data: { customer } });
});

const update = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'Customer updated', data: { customer } });
});

const remove = asyncHandler(async (req, res) => {
  const data = await customerService.deleteCustomer(req.params.id, req.user, req);
  res.json({ success: true, message: 'Customer deleted', data });
});

module.exports = { list, getById, create, update, remove };
