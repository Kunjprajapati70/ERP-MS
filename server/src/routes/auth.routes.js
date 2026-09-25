const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const customerPortalController = require('../controllers/customerPortal.controller');
const authenticateUser = require('../middleware/authenticate');
const {
  validate,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/auth.validator');
const { customerRegisterSchema } = require('../validators/customerPortal.validator');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    errorCode: 'AUTH_RATE_LIMIT',
  },
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post(
  '/customer/register',
  authLimiter,
  validate(customerRegisterSchema),
  customerPortalController.register
);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

router.post('/logout', authenticateUser, authController.logout);
router.get('/me', authenticateUser, authController.me);
router.patch('/change-password', authenticateUser, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
