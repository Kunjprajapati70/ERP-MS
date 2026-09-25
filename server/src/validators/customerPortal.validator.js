const Joi = require('joi');
const { validate, passwordSchema } = (() => {
  const auth = require('./auth.validator');
  return {
    validate: auth.validate,
    passwordSchema: require('joi')
      .string()
      .min(8)
      .max(128)
      .pattern(/[A-Z]/)
      .pattern(/[a-z]/)
      .pattern(/[0-9]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must include uppercase, lowercase, and a number',
        'string.min': 'Password must be at least 8 characters',
      }),
  };
})();

const customerRegisterSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(80).required(),
  lastName: Joi.string().trim().min(1).max(80).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: passwordSchema,
  phone: Joi.string().allow('').max(30).optional(),
  company: Joi.string().allow('').max(200).optional(),
  address: Joi.string().allow('').max(500).optional(),
  city: Joi.string().allow('').max(100).optional(),
  state: Joi.string().allow('').max(100).optional(),
  country: Joi.string().allow('').max(100).optional(),
  pincode: Joi.string().allow('').max(20).optional(),
  gstin: Joi.string().allow('').max(20).optional(),
});

const profileUpdateSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(80).optional(),
  lastName: Joi.string().trim().min(1).max(80).optional(),
  name: Joi.string().trim().min(1).max(200).optional(),
  phone: Joi.string().allow('').max(30).optional(),
  company: Joi.string().allow('').max(200).optional(),
  address: Joi.string().allow('').max(500).optional(),
  billingAddress: Joi.string().allow('').max(500).optional(),
  shippingAddress: Joi.string().allow('').max(500).optional(),
  city: Joi.string().allow('').max(100).optional(),
  state: Joi.string().allow('').max(100).optional(),
  country: Joi.string().allow('').max(100).optional(),
  pincode: Joi.string().allow('').max(20).optional(),
  gstin: Joi.string().allow('').max(20).optional(),
}).min(1);

const supportCreateSchema = Joi.object({
  subject: Joi.string().trim().min(3).max(200).required(),
  category: Joi.string()
    .valid('ORDER', 'INVOICE', 'PAYMENT', 'PRODUCT', 'DELIVERY', 'TECHNICAL', 'OTHER')
    .default('OTHER'),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('MEDIUM'),
  message: Joi.string().trim().min(5).max(4000).required(),
  relatedOrderNumber: Joi.string().allow('').max(50).optional(),
});

const supportReplySchema = Joi.object({
  message: Joi.string().trim().min(1).max(4000).required(),
});

const addressSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  phone: Joi.string().trim().min(5).max(30).required(),
  addressLine: Joi.string().trim().min(3).max(500).required(),
  city: Joi.string().trim().min(1).max(100).required(),
  state: Joi.string().trim().min(1).max(100).required(),
  pincode: Joi.string().trim().min(3).max(20).required(),
  country: Joi.string().trim().max(100).default('India'),
  isDefault: Joi.boolean().default(false),
});

const placeOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().hex().length(24).required(),
        quantity: Joi.number().integer().min(1).max(9999).required(),
      })
    )
    .min(1)
    .max(50)
    .required(),
  shippingAddress: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    phone: Joi.string().trim().min(5).max(30).required(),
    addressLine: Joi.string().trim().min(3).max(500).required(),
    city: Joi.string().trim().min(1).max(100).required(),
    state: Joi.string().trim().min(1).max(100).required(),
    pincode: Joi.string().trim().min(3).max(20).required(),
    country: Joi.string().trim().max(100).default('India'),
  }).optional(),
  paymentMethod: Joi.string().valid('UPI', 'CARD', 'COD', 'BANK_TRANSFER', 'OTHER').default('COD'),
  paymentDetails: Joi.object({
    upiId: Joi.string().allow('').max(100).optional(),
    cardLast4: Joi.string().allow('').max(4).optional(),
    cardType: Joi.string().allow('').max(50).optional(),
    transactionRef: Joi.string().allow('').max(100).optional(),
  }).optional(),
  saveAddress: Joi.boolean().optional(),
  notes: Joi.string().allow('').max(1000).optional(),
});

module.exports = {
  validate,
  customerRegisterSchema,
  profileUpdateSchema,
  supportCreateSchema,
  supportReplySchema,
  placeOrderSchema,
  addressSchema,
};

