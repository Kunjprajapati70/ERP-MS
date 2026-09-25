const express = require('express');
const customerController = require('../controllers/customer.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const { validate, customerSchema, customerUpdateSchema } = require('../validators/party.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('customers:read'), customerController.list);
router.get('/:id', authorizePermissions('customers:read'), customerController.getById);
router.post('/', authorizePermissions('customers:write'), validate(customerSchema), customerController.create);
router.patch('/:id', authorizePermissions('customers:write'), validate(customerUpdateSchema), customerController.update);
router.delete('/:id', authorizePermissions('customers:write'), customerController.remove);

module.exports = router;
