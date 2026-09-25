const WorkOrder = require('../models/WorkOrder');
const BOM = require('../models/BOM');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { createNotification } = require('./notificationService');
const { applyStockChange } = require('./inventoryService');
const { nextDocumentNumber } = require('../utils/documentHelpers');
const { populateBOM } = require('./bomService');

async function populateWO(id) {
  return WorkOrder.findById(id)
    .populate('finishedProduct', 'name sku currentStock unit')
    .populate('warehouse', 'name code')
    .populate({
      path: 'bom',
      populate: [
        { path: 'finishedProduct', select: 'name sku' },
        { path: 'components.product', select: 'name sku currentStock unit' },
      ],
    })
    .populate('createdBy', 'firstName lastName');
}

async function listWorkOrders(query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.status = status.toUpperCase();
  if (search) filter.workOrderNumber = { $regex: search, $options: 'i' };

  const [items, total] = await Promise.all([
    WorkOrder.find(filter)
      .populate('finishedProduct', 'name sku')
      .populate('bom', 'code name')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    WorkOrder.countDocuments(filter),
  ]);
  return buildPagedResult({ items, total, page, limit });
}

async function getWorkOrder(id) {
  const wo = await populateWO(id);
  if (!wo) throw AppError.notFound('Work order not found', 'WO_NOT_FOUND');
  return wo;
}

async function createWorkOrder(payload, actor, req) {
  const bom = await BOM.findById(payload.bom);
  if (!bom || !bom.isActive) {
    throw AppError.badRequest('Active BOM is required', 'INVALID_BOM');
  }

  const qty = Number(payload.quantity);
  if (!qty || qty < 1) throw AppError.badRequest('Quantity must be at least 1', 'INVALID_QTY');

  const workOrderNumber = await nextDocumentNumber(WorkOrder, 'workOrderNumber', 'WO');
  const wo = await WorkOrder.create({
    workOrderNumber,
    bom: bom._id,
    finishedProduct: bom.finishedProduct,
    warehouse: payload.warehouse || null,
    quantity: qty,
    status: 'DRAFT',
    plannedStart: payload.plannedStart || null,
    plannedEnd: payload.plannedEnd || null,
    notes: payload.notes || '',
    createdBy: actor._id,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'WO_CREATED',
    module: 'MANUFACTURING',
    recordId: wo._id.toString(),
    metadata: { workOrderNumber, quantity: qty },
    req,
  });

  return populateWO(wo._id);
}

async function releaseWorkOrder(id, actor, req) {
  const wo = await WorkOrder.findById(id);
  if (!wo) throw AppError.notFound('Work order not found', 'WO_NOT_FOUND');
  if (wo.status !== 'DRAFT') {
    throw AppError.badRequest('Only draft work orders can be released', 'WO_NOT_RELEASABLE');
  }

  const bom = await BOM.findById(wo.bom);
  if (!bom || !bom.isActive) {
    throw AppError.badRequest('BOM is inactive or missing', 'INVALID_BOM');
  }

  for (const line of bom.components) {
    const product = await Product.findById(line.product);
    const needed = line.quantity * wo.quantity;
    if (!product || product.currentStock < needed) {
      throw AppError.badRequest(
        `Insufficient stock for ${product?.sku || line.product}. Need ${needed}, have ${product?.currentStock ?? 0}`,
        'INSUFFICIENT_STOCK'
      );
    }
  }

  wo.status = 'RELEASED';
  await wo.save();

  await writeAuditLog({
    userId: actor._id,
    action: 'WO_RELEASED',
    module: 'MANUFACTURING',
    recordId: id,
    metadata: { workOrderNumber: wo.workOrderNumber },
    req,
  });

  return populateWO(id);
}

/**
 * Complete WO: consume components (PRODUCTION_OUT) and receive finished goods (PRODUCTION_IN).
 */
