const Joi = require('joi');
const { validate } = require('./auth.validator');
const { LEAD_STATUSES, LEAD_SOURCES } = require('../models/Lead');

const objectId = Joi.string().hex().length(24);

const leadSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  company: Joi.string().allow('').max(200).optional(),
  email: Joi.string().email({ tlds: { allow: false } }).allow('').optional(),
  phone: Joi.string().allow('').max(40).optional(),
  source: Joi.string()
    .valid(...LEAD_SOURCES)
    .optional(),
  status: Joi.string()
    .valid(...LEAD_STATUSES)
    .optional(),
  estimatedValue: Joi.number().min(0).optional(),
  notes: Joi.string().allow('').max(2000).optional(),
  owner: objectId.optional(),
});

const leadUpdateSchema = leadSchema.fork(['name'], (s) => s.optional()).min(1);

const convertLeadSchema = Joi.object({
  code: Joi.string().trim().uppercase().max(40).optional(),
  name: Joi.string().trim().min(2).max(200).optional(),
  company: Joi.string().allow('').optional(),
  email: Joi.string().email({ tlds: { allow: false } }).allow('').optional(),
  phone: Joi.string().allow('').optional(),
  city: Joi.string().allow('').optional(),
  notes: Joi.string().allow('').optional(),
});

module.exports = {
  validate,
  leadSchema,
  leadUpdateSchema,
  convertLeadSchema,
};
