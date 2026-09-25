const mongoose = require('mongoose');

const bomComponentSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 0.0001 },
    notes: { type: String, default: '' },
  },
  { _id: true }
);

const bomSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    finishedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    components: {
      type: [bomComponentSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, 'BOM needs at least one component'],
    },
    version: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, default: '', maxlength: 1000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BOM', bomSchema);
