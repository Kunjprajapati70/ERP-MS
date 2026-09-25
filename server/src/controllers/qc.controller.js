const qcService = require('../services/qcService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await qcService.listInspections(req.query);
  res.json({ success: true, message: 'QC inspections retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const inspection = await qcService.getInspection(req.params.id);
  res.json({ success: true, message: 'QC inspection retrieved', data: { inspection } });
});

const create = asyncHandler(async (req, res) => {
  const inspection = await qcService.createInspection(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'QC inspection created', data: { inspection } });
});

const complete = asyncHandler(async (req, res) => {
  const inspection = await qcService.completeInspection(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'QC inspection completed', data: { inspection } });
});

module.exports = { list, getById, create, complete };
