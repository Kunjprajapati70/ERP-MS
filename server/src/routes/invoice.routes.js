const express = require('express');
const invoiceController = require('../controllers/invoice.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const { validate, invoiceFromSOSchema } = require('../validators/sales.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('invoices:read'), invoiceController.list);
router.get('/:id', authorizePermissions('invoices:read'), invoiceController.getById);
router.post(
  '/from-sales-order/:salesOrderId',
  authorizePermissions('invoices:write'),
  validate(invoiceFromSOSchema),
  invoiceController.createFromSalesOrder
);

module.exports = router;
