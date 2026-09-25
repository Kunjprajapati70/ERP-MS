const mongoose = require('mongoose');

const DEPARTMENTS = ['SALES', 'PURCHASE', 'INVENTORY', 'FINANCE', 'HR', 'PRODUCTION', 'IT', 'ADMIN', 'OTHER'];
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];
const EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'];

const employeeSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, default: '', index: true },
    phone: { type: String, trim: true, default: '' },
    department: { type: String, enum: DEPARTMENTS, default: 'OTHER', index: true },
    designation: { type: String, trim: true, default: '' },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: 'FULL_TIME' },
    joinDate: { type: Date, default: Date.now },
    salary: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: EMPLOYEE_STATUSES, default: 'ACTIVE', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    notes: { type: String, default: '', maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

employeeSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Employee', employeeSchema);
module.exports.DEPARTMENTS = DEPARTMENTS;
module.exports.EMPLOYMENT_TYPES = EMPLOYMENT_TYPES;
module.exports.EMPLOYEE_STATUSES = EMPLOYEE_STATUSES;
