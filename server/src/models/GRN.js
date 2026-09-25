const mongoose = require('mongoose');

const GRN_STATUSES = ['DRAFT', 'CONFIRMED', 'CANCELLED'];

const grnItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    purchaseOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    orderedQuantity: { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, required: true, min: 0 },
    rejectedQuantity: { type: Number, default: 0, min: 0 },
    damagedQuantity: { type: Number, default: 0, min: 0 },
    acceptedQuantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const grnSchema = new mongoose.Schema(
  {
    grnNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
    receivedDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: GRN_STATUSES,
      default: 'DRAFT',
      index: true,
    },
    items: {
      type: [grnItemSchema],
      validate: [(v) => v.length > 0, 'At least one GRN line is required'],
    },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    confirmedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GRN', grnSchema);
module.exports.GRN_STATUSES = GRN_STATUSES;
