const purchaseOrderService = require('../services/purchaseOrderService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await purchaseOrderService.listPurchaseOrders(req.query);
  res.json({ success: true, message: 'Purchase orders retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.getPurchaseOrder(req.params.id);
  res.json({ success: true, message: 'Purchase order retrieved', data: { purchaseOrder } });
});

const create = asyncHandler(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.createPurchaseOrder(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Purchase order created', data: { purchaseOrder } });
});

const update = asyncHandler(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.updatePurchaseOrder(
    req.params.id,
    req.body,
    req.user,
    req
  );
  res.json({ success: true, message: 'Purchase order updated', data: { purchaseOrder } });
});

const transition = asyncHandler(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.transitionPO(
    req.params.id,
    req.body.status,
    req.user,
    req
  );
  res.json({ success: true, message: `Purchase order ${req.body.status.toLowerCase()}`, data: { purchaseOrder } });
});

const remove = asyncHandler(async (req, res) => {
  const data = await purchaseOrderService.deletePurchaseOrder(req.params.id, req.user, req);
  res.json({ success: true, message: 'Purchase order deleted', data });
});

module.exports = { list, getById, create, update, transition, remove };
