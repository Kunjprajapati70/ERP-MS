const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
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
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    billingAddress: {
      type: String,
      default: '',
    },
    shippingAddress: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: 'India',
    },
    pincode: {
      type: String,
      default: '',
    },
    creditLimit: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
      sparse: true,
    },
    savedAddresses: [
      {
        name: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        addressLine: { type: String, trim: true, default: '' },
        city: { type: String, trim: true, default: '' },
        state: { type: String, trim: true, default: '' },
        pincode: { type: String, trim: true, default: '' },
        country: { type: String, default: 'India' },
        isDefault: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', code: 'text', email: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
