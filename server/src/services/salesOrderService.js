const SalesOrder = require('../models/SalesOrder');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { createNotification } = require('./notificationService');
const { applyStockChange } = require('./inventoryService');
const { calcOrderTotals, nextDocumentNumber } = require('../utils/documentHelpers');

async function populateSO(id) {
  return SalesOrder.findById(id)
    .populate('customer', 'name code email phone')
    .populate('warehouse', 'name code')
    .populate('items.product', 'name sku unit sellingPrice currentStock')
    .populate('salesperson', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .populate('invoice', 'invoiceNumber paymentStatus grandTotal');
}

async function listSalesOrders(query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.status = status.toUpperCase();
  if (query.customer) filter.customer = query.customer;
  if (search) filter.orderNumber = { $regex: search, $options: 'i' };

  const [items, total] = await Promise.all([
    SalesOrder.find(filter)
      .populate('customer', 'name code')
      .populate('warehouse', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    SalesOrder.countDocuments(filter),
  ]);

  return buildPagedResult({ items, total, page, limit });
}

async function getSalesOrder(id) {
  const so = await populateSO(id);
  if (!so) throw AppError.notFound('Sales order not found', 'SO_NOT_FOUND');
  return so;
}

async function buildItems(rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length) {
    throw AppError.badRequest('At least one item is required', 'EMPTY_ITEMS');
  }

  const items = [];
  for (const line of rawItems) {
    const product = await Product.findById(line.product);
    if (!product) throw AppError.badRequest(`Invalid product: ${line.product}`, 'INVALID_PRODUCT');
    items.push({
      product: product._id,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice ?? product.sellingPrice),
      taxPercent: Number(line.taxPercent ?? product.taxPercent ?? 0),
      discount: Number(line.discount || 0),
    });
  }
  return calcOrderTotals(items);
}

async function createSalesOrder(payload, actor, req) {
  const customer = await Customer.findById(payload.customer);
  if (!customer || customer.status !== 'ACTIVE') {
    throw AppError.badRequest('Active customer is required', 'INVALID_CUSTOMER');
  }

  const totals = await buildItems(payload.items);
  const orderNumber = await nextDocumentNumber(SalesOrder, 'orderNumber', 'SO');

  const so = await SalesOrder.create({
    orderNumber,
    customer: customer._id,
    warehouse: payload.warehouse || null,
    orderDate: payload.orderDate || new Date(),
    deliveryDate: payload.deliveryDate || null,
    status: 'DRAFT',
    items: totals.items,
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
    notes: payload.notes || '',
    salesperson: payload.salesperson || actor._id,
    createdBy: actor._id,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'SO_CREATED',
    module: 'SALES',
    recordId: so._id.toString(),
    metadata: { orderNumber, grandTotal: so.grandTotal },
    req,
  });

  return populateSO(so._id);
}

async function updateSalesOrder(id, payload, actor, req) {
  const so = await SalesOrder.findById(id);
  if (!so) throw AppError.notFound('Sales order not found', 'SO_NOT_FOUND');
  if (!['DRAFT', 'PENDING'].includes(so.status)) {
    throw AppError.badRequest('Only draft/pending sales orders can be edited', 'SO_NOT_EDITABLE');
  }

  if (payload.customer) {
    const customer = await Customer.findById(payload.customer);
    if (!customer) throw AppError.badRequest('Invalid customer', 'INVALID_CUSTOMER');
    so.customer = customer._id;
  }
  if (payload.warehouse !== undefined) so.warehouse = payload.warehouse || null;
  if (payload.deliveryDate !== undefined) so.deliveryDate = payload.deliveryDate;
  if (payload.notes !== undefined) so.notes = payload.notes;
  if (payload.orderDate) so.orderDate = payload.orderDate;

  if (payload.items) {
    const totals = await buildItems(payload.items);
    so.items = totals.items;
    so.subtotal = totals.subtotal;
    so.taxTotal = totals.taxTotal;
    so.grandTotal = totals.grandTotal;
  }

  await so.save();
  await writeAuditLog({
    userId: actor._id,
    action: 'SO_UPDATED',
    module: 'SALES',
    recordId: id,
    metadata: { orderNumber: so.orderNumber },
    req,
  });
  return populateSO(id);
}

