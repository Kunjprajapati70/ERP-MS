const mongoose = require('mongoose');

const STOCK_TYPES = [
  'PURCHASE',
  'SALE',
  'RETURN',
  'ADJUSTMENT',
  'TRANSFER',
  'PRODUCTION_IN',
  'PRODUCTION_OUT',
  'OPENING',
];

const stockTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: STOCK_TYPES,
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    unitCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    referenceType: {
      type: String,
      default: '',
    },
    referenceId: {
      type: String,
      default: '',
      index: true,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockTransactionSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);
module.exports.STOCK_TYPES = STOCK_TYPES;
