const express = require('express');
const purchaseOrderController = require('../controllers/purchaseOrder.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const {
  validate,
  purchaseOrderSchema,
  purchaseOrderUpdateSchema,
  poStatusSchema,
} = require('../validators/party.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('purchases:read'), purchaseOrderController.list);
router.get('/:id', authorizePermissions('purchases:read'), purchaseOrderController.getById);
router.post('/', authorizePermissions('purchases:write'), validate(purchaseOrderSchema), purchaseOrderController.create);
router.patch(
  '/:id',
  authorizePermissions('purchases:write'),
  validate(purchaseOrderUpdateSchema),
  purchaseOrderController.update
);
router.post(
  '/:id/status',
  authorizePermissions('purchases:write'),
  validate(poStatusSchema),
  purchaseOrderController.transition
);
router.delete('/:id', authorizePermissions('purchases:write'), purchaseOrderController.remove);

module.exports = router;
