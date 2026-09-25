const Joi = require('joi');
const { validate } = require('./auth.validator');

const objectId = Joi.string().hex().length(24);

const customerSchema = Joi.object({
  code: Joi.string().trim().max(40).optional(),
  name: Joi.string().trim().min(1).max(200).required(),
  email: Joi.string().email({ tlds: { allow: false } }).allow('').optional(),
  phone: Joi.string().allow('').max(30).optional(),
  company: Joi.string().allow('').max(200).optional(),
  gstin: Joi.string().allow('').max(20).optional(),
  billingAddress: Joi.string().allow('').optional(),
  shippingAddress: Joi.string().allow('').optional(),
  city: Joi.string().allow('').optional(),
  creditLimit: Joi.number().min(0).optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  notes: Joi.string().allow('').max(1000).optional(),
});

const customerUpdateSchema = customerSchema.fork(['name'], (s) => s.optional()).min(1);

const supplierSchema = Joi.object({
  code: Joi.string().trim().max(40).optional(),
  name: Joi.string().trim().min(1).max(200).required(),
  email: Joi.string().email({ tlds: { allow: false } }).allow('').optional(),
  phone: Joi.string().allow('').max(30).optional(),
  contactPerson: Joi.string().allow('').max(120).optional(),
  gstin: Joi.string().allow('').max(20).optional(),
  address: Joi.string().allow('').optional(),
  city: Joi.string().allow('').optional(),
  paymentTerms: Joi.string().allow('').optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  notes: Joi.string().allow('').max(1000).optional(),
});

const supplierUpdateSchema = supplierSchema.fork(['name'], (s) => s.optional()).min(1);

const poItemSchema = Joi.object({
  product: objectId.required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().min(0).optional(),
  taxPercent: Joi.number().min(0).max(100).optional(),
  discount: Joi.number().min(0).optional(),
});

const purchaseOrderSchema = Joi.object({
  supplier: objectId.required(),
  warehouse: objectId.allow(null, '').optional(),
  orderDate: Joi.date().optional(),
  expectedDate: Joi.date().allow(null).optional(),
  notes: Joi.string().allow('').optional(),
  items: Joi.array().items(poItemSchema).min(1).required(),
});

const purchaseOrderUpdateSchema = Joi.object({
  supplier: objectId.optional(),
  warehouse: objectId.allow(null, '').optional(),
  orderDate: Joi.date().optional(),
  expectedDate: Joi.date().allow(null).optional(),
  notes: Joi.string().allow('').optional(),
  items: Joi.array().items(poItemSchema).min(1).optional(),
}).min(1);

const poStatusSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'APPROVED', 'ORDERED', 'CANCELLED').required(),
});

const grnItemSchema = Joi.object({
  purchaseOrderItemId: objectId.required(),
  receivedQuantity: Joi.number().min(0).required(),
  rejectedQuantity: Joi.number().min(0).optional(),
  damagedQuantity: Joi.number().min(0).optional(),
  acceptedQuantity: Joi.number().min(0).optional(),
});

const grnSchema = Joi.object({
  purchaseOrder: objectId.required(),
  warehouse: objectId.allow(null, '').optional(),
  receivedDate: Joi.date().optional(),
  notes: Joi.string().allow('').optional(),
  items: Joi.array().items(grnItemSchema).min(1).required(),
});

module.exports = {
  validate,
  customerSchema,
  customerUpdateSchema,
  supplierSchema,
  supplierUpdateSchema,
  purchaseOrderSchema,
  purchaseOrderUpdateSchema,
  poStatusSchema,
  grnSchema,
};
