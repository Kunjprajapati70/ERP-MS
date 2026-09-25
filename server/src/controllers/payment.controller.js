const paymentService = require('../services/paymentService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await paymentService.listPayments(req.query);
  res.json({ success: true, message: 'Payments retrieved', data });
});

const create = asyncHandler(async (req, res) => {
  const data = await paymentService.recordPayment(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Payment recorded', data });
});

module.exports = { list, create };
