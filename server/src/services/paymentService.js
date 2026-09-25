const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { createNotification } = require('./notificationService');
const { nextDocumentNumber } = require('../utils/documentHelpers');
const { populateInvoice } = require('./invoiceService');

async function populatePayment(id) {
  return Payment.findById(id)
    .populate('invoice', 'invoiceNumber grandTotal paymentStatus balanceAmount')
    .populate('customer', 'name code')
    .populate('createdBy', 'firstName lastName');
}

async function listPayments(query) {
  const { page, limit, skip, search, sort } = parseListQuery(query);
  const filter = {};
  if (query.invoice) filter.invoice = query.invoice;
  if (query.customer) filter.customer = query.customer;
  if (search) {
    filter.$or = [
      { paymentNumber: { $regex: search, $options: 'i' } },
      { referenceNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Payment.find(filter)
      .populate('invoice', 'invoiceNumber')
      .populate('customer', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);

  return buildPagedResult({ items, total, page, limit });
}

async function recordPayment(payload, actor, req) {
  const invoice = await Invoice.findById(payload.invoice);
  if (!invoice) throw AppError.notFound('Invoice not found', 'INVOICE_NOT_FOUND');
  if (invoice.status === 'CANCELLED') {
    throw AppError.badRequest('Cannot pay a cancelled invoice', 'INVOICE_CANCELLED');
  }

  const amount = Number(payload.amount);
  if (!amount || amount <= 0) {
    throw AppError.badRequest('Payment amount must be positive', 'INVALID_AMOUNT');
  }

  const remaining = Math.round((invoice.grandTotal - invoice.paidAmount) * 100) / 100;
  if (amount > remaining + 0.001) {
    throw AppError.badRequest(
      `Payment exceeds remaining balance (₹${remaining})`,
      'AMOUNT_EXCEEDS_BALANCE'
    );
  }

  const paymentNumber = await nextDocumentNumber(Payment, 'paymentNumber', 'PAY');
  const payment = await Payment.create({
    paymentNumber,
    invoice: invoice._id,
    customer: invoice.customer,
    amount,
    method: payload.method || 'BANK_TRANSFER',
    paymentDate: payload.paymentDate || new Date(),
    referenceNumber: payload.referenceNumber || '',
    notes: payload.notes || '',
    createdBy: actor._id,
  });

  invoice.paidAmount = Math.round((invoice.paidAmount + amount) * 100) / 100;
  invoice.refreshPaymentStatus();
  await invoice.save();

  await writeAuditLog({
    userId: actor._id,
    action: 'PAYMENT_RECORDED',
    module: 'PAYMENTS',
    recordId: payment._id.toString(),
    metadata: {
      paymentNumber,
      invoiceNumber: invoice.invoiceNumber,
      amount,
      paymentStatus: invoice.paymentStatus,
    },
    req,
  });

  createNotification({
    userId: actor._id,
    title: 'Payment recorded',
    message: `${paymentNumber}: ₹${amount} against ${invoice.invoiceNumber} (${invoice.paymentStatus}).`,
    type: 'SUCCESS',
    module: 'PAYMENTS',
    link: '/operations/payments',
  });

  return {
    payment: await populatePayment(payment._id),
    invoice: await populateInvoice(invoice._id),
  };
}

module.exports = {
  listPayments,
  recordPayment,
  populatePayment,
};
