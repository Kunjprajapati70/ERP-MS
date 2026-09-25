const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { createNotification } = require('./notificationService');
const { calcOrderTotals, nextDocumentNumber } = require('../utils/documentHelpers');

async function populatePO(doc) {
  return PurchaseOrder.findById(doc._id || doc)
    .populate('supplier', 'name code email phone')
    .populate('warehouse', 'name code')
    .populate('items.product', 'name sku unit purchasePrice')
    .populate('createdBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName');
}

async function listPurchaseOrders(query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.status = status.toUpperCase();
  if (query.supplier) filter.supplier = query.supplier;
  if (search) {
    filter.orderNumber = { $regex: search, $options: 'i' };
  }

  const [items, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .populate('supplier', 'name code')
      .populate('warehouse', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    PurchaseOrder.countDocuments(filter),
  ]);

  return buildPagedResult({ items, total, page, limit });
}

async function getPurchaseOrder(id) {
  const po = await populatePO(id);
  if (!po) throw AppError.notFound('Purchase order not found', 'PO_NOT_FOUND');
  return po;
}

async function buildItems(rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length) {
    throw AppError.badRequest('At least one item is required', 'EMPTY_ITEMS');
  }

  const items = [];
  for (const line of rawItems) {
    const product = await Product.findById(line.product);
    if (!product) {
      throw AppError.badRequest(`Invalid product: ${line.product}`, 'INVALID_PRODUCT');
    }
    items.push({
      product: product._id,
      quantity: Number(line.quantity),
      receivedQuantity: 0,
      unitPrice: Number(line.unitPrice ?? product.purchasePrice),
      taxPercent: Number(line.taxPercent ?? product.taxPercent ?? 0),
      discount: Number(line.discount || 0),
    });
  }

  return calcOrderTotals(items);
}

async function createPurchaseOrder(payload, actor, req) {
  const supplier = await Supplier.findById(payload.supplier);
  if (!supplier || supplier.status !== 'ACTIVE') {
    throw AppError.badRequest('Active supplier is required', 'INVALID_SUPPLIER');
  }

  const totals = await buildItems(payload.items);
  const orderNumber = await nextDocumentNumber(PurchaseOrder, 'orderNumber', 'PO');

  const po = await PurchaseOrder.create({
    orderNumber,
    supplier: supplier._id,
    warehouse: payload.warehouse || null,
    orderDate: payload.orderDate || new Date(),
    expectedDate: payload.expectedDate || null,
    status: 'DRAFT',
    items: totals.items,
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
    notes: payload.notes || '',
    createdBy: actor._id,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'PO_CREATED',
    module: 'PURCHASES',
    recordId: po._id.toString(),
    metadata: { orderNumber, grandTotal: po.grandTotal },
    req,
  });

  return populatePO(po);
}

async function updatePurchaseOrder(id, payload, actor, req) {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw AppError.notFound('Purchase order not found', 'PO_NOT_FOUND');
  if (!['DRAFT', 'PENDING'].includes(po.status)) {
    throw AppError.badRequest('Only draft/pending POs can be edited', 'PO_NOT_EDITABLE');
  }

  if (payload.supplier) {
    const supplier = await Supplier.findById(payload.supplier);
    if (!supplier) throw AppError.badRequest('Invalid supplier', 'INVALID_SUPPLIER');
    po.supplier = supplier._id;
  }
  if (payload.warehouse !== undefined) po.warehouse = payload.warehouse || null;
  if (payload.expectedDate !== undefined) po.expectedDate = payload.expectedDate;
  if (payload.notes !== undefined) po.notes = payload.notes;
  if (payload.orderDate) po.orderDate = payload.orderDate;

  if (payload.items) {
    const totals = await buildItems(payload.items);
    po.items = totals.items;
    po.subtotal = totals.subtotal;
    po.taxTotal = totals.taxTotal;
    po.grandTotal = totals.grandTotal;
  }

  await po.save();
  await writeAuditLog({
    userId: actor._id,
    action: 'PO_UPDATED',
    module: 'PURCHASES',
    recordId: id,
    metadata: { orderNumber: po.orderNumber },
    req,
  });

  return populatePO(po);
}

async function transitionPO(id, nextStatus, actor, req) {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw AppError.notFound('Purchase order not found', 'PO_NOT_FOUND');

  const allowed = {
    PENDING: ['DRAFT'],
    APPROVED: ['PENDING', 'DRAFT'],
    ORDERED: ['APPROVED'],
    CANCELLED: ['DRAFT', 'PENDING', 'APPROVED', 'ORDERED'],
  };

  if (!allowed[nextStatus]?.includes(po.status)) {
    throw AppError.badRequest(
      `Cannot move PO from ${po.status} to ${nextStatus}`,
      'INVALID_PO_TRANSITION'
    );
  }

  if (['PARTIALLY_RECEIVED', 'RECEIVED'].includes(po.status) && nextStatus === 'CANCELLED') {
    throw AppError.badRequest('Received POs cannot be cancelled', 'PO_ALREADY_RECEIVED');
  }

  po.status = nextStatus;
  if (nextStatus === 'APPROVED') {
    po.approvedBy = actor._id;
    po.approvedAt = new Date();
  }
  await po.save();

  await writeAuditLog({
    userId: actor._id,
    action: `PO_${nextStatus}`,
    module: 'PURCHASES',
    recordId: id,
    metadata: { orderNumber: po.orderNumber },
    req,
  });

  if (nextStatus === 'APPROVED') {
    createNotification({
      userId: actor._id,
      title: 'Purchase order approved',
      message: `${po.orderNumber} was approved and is ready to order.`,
      type: 'SUCCESS',
      module: 'PURCHASES',
      link: '/operations/purchase-orders',
    });
  }

  return populatePO(po);
}

async function deletePurchaseOrder(id, actor, req) {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw AppError.notFound('Purchase order not found', 'PO_NOT_FOUND');
  if (po.status !== 'DRAFT') {
    throw AppError.badRequest('Only draft POs can be deleted', 'PO_NOT_DELETABLE');
  }
  await po.deleteOne();
  await writeAuditLog({
    userId: actor._id,
    action: 'PO_DELETED',
    module: 'PURCHASES',
    recordId: id,
    metadata: { orderNumber: po.orderNumber },
    req,
  });
  return { id };
}

module.exports = {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  transitionPO,
  deletePurchaseOrder,
  populatePO,
};
