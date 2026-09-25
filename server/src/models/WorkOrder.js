const mongoose = require('mongoose');

const WO_STATUSES = ['DRAFT', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const workOrderSchema = new mongoose.Schema(
  {
    workOrderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    bom: { type: mongoose.Schema.Types.ObjectId, ref: 'BOM', required: true },
    finishedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: WO_STATUSES, default: 'DRAFT', index: true },
    plannedStart: { type: Date, default: null },
    plannedEnd: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    stockApplied: { type: Boolean, default: false },
    notes: { type: String, default: '', maxlength: 1000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkOrder', workOrderSchema);
module.exports.WO_STATUSES = WO_STATUSES;
