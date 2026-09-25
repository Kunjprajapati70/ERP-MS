const express = require('express');
const roleController = require('../controllers/role.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const { validate, updateRoleSchema } = require('../validators/user.validator');

const router = express.Router();

router.use(authenticateUser);

router.get('/permissions/catalog', authorizePermissions('roles:read'), roleController.permissions);
router.get('/', authorizePermissions('roles:read'), roleController.list);
router.get('/:id', authorizePermissions('roles:read'), roleController.getById);
router.patch('/:id', authorizePermissions('roles:write'), validate(updateRoleSchema), roleController.update);

module.exports = router;
