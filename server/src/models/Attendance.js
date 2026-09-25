const mongoose = require('mongoose');

const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'HOLIDAY'];

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      default: 'PRESENT',
      index: true,
    },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    workHours: { type: Number, min: 0, default: 0 },
    sessions: [
      {
        checkIn: { type: Date, required: true },
        checkOut: { type: Date, default: null },
        durationHours: { type: Number, default: 0 },
      },
    ],
    notes: { type: String, default: '', maxlength: 500 },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
module.exports.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES;
