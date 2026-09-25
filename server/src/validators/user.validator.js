const Joi = require('joi');
const { validate } = require('./auth.validator');

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/)
  .pattern(/[a-z]/)
  .pattern(/[0-9]/)
  .messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
    'string.min': 'Password must be at least 8 characters',
    'string.pattern.base': 'Password must include uppercase, lowercase, and a number',
  });

const createUserSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(80).required(),
  lastName: Joi.string().trim().min(1).max(80).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: passwordSchema.required(),
  phone: Joi.string().allow('').max(30).optional(),
  roleName: Joi.string().uppercase().required(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED').optional(),
});

const updateUserSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(80).optional(),
  lastName: Joi.string().trim().min(1).max(80).optional(),
  email: Joi.string().email({ tlds: { allow: false } }).optional(),
  password: passwordSchema.allow('').optional(),
  phone: Joi.string().allow('').max(30).optional(),
  roleName: Joi.string().uppercase().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED').optional(),
}).min(1);

const updateRoleSchema = Joi.object({
  displayName: Joi.string().trim().min(1).max(120).optional(),
  description: Joi.string().allow('').max(500).optional(),
  permissions: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

module.exports = {
  validate,
  createUserSchema,
  updateUserSchema,
  updateRoleSchema,
};
