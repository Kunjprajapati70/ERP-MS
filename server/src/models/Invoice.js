const mongoose = require('mongoose');

const PAYMENT_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'];

const invoiceItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    description: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesOrder',
      default: null,
      index: true,
    },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
    items: {
      type: [invoiceItemSchema],
      validate: [(v) => v.length > 0, 'Invoice needs at least one line'],
    },
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'UNPAID',
      index: true,
    },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'CANCELLED'],
      default: 'ISSUED',
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

invoiceSchema.methods.refreshPaymentStatus = function refreshPaymentStatus() {
  const paid = this.paidAmount || 0;
  const total = this.grandTotal || 0;
  this.balanceAmount = Math.round((total - paid) * 100) / 100;

  if (paid <= 0) {
    this.paymentStatus =
      this.dueDate && this.dueDate < new Date() && this.status === 'ISSUED' ? 'OVERDUE' : 'UNPAID';
  } else if (paid + 0.001 >= total) {
    this.paymentStatus = 'PAID';
    this.balanceAmount = 0;
  } else {
    this.paymentStatus =
      this.dueDate && this.dueDate < new Date() ? 'OVERDUE' : 'PARTIALLY_PAID';
  }
};

module.exports = mongoose.model('Invoice', invoiceSchema);
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
