const Joi = require('joi');
const { validate } = require('./auth.validator');

const objectId = Joi.string().hex().length(24);

const soItemSchema = Joi.object({
  product: objectId.required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().min(0).optional(),
  taxPercent: Joi.number().min(0).max(100).optional(),
  discount: Joi.number().min(0).optional(),
});

const salesOrderSchema = Joi.object({
  customer: objectId.required(),
  warehouse: objectId.allow(null, '').optional(),
  orderDate: Joi.date().optional(),
  deliveryDate: Joi.date().allow(null).optional(),
  notes: Joi.string().allow('').optional(),
  salesperson: objectId.optional(),
  items: Joi.array().items(soItemSchema).min(1).required(),
});

const salesOrderUpdateSchema = Joi.object({
  customer: objectId.optional(),
  warehouse: objectId.allow(null, '').optional(),
  orderDate: Joi.date().optional(),
  deliveryDate: Joi.date().allow(null).optional(),
  notes: Joi.string().allow('').optional(),
  items: Joi.array().items(soItemSchema).min(1).optional(),
}).min(1);

const soStatusSchema = Joi.object({
  status: Joi.string()
    .valid('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')
    .required(),
});

const invoiceFromSOSchema = Joi.object({
  dueDate: Joi.date().optional(),
  dueDays: Joi.number().integer().min(0).max(365).optional(),
  invoiceDate: Joi.date().optional(),
  notes: Joi.string().allow('').optional(),
});

const paymentSchema = Joi.object({
  invoice: objectId.required(),
  amount: Joi.number().positive().required(),
  method: Joi.string()
    .valid('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'OTHER')
    .optional(),
  paymentDate: Joi.date().optional(),
  referenceNumber: Joi.string().allow('').max(120).optional(),
  notes: Joi.string().allow('').max(1000).optional(),
});

module.exports = {
  validate,
  salesOrderSchema,
  salesOrderUpdateSchema,
  soStatusSchema,
  invoiceFromSOSchema,
  paymentSchema,
};
