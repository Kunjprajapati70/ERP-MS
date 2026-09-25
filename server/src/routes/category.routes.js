const express = require('express');
const categoryController = require('../controllers/category.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const {
  validate,
  categorySchema,
  categoryUpdateSchema,
} = require('../validators/product.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('products:read'), categoryController.list);
router.post('/', authorizePermissions('products:write'), validate(categorySchema), categoryController.create);
router.patch('/:id', authorizePermissions('products:write'), validate(categoryUpdateSchema), categoryController.update);
router.delete('/:id', authorizePermissions('products:write'), categoryController.remove);

module.exports = router;
