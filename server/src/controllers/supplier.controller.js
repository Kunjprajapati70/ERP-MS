const supplierService = require('../services/supplierService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await supplierService.listSuppliers(req.query);
  res.json({ success: true, message: 'Suppliers retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const supplier = await supplierService.getSupplier(req.params.id);
  res.json({ success: true, message: 'Supplier retrieved', data: { supplier } });
});

const create = asyncHandler(async (req, res) => {
  const supplier = await supplierService.createSupplier(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Supplier created', data: { supplier } });
});

const update = asyncHandler(async (req, res) => {
  const supplier = await supplierService.updateSupplier(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'Supplier updated', data: { supplier } });
});

const remove = asyncHandler(async (req, res) => {
  const data = await supplierService.deleteSupplier(req.params.id, req.user, req);
  res.json({ success: true, message: 'Supplier deleted', data });
});

module.exports = { list, getById, create, update, remove };
