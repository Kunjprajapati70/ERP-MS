const Joi = require('joi');
const { validate } = require('./auth.validator');

const objectId = Joi.string().hex().length(24);

const bomComponentSchema = Joi.object({
  product: objectId.required(),
  quantity: Joi.number().positive().required(),
  notes: Joi.string().allow('').optional(),
});

const bomSchema = Joi.object({
  code: Joi.string().trim().uppercase().max(40).optional(),
  name: Joi.string().trim().min(2).max(200).required(),
  finishedProduct: objectId.required(),
  components: Joi.array().items(bomComponentSchema).min(1).required(),
  version: Joi.number().integer().min(1).optional(),
  isActive: Joi.boolean().optional(),
  notes: Joi.string().allow('').max(1000).optional(),
});

const bomUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).optional(),
  finishedProduct: objectId.optional(),
  components: Joi.array().items(bomComponentSchema).min(1).optional(),
  version: Joi.number().integer().min(1).optional(),
  isActive: Joi.boolean().optional(),
  notes: Joi.string().allow('').max(1000).optional(),
}).min(1);

const workOrderSchema = Joi.object({
  bom: objectId.required(),
  warehouse: objectId.allow(null, '').optional(),
  quantity: Joi.number().integer().min(1).required(),
  plannedStart: Joi.date().allow(null).optional(),
  plannedEnd: Joi.date().allow(null).optional(),
  notes: Joi.string().allow('').max(1000).optional(),
});

const woStatusSchema = Joi.object({
  status: Joi.string().valid('RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').required(),
});

module.exports = {
  validate,
  bomSchema,
  bomUpdateSchema,
  workOrderSchema,
  woStatusSchema,
};
