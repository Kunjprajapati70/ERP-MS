const Joi = require('joi');
const { validate } = require('./auth.validator');

const objectId = Joi.string().hex().length(24);

const categorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  code: Joi.string().trim().max(40).allow('').optional(),
  description: Joi.string().allow('').max(500).optional(),
  parent: objectId.allow(null, '').optional(),
  isActive: Joi.boolean().optional(),
});

const categoryUpdateSchema = categorySchema.fork(['name'], (s) => s.optional()).min(1);

const warehouseSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  code: Joi.string().trim().min(1).max(40).required(),
  address: Joi.string().allow('').optional(),
  city: Joi.string().allow('').optional(),
  isDefault: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
});

const warehouseUpdateSchema = warehouseSchema.fork(['name', 'code'], (s) => s.optional()).min(1);

const productSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  sku: Joi.string().trim().min(1).max(60).required(),
  barcode: Joi.string().allow('').max(80).optional(),
  category: objectId.allow(null, '').optional(),
  brand: Joi.string().allow('').max(120).optional(),
  description: Joi.string().allow('').max(2000).optional(),
  purchasePrice: Joi.number().min(0).required(),
  sellingPrice: Joi.number().min(0).required(),
  taxPercent: Joi.number().min(0).max(100).optional(),
  openingStock: Joi.number().min(0).optional(),
  minimumStock: Joi.number().min(0).optional(),
  maximumStock: Joi.number().min(0).optional(),
  unit: Joi.string().trim().max(20).optional(),
  warehouse: objectId.allow(null, '').optional(),
  imageUrl: Joi.string().allow('').max(1000).optional(),
  visibleToCustomers: Joi.boolean().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'DISCONTINUED').optional(),
});

const productUpdateSchema = productSchema
  .fork(['name', 'sku', 'purchasePrice', 'sellingPrice'], (s) => s.optional())
  .keys({ openingStock: Joi.forbidden() })
  .min(1);

const adjustStockSchema = Joi.object({
  quantity: Joi.number().invalid(0).required(),
  notes: Joi.string().allow('').max(1000).optional(),
  warehouse: objectId.allow(null, '').optional(),
});

module.exports = {
  validate,
  categorySchema,
  categoryUpdateSchema,
  warehouseSchema,
  warehouseUpdateSchema,
  productSchema,
  productUpdateSchema,
  adjustStockSchema,
};
