const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: 200,
      index: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    taxPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    currentStock: {
      type: Number,
      min: 0,
      default: 0,
    },
    minimumStock: {
      type: Number,
      min: 0,
      default: 0,
    },
    maximumStock: {
      type: Number,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      default: 'PCS',
      trim: true,
      uppercase: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
      index: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
      default: 'ACTIVE',
      index: true,
    },
    /** When true, ACTIVE products appear in the customer portal catalog */
    visibleToCustomers: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

productSchema.virtual('stockStatus').get(function stockStatus() {
  if (this.currentStock <= 0) return 'OUT_OF_STOCK';
  if (this.currentStock <= this.minimumStock) return 'LOW_STOCK';
  return 'IN_STOCK';
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

productSchema.index({ name: 'text', sku: 'text', brand: 'text' });

module.exports = mongoose.model('Product', productSchema);
