const Joi = require('joi');
const AppError = require('../utils/AppError');

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/)
  .pattern(/[a-z]/)
  .pattern(/[0-9]/)
  .required()
  .messages({
    'string.pattern.base': 'Password must include uppercase, lowercase, and a number',
    'string.min': 'Password must be at least 8 characters',
  });

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      }));
      return next(AppError.validation('Validation failed', details));
    }

    req[property] = value;
    return next();
  };
}

const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(80).required(),
  lastName: Joi.string().trim().min(1).max(80).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: passwordSchema,
  phone: Joi.string().allow('').max(30).optional(),
  roleName: Joi.string().uppercase().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema,
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordSchema,
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
