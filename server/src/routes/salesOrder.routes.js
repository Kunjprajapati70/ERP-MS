const express = require('express');
const salesOrderController = require('../controllers/salesOrder.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const {
  validate,
  salesOrderSchema,
  salesOrderUpdateSchema,
  soStatusSchema,
} = require('../validators/sales.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('sales:read'), salesOrderController.list);
router.get('/:id', authorizePermissions('sales:read'), salesOrderController.getById);
router.post('/', authorizePermissions('sales:write'), validate(salesOrderSchema), salesOrderController.create);
router.patch(
  '/:id',
  authorizePermissions('sales:write'),
  validate(salesOrderUpdateSchema),
  salesOrderController.update
);
router.post(
  '/:id/status',
  authorizePermissions('sales:write'),
  validate(soStatusSchema),
  salesOrderController.transition
);
router.delete('/:id', authorizePermissions('sales:write'), salesOrderController.remove);

module.exports = router;
