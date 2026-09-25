const express = require('express');
const userController = require('../controllers/user.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const {
  validate,
  createUserSchema,
  updateUserSchema,
} = require('../validators/user.validator');

const router = express.Router();

router.use(authenticateUser);

router.get('/', authorizePermissions('users:read'), userController.list);
router.get('/:id', authorizePermissions('users:read'), userController.getById);
router.post('/', authorizePermissions('users:write'), validate(createUserSchema), userController.create);
router.patch('/:id', authorizePermissions('users:write'), validate(updateUserSchema), userController.update);
router.delete('/:id', authorizePermissions('users:write'), userController.remove);

module.exports = router;
