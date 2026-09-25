const express = require('express');
const paymentController = require('../controllers/payment.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const { validate, paymentSchema } = require('../validators/sales.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('payments:read'), paymentController.list);
router.post('/', authorizePermissions('payments:write'), validate(paymentSchema), paymentController.create);

module.exports = router;
