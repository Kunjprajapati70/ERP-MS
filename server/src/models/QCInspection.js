const mongoose = require('mongoose');

const QC_RESULTS = ['PENDING', 'PASSED', 'FAILED', 'PARTIAL'];

const qcInspectionSchema = new mongoose.Schema(
  {
    inspectionNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    workOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkOrder',
      required: true,
      index: true,
    },
    finishedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    inspectedQty: { type: Number, required: true, min: 0 },
    passedQty: { type: Number, required: true, min: 0, default: 0 },
    failedQty: { type: Number, required: true, min: 0, default: 0 },
    result: { type: String, enum: QC_RESULTS, default: 'PENDING', index: true },
    defectNotes: { type: String, default: '', maxlength: 2000 },
    inspectedAt: { type: Date, default: null },
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QCInspection', qcInspectionSchema);
module.exports.QC_RESULTS = QC_RESULTS;