async function validateStockAvailability(so) {
  for (const line of so.items) {
    const product = await Product.findById(line.product);
    if (!product) {
      throw AppError.badRequest('Product missing on order line', 'INVALID_PRODUCT');
    }
    if (product.currentStock < line.quantity) {
      throw AppError.badRequest(
        `Insufficient stock for ${product.sku}. Available: ${product.currentStock}, required: ${line.quantity}`,
        'INSUFFICIENT_STOCK'
      );
    }
  }
}

/**
 * Confirm sales order: validate stock, reduce inventory (SALE), mark CONFIRMED.
 */
async function confirmSalesOrder(id, actor, req) {
  const so = await SalesOrder.findById(id);
  if (!so) throw AppError.notFound('Sales order not found', 'SO_NOT_FOUND');
  if (!['DRAFT', 'PENDING'].includes(so.status)) {
    throw AppError.badRequest('Only draft/pending orders can be confirmed', 'SO_NOT_CONFIRMABLE');
  }
  if (so.stockReserved) {
    throw AppError.badRequest('Stock already reserved for this order', 'STOCK_ALREADY_RESERVED');
  }

  await validateStockAvailability(so);

  for (const line of so.items) {
    await applyStockChange({
      productId: line.product,
      quantity: -line.quantity,
      type: 'SALE',
      warehouseId: so.warehouse,
      unitCost: line.unitPrice,
      referenceType: 'SALES_ORDER',
      referenceId: so._id.toString(),
      notes: `SO ${so.orderNumber} confirmed`,
      userId: actor._id,
      req,
    });
  }

  so.status = 'CONFIRMED';
  so.confirmedAt = new Date();
  so.stockReserved = true;
  await so.save();

  await writeAuditLog({
    userId: actor._id,
    action: 'SO_CONFIRMED',
    module: 'SALES',
    recordId: id,
    metadata: { orderNumber: so.orderNumber },
    req,
  });

  createNotification({
    userId: actor._id,
    title: 'Sales order confirmed',
    message: `${so.orderNumber} confirmed and stock reduced.`,
    type: 'SUCCESS',
    module: 'SALES',
    link: '/operations/sales-orders',
  });

  return populateSO(id);
}

async function transitionSalesOrder(id, nextStatus, actor, req) {
  if (nextStatus === 'CONFIRMED') {
    return confirmSalesOrder(id, actor, req);
  }

  const so = await SalesOrder.findById(id);
  if (!so) throw AppError.notFound('Sales order not found', 'SO_NOT_FOUND');

  const allowed = {
    PENDING: ['DRAFT'],
    PROCESSING: ['CONFIRMED'],
    SHIPPED: ['PROCESSING', 'CONFIRMED'],
    DELIVERED: ['SHIPPED', 'PROCESSING'],
    CANCELLED: ['DRAFT', 'PENDING'],
  };

  if (!allowed[nextStatus]?.includes(so.status)) {
    throw AppError.badRequest(
      `Cannot move sales order from ${so.status} to ${nextStatus}`,
      'INVALID_SO_TRANSITION'
    );
  }

  if (nextStatus === 'CANCELLED' && so.stockReserved) {
    throw AppError.badRequest(
      'Confirmed orders with stock deducted cannot be cancelled here',
      'SO_ALREADY_CONFIRMED'
    );
  }

  so.status = nextStatus;
  await so.save();

  await writeAuditLog({
    userId: actor._id,
    action: `SO_${nextStatus}`,
    module: 'SALES',
    recordId: id,
    metadata: { orderNumber: so.orderNumber },
    req,
  });

  return populateSO(id);
}

async function deleteSalesOrder(id, actor, req) {
  const so = await SalesOrder.findById(id);
  if (!so) throw AppError.notFound('Sales order not found', 'SO_NOT_FOUND');
  if (so.status !== 'DRAFT') {
    throw AppError.badRequest('Only draft sales orders can be deleted', 'SO_NOT_DELETABLE');
  }
  await so.deleteOne();
  await writeAuditLog({
    userId: actor._id,
    action: 'SO_DELETED',
    module: 'SALES',
    recordId: id,
    metadata: { orderNumber: so.orderNumber },
    req,
  });
  return { id };
}

module.exports = {
  listSalesOrders,
  getSalesOrder,
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  transitionSalesOrder,
  deleteSalesOrder,
  populateSO,
};
