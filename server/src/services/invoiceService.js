const Invoice = require('../models/Invoice');
const SalesOrder = require('../models/SalesOrder');
const Customer = require('../models/Customer');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { createNotification } = require('./notificationService');
const { nextDocumentNumber } = require('../utils/documentHelpers');

async function populateInvoice(id) {
  return Invoice.findById(id)
    .populate('customer', 'name code email phone billingAddress')
    .populate('salesOrder', 'orderNumber status')
    .populate('items.product', 'name sku unit')
    .populate('createdBy', 'firstName lastName');
}

async function listInvoices(query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.status = status.toUpperCase();
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus.toUpperCase();
  if (query.customer) filter.customer = query.customer;
  if (search) filter.invoiceNumber = { $regex: search, $options: 'i' };

  const [items, total] = await Promise.all([
    Invoice.find(filter)
      .populate('customer', 'name code')
      .populate('salesOrder', 'orderNumber')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Invoice.countDocuments(filter),
  ]);

  return buildPagedResult({ items, total, page, limit });
}

async function getInvoice(id) {
  const invoice = await populateInvoice(id);
  if (!invoice) throw AppError.notFound('Invoice not found', 'INVOICE_NOT_FOUND');
  return invoice;
}

async function createInvoiceFromSalesOrder(salesOrderId, payload, actor, req) {
  const so = await SalesOrder.findById(salesOrderId);
  if (!so) throw AppError.notFound('Sales order not found', 'SO_NOT_FOUND');
  if (!['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(so.status)) {
    throw AppError.badRequest(
      'Invoice can only be created for confirmed (or later) sales orders',
      'INVALID_SO_STATUS'
    );
  }
  if (so.invoice) {
    throw AppError.conflict('Sales order already has an invoice', 'INVOICE_EXISTS');
  }

  const invoiceNumber = await nextDocumentNumber(Invoice, 'invoiceNumber', 'INV');
  const dueDate =
    payload.dueDate ||
    new Date(Date.now() + (payload.dueDays ? Number(payload.dueDays) : 15) * 24 * 60 * 60 * 1000);

  const invoice = await Invoice.create({
    invoiceNumber,
    customer: so.customer,
    salesOrder: so._id,
    invoiceDate: payload.invoiceDate || new Date(),
    dueDate,
    items: so.items.map((line) => ({
      product: line.product,
      description: '',
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxPercent: line.taxPercent,
      discount: line.discount,
      lineTotal: line.lineTotal,
    })),
    subtotal: so.subtotal,
    taxTotal: so.taxTotal,
    grandTotal: so.grandTotal,
    paidAmount: 0,
    balanceAmount: so.grandTotal,
    paymentStatus: 'UNPAID',
    notes: payload.notes || so.notes || '',
    status: 'ISSUED',
    createdBy: actor._id,
  });

  so.invoice = invoice._id;
  await so.save();

  await writeAuditLog({
    userId: actor._id,
    action: 'INVOICE_CREATED',
    module: 'INVOICES',
    recordId: invoice._id.toString(),
    metadata: { invoiceNumber, salesOrder: so.orderNumber, grandTotal: invoice.grandTotal },
    req,
  });

  createNotification({
    userId: actor._id,
    title: 'Invoice created',
    message: `${invoiceNumber} issued for ${so.orderNumber} (₹${invoice.grandTotal}).`,
    type: 'INFO',
    module: 'INVOICES',
    link: '/operations/invoices',
  });

  return populateInvoice(invoice._id);
}

async function createManualInvoice(payload, actor, req) {
  const customer = await Customer.findById(payload.customer);
  if (!customer) throw AppError.badRequest('Invalid customer', 'INVALID_CUSTOMER');

  const Product = require('../models/Product');
  const { calcOrderTotals } = require('../utils/documentHelpers');

  const rawItems = [];
  for (const line of payload.items || []) {
    const product = await Product.findById(line.product);
    if (!product) throw AppError.badRequest('Invalid product', 'INVALID_PRODUCT');
    rawItems.push({
      product: product._id,
      description: line.description || product.name,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice ?? product.sellingPrice),
      taxPercent: Number(line.taxPercent ?? product.taxPercent ?? 0),
      discount: Number(line.discount || 0),
    });
  }

  const totals = calcOrderTotals(rawItems);
  const invoiceNumber = await nextDocumentNumber(Invoice, 'invoiceNumber', 'INV');

  const invoice = await Invoice.create({
    invoiceNumber,
    customer: customer._id,
    salesOrder: null,
    invoiceDate: payload.invoiceDate || new Date(),
    dueDate: payload.dueDate || null,
    items: totals.items,
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
    paidAmount: 0,
    balanceAmount: totals.grandTotal,
    paymentStatus: 'UNPAID',
    notes: payload.notes || '',
    status: 'ISSUED',
    createdBy: actor._id,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'INVOICE_CREATED',
    module: 'INVOICES',
    recordId: invoice._id.toString(),
    metadata: { invoiceNumber, grandTotal: invoice.grandTotal },
    req,
  });

  return populateInvoice(invoice._id);
}

module.exports = {
  listInvoices,
  getInvoice,
  createInvoiceFromSalesOrder,
  createManualInvoice,
  populateInvoice,
};
