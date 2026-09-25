const express = require('express');
const rateLimit = require('express-rate-limit');
const authenticateUser = require('../middleware/authenticate');
const requireCustomerPortal = require('../middleware/requireCustomerPortal');
const customerPortalController = require('../controllers/customerPortal.controller');
const {
  validate,
  customerRegisterSchema,
  profileUpdateSchema,
  supportCreateSchema,
  supportReplySchema,
  placeOrderSchema,
  addressSchema,
} = require('../validators/customerPortal.validator');

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
    errorCode: 'AUTH_RATE_LIMIT',
  },
});

router.post(
  '/auth/register',
  registerLimiter,
  validate(customerRegisterSchema),
  customerPortalController.register
);

router.use(authenticateUser, requireCustomerPortal);

router.get('/profile', customerPortalController.getProfile);
router.put('/profile', validate(profileUpdateSchema), customerPortalController.updateProfile);

router.get('/addresses', customerPortalController.listAddresses);
router.post('/addresses', validate(addressSchema), customerPortalController.addAddress);
router.delete('/addresses/:id', customerPortalController.deleteAddress);

router.get('/dashboard', customerPortalController.getDashboard);

router.get('/products', customerPortalController.listProducts);
router.get('/products/:id', customerPortalController.getProduct);

router.get('/orders', customerPortalController.listOrders);
router.post('/orders', validate(placeOrderSchema), customerPortalController.placeOrder);
router.get('/orders/:id', customerPortalController.getOrder);

router.get('/invoices', customerPortalController.listInvoices);
router.get('/invoices/:id', customerPortalController.getInvoice);
router.get('/invoices/:id/pdf', customerPortalController.downloadInvoicePdf);

router.get('/payments', customerPortalController.listPayments);

router.get('/notifications', customerPortalController.listNotifications);
router.get('/notifications/unread-count', customerPortalController.unreadNotifications);
router.patch('/notifications/read-all', customerPortalController.markAllNotificationsRead);
router.patch('/notifications/:id/read', customerPortalController.markNotificationRead);

router.get('/support', customerPortalController.listSupport);
router.post('/support', validate(supportCreateSchema), customerPortalController.createSupport);
router.get('/support/:id', customerPortalController.getSupport);
router.post(
  '/support/:id/reply',
  validate(supportReplySchema),
  customerPortalController.replySupport
);

module.exports = router;
