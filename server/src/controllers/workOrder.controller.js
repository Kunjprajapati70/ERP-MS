const workOrderService = require('../services/workOrderService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await workOrderService.listWorkOrders(req.query);
  res.json({ success: true, message: 'Work orders retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const workOrder = await workOrderService.getWorkOrder(req.params.id);
  res.json({ success: true, message: 'Work order retrieved', data: { workOrder } });
});

const create = asyncHandler(async (req, res) => {
  const workOrder = await workOrderService.createWorkOrder(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Work order created', data: { workOrder } });
});

const transition = asyncHandler(async (req, res) => {
  const workOrder = await workOrderService.transitionWorkOrder(
    req.params.id,
    req.body.status,
    req.user,
    req
  );
  res.json({
    success: true,
    message: `Work order ${req.body.status.toLowerCase()}`,
    data: { workOrder },
  });
});

const remove = asyncHandler(async (req, res) => {
  const data = await workOrderService.deleteWorkOrder(req.params.id, req.user, req);
  res.json({ success: true, message: 'Work order deleted', data });
});

module.exports = { list, getById, create, transition, remove };
