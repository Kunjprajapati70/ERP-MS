const express = require('express');
const warehouseController = require('../controllers/warehouse.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const {
  validate,
  warehouseSchema,
  warehouseUpdateSchema,
} = require('../validators/product.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('inventory:read'), warehouseController.list);
router.post('/', authorizePermissions('inventory:write'), validate(warehouseSchema), warehouseController.create);
router.patch('/:id', authorizePermissions('inventory:write'), validate(warehouseUpdateSchema), warehouseController.update);
router.delete('/:id', authorizePermissions('inventory:write'), warehouseController.remove);

module.exports = router;
