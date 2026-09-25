const warehouseService = require('../services/warehouseService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await warehouseService.listWarehouses(req.query);
  res.json({ success: true, message: 'Warehouses retrieved', data });
});

const create = asyncHandler(async (req, res) => {
  const warehouse = await warehouseService.createWarehouse(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Warehouse created', data: { warehouse } });
});

const update = asyncHandler(async (req, res) => {
  const warehouse = await warehouseService.updateWarehouse(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'Warehouse updated', data: { warehouse } });
});

const remove = asyncHandler(async (req, res) => {
  const data = await warehouseService.deleteWarehouse(req.params.id, req.user, req);
  res.json({ success: true, message: 'Warehouse deleted', data });
});

module.exports = { list, create, update, remove };
