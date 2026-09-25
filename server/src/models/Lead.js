const mongoose = require('mongoose');

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
const LEAD_SOURCES = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'EVENT', 'OTHER'];

const leadSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: LEAD_SOURCES,
      default: 'OTHER',
    },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: 'NEW',
      index: true,
    },
    estimatedValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    convertedCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

leadSchema.index({ name: 'text', company: 'text', email: 'text' });

module.exports = mongoose.model('Lead', leadSchema);
module.exports.LEAD_STATUSES = LEAD_STATUSES;
module.exports.LEAD_SOURCES = LEAD_SOURCES;
