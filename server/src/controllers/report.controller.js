const reportService = require('../services/reportService');
const asyncHandler = require('../utils/asyncHandler');

const sales = asyncHandler(async (req, res) => {
  const data = await reportService.salesSummary(req.query);
  res.json({ success: true, message: 'Sales report retrieved', data });
});

const receivables = asyncHandler(async (req, res) => {
  const data = await reportService.receivablesReport();
  res.json({ success: true, message: 'Receivables report retrieved', data });
});

const inventory = asyncHandler(async (req, res) => {
  const data = await reportService.inventoryReport();
  res.json({ success: true, message: 'Inventory report retrieved', data });
});

const payments = asyncHandler(async (req, res) => {
  const data = await reportService.paymentsSummary(req.query);
  res.json({ success: true, message: 'Payments report retrieved', data });
});

module.exports = { sales, receivables, inventory, payments };
