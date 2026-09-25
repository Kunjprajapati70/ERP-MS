const bomService = require('../services/bomService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await bomService.listBOMs(req.query);
  res.json({ success: true, message: 'BOMs retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const bom = await bomService.getBOM(req.params.id);
  res.json({ success: true, message: 'BOM retrieved', data: { bom } });
});

const create = asyncHandler(async (req, res) => {
  const bom = await bomService.createBOM(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'BOM created', data: { bom } });
});

const update = asyncHandler(async (req, res) => {
  const bom = await bomService.updateBOM(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'BOM updated', data: { bom } });
});

const remove = asyncHandler(async (req, res) => {
  const data = await bomService.deleteBOM(req.params.id, req.user, req);
  res.json({ success: true, message: 'BOM deleted', data });
});

module.exports = { list, getById, create, update, remove };
