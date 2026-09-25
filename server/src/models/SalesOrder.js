const mongoose = require('mongoose');

const SO_STATUSES = [
  'DRAFT',
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const salesOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },
    discount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const salesOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
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
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date, default: null },
    status: {
      type: String,
      enum: SO_STATUSES,
      default: 'DRAFT',
      index: true,
    },
    items: {
      type: [salesOrderItemSchema],
      validate: [(v) => v.length > 0, 'At least one line item is required'],
    },
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    salesperson: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    confirmedAt: { type: Date, default: null },
    stockReserved: { type: Boolean, default: false },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    shippingAddress: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      addressLine: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'CARD', 'COD', 'BANK_TRANSFER', 'OTHER'],
      default: 'COD',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'COD', 'FAILED'],
      default: 'PENDING',
    },
    paymentDetails: {
      upiId: { type: String, default: '' },
      cardLast4: { type: String, default: '' },
      cardType: { type: String, default: '' },
      transactionRef: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
module.exports.SO_STATUSES = SO_STATUSES;
