const salesOrderService = require('../services/salesOrderService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await salesOrderService.listSalesOrders(req.query);
  res.json({ success: true, message: 'Sales orders retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const salesOrder = await salesOrderService.getSalesOrder(req.params.id);
  res.json({ success: true, message: 'Sales order retrieved', data: { salesOrder } });
});

const create = asyncHandler(async (req, res) => {
  const salesOrder = await salesOrderService.createSalesOrder(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Sales order created', data: { salesOrder } });
});

const update = asyncHandler(async (req, res) => {
  const salesOrder = await salesOrderService.updateSalesOrder(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'Sales order updated', data: { salesOrder } });
});

const transition = asyncHandler(async (req, res) => {
  const salesOrder = await salesOrderService.transitionSalesOrder(
    req.params.id,
    req.body.status,
    req.user,
    req
  );
  res.json({
    success: true,
    message: `Sales order ${req.body.status.toLowerCase()}`,
    data: { salesOrder },
  });
});

const remove = asyncHandler(async (req, res) => {
  const data = await salesOrderService.deleteSalesOrder(req.params.id, req.user, req);
  res.json({ success: true, message: 'Sales order deleted', data });
});

module.exports = { list, getById, create, update, transition, remove };
