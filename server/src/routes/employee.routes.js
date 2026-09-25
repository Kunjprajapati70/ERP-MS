const express = require('express');
const employeeController = require('../controllers/employee.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const { validate, employeeSchema, employeeUpdateSchema } = require('../validators/hr.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('hr:read'), employeeController.list);
router.get('/:id', authorizePermissions('hr:read'), employeeController.getById);
router.post('/', authorizePermissions('hr:write'), validate(employeeSchema), employeeController.create);
router.patch(
  '/:id',
  authorizePermissions('hr:write'),
  validate(employeeUpdateSchema),
  employeeController.update
);
router.delete('/:id', authorizePermissions('hr:write'), employeeController.remove);

module.exports = router;
