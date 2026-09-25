const express = require('express');
const payrollController = require('../controllers/payroll.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const { validate, payrollCreateSchema, payrollStatusSchema } = require('../validators/phase8.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('payroll:read'), payrollController.list);
router.get('/:id', authorizePermissions('payroll:read'), payrollController.getById);
router.post('/', authorizePermissions('payroll:write'), validate(payrollCreateSchema), payrollController.create);
router.post(
  '/:id/status',
  authorizePermissions('payroll:write'),
  validate(payrollStatusSchema),
  payrollController.transition
);

module.exports = router;