async function completeWorkOrder(id, actor, req) {
  const wo = await WorkOrder.findById(id);
  if (!wo) throw AppError.notFound('Work order not found', 'WO_NOT_FOUND');
  if (!['RELEASED', 'IN_PROGRESS'].includes(wo.status)) {
    throw AppError.badRequest('Only released/in-progress WOs can be completed', 'WO_NOT_COMPLETABLE');
  }
  if (wo.stockApplied) {
    throw AppError.badRequest('Stock already applied for this work order', 'WO_STOCK_APPLIED');
  }

  const bom = await BOM.findById(wo.bom);
  if (!bom) throw AppError.notFound('BOM not found', 'BOM_NOT_FOUND');

  for (const line of bom.components) {
    const needed = line.quantity * wo.quantity;
    await applyStockChange({
      productId: line.product,
      quantity: -needed,
      type: 'PRODUCTION_OUT',
      warehouseId: wo.warehouse,
      unitCost: 0,
      referenceType: 'WORK_ORDER',
      referenceId: wo._id.toString(),
      notes: `WO ${wo.workOrderNumber} component consumption`,
      userId: actor._id,
      req,
    });
  }

  const finished = await Product.findById(wo.finishedProduct);
  await applyStockChange({
    productId: wo.finishedProduct,
    quantity: wo.quantity,
    type: 'PRODUCTION_IN',
    warehouseId: wo.warehouse,
    unitCost: finished?.purchasePrice || 0,
    referenceType: 'WORK_ORDER',
    referenceId: wo._id.toString(),
    notes: `WO ${wo.workOrderNumber} finished goods receipt`,
    userId: actor._id,
    req,
  });

  wo.status = 'COMPLETED';
  wo.completedAt = new Date();
  wo.stockApplied = true;
  await wo.save();

  await writeAuditLog({
    userId: actor._id,
    action: 'WO_COMPLETED',
    module: 'MANUFACTURING',
    recordId: id,
    metadata: { workOrderNumber: wo.workOrderNumber, quantity: wo.quantity },
    req,
  });

  createNotification({
    userId: actor._id,
    title: 'Work order completed',
    message: `${wo.workOrderNumber} produced ${wo.quantity} unit(s); stock updated.`,
    type: 'SUCCESS',
    module: 'MANUFACTURING',
    link: '/manufacturing/work-orders',
  });

  return populateWO(id);
}

async function transitionWorkOrder(id, nextStatus, actor, req) {
  if (nextStatus === 'RELEASED') return releaseWorkOrder(id, actor, req);
  if (nextStatus === 'COMPLETED') return completeWorkOrder(id, actor, req);

  const wo = await WorkOrder.findById(id);
  if (!wo) throw AppError.notFound('Work order not found', 'WO_NOT_FOUND');

  const allowed = {
    IN_PROGRESS: ['RELEASED'],
    CANCELLED: ['DRAFT', 'RELEASED'],
  };

  if (!allowed[nextStatus]?.includes(wo.status)) {
    throw AppError.badRequest(
      `Cannot move work order from ${wo.status} to ${nextStatus}`,
      'INVALID_WO_TRANSITION'
    );
  }

  if (nextStatus === 'CANCELLED' && wo.stockApplied) {
    throw AppError.badRequest('Completed work orders cannot be cancelled', 'WO_ALREADY_COMPLETED');
  }

  wo.status = nextStatus;
  await wo.save();

  await writeAuditLog({
    userId: actor._id,
    action: `WO_${nextStatus}`,
    module: 'MANUFACTURING',
    recordId: id,
    metadata: { workOrderNumber: wo.workOrderNumber },
    req,
  });

  return populateWO(id);
}

async function deleteWorkOrder(id, actor, req) {
  const wo = await WorkOrder.findById(id);
  if (!wo) throw AppError.notFound('Work order not found', 'WO_NOT_FOUND');
  if (wo.status !== 'DRAFT') {
    throw AppError.badRequest('Only draft work orders can be deleted', 'WO_NOT_DELETABLE');
  }
  await wo.deleteOne();
  await writeAuditLog({
    userId: actor._id,
    action: 'WO_DELETED',
    module: 'MANUFACTURING',
    recordId: id,
    metadata: { workOrderNumber: wo.workOrderNumber },
    req,
  });
  return { id };
}

module.exports = {
  listWorkOrders,
  getWorkOrder,
  createWorkOrder,
  transitionWorkOrder,
  completeWorkOrder,
  releaseWorkOrder,
  deleteWorkOrder,
  populateWO,
  populateBOM,
};
