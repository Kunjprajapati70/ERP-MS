const express = require('express');
const supplierController = require('../controllers/supplier.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const { validate, supplierSchema, supplierUpdateSchema } = require('../validators/party.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('suppliers:read'), supplierController.list);
router.get('/:id', authorizePermissions('suppliers:read'), supplierController.getById);
router.post('/', authorizePermissions('suppliers:write'), validate(supplierSchema), supplierController.create);
router.patch('/:id', authorizePermissions('suppliers:write'), validate(supplierUpdateSchema), supplierController.update);
router.delete('/:id', authorizePermissions('suppliers:write'), supplierController.remove);

module.exports = router;
