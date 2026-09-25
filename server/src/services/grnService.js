const GRN = require('../models/GRN');
const PurchaseOrder = require('../models/PurchaseOrder');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { createNotification } = require('./notificationService');
const { applyStockChange } = require('./inventoryService');
const { nextDocumentNumber } = require('../utils/documentHelpers');
const { populatePO } = require('./purchaseOrderService');

async function populateGRN(id) {
  return GRN.findById(id)
    .populate('purchaseOrder', 'orderNumber status')
    .populate('supplier', 'name code')
    .populate('warehouse', 'name code')
    .populate('items.product', 'name sku unit')
    .populate('createdBy', 'firstName lastName')
    .populate('confirmedBy', 'firstName lastName');
}

async function listGRNs(query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.status = status.toUpperCase();
  if (query.purchaseOrder) filter.purchaseOrder = query.purchaseOrder;
  if (search) filter.grnNumber = { $regex: search, $options: 'i' };

  const [items, total] = await Promise.all([
    GRN.find(filter)
      .populate('purchaseOrder', 'orderNumber')
      .populate('supplier', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    GRN.countDocuments(filter),
  ]);

  return buildPagedResult({ items, total, page, limit });
}

async function getGRN(id) {
  const grn = await populateGRN(id);
  if (!grn) throw AppError.notFound('GRN not found', 'GRN_NOT_FOUND');
  return grn;
}

async function createGRN(payload, actor, req) {
  const po = await PurchaseOrder.findById(payload.purchaseOrder);
  if (!po) throw AppError.notFound('Purchase order not found', 'PO_NOT_FOUND');
  if (!['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
    throw AppError.badRequest(
      'GRN can only be created for approved/ordered/partially received POs',
      'INVALID_PO_STATUS'
    );
  }

  if (!Array.isArray(payload.items) || !payload.items.length) {
    throw AppError.badRequest('GRN items are required', 'EMPTY_ITEMS');
  }

  const items = [];
  for (const line of payload.items) {
    const poItem = po.items.id(line.purchaseOrderItemId);
    if (!poItem) {
      throw AppError.badRequest('Invalid purchase order line', 'INVALID_PO_ITEM');
    }

    const receivedQuantity = Number(line.receivedQuantity || 0);
    const rejectedQuantity = Number(line.rejectedQuantity || 0);
    const damagedQuantity = Number(line.damagedQuantity || 0);
    const acceptedQuantity = Number(
      line.acceptedQuantity !== undefined
        ? line.acceptedQuantity
        : Math.max(0, receivedQuantity - rejectedQuantity - damagedQuantity)
    );

    if (receivedQuantity <= 0 && acceptedQuantity <= 0) {
      continue;
    }

    const pending = poItem.quantity - poItem.receivedQuantity;
    if (acceptedQuantity > pending) {
      throw AppError.badRequest(
        `Accepted qty exceeds pending qty for a line (pending ${pending})`,
        'EXCEEDS_PENDING'
      );
    }

    items.push({
      product: poItem.product,
      purchaseOrderItemId: poItem._id,
      orderedQuantity: poItem.quantity,
      receivedQuantity,
      rejectedQuantity,
      damagedQuantity,
      acceptedQuantity,
      unitPrice: poItem.unitPrice,
    });
  }

  if (!items.length) {
    throw AppError.badRequest('No valid GRN lines with quantities', 'EMPTY_ITEMS');
  }

  const grnNumber = await nextDocumentNumber(GRN, 'grnNumber', 'GRN');
  const grn = await GRN.create({
    grnNumber,
    purchaseOrder: po._id,
    supplier: po.supplier,
    warehouse: payload.warehouse || po.warehouse || null,
    receivedDate: payload.receivedDate || new Date(),
    status: 'DRAFT',
    items,
    notes: payload.notes || '',
    createdBy: actor._id,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'GRN_CREATED',
    module: 'GRN',
    recordId: grn._id.toString(),
    metadata: { grnNumber, po: po.orderNumber },
    req,
  });

  return populateGRN(grn._id);
}

/**
 * Confirm GRN:
 * - increase inventory by accepted quantity only
 * - create PURCHASE stock transactions
 * - update PO received quantities and status
 */
async function confirmGRN(id, actor, req) {
  const grn = await GRN.findById(id);
  if (!grn) throw AppError.notFound('GRN not found', 'GRN_NOT_FOUND');
  if (grn.status !== 'DRAFT') {
    throw AppError.badRequest('Only draft GRNs can be confirmed', 'GRN_NOT_CONFIRMABLE');
  }

  const po = await PurchaseOrder.findById(grn.purchaseOrder);
  if (!po) throw AppError.notFound('Purchase order not found', 'PO_NOT_FOUND');

  for (const line of grn.items) {
    if (line.acceptedQuantity > 0) {
      await applyStockChange({
        productId: line.product,
        quantity: line.acceptedQuantity,
        type: 'PURCHASE',
        warehouseId: grn.warehouse,
        unitCost: line.unitPrice,
        referenceType: 'GRN',
        referenceId: grn._id.toString(),
        notes: `GRN ${grn.grnNumber} accepted qty`,
        userId: actor._id,
        req,
        skipLowStockNotify: true,
      });
    }

    const poItem = po.items.id(line.purchaseOrderItemId);
    if (poItem) {
      poItem.receivedQuantity += line.acceptedQuantity;
      if (poItem.receivedQuantity > poItem.quantity) {
        poItem.receivedQuantity = poItem.quantity;
      }
    }
  }

  const allReceived = po.items.every((item) => item.receivedQuantity >= item.quantity);
  const anyReceived = po.items.some((item) => item.receivedQuantity > 0);
  po.status = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : po.status;
  await po.save();

  grn.status = 'CONFIRMED';
  grn.confirmedBy = actor._id;
  grn.confirmedAt = new Date();
  await grn.save();

  await writeAuditLog({
    userId: actor._id,
    action: 'GRN_CONFIRMED',
    module: 'GRN',
    recordId: grn._id.toString(),
    metadata: { grnNumber: grn.grnNumber, poStatus: po.status },
    req,
  });

  createNotification({
    userId: actor._id,
    title: 'GRN confirmed',
    message: `${grn.grnNumber} confirmed. Purchase order is now ${po.status}.`,
    type: 'SUCCESS',
    module: 'GRN',
    link: '/operations/grn',
  });

  return {
    grn: await populateGRN(grn._id),
    purchaseOrder: await populatePO(po._id),
  };
}

async function cancelGRN(id, actor, req) {
  const grn = await GRN.findById(id);
  if (!grn) throw AppError.notFound('GRN not found', 'GRN_NOT_FOUND');
  if (grn.status !== 'DRAFT') {
    throw AppError.badRequest('Only draft GRNs can be cancelled', 'GRN_NOT_CANCELLABLE');
  }
  grn.status = 'CANCELLED';
  await grn.save();
  await writeAuditLog({
    userId: actor._id,
    action: 'GRN_CANCELLED',
    module: 'GRN',
    recordId: id,
    metadata: { grnNumber: grn.grnNumber },
    req,
  });
  return populateGRN(id);
}

module.exports = {
  listGRNs,
  getGRN,
  createGRN,
  confirmGRN,
  cancelGRN,
};
