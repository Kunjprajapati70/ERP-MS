const mongoose = require('mongoose');

const PAYROLL_STATUSES = ['DRAFT', 'APPROVED', 'PAID', 'CANCELLED'];

const payrollLineSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    baseSalary: { type: Number, required: true, min: 0 },
    presentDays: { type: Number, default: 0, min: 0 },
    absentDays: { type: Number, default: 0, min: 0 },
    halfDays: { type: Number, default: 0, min: 0 },
    leaveDays: { type: Number, default: 0, min: 0 },
    workingDaysInPeriod: { type: Number, default: 0, min: 0 },
    earnings: { type: Number, required: true, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '' },
  },
  { _id: true }
);

const payrollRunSchema = new mongoose.Schema(
  {
    runNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    periodYear: { type: Number, required: true, min: 2000, max: 2100 },
    periodMonth: { type: Number, required: true, min: 1, max: 12 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: { type: String, enum: PAYROLL_STATUSES, default: 'DRAFT', index: true },
    lines: [payrollLineSchema],
    totalEarnings: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },
    totalNet: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '', maxlength: 1000 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

payrollRunSchema.index({ periodYear: 1, periodMonth: 1 }, { unique: true });

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
module.exports.PAYROLL_STATUSES = PAYROLL_STATUSES;
