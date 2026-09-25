const grnService = require('../services/grnService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await grnService.listGRNs(req.query);
  res.json({ success: true, message: 'GRNs retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const grn = await grnService.getGRN(req.params.id);
  res.json({ success: true, message: 'GRN retrieved', data: { grn } });
});

const create = asyncHandler(async (req, res) => {
  const grn = await grnService.createGRN(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'GRN created', data: { grn } });
});

const confirm = asyncHandler(async (req, res) => {
  const data = await grnService.confirmGRN(req.params.id, req.user, req);
  res.json({ success: true, message: 'GRN confirmed — inventory updated', data });
});

const cancel = asyncHandler(async (req, res) => {
  const grn = await grnService.cancelGRN(req.params.id, req.user, req);
  res.json({ success: true, message: 'GRN cancelled', data: { grn } });
});

module.exports = { list, getById, create, confirm, cancel };
