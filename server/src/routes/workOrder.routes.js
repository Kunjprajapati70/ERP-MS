const express = require('express');
const workOrderController = require('../controllers/workOrder.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const { validate, workOrderSchema, woStatusSchema } = require('../validators/manufacturing.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('manufacturing:read'), workOrderController.list);
router.get('/:id', authorizePermissions('manufacturing:read'), workOrderController.getById);
router.post(
  '/',
  authorizePermissions('manufacturing:write'),
  validate(workOrderSchema),
  workOrderController.create
);
router.post(
  '/:id/status',
  authorizePermissions('manufacturing:write'),
  validate(woStatusSchema),
  workOrderController.transition
);
router.delete('/:id', authorizePermissions('manufacturing:write'), workOrderController.remove);

module.exports = router;
