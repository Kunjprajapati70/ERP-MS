const mongoose = require('mongoose');

const LEAVE_TYPES = ['CASUAL', 'SICK', 'EARNED', 'UNPAID', 'OTHER'];
const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

const leaveRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    leaveType: { type: String, enum: LEAVE_TYPES, default: 'CASUAL' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 0.5 },
    reason: { type: String, default: '', maxlength: 1000 },
    status: { type: String, enum: LEAVE_STATUSES, default: 'PENDING', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, default: '', maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
module.exports.LEAVE_TYPES = LEAVE_TYPES;
module.exports.LEAVE_STATUSES = LEAVE_STATUSES;
